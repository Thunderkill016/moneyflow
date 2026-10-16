// "Vay & cho vay" — informal debt tracking (D1, RESEARCH_TOP_FINANCE_APPS
// §10 top gap). A debt is a tracking record over real ledger movements:
// creating one posts nothing; the Trả nợ/Thu nợ action posts a real
// transaction through apply_debt_repayment (expense for đi vay, income
// for cho vay — never a transfer). The page mirrors the web/accounts
// surface contract: open rows grouped per counterparty with outstanding
// totals, settled under "Đã xong", archived under "Đã lưu trữ" with
// restore, delete only as a soft-delete tombstone.

import 'package:flutter/material.dart';

import '../../data/neon/real_store.dart' show newIdempotencyKey;
import '../../domain/datetime_label.dart';
import '../../domain/debts.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/report.dart' show vnToday;
import '../shared/empty_state.dart';
import '../shared/timed_snack_bar.dart';

class DebtsPage extends StatefulWidget {
  const DebtsPage({
    super.key,
    required this.loadDebts,
    this.loadAccounts,
    this.loadCategories,
    this.onCreate,
    this.onRepay,
    this.onSetState,
    this.onDelete,
  });

  /// Every non-deleted debt — the page groups/sections it.
  final Future<List<Debt>> Function() loadDebts;

  /// Account + category pickers for the repayment dialog — absent
  /// together with [onRepay] hides the Trả/Thu affordance entirely
  /// (read-only surfaces never fake a ledger write).
  final Future<List<AccountSummary>> Function()? loadAccounts;
  final Future<List<Category>> Function()? loadCategories;

  /// Create — null hides the FAB and the empty-state action (demo).
  final Future<void> Function(DebtDraft draft)? onCreate;

  /// apply_debt_repayment — returns the created transaction id.
  final Future<String> Function(DebtRepayment repayment)? onRepay;

  /// set_debt_state — settle/archive/restore/reopen.
  final Future<void> Function(String debtId, DebtState state)? onSetState;

  /// soft_delete_debt — tombstone; offered only on archived rows.
  final Future<void> Function(String debtId)? onDelete;

  @override
  State<DebtsPage> createState() => _DebtsPageState();
}

class _DebtsPageState extends State<DebtsPage> {
  late Future<List<Debt>> _debts;

