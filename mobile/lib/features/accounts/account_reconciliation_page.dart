// "Đối soát" — the account statement workspace, mirroring the web's
// /accounts/[id]/reconcile flow (src/components/account-reconciliation-page.tsx).
//
// State machine (server-enforced, all five RPCs SECURITY DEFINER):
//   start (account + statement date + stated balance, integer đồng)
//     → mark each ledger leg cleared/pending
//     → difference = statement − cleared balance
//     → complete: zero diff locks the legs into reconciled; a nonzero
//       diff closes ONLY through an explicit adjustment transaction the
//       user picks (kind forced by the sign — income when the statement
//       exceeds the ledger, expense when it falls short)
//     → reopen: latest completed period only, while nothing is open.
//
// Honest states: a mismatch is always shown as a mismatch — the page
// never silently balances a gap.

import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/reconciliation.dart';
import '../../domain/register.dart';
import '../../domain/report.dart' show vnToday;
import '../../theme/mf_theme.dart';

/// Server-backed mutations the workspace performs. app.dart binds the
/// RealStore methods; tests inject spies. Every callback returns after
/// the write lands — the page then re-reads canonical state.
class ReconciliationActions {
  const ReconciliationActions({
    required this.start,
    required this.setEntryState,
    required this.complete,
    required this.reopen,
  });

  /// start_account_reconciliation — opens a statement period.
  final Future<void> Function({
    required String statementDate,
    required int statementBalance,
  })
  start;

  /// set_account_entry_reconciliation_state — one leg pending/cleared.
  final Future<void> Function({
    required String entryId,
    required EntryReconciliationState state,
  })
  setEntryState;

  /// complete_account_reconciliation — locks cleared legs; the optional
  /// adjustment pair closes an explicit nonzero difference.
  final Future<void> Function({
    required String reconciliationId,
    String? adjustmentCategoryId,
    String? adjustmentPayee,
  })
  complete;

  /// reopen_account_reconciliation — latest completed period only.
  final Future<void> Function(String reconciliationId) reopen;
}

/// The reconciliation workspace for [account]. Pops `true` when any
/// mutation landed so the host can reload the surfaces a completion or
/// reopen touches (a completed-with-adjustment posts a real transaction).
class AccountReconciliationPage extends StatefulWidget {
  const AccountReconciliationPage({
    super.key,
    required this.account,
    required this.loadState,
    required this.loadLedger,
    required this.loadCategories,
    required this.actions,
    this.today,
  });

  final AccountSummary account;

  /// entry_feed + sessions for this account (RealStore.loadReconciliationState).
  final Future<ReconciliationStateData> Function() loadState;

  /// The account's ledger newest→oldest; `truncated` flags a tail cut by
  /// the page cap so the workspace can say its list is partial.
  final Future<({List<Transaction> rows, bool truncated})> Function()
  loadLedger;

  /// Adjustment-category picker source (kinds filter per the diff sign).
  final Future<List<Category>> Function() loadCategories;

  final ReconciliationActions actions;

  /// YYYY-MM-DD override for tests — statement dates must not pass today.
  final String? today;

  @override
  State<AccountReconciliationPage> createState() =>
      _AccountReconciliationPageState();
}

class _AccountReconciliationPageState extends State<AccountReconciliationPage> {
  ReconciliationStateData? _data;
  List<AccountRegisterEntry> _register = const [];
  List<Category> _categories = const [];
  bool _truncated = false;
  bool _loaded = false;
  Object? _loadError;

  /// Banner message for a failed mutation or a stale re-read.
  String? _error;

  /// Semantic busy key ('start' / 'complete' / 'entry:…' / 'reopen:…') —
  /// while set every action is disabled, like the web.
  String? _busy;

  /// Sticky "the ledger or sessions changed" flag returned on pop.
  bool _changed = false;

  int _gen = 0;

  final _balanceCtrl = TextEditingController();
  late String _statementDate;

  String get _today {
    final override = widget.today;
    if (override != null) return override;
    // The statement date default shares the VN civil calendar with the
    // occurred_on rows it is compared against (domain/report.dart).
    return vnToday();
  }

  @override
  void initState() {
    super.initState();
    _statementDate = _today;
    _load();
  }

  @override
  void dispose() {
    _balanceCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final gen = ++_gen;
    setState(() {
      _loaded = false;
      _loadError = null;
    });
    try {
      final results = await Future.wait([
        widget.loadState(),
        widget.loadLedger(),
        widget.loadCategories(),
      ]);
      if (!mounted || gen != _gen) return;
      _apply(results);
    } catch (e) {
      if (!mounted || gen != _gen) return;
      setState(() {
        _loaded = true;
        _loadError = e;
      });
    }
  }

