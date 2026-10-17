import 'dart:async';

import 'package:flutter/material.dart';

import '../../domain/datetime_label.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/reconciliation.dart';
import '../../domain/register.dart';
import '../../domain/transaction_query.dart';
import '../../theme/mf_theme.dart';
import '../shared/timed_snack_bar.dart';
import 'accounts_page.dart' show accountFormErrorMessage;

/// One account's ledger — the mobile counterpart of the web's
/// /accounts/[id] register (src/components/account-detail-page.tsx).
///
/// Rows page in newest → oldest through [loadPage] under a fixed
/// `TransactionQuery(accountId)`. Each row shows the signed impact from
/// this account's side plus its running balance — `balanceAfter` chains
/// back from the stored current balance, so the newest row always shows
/// exactly the balance the accounts list reports (see register.dart).
///
/// The chain stays honest only while the loaded rows are a contiguous
/// prefix of the ledger: a page that failed to load stops the walk (the
/// older rows it would have accounted for are simply absent, so nothing
/// fabricated shows) and a reload re-anchors at a freshly fetched balance.
class AccountRegisterPage extends StatefulWidget {
  const AccountRegisterPage({
    super.key,
    required this.account,
    required this.loadPage,
    this.onEdit,
    this.onDelete,
    this.loadAccount,
    this.loadReconciliation,
    this.onOpenReconciliation,
    this.onAdjustBalance,
    this.loadReconcileReminder,
    this.onReconcileReminderChanged,
    this.loadShowRunningBalance,
    this.onRunningBalanceVisibleChanged,
    this.onArchiveAccount,
  });

  /// The account being viewed; [AccountSummary.balance] anchors the
  /// running-balance chain.
  final AccountSummary account;

  /// One page of the feed for an account-scoped query.
  final TransactionPageLoader loadPage;

  /// Tap-to-edit — null keeps rows read-only (demo has no writes).
  final Future<void> Function(Transaction tx)? onEdit;

  /// Long-press soft-delete — null disables the gesture (demo).
  final Future<void> Function(String transactionId)? onDelete;

  /// Refetches this account's summary after a mutation so the balance
  /// anchor moves with the ledger; null (or a null result, e.g. the
  /// account left the unarchived list) keeps the last known snapshot.
  final Future<AccountSummary?> Function()? loadAccount;

  /// "Đối soát" status strip — feeds the one-line state under the
  /// header ("Đã đối soát đến …" / "Đang đối soát kỳ …"). Null hides the
  /// affordance entirely (demo mode has no server contract).
  final Future<ReconciliationStateData> Function()? loadReconciliation;

  /// Opens the statement workspace; the register refreshes after it
  /// returns because a completion can post an adjustment transaction.
  final Future<void> Function()? onOpenReconciliation;

  /// "Điều chỉnh số dư" — the quick drift fix (posts a real labeled
  /// adjustment transaction through the host's dialog, never a silent
  /// balance overwrite). Null hides it — demo has no writes.
  final Future<bool> Function()? onAdjustBalance;

  /// Monthly reconcile nudge (D19) — reads this account's stored
  /// "statement day" (1–31, null = unset). The nudge is a device-local
  /// opt-in notification, never a ledger write; both seams must be
  /// wired for the affordance to show (demo keeps it hidden).
  final Future<int?> Function()? loadReconcileReminder;

  /// Persists a day-of-month (or clears it with null) and re-arms the
  /// device reminder. The write is device-local prefs + alarm — it
  /// returns after persisting so the UI can confirm truthfully.
  final Future<void> Function(int? day)? onReconcileReminderChanged;

  /// Running-balance column toggle (D20) — reads the stored display
  /// pref. Null keeps the column visible with no toggle affordance.
  final Future<bool> Function()? loadShowRunningBalance;

  /// Persists the new display choice. The chain is derived either way —
  /// the pref only gates whether each row renders its "Số dư" line.
  final Future<void> Function(bool visible)? onRunningBalanceVisibleChanged;

  /// Close/reopen the account itself — the Monarch close contract the
  /// Tài khoản page carries (`is_archived` flips, history untouched,
  /// reopenable anytime). Null hides the menu: demo registers stay
  /// read-only rather than advertising a write that can't run.
  final Future<void> Function(bool archived)? onArchiveAccount;