  /// Sticky "anything changed" flag — delivered to the shell on pop so it
  /// reloads balances/feed exactly once (a repayment posts a real
  /// transaction, so the ledger surfaces must refresh).
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _debts = widget.loadDebts();
  }

  /// Every mutation refetches — the server owns remaining/state, so the
  /// list never trusts a local guess.
  Future<void> _refresh() async {
    final next = widget.loadDebts();
    setState(() {
      _debts = next;
    });
    try {
      await next;
    } catch (_) {
      // The FutureBuilder renders the honest error state already.
    }
  }

  void _snack(String message) {
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(content: Text(message)),
    );
  }

  /// Runs a write with an honest snackbar on failure, then refreshes
  /// either way — a failure usually means the local row state was stale.
  /// The pop flag only flips on success: a refused write changed nothing.
  Future<void> _guarded(
    Future<void> Function() action, {
    required String fallback,
    String? success,
  }) async {
    try {
      await action();
    } catch (e) {
      if (mounted) _snack(debtErrorMessage(e, fallback: fallback));
      await _refresh();
      return;
    }
    _changed = true;
    if (success != null && mounted) _snack(success);
    await _refresh();
  }

  Future<void> _showForm() async {
    final saved = await showDebtFormDialog(
      context,
      onSave: (draft) => widget.onCreate!(draft),
    );
    if (saved) {
      _changed = true;
      _refresh();
    }
  }

  /// Repayment dialog — lazily loads the account/category pickers only
  /// when the action fires; a failed read lands as an honest snackbar.
  Future<void> _openRepay(Debt debt) async {
    List<AccountSummary> accounts;
    List<Category> categories;
    try {
      accounts = await widget.loadAccounts!();
      categories = await widget.loadCategories!();
    } catch (_) {
      _snack('Không tải được tài khoản/danh mục — thử lại');
      return;
    }
    if (!mounted) return;
    final applied = await showRepayDialog(
      context,
      debt: debt,
      accounts: accounts,
      categories: categories,
      onSave: (repayment) async {
        await widget.onRepay!(repayment);
      },
    );
    if (applied) {
      _changed = true;
      _snack(
        debt.direction == DebtDirection.payable
            ? 'Đã ghi khoản trả nợ'
            : 'Đã ghi khoản thu nợ',
      );
      _refresh();
    }
  }

  Future<void> _markSettled(Debt d) async {
    final ok = await _confirm(
      'Đánh dấu đã xong "${d.counterparty}"?'
      '${d.remainingMinor > 0 ? ' Phần còn lại ${formatMoney(d.remainingMinor)} sẽ ghi nhận là không còn đòi/trả.' : ''}',
    );
    if (!ok) return;
    await _guarded(
      () => widget.onSetState!(d.id, DebtState.settled),
      fallback: 'Không cập nhật được — thử lại',
      success: 'Đã đánh dấu khoản nợ là xong.',
    );
  }

  Future<void> _archive(Debt d) async {
    final ok = await _confirm(
      'Lưu trữ khoản nợ với "${d.counterparty}"? Khoản nợ sẽ ẩn khỏi danh sách.',
    );
    if (!ok) return;
    await _guarded(
      () => widget.onSetState!(d.id, DebtState.archived),
      fallback: 'Không lưu trữ được — thử lại',
      success: 'Đã lưu trữ khoản nợ.',
    );
  }

  Future<void> _restore(Debt d) async {
    // The server picks the honest post-archive state: a fully-repaid row
    // comes back as settled, anything else as open.
    await _guarded(
      () => widget.onSetState!(d.id, DebtState.open),
      fallback: 'Không khôi phục được — thử lại',
      success: 'Đã khôi phục khoản nợ.',
    );
  }

  /// Reopen a settled-without-full-payment row (e.g. marked done by
  /// mistake). For a zero-remaining row the server keeps it settled.
  Future<void> _reopen(Debt d) async {
    await _guarded(
      () => widget.onSetState!(d.id, DebtState.open),
      fallback: 'Không mở lại được — thử lại',
      success: 'Đã mở lại khoản nợ.',
    );
  }

  Future<void> _delete(Debt d) async {
    final ok = await _confirm(
      'Xóa khoản nợ với "${d.counterparty}"? Các giao dịch trả/thu đã ghi '
      'vẫn giữ trong sổ.',
    );
    if (!ok) return;
    await _guarded(
      () => widget.onDelete!(d.id),
      fallback: 'Không xóa được — thử lại',
      success: 'Đã xóa khoản nợ.',
    );
  }

  Future<bool> _confirm(String message) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đồng ý'),
          ),
        ],
      ),
    );
    return ok == true;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Vay & cho vay')),
        body: FutureBuilder<List<Debt>>(
          future: _debts,
          builder: (context, snap) {
            // Same failure contract as accounts/inbox: explicit friendly
            // message + retry, never a forever spinner.
            if (snap.hasError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được khoản nợ'),
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
            final debts = snap.data!;
            final open = [
              for (final d in debts)
                if (d.isOpen) d,
            ];
            final settled = [
              for (final d in debts)
                if (d.state == DebtState.settled) d,
            ];
            final archived = [
              for (final d in debts)
                if (d.state == DebtState.archived) d,
            ];
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                // Bottom slot clears the extended FAB so the last debt
                // row is never trapped underneath it at scroll end.
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                children: [
                  if (debts.isEmpty)
                    EmptyStateCard(
                      icon: Icons.handshake_outlined,
                      title: 'Chưa có khoản nợ nào',
                      message:
                          'Ghi lại khoản đi vay hoặc cho vay để theo dõi còn nợ bao nhiêu.',
                      actionLabel: widget.onCreate == null
                          ? null
                          : 'Thêm khoản nợ',
                      onAction: widget.onCreate == null ? null : _showForm,
                    ),
                  if (open.isNotEmpty) ...[
                    _summaryCard(open),
                    for (final group in groupOpenDebts(open))
                      ..._groupSection(group),
                  ],
                  if (settled.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text(
                      'Đã xong',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    for (final d in settled)
                      _debtTile(d, showCounterparty: true),
                  ],
                  if (archived.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Text(
                      'Đã lưu trữ',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    for (final d in archived)
                      _debtTile(d, showCounterparty: true),
                  ],
                ],
              ),
            );
          },
        ),
        floatingActionButton: widget.onCreate == null
            ? null
            : FloatingActionButton.extended(
                onPressed: _showForm,
                icon: const Icon(Icons.add),
                label: const Text('Thêm khoản nợ'),
              ),
      ),
    );
  }

  /// Open totals by direction — owing and being owed never net against
  /// each other: they are different facts, shown side by side.
  Widget _summaryCard(List<Debt> open) {
    final owe = open
        .where((d) => d.direction == DebtDirection.payable)
        .fold(0, (s, d) => s + d.remainingMinor);
    final lent = open
        .where((d) => d.direction == DebtDirection.receivable)
        .fold(0, (s, d) => s + d.remainingMinor);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            if (owe > 0)
              Expanded(
                child: _summaryCell('Đang nợ', owe, Icons.call_made_outlined),
              ),
            if (owe > 0 && lent > 0) const SizedBox(width: 16),
            if (lent > 0)
              Expanded(
                child: _summaryCell(
                  'Đang cho vay',
                  lent,
                  Icons.call_received_outlined,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _summaryCell(String label, int amount, IconData icon) {
    final text = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 16),
            const SizedBox(width: 4),
            Text(label, style: text.bodySmall),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          formatMoney(amount),
          style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800),
        ),
      ],
    );
  }

  List<Widget> _groupSection(DebtGroup group) => [
    const SizedBox(height: 16),
    Padding(
      padding: const EdgeInsets.only(left: 4, right: 4, bottom: 4),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '${group.counterparty} · '
              '${debtDirectionLabel(group.direction)}',
              style: Theme.of(context).textTheme.titleSmall,
            ),
          ),
          Text(
            'còn ${formatMoney(group.remainingMinor)}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
      ),
    ),
    for (final d in group.debts) _debtTile(d),
  ];

  /// [showCounterparty] is needed outside the grouped sections — under
  /// "Đã xong"/"Đã lưu trữ" there is no counterparty header to inherit.
  Widget _debtTile(Debt d, {bool showCounterparty = false}) {
    final repayable =
        d.isOpen &&
        widget.onRepay != null &&
        widget.loadAccounts != null &&
        widget.loadCategories != null;
    final headline = d.state == DebtState.settled
        ? 'Đã xong'
        : 'Còn lại ${formatMoney(d.remainingMinor)}';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.only(left: 16, top: 4, bottom: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    showCounterparty
                        ? '${d.counterparty} · $headline'
                        : headline,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (widget.onSetState != null || widget.onDelete != null)
                  _debtMenu(d),
              ],
            ),
            Text(_subtitleFor(d), style: Theme.of(context).textTheme.bodySmall),
            if (repayable) ...[
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerLeft,
                child: FilledButton.tonalIcon(
                  icon: Icon(
                    d.direction == DebtDirection.payable
                        ? Icons.call_made_outlined
                        : Icons.call_received_outlined,
                    size: 18,
                  ),
                  onPressed: () => _openRepay(d),
                  label: Text(
                    d.direction == DebtDirection.payable ? 'Trả nợ' : 'Thu nợ',
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _debtMenu(Debt d) {
    return PopupMenuButton<String>(
      tooltip: 'Tùy chọn ${d.counterparty}',
      iconSize: 20,
      onSelected: (action) {
        switch (action) {
          case 'settle':
            _markSettled(d);
          case 'reopen':
            _reopen(d);
          case 'archive':
            _archive(d);
          case 'restore':
            _restore(d);
          case 'delete':
            _delete(d);
        }
      },
      itemBuilder: (ctx) => [
        if (d.isOpen && widget.onSetState != null) ...[
          const PopupMenuItem(value: 'settle', child: Text('Đánh dấu đã xong')),
          const PopupMenuItem(value: 'archive', child: Text('Lưu trữ')),
        ],
        if (d.state == DebtState.settled && widget.onSetState != null) ...[
          const PopupMenuItem(value: 'reopen', child: Text('Mở lại')),
          const PopupMenuItem(value: 'archive', child: Text('Lưu trữ')),
        ],
        if (d.state == DebtState.archived) ...[
          if (widget.onSetState != null)
            const PopupMenuItem(value: 'restore', child: Text('Khôi phục')),
          if (widget.onDelete != null)
            const PopupMenuItem(value: 'delete', child: Text('Xóa')),
        ],
      ],
    );
  }

  /// "Đi vay · Gốc 2.000.000 ₫ · đã trả 500.000 ₫ · hạn 01/12/2026 · note"
  /// — every figure comes straight from the stored row.
  String _subtitleFor(Debt d) {
    final bits = <String>[
      debtDirectionLabel(d.direction),
      'gốc ${formatMoney(d.principalMinor)}',
    ];
    if (d.repaidMinor > 0) {
      bits.add(
        d.direction == DebtDirection.payable
            ? 'đã trả ${formatMoney(d.repaidMinor)}'
            : 'đã thu ${formatMoney(d.repaidMinor)}',
      );
    }
    if (d.dueDate != null) bits.add('hạn ${formatYmdAsDmy(d.dueDate!)}');
    if (d.note.isNotEmpty) bits.add(d.note);
    return bits.join(' · ');
  }
}

/// Add-debt dialog — direction, counterparty, principal, optional due
/// date, note. Creating a debt posts nothing to the ledger: it only
/// records the obligation (the borrowed/lent cash is captured separately
/// if the user wants it in the books). Returns true only on a real save.
Future<bool> showDebtFormDialog(
  BuildContext context, {
  required Future<void> Function(DebtDraft draft) onSave,
}) async {
  final counterparty = TextEditingController();
  final amount = TextEditingController();
  final note = TextEditingController();
  var direction = DebtDirection.payable;
  DateTime? dueDate;
  String? error;
  // create_debt takes no idempotency key — the in-flight guard IS the
  // double-submit defense, same contract as the account form.
  var submitting = false;
  final saved = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDlg) => AlertDialog(
        title: const Text('Thêm khoản nợ'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              SegmentedButton<DebtDirection>(
                segments: const [
                  ButtonSegment(
                    value: DebtDirection.payable,
                    label: Text('Đi vay'),
                    icon: Icon(Icons.call_made_outlined),
                  ),
                  ButtonSegment(
                    value: DebtDirection.receivable,
                    label: Text('Cho vay'),
                    icon: Icon(Icons.call_received_outlined),
                  ),
                ],
                selected: {direction},
                onSelectionChanged: (s) => setDlg(() => direction = s.first),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: counterparty,
                decoration: InputDecoration(
                  labelText: direction == DebtDirection.payable
                      ? 'Vay của ai'
                      : 'Cho ai vay',
                  hintText: 'vd: Anh Hai',
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amount,
                decoration: const InputDecoration(
                  labelText: 'Số tiền',
                  hintText: 'vd: 2tr',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: submitting
                    ? null
                    : () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: dueDate,
                          firstDate: DateTime(2000),
                          // A debt recorded late may already be past due —
                          // the upper bound only needs to stop typos, not
                          // real schedules.
                          lastDate: DateTime.now().add(
                            const Duration(days: 365 * 20),
                          ),
                        );
                        if (picked != null) {
                          setDlg(() => dueDate = picked);
                        }
                      },
                child: InputDecorator(
                  decoration: const InputDecoration(
                    labelText: 'Hạn trả (không bắt buộc)',
                    border: OutlineInputBorder(),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          dueDate == null
                              ? 'Không có hạn'
                              : '${dueDate!.day.toString().padLeft(2, '0')}/'
                                    '${dueDate!.month.toString().padLeft(2, '0')}/'
                                    '${dueDate!.year}',
                        ),
                      ),
                      if (dueDate != null)
                        InkWell(
                          onTap: submitting
                              ? null
                              : () => setDlg(() => dueDate = null),
                          child: const Padding(
                            padding: EdgeInsets.all(4),
                            child: Icon(Icons.clear, size: 18),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: note,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú (không bắt buộc)',
                  border: OutlineInputBorder(),
                ),
              ),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            // No cancel mid-flight — the RPC is already on the wire.
            onPressed: submitting ? null : () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: submitting
                ? null
                : () async {
                    final who = counterparty.text.trim();
                    final principal = parseMoneyInput(amount.text);
                    if (who.isEmpty) {
                      setDlg(() => error = 'Nhập tên người vay/cho vay');
                      return;
                    }
                    if (principal == null || principal <= 0) {
                      setDlg(() => error = 'Số tiền không hợp lệ');
                      return;
                    }
                    setDlg(() => submitting = true);
                    try {
                      await onSave(
                        DebtDraft(
                          direction: direction,
                          counterparty: who,
                          principalMinor: principal,
                          note: note.text.trim(),
                          dueDate: dueDate == null
                              ? null
                              : '${dueDate!.year.toString().padLeft(4, '0')}-'
                                    '${dueDate!.month.toString().padLeft(2, '0')}-'
                                    '${dueDate!.day.toString().padLeft(2, '0')}',
                        ),
                      );
                    } catch (e) {
                      setDlg(() {
                        submitting = false;
                        error = debtErrorMessage(
                          e,
                          fallback: 'Không lưu được — thử lại',
                        );
                      });
                      return;
                    }
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  },
            child: const Text('Tạo'),
          ),
        ],
      ),
    ),
  );
  return saved ?? false;
}

