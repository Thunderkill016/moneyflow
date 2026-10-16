import 'dart:async';

import 'package:flutter/material.dart';

import '../../data/capture_draft.dart';
import '../../data/capture_prefs.dart';
import '../../data/neon/real_store.dart' show newIdempotencyKey;
import '../../data/quick_fills.dart';
import '../../data/share/share_text_parser.dart';
import '../../domain/frequency.dart';
import '../../domain/inbox.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/quick_parse.dart';
import '../../domain/report.dart' show dateAdd, vnNow;
import '../../domain/rule_suggestions.dart';
import '../../domain/split.dart';
import '../../theme/mf_theme.dart';
import 'capture_submit.dart'
    show CaptureQueued, CommitmentFailed, submitErrorMessage;
import 'category_picker.dart';
import '../shared/empty_state.dart';
import '../shared/timed_snack_bar.dart';
import '../voice/voice_capture_page.dart';

/// Result of one capture intent — carries the idempotency key generated when
/// the form opened so replays of the same intent never double-post.
class CaptureIntent {
  const CaptureIntent({
    required this.kind,
    required this.accountId,
    this.destinationAccountId,
    this.categoryId,
    required this.amount,
    required this.occurredOn,
    this.note = '',
    this.payee = '',
    required this.idempotencyKey,
    this.repeatMonthly = false,
    this.dueDay = 1,
    this.commitmentName = '',
    this.transactionId,
    this.expectedUpdatedAt,
    this.splitLines = const [],
    this.excludedFromReports,
    this.isRefund,
  });

  final TransactionKind kind;
  final String accountId;
  final String? destinationAccountId;
  final String? categoryId;
  final int amount;
  final String occurredOn;
  final String note;
  final String payee;
  final String idempotencyKey;

  /// "Lặp lại hàng tháng" — after the transaction saves, a monthly
  /// commitment is created on [dueDay] under [commitmentName] (Money
  /// Manager's inline-recurring pattern, mapped to our commitment RPC).
  final bool repeatMonthly;
  final int dueDay;
  final String commitmentName;

  /// Edit mode — when set, the intent updates this row instead of
  /// creating one. [expectedUpdatedAt] is the optimistic-concurrency
  /// token from the feed (server raises stale_write when stale).
  final String? transactionId;
  final String? expectedUpdatedAt;

  /// Non-empty = one expense split over several categories; [amount] is
  /// then the lines' total and [categoryId] is null.
  final List<SplitLine> splitLines;

  /// Edit-mode report scope (D13): non-null only when the user actually
  /// flipped the "Loại khỏi báo cáo" switch, so a save that never
  /// touched it costs no extra write. Null on every create intent.
  final bool? excludedFromReports;

  /// Money-back flag (D15): a refund is an income-kind row against an
  /// expense category. Create carries true when the "Hoàn tiền" switch
  /// is on; edit sends null when untouched (null preserves the stored
  /// flag, same convention as [excludedFromReports]).
  final bool? isRefund;
}

/// What the capture route returns — `saved` is a clean save;
/// `savedPartial` means the transaction landed but its recurring
/// commitment did not (the shell shows an honest snackbar);
/// `savedRuleFailed` means the transaction landed but the opt-in
/// "lưu thành quy tắc" write did not; `queued` means the submit failed
/// offline and the intent is held for replay.
enum CaptureResult { saved, savedPartial, savedRuleFailed, queued }

/// The three exits of the D6 rule-draft offer — [accept] writes the rule
/// through `onSaveRule`, [declined] mutes the pair, [later] (or a null
/// dismiss) leaves the counter for the next correction.
enum _SuggestionVerdict { accept, declined, later }

class _SplitRow {
  _SplitRow({this.categoryId});

  String? categoryId;
  final TextEditingController amount = TextEditingController();
}

/// Manual capture: Chi / Thu / Chuyển — mirrors the web's three action
/// shapes (create_money_transaction, create_account_transfer).
class CapturePage extends StatefulWidget {
  const CapturePage({
    super.key,
    required this.accounts,
    required this.categories,
    required this.onSubmit,
    this.prefill,
    this.transactions = const [],
    this.editing,
    this.onCreateAccount,
    this.onSaveRule,
    this.onPayeeCategoryCorrection,
    this.onSuggestionDeclined,
    this.draftScope,
    this.quickFillScope,
  });

  final List<AccountSummary> accounts;
  final List<Category> categories;
  final Future<void> Function(CaptureIntent intent) onSubmit;

  /// Zero-account escape hatch — when [accounts] is empty the dropdown
  /// is a dead end, so the form shows "Chưa có ví" with a "Tạo ví"
  /// button that runs the host's account-creation flow. The seam
  /// returns the refreshed account list after a real save (null means
  /// the user cancelled or the save failed); the created account is
  /// auto-selected. Null hides the button — a read-only host (demo)
  /// gets the honest message without a dead affordance.
  final Future<List<AccountSummary>?> Function()? onCreateAccount;

  /// Shared-text extraction applied to the form on open. The user still
  /// reviews and submits manually — a share never posts a transaction.
  final SharedTextPrefill? prefill;

  /// Recent transactions — ranked into the "Mục hay dùng" category row.
  /// Empty for share-receive opens (no feed loaded yet).
  final List<Transaction> transactions;

  /// Edit mode — prefills every field from this row; submits carry its
  /// id + updated_at instead of a new idempotency write. Kind stays
  /// locked to what the update RPC allows (transfers stay transfers).
  final Transaction? editing;

  /// Monarch's "save edit as rule" offer — shown only in edit mode for
  /// income/expense rows. When ticked, after the transaction lands the
  /// page creates one inbox rule (merchant ~ payee → this category) so
  /// future pending candidates pre-fill the same way. The rule write is
  /// separate from the transaction write: a failed rule pops
  /// [CaptureResult.savedRuleFailed] so the shell can say "saved the
  /// money, not the rule" honestly. Null seam (demo/queue) hides the
  /// checkbox.
  final Future<void> Function(InboxRuleDraft draft)? onSaveRule;

  /// D6 — repeated-correction rule suggestion, edit mode only. Called
  /// once after a successful save whose (payee, category) pair differs
  /// from the row's original; the seam records the correction and
  /// returns a [RuleSuggestion] when the counted pattern earns an offer,
  /// else null. Wired alongside [onSaveRule] — a host that can't write
  /// rules is never offered one.
  final Future<RuleSuggestion?> Function({
    required String payee,
    required String categoryId,
  })?
  onPayeeCategoryCorrection;

  /// "Không hỏi lại" on the suggestion dialog — the seam remembers and
  /// stops offering this exact (payee → category) pair on this device.
  final Future<void> Function(RuleSuggestion suggestion)? onSuggestionDeclined;

  /// Account scope for the unsaved-draft slot (`null` = no persistence —
  /// demo/read-only hosts). Process death drops every pushed route, so
  /// in-progress fields are kept in an account-scoped prefs slot and
  /// offered back on the next open instead of relying on framework route
  /// restoration the imperative `Navigator.push` stack can't deliver.
  final String? draftScope;