  @override
  State<AccountRegisterPage> createState() => _AccountRegisterPageState();
}

/// Distance from the list end at which the next page is requested — the
/// same threshold the activity feed uses.
const _loadMoreThreshold = 300.0;

class _AccountRegisterPageState extends State<AccountRegisterPage> {
  late AccountSummary _account = widget.account;

  /// Closed state the appbar menu owns — `loadAccount` drops archived
  /// accounts from the unarchived list, so `_account.isArchived` can go
  /// stale right after a close. This flag is the honest source for the
  /// header chip and the menu label; a successful refresh re-syncs it.
  late bool _closed = widget.account.isArchived;
  late final TransactionQuery _query = TransactionQuery(
    accountId: widget.account.id,
  );
  List<Transaction>? _rows;
  Object? _error;
  bool _hasMore = false;
  bool _loadingMore = false;
  bool _moreFailed = false;

  /// Reconciliation strip state — auxiliary to the ledger, so its
  /// failure never degrades the register itself.
  ReconciliationStateData? _recon;
  bool _reconFailed = false;

  /// The stored statement-day nudge (1–31); null = not set. A failed
  /// read is `_reminderFailed`, and the save path holds `_reminderBusy`
  /// so a double tap can't queue two writes.
  int? _reminderDay;
  bool _reminderFailed = false;
  bool _reminderBusy = false;

  /// The D20 running-balance display pref — default-ON so the column
  /// never flashes away and back while the pref read lands.
  bool _showRunningBalance = true;
  bool _balancePrefLoaded = false;

