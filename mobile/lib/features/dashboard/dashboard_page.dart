import 'package:flutter/material.dart';
import '../../data/demo_store.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});

  @override
  Widget build(BuildContext context) {
    final accounts = DemoStore.seedAccounts();
    final transactions = DemoStore.seedTransactions();
    final total = accounts.fold<int>(0, (s, a) => s + a.balance);

    return Scaffold(
      appBar: AppBar(
        title: const Text('MoneyFlow'),
        actions: const [
          Padding(
            padding: EdgeInsets.only(right: 16),
            child: Center(child: Text('demo')),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _TotalCard(total: total),
          const SizedBox(height: 20),
          Text('Tài khoản', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final a in accounts) _AccountTile(account: a),
          const SizedBox(height: 20),
          Text('Hoạt động gần đây',
              style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final t in transactions) _TransactionTile(tx: t),
        ],
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
