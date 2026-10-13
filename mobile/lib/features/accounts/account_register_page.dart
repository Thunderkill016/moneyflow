import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/register.dart';
import '../../domain/transaction_query.dart';

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
    });
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
      await widget.onDelete!(tx.id);
      _refresh();
    }
  }

  Future<void> _openEdit(Transaction t) async {
    // update_money_transaction rejects multi-line splits — say so
    // instead of failing on save (same guard as the activity feed).
    if (t.isSplit) {
      ScaffoldMessenger.of(context).showSnackBar(
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
              ? 'Nhận từ ${e.transferCounterparty ?? 'tài khoản khác'}'
              : 'Chuyển đến ${e.transferCounterparty ?? 'tài khoản khác'}')
        : t.category;
    final review = t.reviewStatus == TransactionReviewStatus.needsReview
        ? '\nCần xem lại'
        : '';
    return '$payee$base · ${t.occurredOn}$review';
  }

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
          ],
        ),
      ),
    );
  }

  Widget _entryTile(AccountRegisterEntry e) {
    final tx = e.transaction;
    // Web signed-mode tone: + green, − red; the subtitle's "Nhận
    // từ/Chuyển đến" wording (not color) is what marks a transfer.
    final color = e.impact > 0
        ? Colors.green.shade700
        : e.impact < 0
        ? Colors.red.shade700
        : null;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(
          tx.kind == TransactionKind.transfer
              ? Icons.swap_horiz
              : Icons.receipt_outlined,
        ),
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text(_subtitle(e)),
        isThreeLine: tx.reviewStatus == TransactionReviewStatus.needsReview,
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
        onTap: widget.onEdit == null ? null : () => _openEdit(tx),
        onLongPress: widget.onDelete == null ? null : () => _confirmDelete(tx),
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