  /// Bumped per first-page request so a slow older response can never
  /// overwrite a newer one (same guard as the activity feed).
  int _gen = 0;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _loadFirst();
    _loadBalancePref();
  }

  /// One-shot display-pref read; a failed or absent seam simply keeps
  /// the column on — the register never loses its running balance to a
  /// prefs hiccup.
  Future<void> _loadBalancePref() async {
    final loader = widget.loadShowRunningBalance;
    if (loader == null) return;
    try {
      final v = await loader();
      if (!mounted) return;
      setState(() {
        _showRunningBalance = v;
        _balancePrefLoaded = true;
      });
    } catch (_) {
      if (mounted) setState(() => _balancePrefLoaded = true);
    }
  }

  /// Display-only flip — the derived chain keeps running underneath;
  /// this just gates whether each row renders its "Số dư" line.
  Future<void> _toggleRunningBalance() async {
    final save = widget.onRunningBalanceVisibleChanged;
    if (save == null) return;
    final next = !_showRunningBalance;
    setState(() => _showRunningBalance = next);
    try {
      await save(next);
    } catch (_) {
      // A failed pref write can't leave the UI lying — revert to what
      // the store still holds.
      if (mounted) setState(() => _showRunningBalance = !next);
    }
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _loadFirst() async {
    final gen = ++_gen;
    setState(() {
      _rows = null;
      _error = null;
      _moreFailed = false;
      _loadingMore = false;
      _recon = null;
      _reconFailed = false;
      _reminderFailed = false;
    });
    unawaited(_loadRecon(gen));
    unawaited(_loadReminder(gen));
    try {
      final page = await widget.loadPage(_query, offset: 0);
      if (!mounted || gen != _gen) return;
      setState(() {
        _rows = page.rows;
        _hasMore = page.hasMore;
      });
    } catch (e) {
      if (!mounted || gen != _gen) return;
      setState(() {
        _rows = null;
        _error = e;
      });
    }
  }

  /// The reconciliation strip loads beside the ledger, never inside it —
  /// a workspace read failure leaves the register rows fully usable.
  Future<void> _loadRecon(int gen) async {
    final loader = widget.loadReconciliation;
    if (loader == null) return;
    try {
      final data = await loader();
      if (!mounted || gen != _gen) return;
      setState(() {
        _recon = data;
        _reconFailed = false;
      });
    } catch (_) {
      if (!mounted || gen != _gen) return;
      setState(() => _reconFailed = true);
    }
  }

  /// The reminder pref reads beside the strip, never inside it — a bad
  /// read marks the row "Chưa tải được" instead of faking an unset day.
  Future<void> _loadReminder(int gen) async {
    final loader = widget.loadReconcileReminder;
    if (loader == null) return;
    try {
      final day = await loader();
      if (!mounted || gen != _gen) return;
      setState(() {
        _reminderDay = day;
        _reminderFailed = false;
      });
    } catch (_) {
      if (!mounted || gen != _gen) return;
      setState(() => _reminderFailed = true);
    }
  }

  /// The day picker — preselects the stored day, else the latest
  /// completed statement's day (the rhythm the user already keeps),
  /// else the 1st. "Tắt nhắc" clears; the persist runs after the dialog
  /// so a failed write keeps the previous day visible.
  Future<void> _editReminder() async {
    final save = widget.onReconcileReminderChanged;
    if (save == null || _reminderBusy) return;
    var suggested = 1;
    final latest = latestCompletedSession(_recon?.sessions ?? const []);
    if (latest != null) {
      suggested =
          int.tryParse(latest.statementDate.split('-').last) ?? suggested;
    }
    final result = await showDialog<({bool clear, int day})>(
      context: context,
      builder: (ctx) => _ReconcileReminderDialog(
        initialDay: _reminderDay ?? suggested,
        hasReminder: _reminderDay != null,
      ),
    );
    if (result == null || !mounted) return;
    setState(() => _reminderBusy = true);
    try {
      await save(result.clear ? null : result.day);
      if (!mounted) return;
      setState(() {
        _reminderDay = result.clear ? null : result.day;
        _reminderFailed = false;
      });
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        SnackBar(
          content: Text(
            result.clear
                ? 'Đã tắt nhắc đối soát'
                : 'Đã đặt nhắc đối soát ngày ${result.day} hằng tháng',
          ),
        ),
      );
    } catch (_) {
      if (!mounted) return;
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        const SnackBar(content: Text('Không lưu được cài đặt nhắc — thử lại.')),
      );
    } finally {
      if (mounted) setState(() => _reminderBusy = false);
    }
  }

  /// Opens the statement workspace, then re-anchors everything: a
  /// completion can post an adjustment transaction, so the ledger, the
  /// balance header and the strip all re-read together.
  Future<void> _openReconciliation() async {
    final open = widget.onOpenReconciliation;
    if (open == null) return;
    await open();
    if (mounted) await _refresh();
  }

  Future<void> _loadMore() async {
    final rows = _rows;
    if (rows == null || !_hasMore || _loadingMore) return;
    final gen = _gen;
    setState(() {
      _loadingMore = true;
      _moreFailed = false;
    });
    try {
      final page = await widget.loadPage(_query, offset: rows.length);
      if (!mounted || gen != _gen) return;
      setState(() {
        _rows = [...rows, ...page.rows];
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted || gen != _gen) return;
      setState(() {
        _loadingMore = false;
        _moreFailed = true;
      });
    }
  }

  void _onScroll() {
    if (_moreFailed) return; // wait for the explicit retry
    if (_scroll.position.extentAfter < _loadMoreThreshold) _loadMore();
  }

  /// Reload the anchor and the ledger together — an edit/delete moved
  /// both, so re-anchoring without refetching rows (or vice versa) would
  /// show a balance the displayed rows no longer explain.
  Future<void> _refresh() async {
    final loader = widget.loadAccount;
    if (loader != null) {
      try {
        final fresh = await loader();
        // An account that vanished from the list (e.g. just archived)
        // keeps its last snapshot — the register stays readable.
        if (fresh != null && mounted) {
          setState(() {
            _account = fresh;
            _closed = fresh.isArchived;
          });
        }
      } catch (_) {
        // Keep the last known balance; the row refresh below still runs.
      }
    }
    await _loadFirst();
  }

  /// "Đóng" asks first — same confirmation copy as the Tài khoản row,
  /// because the consequence (hidden from pickers, history kept,
  /// reopenable) is identical no matter which surface fired it.
  Future<void> _confirmClose() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Đóng "${_account.name}"?'),
        content: const Text(
          'Tài khoản sẽ ẩn khỏi danh sách và bộ chọn; giao dịch cũ vẫn '
          'giữ — mở lại được bất cứ lúc nào.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đóng'),
          ),
        ],
      ),
    );
    if (ok == true) await _applyClosed(true);
  }

  /// Closing asks first; reopening is immediate — the Tài khoản row's
  /// exact contract. A failed write surfaces instead of flipping the
  /// flag optimistically.
  Future<void> _applyClosed(bool closed) async {
    final seam = widget.onArchiveAccount;
    if (seam == null) return;
    try {
      await seam(closed);
    } catch (e) {
      if (mounted) {
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          SnackBar(content: Text(accountFormErrorMessage(e))),
        );
      }
      return;
    }
    if (!mounted) return;
    setState(() => _closed = closed);
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(
        content: Text(closed ? 'Đã đóng tài khoản.' : 'Đã mở lại tài khoản.'),
      ),
    );
  }

  Future<void> _confirmDelete(Transaction tx) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Xóa giao dịch?'),
        content: Text(
          '${tx.note.isEmpty ? tx.category : tx.note} — ${formatMoney(tx.amount)}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xóa'),
          ),
        ],
      ),
    );
    if (ok == true) {
      try {
        await widget.onDelete!(tx.id);
      } catch (e) {
        if (mounted) {
          showTimedSnackBar(
            ScaffoldMessenger.of(context),
            SnackBar(content: Text(transactionDeleteErrorMessage(e))),
          );
        }
        return;
      }
      _refresh();
    }
  }

  /// The adjustment posts a real ledger transaction — refresh both the
  /// balance anchor and the feed when the host reports it landed.
  Future<void> _adjustBalance() async {
    final adjusted = await widget.onAdjustBalance!();
    if (adjusted) _refresh();
  }

  Future<void> _openEdit(Transaction t) async {
    // update_money_transaction rejects multi-line splits — say so
    // instead of failing on save (same guard as the activity feed).
    if (t.isSplit) {
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        const SnackBar(
          content: Text('Khoản chia danh mục chưa sửa được — xóa rồi ghi lại'),
        ),
      );
      return;
    }
    await widget.onEdit!(t);
    _refresh();
  }

  String _subtitle(AccountRegisterEntry e) {
    final t = e.transaction;
    final payee = t.payee != null && t.payee!.isNotEmpty ? '${t.payee} · ' : '';
    // Mirror the web's row subtitle: transfers name the counterparty so the
    // signed amount can never read as income/expense.
    final base = t.kind == TransactionKind.transfer
        ? (e.direction == RegisterDirection.inflow
              ? 'Nhận từ ${e.transferCounterparty ?? 'tài khoản khác'} · '
                    'không tính thu nhập'
              : 'Chuyển đến ${e.transferCounterparty ?? 'tài khoản khác'} · '
                    'không tính chi tiêu')
        : t.category;
    final review = t.reviewStatus == TransactionReviewStatus.needsReview
        ? '\nCần xem lại'
        : '';
    // D15 — the row is money-in but nets an expense category; say so.
    final refund = t.isRefund ? '\nHoàn tiền' : '';
    final state = _entryState(t.id);
    final recon = state == null ? '' : ' · ${entryStateLabel(state)}';
    return '$payee$base · ${formatYmdAsDmy(t.occurredOn)}$recon$review$refund';
  }

  /// Reconciliation state of a row, from the strip's already-loaded feed —
  /// null (badge hidden, rows stay editable) until that read lands or when
  /// the contract is unavailable.
  EntryReconciliationState? _entryState(String transactionId) {
    final data = _recon;
    if (data == null || !data.featureAvailable) return null;
    for (final r in data.rows) {
      if (r.transactionId == transactionId) return r.state;
    }
    return null;
  }

  bool _isReconciled(String transactionId) =>
      _entryState(transactionId) == EntryReconciliationState.reconciled;

  Widget _header() {
    final a = _account;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(child: Text(a.name.characters.first)),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              a.name,
                              style: Theme.of(context).textTheme.titleMedium,
                            ),
                          ),
                          if (_closed) ...[
                            const SizedBox(width: 8),
                            const Chip(
                              label: Text('Đã đóng'),
                              visualDensity: VisualDensity.compact,
                            ),
                          ],
                        ],
                      ),
                      Text(
                        '${accountKindLabel(a.kind)} · ${a.currencyCode}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Số dư hiện tại',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            Text(
              formatMoney(a.balance),
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(
              'Số dư ban đầu: ${formatMoney(a.initialBalance)}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (widget.onAdjustBalance != null)
              TextButton.icon(
                onPressed: _adjustBalance,
                icon: const Icon(Icons.tune, size: 18),
                label: const Text('Điều chỉnh số dư'),
              ),
          ],
        ),
      ),
    );
  }

  /// "Đối soát" strip — one honest line from
  /// public.account_reconciliation_summaries: the open period, else the
  /// latest completed statement date, else "Chưa có kỳ đối soát". Hidden
  /// when the seam is absent (demo) or the contract is not deployed.
  Widget _reconCard() {
    if (widget.loadReconciliation == null) return const SizedBox.shrink();
    final String? label;
    if (_reconFailed) {
      label = 'Chưa tải được trạng thái đối soát';
    } else {
      label = _recon == null ? null : reconciliationStatusLabel(_recon!);
    }
    // The D19 nudge row sits inside the same card — it reads the same
    // reconcile rhythm the strip reports. It needs BOTH seams: without
    // a reader the row can't state the truth, without a writer tapping
    // would lie. Demo wires neither, so the row never dead-renders.
    final reminderWired =
        widget.loadReconcileReminder != null &&
        widget.onReconcileReminderChanged != null;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.fact_check_outlined),
            title: Text(label ?? 'Đang tải trạng thái đối soát...'),
            trailing: widget.onOpenReconciliation == null
                ? null
                : TextButton(
                    onPressed: _openReconciliation,
                    child: const Text('Đối soát'),
                  ),
            onTap: widget.onOpenReconciliation == null
                ? null
                : _openReconciliation,
          ),
          if (reminderWired) ...[
            const Divider(height: 1),
            ListTile(
              dense: true,
              leading: Icon(
                _reminderDay == null
                    ? Icons.notifications_none
                    : Icons.notifications_active_outlined,
              ),
              title: Text(
                _reminderDay == null
                    ? 'Nhắc đối soát hằng tháng'
                    : 'Nhắc đối soát — ngày $_reminderDay hằng tháng',
              ),
              // The statement-day copy must say what the alarm actually
              // does: a 29–31 pick clamps to the month's real last day
              // (same rule as commitment dues).
              subtitle: _reminderFailed
                  ? const Text('Chưa tải được cài đặt nhắc')
                  : _reminderDay != null && _reminderDay! > 28
                  ? const Text('Tháng thiếu ngày sẽ nhắc vào ngày cuối tháng')
                  : null,
              trailing: _reminderBusy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.chevron_right),
              onTap: _reminderBusy ? null : _editReminder,
            ),
          ],
        ],
      ),
    );
  }

  Widget _entryTile(AccountRegisterEntry e) {
    final tx = e.transaction;
    // Web signed-mode tone: + green, − red; the subtitle's "Nhận
    // từ/Chuyển đến" wording (not color) is what marks a transfer.
    final color = e.impact > 0
        ? context.mf.incomeText
        : e.impact < 0
        ? context.mf.expenseText
        : null;
    final locked = _isReconciled(tx.id);
    final canDelete = widget.onDelete != null && !locked;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          Expanded(
            child: ListTile(
              leading: Icon(
                tx.kind == TransactionKind.transfer
                    ? Icons.swap_horiz
                    : Icons.receipt_outlined,
              ),
              title: Text(tx.note.isEmpty ? tx.category : tx.note),
              subtitle: Text(_subtitle(e)),
              isThreeLine:
                  tx.reviewStatus == TransactionReviewStatus.needsReview,
              trailing: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatSignedMoney(e.impact),
                    style: TextStyle(color: color, fontWeight: FontWeight.w600),
                  ),
                  // D20 — the per-row running balance is a display pref;
                  // the chain still derives, the line just hides.
                  if (_showRunningBalance)
                    Text(
                      'Số dư ${formatMoney(e.balanceAfter)}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
              contentPadding: const EdgeInsets.only(left: 16, right: 4),
              // The server rejects edits/deletes of reconciled rows, so
              // lock them.
              onTap: widget.onEdit == null || locked
                  ? null
                  : () => _openEdit(tx),
              onLongPress: canDelete ? () => _confirmDelete(tx) : null,
            ),
          ),
          // Visible affordance — the web register row has a delete button
          // too; long-press alone was unfindable.
          if (canDelete)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: IconButton(
                icon: Icon(
                  Icons.delete_outline,
                  size: 20,
                  color: Theme.of(context).colorScheme.error,
                ),
                tooltip: 'Xóa giao dịch',
                visualDensity: VisualDensity.compact,
                onPressed: () => _confirmDelete(tx),
              ),
            ),
        ],
      ),
    );
  }

  Widget _footer() {
    if (_loadingMore) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_moreFailed) {
      return Card(
        child: ListTile(
          title: const Text('Không tải thêm được'),
          trailing: TextButton(
            onPressed: _loadMore,
            child: const Text('Thử lại'),
          ),
        ),
      );
    }
    return const SizedBox.shrink();
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    final entries = rows == null
        ? const <AccountRegisterEntry>[]
        : buildAccountRegister(
            currentBalance: _account.balance,
            accountId: _account.id,
            newestFirst: rows,
          );
    return Scaffold(
      appBar: AppBar(
        title: Text('Sổ ${_account.name}'),
        actions: [
          // D20 running-balance toggle — only once the pref has actually
          // landed (and only when a writer seam exists), so the icon
          // never advertises a state the store can't confirm.
          if (widget.onRunningBalanceVisibleChanged != null &&
              _balancePrefLoaded)
            IconButton(
              icon: Icon(
                _showRunningBalance
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
              ),
              tooltip: _showRunningBalance ? 'Ẩn số dư' : 'Hiện số dư',
              onPressed: _toggleRunningBalance,
            ),
          // Close/reopen lives here too — the same Monarch contract the
          // Tài khoản row's overflow carries, so a wallet discovered via
          // the dashboard strip gets the same lifecycle action.
          if (widget.onArchiveAccount != null)
            PopupMenuButton<String>(
              tooltip: 'Tùy chọn ${_account.name}',
              onSelected: (action) {
                switch (action) {
                  case 'archive':
                    _confirmClose();
                  case 'reopen':
                    _applyClosed(false);
                }
              },
              itemBuilder: (ctx) => [
                _closed
                    ? const PopupMenuItem(
                        value: 'reopen',
                        child: Text('Mở lại tài khoản'),
                      )
                    : const PopupMenuItem(
                        value: 'archive',
                        child: Text('Đóng tài khoản'),
                      ),
              ],
            ),
        ],
      ),
      body: _error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Không tải được sổ giao dịch'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _loadFirst,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            )
          : rows == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  _header(),
                  _reconCard(),
                  if (entries.isEmpty)
                    const Card(
                      child: ListTile(
                        title: Text('Chưa có giao dịch nào'),
                        subtitle: Text(
                          'Giao dịch trên tài khoản này sẽ hiện ở đây',
                        ),
                      ),
                    )
                  else
                    ...entries.map(_entryTile),
                  _footer(),
                ],
              ),
            ),
    );
  }
}