  /// Account scope for the D7 quick-fill templates (`null` = none —
  /// demo/read-only hosts hide the chip row and the save-as-template
  /// action entirely, never a dead affordance). The chips only prefill
  /// the form; the user still reviews and saves explicitly.
  final String? quickFillScope;

  @override
  State<CapturePage> createState() => _CapturePageState();
}

class _CapturePageState extends State<CapturePage> with WidgetsBindingObserver {
  final _amount = TextEditingController();
  final _note = TextEditingController();
  final _payee = TextEditingController();
  // "Gõ nhanh" — Vietnamese quick-capture scratch field. It only ever
  // PROPOSES (prefill); the normal fields stay the source of truth.
  final _quick = TextEditingController();
  QuickParseDraft? _quickDraft;

  // The values the quick parse last auto-applied. A field the user has
  // since edited by hand is never overwritten by a later re-parse —
  // prefill accelerates entry, it does not fight corrections.
  int? _autoAmount;
  String? _autoNote;
  TransactionKind? _autoKind;
  String? _autoCategoryId;
  DateTime? _autoDate;

  // One key per form-open — the idempotency key of this capture intent.
  // A restored draft carries its original key back so a submit retried
  // after process death dedupes against the write that may have landed.
  late String _idempotencyKey = newIdempotencyKey();

  TransactionKind _kind = TransactionKind.expense;
  // Mirrors widget.accounts but mutable — creating a wallet from the
  // zero-account state repopulates the dropdown without a route reload.
  late List<AccountSummary> _accounts;
  String? _accountId;
  String? _destAccountId;
  String? _categoryId;
  // The default "hôm nay" is the VN civil date — occurred_on is written
  // on the same calendar the bank SMS and the web capture use, whatever
  // zone the device reports (domain/report.dart's vnNow).
  DateTime _date = vnNow();
  bool _busy = false;
  bool _repeatMonthly = false;
  bool _saveAsRule = false;

  /// Edit-mode "Loại khỏi báo cáo" switch state — seeded from the row
  /// and only sent when it differs (see CaptureIntent.excludedFromReports).
  bool _excludedFromReports = false;

  /// "Hoàn tiền" switch state (D15) — only meaningful while kind is
  /// Thu: the flag flips the category pool to expense categories, which
  /// is where the refund nets. Seeded from the edited row; reset the
  /// moment the kind leaves income.
  bool _isRefund = false;
  String? _error;

  // "Chia danh mục" — one expense over several categories.
  bool _split = false;
  final List<_SplitRow> _splitRows = [];
  final List<_SplitRow> _retiredSplitRows = [];

  // D7 "Mẫu nhanh" — saved templates for the chip row (create mode only;
  // an edit must never be silently overwritten by a template).
  List<QuickFill> _quickFills = const [];

  // ── Unsaved-draft persistence (see widget.draftScope) ─────────────
  // A debounced write keeps the stored copy within ~400ms of the last
  // edit; didChangeAppLifecycleState(paused) flushes it synchronously
  // because Android may kill the process any time after backgrounding.
  static const _draftSaveDebounce = Duration(milliseconds: 400);
  Timer? _draftSaveTimer;

  /// True while the "Đã khôi phục bản nháp" banner is up — it dismisses
  /// itself on the first real edit (the notice has done its job).
  bool _restoredDraft = false;

  /// Suppresses persistence while a draft/default restore mutates the
  /// fields programmatically — re-saving what was just read is wasted
  /// churn and a clear-then-resave race.
  bool _suppressDraftSave = false;

  /// Set once a submit consumed the draft — the dispose-time flush must
  /// not resurrect a stored copy of the transaction that just landed.
  bool _draftConsumed = false;

  bool get _draftEnabled =>
      widget.draftScope != null && widget.editing == null && !_draftConsumed;