/// Repay/collect dialog — amount capped at remaining, account and a
/// kind-matched category picked by the user (the server re-checks every
/// guard). The idempotency key is minted per dialog open: a submit retry
/// after a lost response replays the same logical write, while a new
/// dialog is always a new intent. occurred_on is today (VN clock) — the
/// same convention the commitment payment uses.
Future<bool> showRepayDialog(
  BuildContext context, {
  required Debt debt,
  required List<AccountSummary> accounts,
  required List<Category> categories,
  required Future<void> Function(DebtRepayment repayment) onSave,
}) async {
  final kind = repaymentKind(debt.direction);
  final kindCats = categories.where((c) => c.kind == kind).toList();
  if (accounts.isEmpty || kindCats.isEmpty) {
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(
        content: Text(
          kind == TransactionKind.expense
              ? 'Cần ít nhất một tài khoản và một danh mục chi'
              : 'Cần ít nhất một tài khoản và một danh mục thu',
        ),
      ),
    );
    return false;
  }
  final isPayable = debt.direction == DebtDirection.payable;
  final amount = TextEditingController();
  final note = TextEditingController();
  AccountSummary? acc = accounts.firstOrNull;
  Category? cat = kindCats.firstOrNull;
  String? error;
  var submitting = false;
  final idempotencyKey = newIdempotencyKey();
  final occurredOn = vnToday();
  final saved = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDlg) => AlertDialog(
        title: Text(isPayable ? 'Trả nợ' : 'Thu nợ'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${debt.counterparty} · còn lại '
                '${formatMoney(debt.remainingMinor)}',
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: amount,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Số tiền',
                  hintText: 'tối đa ${formatMoney(debt.remainingMinor)}',
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<AccountSummary>(
                initialValue: acc,
                decoration: InputDecoration(
                  labelText: isPayable ? 'Tài khoản trả' : 'Tài khoản nhận',
                  border: const OutlineInputBorder(),
                ),
                items: [
                  for (final a in accounts)
                    DropdownMenuItem(value: a, child: Text(a.name)),
                ],
                onChanged: (v) => setDlg(() => acc = v ?? acc),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<Category>(
                initialValue: cat,
                decoration: const InputDecoration(
                  labelText: 'Danh mục',
                  border: OutlineInputBorder(),
                ),
                items: [
                  for (final c in kindCats)
                    DropdownMenuItem(value: c, child: Text(c.name)),
                ],
                onChanged: (v) => setDlg(() => cat = v ?? cat),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: note,
                decoration: const InputDecoration(
                  labelText: 'Ghi chú (không bắt buộc)',
                  border: OutlineInputBorder(),
                ),
              ),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            // No cancel mid-flight — the RPC is already on the wire;
            // popping here would hide a write that still lands.
            onPressed: submitting ? null : () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: submitting
                ? null
                : () async {
                    final a = parseMoneyInput(amount.text);
                    if (a == null) {
                      setDlg(() => error = 'Số tiền không hợp lệ');
                      return;
                    }
                    final token = validateRepaymentAmount(
                      debt.remainingMinor,
                      a,
                    );
                    // Snapshot for promotion — acc/cat mutate via the
                    // dropdowns so the compiler cannot promote them.
                    final account = acc;
                    final category = cat;
                    if (token != null || account == null || category == null) {
                      setDlg(
                        () => error = switch (token) {
                          'repayment_exceeds_remaining' =>
                            'Số tiền vượt phần còn lại '
                                '(${formatMoney(debt.remainingMinor)})',
                          'amount_must_be_positive' => 'Số tiền không hợp lệ',
                          _ => 'Thiếu thông tin',
                        },
                      );
                      return;
                    }
                    setDlg(() => submitting = true);
                    try {
                      await onSave(
                        DebtRepayment(
                          debtId: debt.id,
                          amountMinor: a,
                          accountId: account.id,
                          categoryId: category.id,
                          occurredOn: occurredOn,
                          note: note.text.trim(),
                          idempotencyKey: idempotencyKey,
                        ),
                      );
                    } catch (e) {
                      setDlg(() {
                        submitting = false;
                        error = debtErrorMessage(
                          e,
                          fallback: 'Không ghi được — thử lại',
                        );
                      });
                      return;
                    }
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  },
            child: Text(isPayable ? 'Trả' : 'Thu'),
          ),
        ],
      ),
    ),
  );
  return saved ?? false;
}