  /// Silent re-read after a mutation — the last good data stays on
  /// screen; a failed refresh only raises the banner, mirroring the
  /// web's "Đã cập nhật nhưng chưa tải lại được trạng thái mới."
  Future<void> _refresh() async {
    final gen = ++_gen;
    try {
      final results = await Future.wait([
        widget.loadState(),
        widget.loadLedger(),
        widget.loadCategories(),
      ]);
      if (!mounted || gen != _gen) return;
      _apply(results);
    } catch (_) {
      if (!mounted || gen != _gen) return;
      setState(
        () => _error = 'Đã cập nhật nhưng chưa tải lại được trạng thái mới.',
      );
    }
  }

  void _apply(List<Object?> results) {
    final state = results[0] as ReconciliationStateData;
    final ledger = results[1] as ({List<Transaction> rows, bool truncated});
    final categories = results[2] as List<Category>;
    final register = buildAccountRegister(
      currentBalance: widget.account.balance,
      accountId: widget.account.id,
      newestFirst: ledger.rows,
    );
    // Sessions read through the base-table fallback carry no live values
    // while open — the same snapshot the server computes gets filled in
    // here from the merged register.
    final resolved = resolveSessionSnapshots(
      data: state,
      registerEntries: register,
      initialBalance: widget.account.initialBalance,
    );
    setState(() {
      _data = resolved;
      _register = register;
      _categories = categories;
      _truncated = ledger.truncated;
      _loaded = true;
      _loadError = null;
    });
  }

