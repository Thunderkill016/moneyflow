import 'package:flutter/material.dart';

import '../../domain/models.dart';
import '../../domain/money.dart';

/// Full transaction activity — soft-delete via long-press (the same
/// soft_delete_money_transaction RPC the web trash flow uses).
class ActivityPage extends StatefulWidget {
  const ActivityPage({
    super.key,
    required this.loadTransactions,
    required this.onDelete,
  });

  final Future<List<Transaction>> Function() loadTransactions;
  final Future<void> Function(String transactionId) onDelete;

  @override
  State<ActivityPage> createState() => _ActivityPageState();
}

class _ActivityPageState extends State<ActivityPage> {
  late Future<List<Transaction>> _txs;

  @override
  void initState() {
    super.initState();
    _txs = widget.loadTransactions();
  }

  Future<void> _refresh() async {
    setState(() {
      _txs = widget.loadTransactions();
    });
    try {
      await _txs;
    } catch (_) {}
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
      await widget.onDelete(tx.id);
      _refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hoạt động')),
      body: FutureBuilder(
        future: _txs,
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          final txs = snap.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                if (txs.isEmpty)
                  const Card(
                    child: ListTile(title: Text('Chưa có giao dịch nào')),
                  ),
                for (final t in txs)
                  _TxTile(tx: t, onLongPress: () => _confirmDelete(t)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TxTile extends StatelessWidget {
  const _TxTile({required this.tx, required this.onLongPress});
  final Transaction tx;
  final VoidCallback onLongPress;

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
        onLongPress: onLongPress,
      ),
    );
  }
}