/// The statement-day picker for the D19 reconcile nudge — a plain
/// day-of-month choice with an honest end-of-month note for 29–31.
/// Returns `({clear: true, ...})` from "Tắt nhắc", a picked day from
/// "Lưu", or null on cancel.
class _ReconcileReminderDialog extends StatefulWidget {
  const _ReconcileReminderDialog({
    required this.initialDay,
    required this.hasReminder,
  });

  final int initialDay;

  /// Whether a reminder is currently armed — "Tắt nhắc" only makes
  /// sense as a disable for an existing one.
  final bool hasReminder;

  @override
  State<_ReconcileReminderDialog> createState() =>
      _ReconcileReminderDialogState();
}

class _ReconcileReminderDialogState extends State<_ReconcileReminderDialog> {
  late int _day = widget.initialDay;

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Nhắc đối soát hằng tháng'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'MoneyFlow nhắc vào sáng ngày sao kê để bạn đối chiếu số dư.',
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            initialValue: _day,
            decoration: const InputDecoration(labelText: 'Ngày sao kê'),
            items: [
              for (var d = 1; d <= 31; d++)
                DropdownMenuItem(value: d, child: Text('Ngày $d')),
            ],
            onChanged: (v) => setState(() => _day = v ?? _day),
          ),
          if (_day > 28) ...[
            const SizedBox(height: 8),
            Text(
              'Tháng không có ngày $_day sẽ nhắc vào ngày cuối tháng.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ],
      ),
      actions: [
        if (widget.hasReminder)
          TextButton(
            onPressed: () =>
                Navigator.of(context).pop((clear: true, day: _day)),
            child: const Text('Tắt nhắc'),
          ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop((clear: false, day: _day)),
          child: const Text('Lưu'),
        ),
      ],
    );
  }
}