  /// One mutation path for every action: busy-gate → write → canonical
  /// re-read. A failed write keeps the old state and maps the server
  /// code to an honest message.
  Future<void> _mutate(String busyKey, Future<void> Function() action) async {
    if (_busy != null) return;
    setState(() {
      _busy = busyKey;
      _error = null;
    });
    try {
      await action();
      _changed = true;
      await _refresh();
    } catch (e) {
      if (mounted) {
        setState(() => _error = reconciliationErrorMessage(e));
      }
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  int? get _parsedBalance => parseSignedMoneyInput(_balanceCtrl.text);

  bool _canStart(ReconciliationWorkspace ws) {
    return _data!.featureAvailable &&
        !widget.account.isArchived &&
        widget.account.currencyCode == 'VND' &&
        ws.openSession == null &&
        _statementDate.compareTo(_today) <= 0 &&
        _parsedBalance != null &&
        _busy == null;
  }

  Future<void> _start(ReconciliationWorkspace ws) async {
    final amount = _parsedBalance;
    if (amount == null) {
      setState(() => _error = 'Số dư sao kê chưa hợp lệ.');
      return;
    }
    if (_statementDate.compareTo(_today) > 0) {
      setState(() => _error = 'Ngày sao kê chưa hợp lệ.');
      return;
    }
    await _mutate(
      'start',
      () => widget.actions.start(
        statementDate: _statementDate,
        statementBalance: amount,
      ),
    );
  }

  Future<void> _setEntryState(
    ReconciliationWorkspaceEntry entry,
    EntryReconciliationState next,
  ) => _mutate(
    'entry:${entry.entryId}',
    () => widget.actions.setEntryState(entryId: entry.entryId, state: next),
  );

  Future<void> _complete(
    ReconciliationSession session, {
    String? adjustmentCategoryId,
    String? adjustmentPayee,
  }) => _mutate(
    'complete',
    () => widget.actions.complete(
      reconciliationId: session.id,
      adjustmentCategoryId: adjustmentCategoryId,
      adjustmentPayee: adjustmentPayee,
    ),
  );

  /// Mirror of the web's openCompletion: a zero difference reviews the
  /// lock directly; a nonzero difference must name an adjustment
  /// category of the forced kind (income when the statement sits above
  /// the ledger, expense when below) — the RPC refuses anything else.
  Future<void> _openCompletion(ReconciliationSession session) async {
    final difference = session.difference;
    if (difference == null || _busy != null) return;
    if (difference == 0) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Hoàn tất kỳ đối soát?'),
          content: Text(
            'Chênh lệch đã bằng 0.\n\n'
            'Kỳ sao kê: ${displayDate(session.statementDate)}\n'
            'Số dư sao kê: ${formatMoney(session.statementBalance)}\n'
            'Giao dịch sẽ khóa: ${session.clearedLegCount ?? 0} mục đã khớp\n\n'
            'Giao dịch đã đối soát không sửa hay xóa được cho đến khi mở '
            'lại kỳ này.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Hoàn tất đối soát'),
            ),
          ],
        ),
      );
      if (confirmed == true && mounted) await _complete(session);
      return;
    }

    final kind = reconciliationAdjustmentKind(difference);
    final options = [
      for (final c in _categories)
        if (c.kind == kind && !c.isArchived) c,
    ];
    String? categoryId;
    var payee = '';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDlg) => AlertDialog(
          title: const Text('Hoàn tất bằng khoản điều chỉnh?'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Sao kê còn chênh lệch ${formatSignedMoney(difference)}. '
                  'Sẽ tạo khoản điều chỉnh '
                  '${kind == TransactionKind.income ? 'thu' : 'chi'} '
                  '${formatMoney(difference.abs())} ngày '
                  '${displayDate(session.statementDate)}, rồi khóa ngay '
                  'trong kỳ này.',
                ),
                const SizedBox(height: 12),
                Text(
                  'Ghi chú: ${reconciliationAdjustmentNote(session.statementDate)}',
                  style: Theme.of(ctx).textTheme.bodySmall,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: categoryId,
                  decoration: const InputDecoration(
                    labelText: 'Danh mục điều chỉnh',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    for (final c in options)
                      DropdownMenuItem(value: c.id, child: Text(c.name)),
                  ],
                  onChanged: (v) => setDlg(() => categoryId = v),
                ),
                const SizedBox(height: 12),
                TextField(
                  maxLength: 200,
                  decoration: const InputDecoration(
                    labelText: 'Đối tác (không bắt buộc)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (v) => payee = v,
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Hủy'),
            ),
            FilledButton(
              onPressed: categoryId == null
                  ? null
                  : () => Navigator.pop(ctx, true),
              child: const Text('Hoàn tất với điều chỉnh'),
            ),
          ],
        ),
      ),
    );
    if (confirmed == true && mounted) {
      final trimmed = payee.trim();
      await _complete(
        session,
        adjustmentCategoryId: categoryId,
        adjustmentPayee: trimmed.isEmpty ? null : trimmed,
      );
    }
  }

  Future<void> _reopen(ReconciliationSession session) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Mở lại kỳ đối soát?'),
        content: Text(
          '${sessionTitle(session)} sẽ mở lại — các giao dịch đã khóa về '
          'trạng thái đã khớp và sửa/xóa được trở lại.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Mở lại'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) {
      await _mutate(
        'reopen:${session.id}',
        () => widget.actions.reopen(session.id),
      );
    }
  }

  Future<void> _pickStatementDate() async {
    final current = DateTime.tryParse(_statementDate) ?? DateTime.parse(_today);
    final picked = await showDatePicker(
      context: context,
      initialDate: current,
      firstDate: DateTime(2000),
      lastDate: DateTime.parse(_today),
    );
    if (picked == null || !mounted) return;
    setState(() {
      _statementDate =
          '${picked.year}-${picked.month.toString().padLeft(2, '0')}-'
          '${picked.day.toString().padLeft(2, '0')}';
      _error = null;
    });
  }

  // ---- sections ----

  Widget _startPanel(ReconciliationWorkspace ws) {
    final a = widget.account;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kỳ sao kê mới',
              style: Theme.of(context).textTheme.labelSmall,
            ),
            Text(
              'Nhập hai số liệu từ sao kê',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            Text(
              'Dùng ngày kết thúc kỳ và số dư cuối kỳ. MoneyFlow sẽ tính '
              'phần chênh lệch từ các giao dịch được đánh dấu khớp.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            if (a.currencyCode != 'VND')
              const Text(
                'Tài khoản ngoại tệ hiện chỉ theo dõi. Lát cắt đầu tiên '
                'chưa mở đối soát để tránh làm tròn sai đơn vị tiền.',
              )
            else if (a.isArchived)
              const Text(
                'Khôi phục tài khoản trước khi bắt đầu một kỳ đối soát mới.',
              )
            else ...[
              OutlinedButton.icon(
                onPressed: _busy == null ? _pickStatementDate : null,
                icon: const Icon(Icons.calendar_today_outlined),
                label: Text('Ngày kết thúc: ${displayDate(_statementDate)}'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _balanceCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Số dư cuối kỳ',
                  hintText: 'vd: 11098000',
                  suffixText: '₫',
                  border: OutlineInputBorder(),
                ),
                onChanged: (_) => setState(() => _error = null),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: _canStart(ws) ? () => _start(ws) : null,
                  icon: const Icon(Icons.check),
                  label: Text(
                    _busy == 'start' ? 'Đang mở kỳ...' : 'Mở kỳ đối soát',
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _summaryCard(ReconciliationSession session, int eligibleCount) {
    final difference = session.difference;
    final reconciledOrCleared =
        (session.clearedLegCount ?? 0) + (session.reconciledLegCount ?? 0);
    final totalLegs =
        (session.pendingLegCount ?? 0) +
        (session.clearedLegCount ?? 0) +
        (session.reconciledLegCount ?? 0);
    final differenceNote = difference == null
        ? 'Chưa tính được chênh lệch.'
        : difference == 0
        ? 'Đã khớp chính xác. Có thể hoàn tất.'
        : difference > 0
        ? 'Sao kê cao hơn sổ ${formatMoney(difference)} — đối chiếu tiếp, '
              'hoặc hoàn tất bằng khoản thu điều chỉnh.'
        : 'Sổ cao hơn sao kê ${formatMoney(-difference)} — đối chiếu tiếp, '
              'hoặc hoàn tất bằng khoản chi điều chỉnh.';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    sessionTitle(session),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                const Chip(
                  label: Text('Đang mở'),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Chọn các giao dịch có trên sao kê. Chỉ giao dịch đến ngày '
              'kết thúc kỳ mới được tính.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const Divider(height: 24),
            _metricRow('Số dư sao kê', formatMoney(session.statementBalance)),
            _metricRow(
              'Số dư đã khớp',
              session.clearedBalance == null
                  ? '—'
                  : formatMoney(session.clearedBalance!),
            ),
            _metricRow(
              'Chênh lệch',
              difference == null ? '—' : formatSignedMoney(difference),
              valueColor: difference == null || difference == 0
                  ? context.mf.incomeText
                  : context.mf.expenseText,
            ),
            Text(differenceNote, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 8),
            Text(
              'Đã khớp $reconciledOrCleared/$totalLegs giao dịch trong kỳ · '
              '${session.pendingLegCount ?? 0} chờ · '
              '${session.reconciledLegCount ?? 0} đã khóa',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: difference != null && _busy == null
                    ? () => _openCompletion(session)
                    : null,
                icon: const Icon(Icons.check),
                label: Text(
                  _busy == 'complete'
                      ? 'Đang hoàn tất...'
                      : 'Hoàn tất đối soát',
                ),
              ),
            ),
            if (_truncated)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  'Chỉ tải được một phần sổ — danh sách có thể thiếu giao '
                  'dịch cũ; số liệu tóm tắt vẫn đủ theo máy chủ.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _metricRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: Theme.of(context).textTheme.bodySmall),
          ),
          Text(
            value,
            style: TextStyle(fontWeight: FontWeight.w700, color: valueColor),
          ),
        ],
      ),
    );
  }

  String _entryDescription(ReconciliationWorkspaceEntry e) {
    final tx = e.transaction;
    final payee = tx.payee != null && tx.payee!.isNotEmpty
        ? '${tx.payee} · '
        : '';
    if (tx.kind == TransactionKind.transfer) {
      final counterparty = e.transferCounterparty ?? 'tài khoản khác';
      return payee +
          (e.direction == RegisterDirection.inflow
              ? 'Nhận từ $counterparty'
              : 'Chuyển đến $counterparty');
    }
    if (e.entryCount > 1) {
      return '$payee${tx.category} · ${e.entryCount} dòng chia danh mục';
    }
    return '$payee${tx.category}';
  }

  Widget _entryTile(ReconciliationWorkspaceEntry e) {
    final tx = e.transaction;
    final locked = e.state == EntryReconciliationState.reconciled;
    final next = e.state == EntryReconciliationState.cleared
        ? EntryReconciliationState.pending
        : EntryReconciliationState.cleared;
    final busy = _busy != null;
    final color = e.impact > 0
        ? context.mf.incomeText
        : e.impact < 0
        ? context.mf.expenseText
        : null;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
        child: Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  tx.kind == TransactionKind.transfer
                      ? Icons.swap_horiz
                      : Icons.receipt_outlined,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(tx.note.isEmpty ? tx.category : tx.note),
                      Text(
                        '${_entryDescription(e)} · '
                        '${displayDate(tx.occurredOn)}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatSignedMoney(e.impact),
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      entryStateLabel(e.state),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ],
            ),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: locked || busy
                    ? null
                    : () => _setEntryState(e, next),
                icon: Icon(
                  locked
                      ? Icons.lock_outline
                      : next == EntryReconciliationState.cleared
                      ? Icons.check
                      : Icons.undo,
                  size: 18,
                ),
                label: Text(
                  _busy == 'entry:${e.entryId}'
                      ? 'Đang lưu...'
                      : locked
                      ? 'Đã khóa'
                      : next == EntryReconciliationState.cleared
                      ? 'Đánh dấu đã khớp'
                      : 'Bỏ đánh dấu',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _entryList(ReconciliationWorkspace ws, ReconciliationSession open) {
    final eligible = [
      for (final e in ws.entries)
        if (isEntryEligibleForSession(e, open.statementDate)) e,
    ];
    final later = [
      for (final e in ws.entries)
        if (!isEntryEligibleForSession(e, open.statementDate)) e,
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Đánh dấu giao dịch đã xuất hiện trên sao kê',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        if (eligible.isEmpty)
          const Card(
            child: ListTile(
              title: Text('Chưa có giao dịch nào đến ngày sao kê'),
            ),
          )
        else
          ...eligible.map(_entryTile),
        if (later.isNotEmpty)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ExpansionTile(
              title: Text(
                '${later.length} giao dịch sau ngày sao kê — không tính '
                'kỳ này',
              ),
              children: [
                for (final e in later)
                  ListTile(
                    dense: true,
                    title: Text(
                      e.transaction.note.isEmpty
                          ? e.transaction.category
                          : e.transaction.note,
                    ),
                    subtitle: Text(displayDate(e.transaction.occurredOn)),
                    trailing: Text(formatSignedMoney(e.impact)),
                  ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _historyPanel(ReconciliationWorkspace ws) {
    final sessions = ws.completedSessions;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Các kỳ đã hoàn tất (${sessions.length})',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 8),
        if (sessions.isEmpty)
          const Card(
            child: ListTile(title: Text('Chưa có kỳ đối soát nào hoàn tất')),
          )
        else
          for (final s in sessions)
            Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sessionTitle(s),
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 8),
                    _metricRow('Sao kê', formatMoney(s.statementBalance)),
                    _metricRow(
                      'Đã khớp',
                      s.clearedBalance == null
                          ? '—'
                          : formatMoney(s.clearedBalance!),
                    ),
                    _metricRow(
                      'Chênh lệch',
                      s.difference == null
                          ? '—'
                          : formatSignedMoney(s.difference!),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton.icon(
                        onPressed:
                            _busy == null && canReopenSession(s, ws.sessions)
                            ? () => _reopen(s)
                            : null,
                        icon: const Icon(Icons.undo, size: 18),
                        label: Text(
                          _busy == 'reopen:${s.id}'
                              ? 'Đang mở lại...'
                              : 'Mở lại kỳ gần nhất',
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: AppBar(title: Text('Đối soát ${widget.account.name}')),
        body: !_loaded
            ? const Center(child: CircularProgressIndicator())
            : _loadError != null
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được dữ liệu đối soát'),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _load,
                      child: const Text('Thử lại'),
                    ),
                  ],
                ),
              )
            : RefreshIndicator(
                onRefresh: _refresh,
                child: Builder(
                  builder: (context) {
                    final data = _data!;
                    final ws = mergeReconciliationWorkspace(_register, data);
                    return ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      children: [
                        if (_error != null)
                          Card(
                            color: Theme.of(context).colorScheme.errorContainer,
                            child: ListTile(
                              leading: const Icon(Icons.error_outline),
                              title: Text(_error!),
                            ),
                          ),
                        if (!data.featureAvailable)
                          const Card(
                            child: ListTile(
                              leading: Icon(Icons.lock_outline),
                              title: Text(
                                'Đối soát chưa được bật trên máy chủ',
                              ),
                              subtitle: Text(
                                'Sổ tài khoản vẫn hoạt động bình thường.',
                              ),
                            ),
                          )
                        else ...[
                          if (ws.openSession == null)
                            _startPanel(ws)
                          else ...[
                            _summaryCard(
                              ws.openSession!,
                              ws.entries
                                  .where(
                                    (e) => isEntryEligibleForSession(
                                      e,
                                      ws.openSession!.statementDate,
                                    ),
                                  )
                                  .length,
                            ),
                            _entryList(ws, ws.openSession!),
                          ],
                          const SizedBox(height: 8),
                          _historyPanel(ws),
                        ],
                      ],
                    );
                  },
                ),
              ),
      ),
    );
  }
}
