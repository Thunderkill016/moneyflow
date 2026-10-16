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

  @override
  State<AccountRegisterPage> createState() => _AccountRegisterPageState();
}

/// Distance from the list end at which the next page is requested — the
/// same threshold the activity feed uses.
const _loadMoreThreshold = 300.0;

class _AccountRegisterPageState extends State<AccountRegisterPage> {
  late AccountSummary _account = widget.account;
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

  /// Bumped per first-page request so a slow older response can never
  /// overwrite a newer one (same guard as the activity feed).
  int _gen = 0;
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _loadFirst();
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
    });
    unawaited(_loadRecon(gen));
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
        if (fresh != null && mounted) setState(() => _account = fresh);
      } catch (_) {
        // Keep the last known balance; the row refresh below still runs.
      }
    }
    await _loadFirst();
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
    final state = _entryState(t.id);
    final recon = state == null ? '' : ' · ${entryStateLabel(state)}';
    return '$payee$base · ${formatYmdAsDmy(t.occurredOn)}$recon$review';
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
                          if (a.isArchived) ...[
                            const SizedBox(width: 8),
                            const Chip(
                              label: Text('Đã lưu trữ'),
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
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: const Icon(Icons.fact_check_outlined),
        title: Text(label ?? 'Đang tải trạng thái đối soát...'),
        trailing: widget.onOpenReconciliation == null
            ? null
            : TextButton(
                onPressed: _openReconciliation,
                child: const Text('Đối soát'),
              ),
        onTap: widget.onOpenReconciliation == null ? null : _openReconciliation,
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
      appBar: AppBar(title: Text('Sổ ${_account.name}')),
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
