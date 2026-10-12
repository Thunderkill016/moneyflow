import 'package:flutter/material.dart';
import '../../data/demo_store.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';

/// Dashboard loads its data through injected loaders so the same screen
/// serves demo mode (local seeds) and authenticated mode (Neon Data API).
class DashboardPage extends StatefulWidget {
  const DashboardPage({
    super.key,
    required this.loadAccounts,
    required this.loadTransactions,
    this.modeLabel,
    this.onSignOut,
  });

  factory DashboardPage.demo({VoidCallback? onSignOut}) => DashboardPage(
        loadAccounts: () async => DemoStore.seedAccounts(),
        loadTransactions: () async => DemoStore.seedTransactions(),
        modeLabel: 'demo',
        onSignOut: onSignOut,
      );

  final Future<List<AccountSummary>> Function() loadAccounts;
  final Future<List<Transaction>> Function() loadTransactions;
  final String? modeLabel;
  final VoidCallback? onSignOut;

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  late Future<({List<AccountSummary> accounts, List<Transaction> txs})> _data;

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<({List<AccountSummary> accounts, List<Transaction> txs})> _load() async {
    final accounts = await widget.loadAccounts();
    final txs = await widget.loadTransactions();
    return (accounts: accounts, txs: txs);
  }

  Future<void> _refresh() async {
    setState(() => _data = _load());
    try {
      await _data;
    } catch (_) {/* surfaced by the FutureBuilder */}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('MoneyFlow'),
        actions: [
          if (widget.modeLabel != null)
            Center(child: Text(widget.modeLabel!)),
          if (widget.onSignOut != null)
            IconButton(
              icon: const Icon(Icons.logout),
              tooltip: 'Đăng xuất',
              onPressed: widget.onSignOut,
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
                    child: Text('${snap.error}',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                      onPressed: _refresh, child: const Text('Thử lại')),
                ],
              ),
            );
          }
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final accounts = snap.data!.accounts;
          final txs = snap.data!.txs;
          final total = accounts.fold<int>(0, (s, a) => s + a.balance);
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                _TotalCard(total: total),
                const SizedBox(height: 20),
                Text('Tài khoản',
                    style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                for (final a in accounts) _AccountTile(account: a),
                const SizedBox(height: 20),
                Text('Hoạt động gần đây',
                    style: Theme.of(context).textTheme.titleMedium),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.add),
        label: const Text('Ghi khoản'),
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
            Text('Tổng số dư',
                style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            Text(
              formatMoney(total),
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
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
