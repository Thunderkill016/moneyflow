import 'package:flutter/material.dart';
import '../../data/demo_store.dart';
import '../../data/offline_cache.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';

/// One entry in the dashboard overflow menu — keeps the appbar to a single
/// quick action (activity) as the surface count grows.
class DashboardMenuItem {
  const DashboardMenuItem({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
}

/// Dashboard loads its data through injected loaders so the same screen
/// serves demo mode (local seeds) and authenticated mode (Neon Data API).
class DashboardPage extends StatefulWidget {
  const DashboardPage({
    super.key,
    required this.loadAccounts,
    required this.loadTransactions,
    this.modeLabel,
    this.menuItems = const [],
    this.readSnapshot,
    this.writeSnapshot,
  });

  factory DashboardPage.demo({VoidCallback? onSignOut}) => DashboardPage(
    loadAccounts: () async => DemoStore.seedAccounts(),
    loadTransactions: () async => DemoStore.seedTransactions(),
    modeLabel: 'demo',
    menuItems: [
      if (onSignOut != null)
        DashboardMenuItem(
          label: 'Đăng xuất',
          icon: Icons.logout,
          onTap: onSignOut,
        ),
    ],
  );

  final Future<List<AccountSummary>> Function() loadAccounts;
  final Future<List<Transaction>> Function() loadTransactions;
  final String? modeLabel;
  final List<DashboardMenuItem> menuItems;

  /// Offline read-back: when the loaders throw and a snapshot exists, the
  /// dashboard renders it under an explicit stale label — never as fresh.
  final DashboardSnapshot? Function()? readSnapshot;

  /// Called with a fresh snapshot after every successful load.
  final Future<void> Function(DashboardSnapshot snapshot)? writeSnapshot;

  @override
  State<DashboardPage> createState() => DashboardPageState();
}

class DashboardPageState extends State<DashboardPage> {
  late Future<
    ({List<AccountSummary> accounts, List<Transaction> txs, int? savedAtMs})
  >
  _data;

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  /// Fresh load wins; on failure the saved snapshot renders under a stale
  /// label. A snapshot is only a fallback — it never masks a loader error
  /// as success.
  Future<
    ({List<AccountSummary> accounts, List<Transaction> txs, int? savedAtMs})
  >
  _load() async {
    try {
      final accounts = await widget.loadAccounts();
      final txs = await widget.loadTransactions();
      final snap = DashboardSnapshot(
        savedAtMs: DateTime.now().millisecondsSinceEpoch,
        accounts: accounts,
        transactions: txs,
      );
      // Persisting must not fail the render path.
      await widget.writeSnapshot?.call(snap).catchError((_) {});
      return (accounts: accounts, txs: txs, savedAtMs: null);
    } catch (e) {
      final cached = widget.readSnapshot?.call();
      if (cached == null) rethrow;
      return (
        accounts: cached.accounts,
        txs: cached.transactions,
        savedAtMs: cached.savedAtMs,
      );
    }
  }

  Future<void> _refresh() async {
    setState(() => _data = _load());
    try {
      await _data;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
  }

  /// Public reload for the nav shell after a capture save.
  void reload() => _refresh();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MoneyFlow'),
        actions: [
          if (widget.modeLabel != null) Center(child: Text(widget.modeLabel!)),
          if (widget.menuItems.isNotEmpty)
            PopupMenuButton<int>(
              icon: const Icon(Icons.more_vert),
              onSelected: (i) => widget.menuItems[i].onTap(),
              itemBuilder: (ctx) => [
                for (var i = 0; i < widget.menuItems.length; i++)
                  PopupMenuItem(
                    value: i,
                    child: ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: Icon(widget.menuItems[i].icon),
                      title: Text(widget.menuItems[i].label),
                    ),
                  ),
              ],
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: FutureBuilder(
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
                      '${snap.error}',
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
          final accounts = snap.data!.accounts;
          final txs = snap.data!.txs;
          final savedAtMs = snap.data!.savedAtMs;
          final total = accounts.fold<int>(0, (s, a) => s + a.balance);
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (savedAtMs != null) _StaleBanner(savedAtMs: savedAtMs),
                _TotalCard(total: total),
                const SizedBox(height: 20),
                Text(
                  'Tài khoản',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                for (final a in accounts) _AccountTile(account: a),
                const SizedBox(height: 20),
                Text(
                  'Hoạt động gần đây',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                if (txs.isEmpty)
                  const Card(
                    child: ListTile(title: Text('Chưa có giao dịch nào')),
                  ),
                for (final t in txs) _TransactionTile(tx: t),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Offline indicator — labels restored data with its save time so stale
/// numbers can never be mistaken for the live ledger.
class _StaleBanner extends StatelessWidget {
  const _StaleBanner({required this.savedAtMs});
  final int savedAtMs;

  @override
  Widget build(BuildContext context) {
    final saved = DateTime.fromMillisecondsSinceEpoch(savedAtMs);
    final hh = saved.hour.toString().padLeft(2, '0');
    final mm = saved.minute.toString().padLeft(2, '0');
    final dd = saved.day.toString().padLeft(2, '0');
    final mo = saved.month.toString().padLeft(2, '0');
    return Card(
      color: Theme.of(context).colorScheme.errorContainer,
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        dense: true,
        leading: const Icon(Icons.wifi_off),
        title: const Text('Ngoại tuyến — dữ liệu đã lưu'),
        subtitle: Text('Cập nhật lúc $hh:$mm $dd/$mo'),
      ),
    );
  }
}

class _TotalCard extends StatelessWidget {
  const _TotalCard({required this.total});
  final int total;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Tổng số dư', style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            Text(
              formatMoney(total),
              style: Theme.of(
                context,
              ).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}

class _AccountTile extends StatelessWidget {
  const _AccountTile({required this.account});
  final AccountSummary account;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(account.name.characters.first)),
        title: Text(account.name),
        subtitle: Text(_kindLabel(account.kind)),
        trailing: Text(formatMoney(account.balance)),
      ),
    );
  }

  String _kindLabel(AccountKind kind) => switch (kind) {
    AccountKind.cash => 'Tiền mặt',
    AccountKind.bank => 'Ngân hàng',
    AccountKind.eWallet => 'Ví điện tử',
    AccountKind.creditCard => 'Thẻ tín dụng',
    AccountKind.savings => 'Tiết kiệm',
  };
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.tx});
  final Transaction tx;

  @override
  Widget build(BuildContext context) {
    final kind = switch (tx.kind) {
      TransactionKind.income => MoneySignKind.income,
      TransactionKind.expense => MoneySignKind.expense,
      TransactionKind.transfer => MoneySignKind.transfer,
    };
    final color = switch (tx.kind) {
      TransactionKind.income => Colors.green.shade700,
      TransactionKind.expense => Colors.red.shade700,
      TransactionKind.transfer => Colors.blueGrey.shade700,
    };
    final accountLine = tx.destinationAccount == null
        ? tx.account
        : '${tx.account} → ${tx.destinationAccount}';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text('${tx.category} · $accountLine · ${tx.occurredOn}'),
        trailing: Text(
          formatMoneyWithKind(tx.amount, kind),
          style: TextStyle(color: color, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}
