// "Cần xem" — the mobile review queue for imported/shared/pasted data.
//
// Product law this surface serves: a pasted SMS or import row is NEVER a
// ledger entry. It lands as a pending inbox_candidates row, a human reviews
// it here, and only `approve_inbox_candidate` writes the transaction.
// Reject is a status update, not a delete — the audit trail survives.

import 'package:flutter/material.dart';

import '../../data/csv_file_source.dart';
import '../../data/share/inbox_paste_parser.dart';
import '../../domain/csv_import.dart';
import '../../domain/inbox.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../capture/category_picker.dart';
import '../shared/empty_state.dart';
import 'csv_import_sheet.dart';

/// The pending review queue. Page pops `true` when anything changed so the
/// shell can reload dashboard balances and the activity feed.
class InboxPage extends StatefulWidget {
  const InboxPage({
    super.key,
    required this.loadCandidates,
    required this.loadAccounts,
    required this.loadCategories,
    required this.onPlan,
    required this.onApprove,
    required this.onReject,
    this.pickCsvFile,
    this.onImportCsv,
    this.onOpenRules,
    this.onSaveRule,
  });

  final Future<List<InboxCandidate>> Function() loadCandidates;
  final Future<List<AccountSummary>> Function() loadAccounts;
  final Future<List<Category>> Function() loadCategories;

  /// Entry point to the "Quy tắc" manager — rules are what prefill this
  /// queue's candidates, so the shortcut lives on this appbar. Null hides
  /// it (surfaces without a rules store wired).
  final VoidCallback? onOpenRules;

  /// Rule-write seam (Monarch's rule-from-approve): after an approval the
  /// queue offers "Luôn áp dụng cho …" for the reviewed merchant, and a
  /// tap saves a merchant→category rule through this — `saveInboxRule` on
  /// the real store, `DemoRuleStore.save` in demo. Null disables the offer.
  final Future<void> Function(InboxRuleDraft draft)? onSaveRule;

  /// Advisory server dry-run; a failure must not block review because the
  /// approve RPC re-runs the same checks atomically.
  final Future<InboxPlan?> Function(String candidateId) onPlan;
  final Future<void> Function(InboxApproval approval) onApprove;
  final Future<void> Function(String candidateId) onReject;

  /// Candidate-write seams — the "Nhập CSV/Excel" entry needs both, the
  /// "Dán tin nhắn" flow only needs [onImportCsv]: the hosted backend
  /// accepts table writes solely through SECURITY DEFINER RPCs, so
  /// pasted lines
  /// ride the same prepare RPC a CSV batch does (direct inserts fail
  /// 42501). The shell only wires them on the authenticated store, so
  /// demo mode never shows either affordance.
  final CsvFilePicker? pickCsvFile;
  final Future<CsvImportResult> Function(CsvImportBatch batch)? onImportCsv;

  @override
  State<InboxPage> createState() => InboxPageState();
}

typedef _InboxData = ({
  List<InboxCandidate> candidates,
  List<AccountSummary> accounts,
  List<Category> categories,
});

class InboxPageState extends State<InboxPage> {
  late Future<_InboxData> _data;

  /// Sticky "the queue or the ledger changed" flag — delivered to the shell
  /// when the page pops so it reloads balances/feed exactly once, the same
  /// convention TrashPage uses for restores.
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  /// Candidates plus the pickers the review sheet needs — one load pass so a
  /// network failure shows one honest error instead of a half-ready form.
  Future<_InboxData> _load() async {
    final rows = await Future.wait([
      widget.loadCandidates(),
      widget.loadAccounts(),
      widget.loadCategories(),
    ]);
    return (
      candidates: rows[0] as List<InboxCandidate>,
      accounts: rows[1] as List<AccountSummary>,
      categories: rows[2] as List<Category>,
    );
  }