  /// Every state mutation schedules a draft write — overriding the one
  /// funnel beats chasing a dozen call sites (and forgetting the next).
  @override
  void setState(VoidCallback fn) {
    super.setState(fn);
    _persistDraftSoon();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _draftSaveTimer?.cancel();
      _writeDraftNow();
    }
  }

  void _persistDraftSoon() {
    if (!_draftEnabled || _suppressDraftSave) return;
    if (_restoredDraft && mounted) {
      // First post-restore edit — drop the banner with the fields kept.
      super.setState(() => _restoredDraft = false);
    }
    _draftSaveTimer?.cancel();
    _draftSaveTimer = Timer(_draftSaveDebounce, _persistDraftNow);
  }

  void _persistDraftNow() {
    if (!mounted) return;
    _writeDraftNow();
  }

  void _writeDraftNow() {
    if (!_draftEnabled || _suppressDraftSave) return;
    final scope = widget.draftScope!;
    final draft = _currentDraft();
    unawaited(
      draft.isEmpty
          ? CaptureDraftStore.clear(scope)
          : CaptureDraftStore.save(scope, draft),
    );
  }

  CaptureDraft _currentDraft() => CaptureDraft(
    kind: _kind,
    amountText: _amount.text,
    note: _note.text,
    payee: _payee.text,
    accountId: _accountId,
    destinationAccountId: _destAccountId,
    categoryId: _categoryId,
    occurredOn: _sameDay(_date, vnNow()) ? null : _fmtDate(_date),
    repeatMonthly: _repeatMonthly,
    split: _split,
    isRefund: _kind == TransactionKind.income && _isRefund,
    splitRows: [
      for (final r in _splitRows)
        CaptureDraftSplitLine(
          categoryId: r.categoryId,
          amountText: r.amount.text,
        ),
    ],
    idempotencyKey: _idempotencyKey,
    savedAtMs: DateTime.now().millisecondsSinceEpoch,
  );

  /// The draft is consumed once the intent landed (or is held by the
  /// offline queue) — keeping it would resurrect an already-saved form.
  void _clearStoredDraft() {
    _draftConsumed = true;
    _draftSaveTimer?.cancel();
    final scope = widget.draftScope;
    if (scope != null) unawaited(CaptureDraftStore.clear(scope));
  }

  /// "Xóa" on the restored-draft banner: the stored slot goes AND the
  /// fields reset — clearing only the blob would re-save the same draft
  /// on the next keystroke.
  void _discardDraft() {
    _draftSaveTimer?.cancel();
    final scope = widget.draftScope;
    if (scope != null) unawaited(CaptureDraftStore.clear(scope));
    _suppressDraftSave = true;
    setState(() {
      _amount.clear();
      _note.clear();
      _payee.clear();
      _quick.clear();
      _quickDraft = null;
      _kind = TransactionKind.expense;
      _isRefund = false;
      _accountId = null;
      _destAccountId = null;
      _categoryId = null;
      _date = vnNow();
      _repeatMonthly = false;
      _split = false;
      _retiredSplitRows.addAll(_splitRows);
      _splitRows.clear();
      _restoredDraft = false;
      _idempotencyKey = newIdempotencyKey();
    });
    _suppressDraftSave = false;
  }

  /// True while nothing user-entered has touched the form — a draft
  /// that lands over already-typed input would destroy newer intent.
  bool _formIsUntouched() =>
      _amount.text.isEmpty &&
      _note.text.isEmpty &&
      _payee.text.isEmpty &&
      _quick.text.isEmpty &&
      _destAccountId == null &&
      !_split &&
      !_isRefund &&
      !_repeatMonthly &&
      _sameDay(_date, vnNow());

  /// Applies a loaded draft. Ids are re-validated against the live
  /// account/category lists — a wallet deleted since the draft was
  /// typed must not resurrect as a phantom selection.
  void _applyDraft(CaptureDraft d) {
    _kind = d.kind;
    // Refund flag restores only on an income draft — it must be set
    // before the category check below so the stored expense-category id
    // validates against the pool the refund mode actually offers.
    _isRefund = d.isRefund && _kind == TransactionKind.income;
    _amount.text = d.amountText;
    _note.text = d.note;
    _payee.text = d.payee;
    if (_accounts.any((a) => a.id == d.accountId)) {
      _accountId = d.accountId;
    }
    if (_accounts.any((a) => a.id == d.destinationAccountId)) {
      _destAccountId = d.destinationAccountId;
    }
    if (widget.categories.any(
      (c) => c.id == d.categoryId && c.kind == _categoryKind,
    )) {
      _categoryId = d.categoryId;
    }
    final day = d.occurredOn == null ? null : DateTime.tryParse(d.occurredOn!);
    if (day != null) _date = day;
    _repeatMonthly = d.repeatMonthly && _kind != TransactionKind.transfer;
    _split = d.split && _kind == TransactionKind.expense;
    if (_split) {
      for (final l in d.splitRows) {
        final row = _newSplitRow(categoryId: l.categoryId)
          ..amount.text = l.amountText;
        _splitRows.add(row);
      }
      // Split submits need at least two lines — a degenerate stored
      // draft reseeds the pair rather than failing validation oddly.
      while (_splitRows.length < 2) {
        _splitRows.add(_newSplitRow());
      }
    }
    if (d.idempotencyKey != null) _idempotencyKey = d.idempotencyKey!;
    _restoredDraft = true;
  }

  _SplitRow _newSplitRow({String? categoryId}) {
    final row = _SplitRow(categoryId: categoryId);
    if (_draftEnabled) row.amount.addListener(_persistDraftSoon);
    return row;
  }

  @override
  void dispose() {
    _draftSaveTimer?.cancel();
    if (_draftEnabled) {
      WidgetsBinding.instance.removeObserver(this);
      // Flush pending edits — a debounce scheduled in the last 400ms
      // would otherwise die with the page.
      _writeDraftNow();
      _amount.removeListener(_persistDraftSoon);
      _note.removeListener(_persistDraftSoon);
      _payee.removeListener(_persistDraftSoon);
    }
    _amount.dispose();
    _note.dispose();
    _payee.dispose();
    _quick.dispose();
    for (final r in [..._splitRows, ..._retiredSplitRows]) {
      r.amount.dispose();
    }
    super.dispose();
  }

  /// Turning split on seeds two lines, carrying over the category and
  /// amount already typed so nothing the user entered is lost.
  void _setSplit(bool on) {
    setState(() {
      _split = on;
      _error = null;
      if (on && _splitRows.isEmpty) {
        final first = _newSplitRow(categoryId: _categoryId);
        final typed = parseMoneyInput(_amount.text);
        if (typed != null && typed > 0) first.amount.text = typed.toString();
        _splitRows.addAll([first, _newSplitRow()]);
      }
    });
  }

  Future<void> _pickSplitCategory(_SplitRow row) async {
    final usedElsewhere = {
      for (final r in _splitRows)
        if (!identical(r, row) && r.categoryId != null) r.categoryId!,
    };
    final picked = await showCategoryPicker(
      context,
      categories: [
        for (final c in _kindCategories)
          if (!usedElsewhere.contains(c.id)) c,
      ],
      selectedId: row.categoryId,
    );
    if (picked != null) setState(() => row.categoryId = picked.id);
  }

  int get _splitRunningTotal => _splitRows.fold(
    0,
    (sum, r) => sum + (parseMoneyInput(r.amount.text) ?? 0),
  );

  @override
  void initState() {
    super.initState();
    _accounts = widget.accounts;
    if (_draftEnabled) {
      _amount.addListener(_persistDraftSoon);
      _note.addListener(_persistDraftSoon);
      _payee.addListener(_persistDraftSoon);
      WidgetsBinding.instance.addObserver(this);
    }
    final editing = widget.editing;
    if (editing == null && widget.quickFillScope != null) {
      unawaited(_loadQuickFills());
    }
    if (editing != null) {
      _kind = editing.kind;
      _accountId = editing.accountId;
      _destAccountId = editing.destinationAccountId;
      _categoryId = editing.categoryId.isEmpty ? null : editing.categoryId;
      _amount.text = editing.amount.toString();
      _note.text = editing.note;
      _payee.text = editing.payee ?? '';
      _excludedFromReports = editing.excludedFromReports;
      _isRefund = editing.isRefund;
      _date = DateTime.tryParse(editing.occurredOn) ?? vnNow();
      return; // an edited row is the strongest prefill — skip the rest
    }
    final p = widget.prefill;
    if (p != null) {
      if (p.kind != null) _kind = p.kind!;
      if (p.amount != null) _amount.text = p.amount!.toString();
      if (p.note != null) _note.text = p.note!;
    }
    unawaited(_restoreFormState());
  }

  /// Last-used defaults first, then the stored draft over the top —
  /// the draft is the newer intent, so it wins every field it carries.
  /// A share-prefill skips the draft: the shared text is fresher than
  /// whatever was typed earlier.
  Future<void> _restoreFormState() async {
    CaptureDraft? draft;
    final scope = widget.draftScope;
    if (scope != null && widget.prefill == null) {
      try {
        draft = await CaptureDraftStore.load(scope);
      } catch (_) {}
    }
    // A prefs-backend failure (no plugin, corrupt store) just means no
    // prefill; it must never break the form.
    ({String? accountId, String? categoryId}) last = (
      accountId: null,
      categoryId: null,
    );
    try {
      last = await CapturePrefs.loadLastCapture();
    } catch (_) {}
    if (!mounted) return;
    _suppressDraftSave = true;
    setState(() {
      if (_accounts.any((a) => a.id == last.accountId)) {
        _accountId = last.accountId;
      }
      // A remembered category only applies when it still exists and
      // matches the current kind — an income category can't prefill an
      // expense form.
      if (widget.categories.any(
        (c) => c.id == last.categoryId && c.kind == _categoryKind,
      )) {
        _categoryId = last.categoryId;
      }
      // Drafts only land on a still-fresh form — typing that beat the
      // async prefs read is newer intent than the stored snapshot.
      if (draft != null && _formIsUntouched()) _applyDraft(draft);
    });
    _suppressDraftSave = false;
  }

  /// Most-used categories for the current kind — the inline pick row.
  List<Category> get _frequentCategories {
    final ids = frequentCategoryIds(widget.transactions, _categoryKind);
    final byId = {for (final c in widget.categories) c.id: c};
    return [
      for (final id in ids)
        if (byId.containsKey(id)) byId[id]!,
    ];
  }

  /// VND quick amounts — the magnitudes people type most (100k..5tr).
  static const _quickAmounts = [
    (label: '50k', value: 50000),
    (label: '100k', value: 100000),
    (label: '200k', value: 200000),
    (label: '500k', value: 500000),
    (label: '1tr', value: 1000000),
    (label: '5tr', value: 5000000),
  ];

  /// The category pool the form offers: a "Hoàn tiền" income capture
  /// picks among EXPENSE categories — the category is the netting
  /// target, which is the whole point of the flag (server enforces the
  /// same rule, so the picker never offers an invalid choice).
  TransactionKind get _categoryKind =>
      _kind == TransactionKind.income && _isRefund
      ? TransactionKind.expense
      : _kind;

  List<Category> get _kindCategories =>
      widget.categories.where((c) => c.kind == _categoryKind).toList();

  String _fmtDate(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Min chars before the scratch field is parsed — shorter input cannot
  /// carry an amount + context worth proposing.
  static const _minQuickChars = 4;

  void _onQuickChanged(String text) {
    final trimmed = text.trim();
    final draft = trimmed.length >= _minQuickChars
        ? parseQuickCapture(trimmed)
        : null;
    setState(() {
      _quickDraft = draft;
      if (draft != null) _applyQuickDraft(draft);
    });
  }

  /// Prefill from the parse — each field is written only when it still
  /// holds what the parser last proposed (or is untouched), so typing on
  /// never stomps a manual correction.
  void _applyQuickDraft(QuickParseDraft draft) {
    // Kind first — the category hint resolves against this kind's list.
    if (_autoKind != null
        ? _kind == _autoKind
        : _kind == TransactionKind.expense) {
      _kind = draft.kind;
    }
    _autoKind = draft.kind;
    if (_kind != TransactionKind.expense) _split = false;
    if (_kind != TransactionKind.income) _isRefund = false;
    // A category of the old kind cannot survive a kind switch.
    if (_categoryId != null &&
        !widget.categories.any(
          (c) => c.id == _categoryId && c.kind == _categoryKind,
        )) {
      _categoryId = null;
    }
    if (_autoAmount == null
        ? _amount.text.trim().isEmpty
        : _amount.text == _autoAmount.toString()) {
      _amount.text = draft.amountMinor.toString();
    }
    _autoAmount = draft.amountMinor;
    if (draft.note.isNotEmpty &&
        (_autoNote == null
            ? _note.text.trim().isEmpty
            : _note.text == _autoNote)) {
      _note.text = draft.note;
      _autoNote = draft.note;
    }
    final hinted = _matchHintedCategory(draft.categoryHint);
    if (hinted != null &&
        (_autoCategoryId == null
            ? _categoryId == null
            : _categoryId == _autoCategoryId)) {
      _categoryId = hinted.id;
      _autoCategoryId = hinted.id;
    }
    if (draft.dateHint != null) {
      final offset = switch (draft.dateHint!) {
        'yesterday' => -1,
        'dayBeforeYesterday' => -2,
        _ => 0,
      };
      final resolved = dateAdd(vnNow(), offset);
      // Overwrite only an untouched (still-today) or parser-set date.
      if (_autoDate == null
          ? _sameDay(_date, vnNow())
          : _sameDay(_date, _autoDate!)) {
        _date = resolved;
      }
      _autoDate = resolved;
    }
  }

  /// The parser returns a canonical category NAME ("Ăn uống"); the real
  /// category must also match the current kind (an income draft can never
  /// select an expense category).
  Category? _matchHintedCategory(String? hint) {
    if (hint == null) return null;
    final folded = foldVietnameseText(hint);
    for (final c in widget.categories) {
      if (c.kind == _categoryKind && foldVietnameseText(c.name) == folded) {
        return c;
      }
    }
    return null;
  }

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// Inline readout of what the parser understood — shown BEFORE saving so
  /// the suggestion never acts silently (the product's explicit-review law).
  Widget _quickSuggestion(QuickParseDraft d) {
    final kindLabel = switch (d.kind) {
      TransactionKind.expense => 'Chi',
      TransactionKind.income => 'Thu',
      TransactionKind.transfer => 'Chuyển',
    };
    final dateLabel = switch (d.dateHint) {
      'yesterday' => 'hôm qua',
      'dayBeforeYesterday' => 'hôm kia',
      'today' => 'hôm nay',
      _ => null,
    };
    final parts = <String>[
      kindLabel,
      formatMoney(d.amountMinor),
      ?d.categoryHint,
      ?dateLabel,
    ];
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Icon(
            Icons.bolt,
            size: 16,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              '→ ${parts.join(' · ')}',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    var splitLines = <SplitLine>[];
    int? amount;
    if (_split) {
      final drafts = [
        for (final r in _splitRows)
          (categoryId: r.categoryId, amount: parseMoneyInput(r.amount.text)),
      ];
      final problem = validateSplit(drafts);
      if (problem != null) {
        setState(() => _error = problem);
        return;
      }
      splitLines = [
        for (final d in drafts) (categoryId: d.categoryId!, amount: d.amount!),
      ];
      amount = splitTotal(splitLines);
    } else {
      amount = parseMoneyInput(_amount.text);
    }
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Số tiền chưa hợp lệ — vd: 50k, 2tr');
      return;
    }
    if (_accountId == null) {
      setState(() => _error = 'Chọn tài khoản');
      return;
    }
    if (!_split && _kind != TransactionKind.transfer && _categoryId == null) {
      setState(() => _error = 'Chọn danh mục');
      return;
    }
    if (_kind == TransactionKind.transfer && _destAccountId == null) {
      setState(() => _error = 'Chọn tài khoản đến');
      return;
    }
    if (_kind == TransactionKind.transfer && _destAccountId == _accountId) {
      setState(() => _error = 'Tài khoản đến phải khác tài khoản nguồn');
      return;
    }
    // The rule derives from the form's own payee + category — validate
    // them before the transaction write so the user can fix or untick
    // instead of saving the money and then discovering no rule.
    if (_saveAsRule && (_payee.text.trim().isEmpty || _categoryId == null)) {
      setState(
        () => _error =
            'Quy tắc cần nơi giao dịch và danh mục — điền hoặc bỏ chọn',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    // Commitment display name: the most human label available.
    final categoryName = widget.categories
        .where((c) => c.id == _categoryId)
        .map((c) => c.name)
        .firstOrNull;
    final commitmentName = _note.text.trim().isNotEmpty
        ? _note.text.trim()
        : (_payee.text.trim().isNotEmpty
              ? _payee.text.trim()
              : (categoryName ?? 'Khoản lặp lại'));
    try {
      await widget.onSubmit(
        CaptureIntent(
          kind: _kind,
          accountId: _accountId!,
          destinationAccountId: _destAccountId,
          categoryId: _split ? null : _categoryId,
          amount: amount,
          splitLines: splitLines,
          occurredOn: _fmtDate(_date),
          note: _note.text.trim(),
          payee: _kind == TransactionKind.transfer ? '' : _payee.text.trim(),
          idempotencyKey: _idempotencyKey,
          repeatMonthly:
              _repeatMonthly &&
              !_split &&
              _kind != TransactionKind.transfer &&
              widget.editing == null,
          dueDay: _date.day,
          commitmentName: commitmentName,
          transactionId: widget.editing?.id,
          expectedUpdatedAt: widget.editing?.updatedAt,
          excludedFromReports:
              widget.editing != null &&
                  _kind != TransactionKind.transfer &&
                  _excludedFromReports != widget.editing!.excludedFromReports
              ? _excludedFromReports
              : null,
          // D15 — a refund only exists as income-kind; on edit, null
          // means the switch was never touched (server preserves).
          // Switching a refund row away from Thu sends false explicitly —
          // preserving the flag under a non-income kind is a server
          // rejection, not a silent drop of the user's kind change.
          isRefund:
              (_kind == TransactionKind.income && _isRefund) !=
                  (widget.editing?.isRefund ?? false)
              ? _kind == TransactionKind.income && _isRefund
              : null,
        ),
      );
      // Persist the last-used picks so the next capture starts pre-filled.
      unawaited(
        CapturePrefs.saveLastCapture(
          accountId: _accountId!,
          categoryId: _categoryId,
        ),
      );
      _clearStoredDraft();
      final saveRule = widget.onSaveRule;
      if (_saveAsRule && saveRule != null) {
        try {
          // One rule per save: merchant ~ the payee just written → the
          // category just chosen. The server still validates the draft
          // (length bounds, category usable) — a refusal here must not
          // take the transaction's success down with it.
          await saveRule((
            id: null,
            expectedVersion: null,
            matchField: RuleMatchField.merchant,
            containsText: _payee.text.trim(),
            categoryId: _categoryId!,
            merchantName: null,
            enabled: true,
          ));
        } catch (_) {
          if (mounted) {
            Navigator.of(context).pop(CaptureResult.savedRuleFailed);
          }
          return;
        }
      } else if (saveRule != null) {
        // D6 — the saved edit may complete a repeated (payee → category)
        // correction that earns a rule-draft offer. A lookup failure only
        // means no offer — the transaction save stays untouched, and a
        // refused rule write reports savedRuleFailed exactly like the
        // checkbox path above.
        final suggestion = await _pendingRuleSuggestion();
        if (suggestion != null && mounted) {
          final verdict = await _offerRuleSuggestion(suggestion);
          if (!mounted) return;
          switch (verdict) {
            case _SuggestionVerdict.accept:
              try {
                await saveRule((
                  id: null,
                  expectedVersion: null,
                  matchField: RuleMatchField.merchant,
                  containsText: suggestion.payee,
                  categoryId: suggestion.categoryId,
                  merchantName: null,
                  enabled: true,
                ));
              } catch (_) {
                if (mounted) {
                  Navigator.of(context).pop(CaptureResult.savedRuleFailed);
                }
                return;
              }
            case _SuggestionVerdict.declined:
              final declined = widget.onSuggestionDeclined;
              if (declined != null) {
                // Best-effort — a forgotten decline only means the offer
                // can appear once more, never a wrong write.
                unawaited(declined(suggestion).catchError((_) {}));
              }
            case _SuggestionVerdict.later || null:
              break;
          }
        }
      }
      if (mounted) Navigator.of(context).pop(CaptureResult.saved);
    } on CommitmentFailed {
      // The transaction saved; only the recurring commitment failed. The
      // caller turns savedPartial into an honest snackbar — still a save.
      _clearStoredDraft();
      if (mounted) Navigator.of(context).pop(CaptureResult.savedPartial);
    } on CaptureQueued {
      // The submit failed offline and the intent is held in the queue —
      // close the form; the banner + snackbar explain it will replay.
      _clearStoredDraft();
      if (mounted) Navigator.of(context).pop(CaptureResult.queued);
    } catch (e) {
      setState(() {
        _busy = false;
        _error = submitErrorMessage(e);
      });
    }
  }

  /// The D6 correction signal, asked only in edit mode after the save
  /// landed: a changed (payee, category) pair on a payee-bearing
  /// income/expense row is a re-categorization worth counting; an
  /// untouched pair or a note-only edit is not evidence. Seam/prefs
  /// failures return null — the suggestion is a nicety over a save that
  /// already succeeded, never a new failure mode for it.
  Future<RuleSuggestion?> _pendingRuleSuggestion() async {
    final editing = widget.editing;
    final seam = widget.onPayeeCategoryCorrection;
    final payee = _payee.text.trim();
    final categoryId = _categoryId;
    if (editing == null ||
        seam == null ||
        editing.kind == TransactionKind.transfer ||
        _split ||
        payee.isEmpty ||
        categoryId == null) {
      return null;
    }
    final originalPayee = (editing.payee ?? '').trim();
    if (payee == originalPayee && categoryId == editing.categoryId) {
      return null;
    }
    try {
      return await seam(payee: payee, categoryId: categoryId);
    } catch (_) {
      return null;
    }
  }

  /// The rule-draft offer itself — a modal because it names real numbers
  /// (payee, category, count) the user should read once, with three honest
  /// exits: create the rule now, keep correcting manually ("Để sau"
  /// re-offers if the pattern repeats again), or silence this pair.
  /// An outside-tap dismiss reads as "Để sau".
  Future<_SuggestionVerdict?> _offerRuleSuggestion(RuleSuggestion s) {
    final categoryName =
        widget.categories
            .where((c) => c.id == s.categoryId)
            .map((c) => c.name)
            .firstOrNull ??
        'danh mục đã chọn';
    return showDialog<_SuggestionVerdict>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Tạo quy tắc tự điền?'),
        content: Text(
          'Bạn đã đổi “${s.payee}” sang “$categoryName” ${s.times} lần. '
          'Quy tắc sẽ tự điền danh mục này cho các mục chờ duyệt có nơi '
          'giao dịch khớp — mỗi mục vẫn do bạn duyệt, không tự ghi sổ.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(_SuggestionVerdict.declined),
            child: const Text('Không hỏi lại'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(_SuggestionVerdict.later),
            child: const Text('Để sau'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(_SuggestionVerdict.accept),
            child: const Text('Tạo quy tắc'),
          ),
        ],
      ),
    );
  }

  // ── D7 quick fills ────────────────────────────────────────────────

  Future<void> _loadQuickFills() async {
    final scope = widget.quickFillScope;
    if (scope == null) return;
    List<QuickFill> fills;
    try {
      fills = await QuickFillStore.load(scope);
    } catch (_) {
      return; // a prefs failure just means no chips — the form still works
    }
    if (mounted) setState(() => _quickFills = fills);
  }

  /// Chips whose stored ids still resolve against the live lists — a
  /// fill pointing at a deleted wallet or an archived/wrong-kind
  /// category can't prefill honestly, so it hides instead of applying a
  /// half-broken template.
  List<QuickFill> get _usableQuickFills => [
    for (final f in _quickFills)
      if (_accounts.any((a) => a.id == f.accountId) &&
          widget.categories.any(
            (c) => c.id == f.categoryId && c.kind == f.kind && !c.isArchived,
          ))
        f,
  ];

  /// Chip label — the most human token first: payee when the template
  /// carries one, else the category's CURRENT name (a rename never
  /// shows as the stale stored label).
  String _quickFillLabel(QuickFill f) {
    final head = f.payee.isNotEmpty
        ? f.payee
        : (widget.categories
                  .where((c) => c.id == f.categoryId)
                  .map((c) => c.name)
                  .firstOrNull ??
              f.categoryName);
    return '$head · ${formatMoney(f.amountMinor)}';
  }

  /// Applying a template is an explicit fill, not a post — every field
  /// lands on the form and the user still reviews before saving. The
  /// date keeps its "hôm nay" default on purpose: a quick fill answers
  /// "the usual coffee again", not "re-enter that day".
  void _applyQuickFill(QuickFill f) {
    setState(() {
      _kind = f.kind;
      _split = false; // templates hold one category — split mode off
      // Templates never carry the refund flag — the filled row is an
      // ordinary capture, so a leftover toggle must not tag along.
      _isRefund = false;
      _categoryId = f.categoryId;
      _amount.text = f.amountMinor.toString();
      _payee.text = f.payee;
      _note.text = f.note;
      _accountId = f.accountId;
      // Hand-entered intent outranks any auto-prefill the quick-parse
      // scratch field produced earlier — record the applied values as
      // user-owned so a later re-parse cannot stomp them.
      _autoKind = null;
      _autoAmount = null;
      _autoNote = null;
      _autoCategoryId = null;
      _autoDate = null;
    });
  }

  /// AppBar "Lưu làm mẫu nhanh" — snapshots the CURRENT fields as a
  /// template without submitting the transaction. Validation mirrors the
  /// submit's minimum (positive amount, category chosen) so a template
  /// can never encode a form that could not save anyway.
  Future<void> _saveQuickFill() async {
    final scope = widget.quickFillScope;
    if (scope == null) return;
    final amount = parseMoneyInput(_amount.text);
    if (_kind == TransactionKind.transfer ||
        amount == null ||
        amount <= 0 ||
        _categoryId == null ||
        _accountId == null) {
      _snack('Nhập số tiền và danh mục trước khi lưu mẫu');
      return;
    }
    final category = widget.categories
        .where((c) => c.id == _categoryId)
        .firstOrNull;
    if (category == null) return;
    try {
      await QuickFillStore.save(
        scope,
        QuickFill(
          kind: _kind,
          amountMinor: amount,
          categoryId: category.id,
          categoryName: category.name,
          accountId: _accountId!,
          payee: _payee.text.trim(),
          note: _note.text.trim(),
        ),
      );
    } catch (_) {
      if (mounted) _snack('Chưa lưu được mẫu — thử lại');
      return;
    }
    await _loadQuickFills();
    if (mounted) _snack('Đã lưu mẫu nhanh');
  }

  Future<void> _deleteQuickFill(QuickFill f) async {
    final scope = widget.quickFillScope;
    if (scope == null) return;
    try {
      await QuickFillStore.delete(scope, f);
    } catch (_) {
      if (mounted) _snack('Chưa xóa được mẫu — thử lại');
      return;
    }
    await _loadQuickFills();
    if (mounted) _snack('Đã xóa mẫu nhanh');
  }

  void _snack(String message) {
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(content: Text(message)),
    );
  }

  /// Category selection via a searchable bottom sheet — the flat list
  /// will not scale as user categories grow (Money Lover/Wallet pattern).
  Future<void> _pickCategory() async {
    final picked = await showCategoryPicker(
      context,
      categories: _kindCategories,
      selectedId: _categoryId,
    );
    if (picked != null) setState(() => _categoryId = picked.id);
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  /// "Tạo ví" on the zero-account state — the host runs the shared
  /// account-creation dialog and hands back the refreshed list. The
  /// newly created wallet is auto-selected so the form is ready to
  /// save; a failed refresh keeps the honest empty state plus an error.
  Future<void> _createAccount() async {
    // Separate method — a variable assigned inside try/catch can't be
    // promoted, and the null-check below needs the promotion.
    final fresh = await _runCreateAccount();
    if (!mounted || fresh == null) return;
    setState(() {
      final known = {for (final a in _accounts) a.id};
      _accounts = fresh;
      // Prefer the wallet the user just created; fall back to the
      // first row when the host can't tell which is new.
      _accountId ??=
          fresh
              .where((a) => !known.contains(a.id))
              .map((a) => a.id)
              .firstOrNull ??
          fresh.firstOrNull?.id;
    });
  }

  /// Opens voice capture on this form's data + submit path. A saved or
  /// queued voice intent pops this page too with the same CaptureResult,
  /// so the shell's post-save reload/snack run identically.
  Future<void> _openVoice(BuildContext context) async {
    final result = await Navigator.of(context).push<CaptureResult>(
      MaterialPageRoute(
        builder: (_) => VoiceCapturePage(
          accounts: _accounts,
          categories: widget.categories,
          onSubmit: widget.onSubmit,
        ),
      ),
    );
    if (result != null && mounted && context.mounted) {
      Navigator.of(context).pop(result);
    }
  }

  /// Runs the host's create seam; a thrown refresh read lands as the
  /// honest inline error rather than an unhandled snackbar-less crash.
  Future<List<AccountSummary>?> _runCreateAccount() async {
    try {
      return await widget.onCreateAccount!();
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Không tải được tài khoản — thử lại');
      }
      return null;
    }
  }

  /// One editable split line: category picker + amount (+ remove while
  /// more than the 2-line minimum remain).
  Widget _splitRowTile(int index, _SplitRow row) {
    final name = widget.categories
        .where((c) => c.id == row.categoryId)
        .map((c) => c.name)
        .firstOrNull;
    return Padding(
      key: ObjectKey(row),
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 5,
            child: InkWell(
              key: ValueKey('split-cat-$index'),
              onTap: () => _pickSplitCategory(row),
              borderRadius: BorderRadius.circular(4),
              child: InputDecorator(
                decoration: InputDecoration(
                  labelText: 'Danh mục ${index + 1}',
                  border: const OutlineInputBorder(),
                ),
                child: Text(name ?? 'Chọn', overflow: TextOverflow.ellipsis),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            flex: 4,
            child: TextField(
              key: ValueKey('split-amt-$index'),
              controller: row.amount,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                labelText: 'Số tiền',
                border: OutlineInputBorder(),
              ),
            ),
          ),
          if (_splitRows.length > 2)
            IconButton(
              tooltip: 'Bỏ dòng',
              icon: const Icon(Icons.close),
              onPressed: () => setState(() {
                _splitRows.remove(row);
                // Disposed with the page — the unmounting field may still
                // reference this controller for the current frame.
                _retiredSplitRows.add(row);
              }),
            ),
        ],
      ),
    );
  }

  /// Which kind segments the user may pick. Create mode offers all
  /// three; editing locks to the update-RPC contract — a transfer can
  /// never change kind, and a normal transaction can't become one.
  List<ButtonSegment<TransactionKind>> get _kindSegments {
    if (widget.editing != null) {
      if (widget.editing!.kind == TransactionKind.transfer) {
        return const [
          ButtonSegment(
            value: TransactionKind.transfer,
            label: Text('Chuyển'),
            icon: Icon(Icons.swap_horiz),
          ),
        ];
      }
      return const [
        ButtonSegment(
          value: TransactionKind.expense,
          label: Text('Chi'),
          icon: Icon(Icons.north_east),
        ),
        ButtonSegment(
          value: TransactionKind.income,
          label: Text('Thu'),
          icon: Icon(Icons.south_west),
        ),
      ];
    }
    return const [
      ButtonSegment(
        value: TransactionKind.expense,
        label: Text('Chi'),
        icon: Icon(Icons.north_east),
      ),
      ButtonSegment(
        value: TransactionKind.income,
        label: Text('Thu'),
        icon: Icon(Icons.south_west),
      ),
      ButtonSegment(
        value: TransactionKind.transfer,
        label: Text('Chuyển'),
        icon: Icon(Icons.swap_horiz),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final isTransfer = _kind == TransactionKind.transfer;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.editing == null ? 'Ghi khoản' : 'Sửa khoản'),
        actions: [
          // "Nói để ghi" — same accounts/categories/submit as this form; a
          // voice save pops back out with its CaptureResult so the shell
          // reloads exactly like a manual save. Hidden while editing: an
          // update-in-flight row can't be voice-captured over.
          if (widget.editing == null)
            IconButton(
              icon: const Icon(Icons.mic),
              tooltip: 'Nói để ghi',
              onPressed: () => _openVoice(context),
            ),
          // D7 "Lưu làm mẫu nhanh" — snapshots the current fields into a
          // one-tap chip template; never submits the transaction. Hidden
          // for transfers (a chip can't carry two accounts) and where no
          // scope was wired (demo/read-only).
          if (widget.quickFillScope != null &&
              _kind != TransactionKind.transfer)
            IconButton(
              icon: const Icon(Icons.bookmark_add_outlined),
              tooltip: 'Lưu làm mẫu nhanh',
              onPressed: _busy ? null : _saveQuickFill,
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (widget.prefill != null) ...[
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: const ListTile(
                dense: true,
                leading: Icon(Icons.share),
                title: Text('Điền sẵn từ nội dung chia sẻ'),
                subtitle: Text('Kiểm tra lại trước khi lưu'),
              ),
            ),
            const SizedBox(height: 12),
          ],
          if (_restoredDraft) ...[
            Card(
              color: Theme.of(context).colorScheme.secondaryContainer,
              child: ListTile(
                dense: true,
                leading: const Icon(Icons.restore),
                title: const Text('Đã khôi phục bản nháp chưa lưu'),
                // "Xóa" clears the stored slot AND the fields — the
                // draft would otherwise re-save on the next keystroke.
                trailing: TextButton(
                  onPressed: _discardDraft,
                  child: const Text('Xóa'),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
          // "Gõ nhanh" sits first so a typed sentence prefills the form
          // below; edit mode keeps the loaded row authoritative instead.
          if (widget.editing == null) ...[
            TextField(
              key: const ValueKey('quick-field'),
              controller: _quick,
              onChanged: _onQuickChanged,
              decoration: const InputDecoration(
                labelText: 'Gõ nhanh',
                hintText: 'vd: ăn trưa 45k, nhận lương 5tr',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.bolt),
              ),
            ),
            if (_quickDraft != null) _quickSuggestion(_quickDraft!),
            // D7 chip row — one tap prefills kind/amount/category/payee/
            // note/account; the user still reviews and saves explicitly.
            if (_usableQuickFills.isNotEmpty) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final f in _usableQuickFills)
                    InputChip(
                      label: Text(_quickFillLabel(f)),
                      onPressed: _busy ? null : () => _applyQuickFill(f),
                      onDeleted: () => _deleteQuickFill(f),
                      deleteButtonTooltipMessage: 'Xóa mẫu nhanh',
                    ),
                ],
              ),
            ],
            const SizedBox(height: 12),
          ],
          SegmentedButton<TransactionKind>(
            segments: _kindSegments,
            selected: {_kind},
            onSelectionChanged: widget.editing?.kind == TransactionKind.transfer
                ? null // a transfer can never change kind (RPC-locked)
                : (s) => setState(() {
                    _kind = s.first;
                    _categoryId = null;
                    // Only expenses can be split across categories.
                    if (_kind != TransactionKind.expense) _split = false;
                    // A refund is income-kind money back — the flag
                    // cannot survive a switch away from Thu.
                    if (_kind != TransactionKind.income) _isRefund = false;
                  }),
          ),
          const SizedBox(height: 16),
          if (_split)
            Card(
              child: ListTile(
                title: const Text('Tổng số tiền'),
                // Long figures at 2x text scale must shrink, not clip
                // the "Tổng số tiền" label or overflow the tile.
                trailing: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    formatMoney(_splitRunningTotal),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ),
            )
          else ...[
            TextField(
              controller: _amount,
              keyboardType: TextInputType.text,
              decoration: const InputDecoration(
                labelText: 'Số tiền',
                hintText: 'vd: 50k, 2tr, 150.000',
                suffixText: '₫',
                border: OutlineInputBorder(),
              ),
            ),
            // Live parsed figure so "45k" is confirmed as 45.000 ₫ before save.
            ListenableBuilder(
              listenable: _amount,
              builder: (context, _) {
                final parsed = parseMoneyInput(_amount.text);
                if (parsed == null || parsed <= 0) {
                  return const SizedBox.shrink();
                }
                return Align(
                  alignment: Alignment.centerLeft,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      formatMoney(parsed),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: context.mf.textMuted,
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
            // Quick-amount chips — one tap beats six digits for common sizes.
            Wrap(
              spacing: 8,
              children: [
                for (final q in _quickAmounts)
                  ActionChip(
                    label: Text(q.label),
                    onPressed: () =>
                        setState(() => _amount.text = q.value.toString()),
                  ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          // Zero accounts makes the picker a dead end — Ghi needs a
          // wallet, so say so and offer the create flow when the host
          // provides it instead of an empty dropdown.
          if (_accounts.isEmpty)
            EmptyStateCard(
              icon: Icons.account_balance_wallet_outlined,
              title: 'Chưa có ví — tạo ví trước khi ghi',
              message: 'Khoản ghi cần gắn vào một ví hoặc tài khoản.',
              actionLabel: widget.onCreateAccount == null ? null : 'Tạo ví',
              onAction: widget.onCreateAccount == null
                  ? null
                  : (_busy ? null : _createAccount),
            )
          else
            DropdownButtonFormField<String>(
              // initialValue is non-reactive: the key recreates the field
              // when the remembered-account prefill lands asynchronously.
              key: ValueKey('acc-$_accountId'),
              initialValue: _accountId,
              decoration: InputDecoration(
                labelText: isTransfer ? 'Từ tài khoản' : 'Tài khoản',
                border: const OutlineInputBorder(),
              ),
              items: [
                for (final a in _accounts)
                  DropdownMenuItem(value: a.id, child: Text(a.name)),
              ],
              onChanged: (v) => setState(() => _accountId = v),
            ),
          if (isTransfer && _accounts.isNotEmpty) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _destAccountId,
              decoration: const InputDecoration(
                labelText: 'Đến tài khoản',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final a in _accounts)
                  DropdownMenuItem(value: a.id, child: Text(a.name)),
              ],
              onChanged: (v) => setState(() => _destAccountId = v),
            ),
            const SizedBox(height: 8),
            Text(
              'Chuyển nội bộ — không tính vào thu/chi',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: context.mf.textMuted),
            ),
          ] else if (_split) ...[
            const SizedBox(height: 12),
            for (var i = 0; i < _splitRows.length; i++)
              _splitRowTile(i, _splitRows[i]),
            if (_splitRows.length < maxSplitLines)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: () =>
                      setState(() => _splitRows.add(_newSplitRow())),
                  icon: const Icon(Icons.add),
                  label: const Text('Thêm dòng'),
                ),
              ),
          ] else ...[
            const SizedBox(height: 12),
            // D15 "Hoàn tiền" — only for Thu: the switch flips the
            // category pool to expense categories (the netting target)
            // and the subtitle states the honest contract — the row
            // stays in the ledger as money-in, reports net it against
            // that category's spend instead of counting it as income.
            if (_kind == TransactionKind.income)
              SwitchListTile(
                value: _isRefund,
                contentPadding: EdgeInsets.zero,
                title: const Text('Hoàn tiền'),
                subtitle: const Text(
                  'Tiền được trả lại — trừ vào danh mục chi đã chọn, '
                  'không tính vào Thu.',
                ),
                onChanged: _busy
                    ? null
                    : (v) => setState(() {
                        _isRefund = v;
                        // The flag flips the category pool — a pick of
                        // the other kind cannot survive the change.
                        if (_categoryId != null &&
                            !widget.categories.any(
                              (c) =>
                                  c.id == _categoryId &&
                                  c.kind == _categoryKind,
                            )) {
                          _categoryId = null;
                        }
                      }),
              ),
            // "Mục hay dùng" — most-used categories inline, no picker trip.
            if (_frequentCategories.isNotEmpty) ...[
              Text(
                'Mục hay dùng',
                style: Theme.of(context).textTheme.labelLarge,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: [
                  for (final c in _frequentCategories)
                    ChoiceChip(
                      label: Text(c.name),
                      selected: _categoryId == c.id,
                      onSelected: (_) => setState(() => _categoryId = c.id),
                    ),
                ],
              ),
              const SizedBox(height: 8),
            ],
            // Category opens a searchable sheet — the selected name shows
            // on an input-styled row so the form reads like the old field.
            InkWell(
              onTap: _pickCategory,
              borderRadius: BorderRadius.circular(4),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Danh mục',
                  border: OutlineInputBorder(),
                  suffixIcon: Icon(Icons.arrow_drop_down),
                ),
                child: Text(
                  _categoryId == null
                      ? 'Chọn'
                      : widget.categories
                                .where((c) => c.id == _categoryId)
                                .map((c) => c.name)
                                .firstOrNull ??
                            '',
                  style: _categoryId == null
                      ? TextStyle(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        )
                      : null,
                ),
              ),
            ),
          ],
          // Split is a create-only expense affordance (the update RPC
          // rejects split rows, and income/transfers have no categories).
          if (_kind == TransactionKind.expense && widget.editing == null)
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Chia theo nhiều danh mục'),
              subtitle: const Text('Một khoản chi, nhiều dòng danh mục'),
              value: _split,
              onChanged: _setSplit,
            ),
          const SizedBox(height: 12),
          TextField(
            controller: _note,
            decoration: const InputDecoration(
              labelText: 'Ghi chú',
              border: OutlineInputBorder(),
            ),
          ),
          if (!isTransfer) ...[
            const SizedBox(height: 12),
            TextField(
              controller: _payee,
              decoration: const InputDecoration(
                labelText: 'Nơi chi / Nguồn thu (tùy chọn)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today),
            label: Text('Ngày: ${_fmtDate(_date)}'),
          ),
          // Money Manager's inline "Lặp lại" — a monthly commitment for
          // new expense/income captures only. Transfers can't recur (no
          // category), and an edit can't silently spawn a commitment.
          if (!isTransfer && !_split && widget.editing == null)
            CheckboxListTile(
              value: _repeatMonthly,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('Lặp lại hàng tháng'),
              subtitle: Text('Tạo cam kết vào ngày ${_date.day} hằng tháng'),
              onChanged: (v) => setState(() => _repeatMonthly = v ?? false),
            ),
          // Monarch's edit→rule offer: one explicit tick turns this
          // correction into an inbox rule for future pending candidates.
          // Edit mode only — a fresh capture hasn't proven a pattern yet.
          if (!isTransfer &&
              !_split &&
              widget.editing != null &&
              widget.onSaveRule != null)
            CheckboxListTile(
              value: _saveAsRule,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text('Lưu thành quy tắc tự điền'),
              subtitle: const Text(
                'Các mục chờ có nơi giao dịch chứa tên này sẽ tự điền '
                'danh mục đã chọn — vẫn cần duyệt, không tự ghi sổ.',
              ),
              onChanged: _busy
                  ? null
                  : (v) => setState(() => _saveAsRule = v ?? false),
            ),
          // D13 "Loại khỏi báo cáo" — edit mode only (a new row is saved
          // as-is; flagging can come on the first edit) and never for
          // transfers, which report math never counts anyway. The
          // subtitle states the honest contract: ledger balance and
          // budgets are untouched.
          if (!isTransfer && widget.editing != null)
            SwitchListTile(
              value: _excludedFromReports,
              contentPadding: EdgeInsets.zero,
              title: const Text('Loại khỏi báo cáo'),
              subtitle: const Text(
                'Không tính vào báo cáo — số dư tài khoản và ngân sách '
                'vẫn giữ nguyên.',
              ),
              onChanged: _busy
                  ? null
                  : (v) => setState(() => _excludedFromReports = v),
            ),
          const SizedBox(height: 8),
          if (_error != null) ...[
            Text(
              _error!,
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
            const SizedBox(height: 8),
          ],
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? 'Đang lưu…' : 'Lưu'),
          ),
        ],
      ),
    );
  }
}
