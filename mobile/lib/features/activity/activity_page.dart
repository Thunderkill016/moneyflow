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
    this.onOpenTrash,
    this.onEdit,
  });

  final Future<List<Transaction>> Function() loadTransactions;
  final Future<void> Function(String transactionId) onDelete;

  /// Tap-to-edit entry — null keeps rows read-only (demo has no writes).
  final Future<void> Function(Transaction tx)? onEdit;

  /// Trash entry — null hides the action (demo deletes are no-ops, so a
  /// trash surface there would always be empty and misleading).
  final VoidCallback? onOpenTrash;

  @override
  State<ActivityPage> createState() => ActivityPageState();
}

class ActivityPageState extends State<ActivityPage> {
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

  /// Public reload for the nav shell after a capture save.
  void reload() => _refresh();

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
      appBar: AppBar(
        title: const Text('Hoạt động'),
        actions: [
          if (widget.onOpenTrash != null)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              tooltip: 'Thùng rác',
              onPressed: widget.onOpenTrash,
            ),
        ],
      ),
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
                    child: ListTile(
                      title: Text('Chưa có giao dịch nào'),
                      subtitle: Text(
                        'Bấm "Ghi" ở thanh dưới để thêm khoản đầu tiên',
                      ),
                    ),
                  ),
                for (final t in txs)
                  _TxTile(
                    tx: t,
                    onTap: widget.onEdit == null
                        ? null
                        : () async {
                            // update_money_transaction rejects multi-line
                            // splits — say so instead of failing on save.
                            if (t.isSplit) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                    'Khoản chia danh mục chưa sửa được — '
                                    'xóa rồi ghi lại',
                                  ),
                                ),
                              );
                              return;
                            }
                            await widget.onEdit!(t);
                            _refresh();
                          },
                    onLongPress: () => _confirmDelete(t),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _TxTile extends StatelessWidget {
  const _TxTile({required this.tx, required this.onLongPress, this.onTap});
  final Transaction tx;
  final VoidCallback onLongPress;
  final VoidCallback? onTap;

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
        onTap: onTap,
        onLongPress: onLongPress,
      ),
    );
  }
}