  /// Public reload so the host (and pull-to-refresh) can re-read the queue.
  void reload() => _refresh();

  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _data = next;
    });
    try {
      await next;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
  }

  /// Dismiss = server-side status flip to `rejected`, matching the web's
  /// updateInboxCandidateAction — never a hard delete. The row only leaves
  /// the list after the write succeeds; a failure keeps it visible.
  Future<void> _reject(InboxCandidate c) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Từ chối mục này?'),
        content: Text(
          '"${c.merchant}" · ${formatMoney(c.amountMinor)} sẽ được đánh dấu '
          'từ chối và rời khỏi hàng chờ — bản ghi không bị xóa.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    try {
      await widget.onReject(c.id);
      _changed = true;
      if (mounted) {
        final next = _data.then(
          (d) => (
            candidates: [
              for (final x in d.candidates)
                if (x.id != c.id) x,
            ],
            accounts: d.accounts,
            categories: d.categories,
          ),
        );
        setState(() {
          _data = next;
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Đã từ chối mục')));
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không từ chối được — kiểm tra mạng rồi thử lại.'),
          ),
        );
      }
    }
  }

  Future<void> _review(_InboxData data, InboxCandidate c) async {
    final result = await Navigator.of(context).push<_ReviewResult>(
      MaterialPageRoute(
        builder: (_) => _ReviewPage(
          candidate: c,
          accounts: data.accounts,
          categories: data.categories,
          onPlan: widget.onPlan,
          onApprove: widget.onApprove,
          onReject: widget.onReject,
        ),
      ),
    );
    // Any approve/reject inside review mutates the queue AND possibly the
    // ledger — reload the list; the shell hears about it via the pop flag.
    // A null result is a plain back-navigation: nothing changed.
    if (result != null) {
      _changed = true;
      _refresh();
      final approval = result.approval;
      if (approval != null) _offerRule(approval);
    }
  }

  /// Rule-from-approve (the Monarch pattern): after a successful approve,
  /// offer "Luôn áp dụng cho …" for the reviewed payee as a snackbar
  /// action. Transfers carry neither payee nor category and a blank
  /// reviewed payee has no stable text to match — neither shows the offer.
  void _offerRule(InboxApproval approval) {
    final save = widget.onSaveRule;
    if (save == null || approval.kind == TransactionKind.transfer) return;
    final merchant = approval.payee.trim();
    final categoryId = approval.categoryId;
    if (merchant.isEmpty || categoryId == null || categoryId.isEmpty) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã duyệt. Luôn áp dụng cho "$merchant"?'),
        action: SnackBarAction(
          label: 'Tạo quy tắc',
          onPressed: () => _saveRule(merchant, categoryId),
        ),
      ),
    );
  }

  /// Saves the merchant→category rule the review just used; the result is
  /// reported honestly — the write is a separate call AFTER the approve,
  /// so its failure can never pretend the approval failed (it didn't).
  Future<void> _saveRule(String merchant, String categoryId) async {
    try {
      await widget.onSaveRule!((
        id: null,
        expectedVersion: null,
        matchField: RuleMatchField.merchant,
        containsText: merchant,
        categoryId: categoryId,
        merchantName: null,
        enabled: true,
      ));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Đã lưu quy tắc cho "$merchant"')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(inboxRuleErrorMessage(e))));
      }
    }
  }

  /// "Dán tin nhắn" — pasted lines become pending candidates through the
  /// same prepare RPC the CSV sheet calls; the sheet returns the real
  /// server result so the snackbar reports the created count honestly.
  Future<void> _openPaste() async {
    final onImport = widget.onImportCsv;
    if (onImport == null) return;
    _InboxData data;
    try {
      data = await _data;
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không tải được dữ liệu — thử lại khi có mạng'),
          ),
        );
      }
      return;
    }
    if (!mounted) return;
    final result = await showModalBottomSheet<CsvImportResult>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _PasteSheet(
        accounts: data.accounts,
        categories: data.categories,
        onImport: onImport,
      ),
    );
    if (result != null) {
      _changed = true;
      _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã tạo ${result.candidateCount} mục chờ duyệt'),
          ),
        );
      }
    }
  }

  bool get _csvImportEnabled =>
      widget.pickCsvFile != null && widget.onImportCsv != null;

  /// Paste needs only the write seam — no file picker.
  bool get _pasteEnabled => widget.onImportCsv != null;

  /// "Nhập CSV/Excel" — a picked bank statement becomes pending
  /// candidates via the shared prepare RPC; the sheet returns the server
  /// result so the snackbar reports the real created count, and the
  /// queue reloads. Nothing posts to the ledger here or inside the sheet.
  Future<void> _openCsvImport() async {
    final pickFile = widget.pickCsvFile;
    final onImport = widget.onImportCsv;
    if (pickFile == null || onImport == null) return;
    _InboxData data;
    try {
      data = await _data;
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không tải được dữ liệu — thử lại khi có mạng'),
          ),
        );
      }
      return;
    }
    if (!mounted) return;
    final result = await showCsvImportSheet(
      context,
      accounts: data.accounts,
      categories: data.categories,
      pickFile: pickFile,
      onImport: onImport,
    );
    if (result != null) {
      _changed = true;
      _refresh();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã tạo ${result.candidateCount} mục chờ duyệt'),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Cần xem'),
          actions: [
            if (widget.onOpenRules != null)
              IconButton(
                tooltip: 'Quy tắc',
                icon: const Icon(Icons.rule_outlined),
                onPressed: widget.onOpenRules,
              ),
            if (_csvImportEnabled)
              IconButton(
                tooltip: 'Nhập CSV/Excel',
                icon: const Icon(Icons.upload_file_outlined),
                onPressed: _openCsvImport,
              ),
            if (_pasteEnabled)
              IconButton(
                tooltip: 'Dán tin nhắn',
                icon: const Icon(Icons.content_paste),
                onPressed: _openPaste,
              ),
            const SizedBox(width: 8),
          ],
        ),
        body: FutureBuilder<_InboxData>(
          future: _data,
          builder: (context, snap) {
            if (snap.hasError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được dữ liệu'),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'Kiểm tra kết nối mạng rồi thử lại.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _refresh,
                      child: const Text('Thử lại'),
                    ),
                  ],
                ),
              );
            }
            if (!snap.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final data = snap.data!;
            if (data.candidates.isEmpty) {
              return RefreshIndicator(
                onRefresh: _refresh,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  children: [
                    const EmptyStateCard(
                      icon: Icons.inbox_outlined,
                      title: 'Không có mục nào chờ duyệt',
                      message:
                          'Dán tin nhắn ngân hàng hoặc nhập file '
                          'CSV/Excel để tạo mục chờ duyệt — chưa có gì '
                          'ghi vào sổ.',
                    ),
                    const SizedBox(height: 12),
                    if (_pasteEnabled)
                      FilledButton.tonalIcon(
                        onPressed: _openPaste,
                        icon: const Icon(Icons.content_paste),
                        label: const Text('Dán tin nhắn'),
                      ),
                    if (_csvImportEnabled) ...[
                      const SizedBox(height: 8),
                      FilledButton.tonalIcon(
                        onPressed: _openCsvImport,
                        icon: const Icon(Icons.upload_file_outlined),
                        label: const Text('Nhập file CSV/Excel'),
                      ),
                    ],
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: data.candidates.length,
                itemBuilder: (context, i) => _CandidateCard(
                  candidate: data.candidates[i],
                  onReject: () => _reject(data.candidates[i]),
                  onReview: () => _review(data, data.candidates[i]),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

/// What the review page pops: [approval] null is a reject (queue changed,
/// no payload), non-null is an approve carrying the exact values that
/// landed — the rule offer needs the reviewed payee/category, not the
/// candidate's raw suggestion.
class _ReviewResult {
  const _ReviewResult.rejected() : approval = null;
  const _ReviewResult.approved(this.approval);
  final InboxApproval? approval;
}

/// dd/MM/yyyy — the row reads in the Vietnamese convention even though the
/// stored contract is YYYY-MM-DD.
String _displayDate(String occurredOn) {
  final p = occurredOn.split('-');
  if (p.length != 3) return occurredOn;
  return '${p[2]}/${p[1]}/${p[0]}';
}

class _CandidateCard extends StatelessWidget {
  const _CandidateCard({
    required this.candidate,
    required this.onReject,
    required this.onReview,
  });

  final InboxCandidate candidate;
  final VoidCallback onReject;
  final VoidCallback onReview;

  @override
  Widget build(BuildContext context) {
    final c = candidate;
    final text = Theme.of(context).textTheme;
    final flags = <String>[
      if (c.possibleDuplicate) 'Có thể trùng',
      if (c.possibleTransfer) 'Có thể là chuyển khoản',
    ];
    final suggestions = [
      if (c.accountName != null && c.accountName!.isNotEmpty)
        'TK: ${c.accountName}',
      if (c.categoryName != null && c.categoryName!.isNotEmpty) c.categoryName!,
    ];
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    c.merchant,
                    style: text.titleMedium,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  formatMoney(c.amountMinor),
                  style: text.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${inboxKindLabel(c.kind)} · ${_displayDate(c.occurredOn)} · '
              '${inboxSourceLabel(c.source)} · '
              '${inboxConfidenceLabel(c.confidence)}',
              style: text.bodySmall,
            ),
            if (suggestions.isNotEmpty || flags.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                [...flags, ...suggestions].join(' · '),
                style: text.bodySmall?.copyWith(
                  color: flags.isNotEmpty
                      ? Theme.of(context).colorScheme.error
                      : null,
                ),
              ),
            ],
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(onPressed: onReject, child: const Text('Từ chối')),
                const SizedBox(width: 8),
                FilledButton.tonal(
                  onPressed: onReview,
                  child: const Text('Duyệt'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// "Sửa trước khi duyệt" — the same levers the web's review panel exposes
/// (amount, payee, note, date, account, category / destination, kind and
/// the explicit duplicate override), all funneled into one
/// `approve_inbox_candidate` call.
class _ReviewPage extends StatefulWidget {
  const _ReviewPage({
    required this.candidate,
    required this.accounts,
    required this.categories,
    required this.onPlan,
    required this.onApprove,
    required this.onReject,
  });

  final InboxCandidate candidate;
  final List<AccountSummary> accounts;
  final List<Category> categories;
  final Future<InboxPlan?> Function(String) onPlan;
  final Future<void> Function(InboxApproval) onApprove;
  final Future<void> Function(String) onReject;

  @override
  State<_ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<_ReviewPage> {
  late TransactionKind _kind = widget.candidate.kind;
  late final TextEditingController _amount = TextEditingController(
    text: widget.candidate.amountMinor.toString(),
  );
  late final TextEditingController _payee = TextEditingController(
    text: widget.candidate.merchant == 'Không rõ'
        ? ''
        : widget.candidate.merchant,
  );
  late final TextEditingController _note = TextEditingController(
    text: widget.candidate.note,
  );
  late DateTime _date = DateTime.parse(widget.candidate.occurredOn);
  late String? _accountId = resolveInboxAccountId(
    widget.candidate,
    widget.accounts,
  );
  String? _destinationAccountId;
  late String? _categoryId = resolveInboxCategoryId(
    widget.candidate,
    widget.categories,
  );
  bool _allowDuplicate = false;
  bool _busy = false;
  String? _error;

  /// Last resolved dry-run — a hard-blocking verdict disables the approve
  /// button (same posture as the web's not-approvable state); a missing or
  /// failed plan never blocks, the server re-checks atomically on approve.
  InboxPlan? _plan;
  late Future<InboxPlan?> _planFuture = _runPlan();

  Future<InboxPlan?> _runPlan() {
    final f = widget.onPlan(widget.candidate.id);
    f
        .then((p) {
          if (mounted) setState(() => _plan = p);
        })
        .catchError((_) {});
    return f;
  }

  /// The candidate may be a pasted expense that is really an internal
  /// transfer — kind switching is allowed, but the category/dropdown pools
  /// follow the selected kind so an invalid pair can never be sent.
  void _setKind(Set<TransactionKind> kinds) {
    setState(() {
      _kind = kinds.first;
      _categoryId = null;
      _error = null;
    });
  }

  List<Category> get _kindCategories => [
    for (final c in widget.categories)
      if (!c.isArchived &&
          c.kind ==
              (_kind == TransactionKind.income
                  ? TransactionKind.income
                  : TransactionKind.expense))
        c,
  ];

  String _ymd(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _pickCategory() async {
    final picked = await showCategoryPicker(
      context,
      categories: _kindCategories,
      selectedId: _categoryId,
    );
    if (picked != null) setState(() => _categoryId = picked.id);
  }

  /// Validate, then one RPC — the idempotency key is the candidate id, so a
  /// tapped-twice or retried approve can never double-post.
  Future<void> _approve() async {
    final amount = parseMoneyInput(_amount.text);
    if (amount == null || amount <= 0) {
      setState(() => _error = 'Nhập số tiền hợp lệ (đồng nguyên).');
      return;
    }
    if (_accountId == null) {
      setState(() => _error = 'Hãy chọn tài khoản.');
      return;
    }
    final isTransfer = _kind == TransactionKind.transfer;
    if (isTransfer) {
      if (_destinationAccountId == null) {
        setState(() => _error = 'Hãy chọn tài khoản đến.');
        return;
      }
      if (_destinationAccountId == _accountId) {
        setState(() => _error = 'Hai tài khoản chuyển phải khác nhau.');
        return;
      }
    } else if (_categoryId == null) {
      setState(() => _error = 'Hãy chọn danh mục.');
      return;
    }
    // The server's dry-run already said this must not create a new row.
    if (inboxPlanBlocksApproval(_plan)) {
      setState(() => _error = inboxPlanMessage(_plan!));
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    final approval = InboxApproval(
      candidateId: widget.candidate.id,
      kind: _kind,
      accountId: _accountId!,
      categoryId: isTransfer ? null : _categoryId,
      destinationAccountId: isTransfer ? _destinationAccountId : null,
      amountMinor: amount,
      occurredOn: _ymd(_date),
      note: _note.text.trim(),
      payee: _payee.text.trim(),
      allowHeuristicDuplicate: _allowDuplicate,
    );
    try {
      await widget.onApprove(approval);
      if (mounted) {
        Navigator.of(context).pop(_ReviewResult.approved(approval));
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = inboxApprovalErrorMessage(e);
        });
      }
    }
  }

  Future<void> _reject() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Từ chối mục này?'),
        content: const Text(
          'Mục sẽ được đánh dấu từ chối và rời khỏi hàng chờ — '
          'bản ghi không bị xóa.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _busy = true);
    try {
      await widget.onReject(widget.candidate.id);
      if (mounted) {
        Navigator.of(context).pop(const _ReviewResult.rejected());
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = 'Không từ chối được — kiểm tra mạng rồi thử lại.';
        });
      }
    }
  }

  Widget _planBanner(BuildContext context) {
    final theme = Theme.of(context);
    return FutureBuilder<InboxPlan?>(
      future: _planFuture,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Padding(
            padding: EdgeInsets.only(bottom: 12),
            child: LinearProgressIndicator(),
          );
        }
        final plan = snap.data;
        if (snap.hasError || plan == null) {
          return Card(
            child: ListTile(
              dense: true,
              leading: const Icon(Icons.sync_problem),
              title: const Text('Chưa kiểm tra được trùng lặp'),
              subtitle: const Text('Máy chủ sẽ kiểm tra lại khi bạn duyệt.'),
              trailing: IconButton(
                tooltip: 'Kiểm tra lại',
                icon: const Icon(Icons.refresh),
                onPressed: () => setState(() {
                  _plan = null;
                  _planFuture = _runPlan();
                }),
              ),
            ),
          );
        }
        final blocked = inboxPlanBlocksApproval(plan);
        final duplicates = plan.status == 'duplicate';
        return Card(
          color: blocked || (duplicates && !_allowDuplicate)
              ? theme.colorScheme.errorContainer
              : duplicates || plan.status == 'suspected_transfer'
              ? theme.colorScheme.secondaryContainer
              : null,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      blocked
                          ? Icons.block
                          : duplicates || plan.status == 'suspected_transfer'
                          ? Icons.content_copy
                          : Icons.check_circle_outline,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(inboxPlanMessage(plan))),
                  ],
                ),
                if (duplicates && !blocked)
                  CheckboxListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    controlAffinity: ListTileControlAffinity.leading,
                    title: const Text('Vẫn tạo giao dịch mới'),
                    value: _allowDuplicate,
                    onChanged: (v) =>
                        setState(() => _allowDuplicate = v ?? false),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  void dispose() {
    _amount.dispose();
    _payee.dispose();
    _note.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isTransfer = _kind == TransactionKind.transfer;
    final c = widget.candidate;
    return Scaffold(
      appBar: AppBar(title: const Text('Duyệt mục')),
      // Primary action pinned to the bottom bar — always reachable on a
      // small screen, one primary action per viewport.
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_error != null) ...[
                Text(
                  _error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 8),
              ],
              FilledButton.icon(
                onPressed: _busy || inboxPlanBlocksApproval(_plan)
                    ? null
                    : _approve,
                icon: _busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.check),
                label: const Text('Duyệt vào sổ'),
              ),
              TextButton(
                onPressed: _busy ? null : _reject,
                child: const Text('Từ chối mục này'),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (c.rawSnippet != null && c.rawSnippet!.isNotEmpty)
            Card(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: ListTile(
                dense: true,
                leading: const Icon(Icons.message_outlined),
                title: Text(
                  c.rawSnippet!,
                  style: const TextStyle(fontSize: 13),
                ),
              ),
            ),
          const SizedBox(height: 8),
          _planBanner(context),
          const SizedBox(height: 8),
          SegmentedButton<TransactionKind>(
            segments: const [
              ButtonSegment(
                value: TransactionKind.expense,
                label: Text('Chi'),
                icon: Icon(Icons.remove),
              ),
              ButtonSegment(
                value: TransactionKind.income,
                label: Text('Thu'),
                icon: Icon(Icons.add),
              ),
              ButtonSegment(
                value: TransactionKind.transfer,
                label: Text('Chuyển'),
                icon: Icon(Icons.swap_horiz),
              ),
            ],
            selected: {_kind},
            onSelectionChanged: _setKind,
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _amount,
            keyboardType: TextInputType.text,
            decoration: const InputDecoration(
              labelText: 'Số tiền',
              hintText: 'vd: 50k, 2tr, 150.000',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          if (!isTransfer)
            TextField(
              controller: _payee,
              decoration: const InputDecoration(
                labelText: 'Nơi chi / người nhận',
                border: OutlineInputBorder(),
              ),
            ),
          if (!isTransfer) const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            key: ValueKey('acc-$_accountId'),
            initialValue: _accountId,
            decoration: InputDecoration(
              labelText: isTransfer ? 'Từ tài khoản' : 'Tài khoản',
              border: const OutlineInputBorder(),
            ),
            items: [
              for (final a in widget.accounts)
                DropdownMenuItem(value: a.id, child: Text(a.name)),
            ],
            onChanged: (v) => setState(() => _accountId = v),
          ),
          const SizedBox(height: 12),
          if (isTransfer)
            DropdownButtonFormField<String>(
              key: ValueKey('dest-$_destinationAccountId'),
              initialValue: _destinationAccountId,
              decoration: const InputDecoration(
                labelText: 'Đến tài khoản',
                border: OutlineInputBorder(),
              ),
              items: [
                for (final a in widget.accounts)
                  DropdownMenuItem(value: a.id, child: Text(a.name)),
              ],
              onChanged: (v) => setState(() => _destinationAccountId = v),
            )
          else
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
                      : _kindCategories
                                .where((x) => x.id == _categoryId)
                                .map((x) => x.name)
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
          const SizedBox(height: 12),
          TextField(
            controller: _note,
            decoration: const InputDecoration(
              labelText: 'Ghi chú',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today, size: 18),
            label: Text('Ngày ${_displayDate(_ymd(_date))}'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

/// "Dán tin nhắn" — parses pasted bank/SMS text into pending candidates.
///
/// Upstream reality this sheet encodes: the hosted backend refuses direct
/// table writes (42501), so pasted lines go through the SAME SECURITY
/// DEFINER prepare RPC a CSV batch uses. That contract requires a real
/// account and a per-kind category on every candidate — fields a pasted
/// line cannot carry — so after "Phân tích" the sheet collects the same
/// defaults the CSV sheet asks for (same widgets, same replan). The RPC
/// also rejects `transfer` kind, so transfer-hinted lines are reported as
/// skipped exactly like the CSV plan does.
/// Nothing commits until the preview's "Lưu" lands a successful call;
/// the ledger itself is never touched here.
class _PasteSheet extends StatefulWidget {
  const _PasteSheet({
    required this.accounts,
    required this.categories,
    required this.onImport,
  });

  final List<AccountSummary> accounts;
  final List<Category> categories;

  /// The prepare-RPC seam — the store's `prepareCsvImport`; the same call
  /// the CSV import uses because the payload contract is identical.
  final Future<CsvImportResult> Function(CsvImportBatch) onImport;

  @override
  State<_PasteSheet> createState() => _PasteSheetState();
}

class _PasteSheetState extends State<_PasteSheet> {
  final _text = TextEditingController();
  List<InboxPasteDraft>? _drafts;
  CsvImportPlan? _plan;
  String? _error;
  bool _busy = false;

  /// Non-empty input lines and how many produced no draft — the honest
  /// skipped accounting the batch reports upstream.
  int _lineCount = 0;
  int _unparseableLines = 0;

  /// Defaults mirror the CSV sheet's `accounts[0]` / first-of-kind
  /// category preselects — the RPC demands a concrete account and
  /// per-kind category, so the reviewer picks (or keeps) them here.
  late String _accountId = widget.accounts.firstOrNull?.id ?? '';
  late String _expenseCategoryId = _firstKind(TransactionKind.expense);
  late String _incomeCategoryId = _firstKind(TransactionKind.income);

  String _firstKind(TransactionKind kind) {
    for (final c in widget.categories) {
      if (c.kind == kind && !c.isArchived) return c.id;
    }
    return '';
  }

  List<Category> _kindCategories(TransactionKind kind) => [
    for (final c in widget.categories)
      if (!c.isArchived && c.kind == kind) c,
  ];

  void _replan() {
    final drafts = _drafts;
    if (drafts == null) {
      _plan = null;
      return;
    }
    _plan = planPasteImport(
      drafts,
      accountId: _accountId,
      expenseCategoryId: _expenseCategoryId,
      incomeCategoryId: _incomeCategoryId,
      accounts: widget.accounts,
      categories: widget.categories,
    );
  }

  void _analyze() {
    final raw = _text.text;
    if (raw.trim().isEmpty) {
      setState(() {
        _drafts = null;
        _plan = null;
        _error = 'Dán nội dung trước khi phân tích.';
      });
      return;
    }
    final lineCount = raw
        .split(RegExp(r'\r?\n'))
        .where((l) => l.trim().isNotEmpty)
        .length;
    final drafts = parseInboxPasteText(raw);
    setState(() {
      if (drafts.isEmpty) {
        _drafts = null;
        _plan = null;
        _error =
            'Không tìm thấy số tiền hợp lệ. Thử dạng "cafe 45k" '
            'hoặc "45.000 VND".';
      } else if (drafts.length > 500) {
        // Same bound the web action enforces per call.
        _drafts = null;
        _plan = null;
        _error = 'Quá nhiều mục trong một lần (tối đa 500).';
      } else {
        _drafts = drafts;
        _lineCount = lineCount;
        // The parser drops unparseable lines silently; a single-line
        // multi-amount fallback can emit more drafts than lines, so the
        // skip count is floored at 0 rather than allowed to go negative.
        _unparseableLines = lineCount > drafts.length
            ? lineCount - drafts.length
            : 0;
        _error = null;
        _replan();
      }
    });
  }

  /// Provenance carried in `file_name` — the RPC only bounds its length,
  /// so an honest "paste-…txt" name marks where the batch came from
  /// (the stored import_batches row keeps it verbatim).
  String _pasteFileName() {
    final now = DateTime.now();
    String two(int v) => v.toString().padLeft(2, '0');
    return 'paste-${now.year}${two(now.month)}${two(now.day)}-'
        '${two(now.hour)}${two(now.minute)}.txt';
  }

  Future<void> _pickCategory({
    required bool income,
    required String currentId,
    required ValueChanged<String> onPicked,
  }) async {
    final picked = await showCategoryPicker(
      context,
      categories: _kindCategories(
        income ? TransactionKind.income : TransactionKind.expense,
      ),
      selectedId: currentId.isEmpty ? null : currentId,
    );
    if (picked != null) onPicked(picked.id);
  }

  /// One RPC, one atomic batch — the server rejects the whole paste on
  /// any bad row, so the client never tracks partial progress.
  Future<void> _commit() async {
    final plan = _plan;
    if (_busy || plan == null || plan.ready.isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await widget.onImport(
        toPasteImportBatch(
          fileName: _pasteFileName(),
          lineCount: _lineCount,
          unparseableLines: _unparseableLines,
          plan: plan,
        ),
      );
      if (mounted) Navigator.of(context).pop(result);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = csvImportErrorMessage(e);
        });
      }
    }
  }

  Widget _categoryField({
    required String label,
    required String categoryId,
    required VoidCallback onTap,
  }) {
    final name = widget.categories
        .where((c) => c.id == categoryId)
        .map((c) => c.name)
        .firstOrNull;
    return InkWell(
      onTap: _busy ? null : onTap,
      borderRadius: BorderRadius.circular(4),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.arrow_drop_down),
        ),
        child: Text(
          name ?? 'Chọn',
          style: name == null
              ? TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)
              : null,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final drafts = _drafts;
    final plan = _plan;
    final needsReview = drafts == null
        ? 0
        : drafts
              .where(
                (d) => d.confidence == 'low' || d.uncertainFields.isNotEmpty,
              )
              .length;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        initialChildSize: 0.8,
        expand: false,
        builder: (context, scroll) => ListView(
          controller: scroll,
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          children: [
            Text(
              'Dán tin nhắn',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Mỗi dòng thành một mục chờ duyệt — chưa có gì ghi vào sổ.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _text,
              minLines: 4,
              maxLines: 8,
              decoration: const InputDecoration(
                hintText:
                    'vd: TK 1234 GD -50,000 VND PHO NGON\n'
                    '    cafe 45k',
                border: OutlineInputBorder(),
              ),
              onChanged: (_) {
                if (_drafts != null || _error != null) {
                  setState(() {
                    _drafts = null;
                    _plan = null;
                    _error = null;
                  });
                }
              },
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                FilledButton.tonalIcon(
                  onPressed: _busy ? null : _analyze,
                  icon: const Icon(Icons.search),
                  label: const Text('Phân tích'),
                ),
                const SizedBox(width: 12),
                if (drafts != null)
                  Expanded(
                    child: Text(
                      'Tìm thấy ${drafts.length} giao dịch'
                      '${needsReview > 0 ? ' · $needsReview cần xem' : ''}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
              ],
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
            if (drafts != null) ...[
              const SizedBox(height: 8),
              if (_unparseableLines > 0 || plan != null)
                Text(
                  [
                    if (_unparseableLines > 0)
                      '$_unparseableLines dòng không đọc được',
                    if (plan != null) csvImportSummary(plan),
                  ].join(' · '),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              for (final d in drafts)
                ListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: Text(d.merchant, overflow: TextOverflow.ellipsis),
                  subtitle: Text(
                    '${inboxKindLabel(d.kind)} · '
                    '${inboxConfidenceLabel(d.confidence)} · '
                    '${_displayDate(d.occurredOn)}',
                  ),
                  trailing: Text(formatMoney(d.amountMinor)),
                ),
              const SizedBox(height: 4),
              // The RPC requires a real account + per-kind category on
              // every candidate — a pasted line carries neither, so the
              // reviewer picks the defaults here (same pickers the CSV
              // sheet offers).
              DropdownButtonFormField<String>(
                key: ValueKey('acc-$_accountId'),
                initialValue: _accountId.isEmpty ? null : _accountId,
                decoration: const InputDecoration(
                  labelText: 'Tài khoản',
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final a in widget.accounts)
                    DropdownMenuItem(value: a.id, child: Text(a.name)),
                ],
                onChanged: _busy
                    ? null
                    : (v) => setState(() {
                        _accountId = v ?? '';
                        _replan();
                      }),
              ),
              const SizedBox(height: 12),
              _categoryField(
                label: 'Danh mục chi',
                categoryId: _expenseCategoryId,
                onTap: () => _pickCategory(
                  income: false,
                  currentId: _expenseCategoryId,
                  onPicked: (id) => setState(() {
                    _expenseCategoryId = id;
                    _replan();
                  }),
                ),
              ),
              const SizedBox(height: 12),
              _categoryField(
                label: 'Danh mục thu',
                categoryId: _incomeCategoryId,
                onTap: () => _pickCategory(
                  income: true,
                  currentId: _incomeCategoryId,
                  onPicked: (id) => setState(() {
                    _incomeCategoryId = id;
                    _replan();
                  }),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _busy || plan == null || plan.readyCount == 0
                    ? null
                    : _commit,
                icon: _busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.move_to_inbox),
                label: Text(
                  plan == null
                      ? 'Lưu mục chờ duyệt'
                      : 'Lưu ${plan.readyCount} mục chờ duyệt',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
