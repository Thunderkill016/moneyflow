import 'package:flutter/material.dart';

import '../../domain/datetime_label.dart';
import '../../domain/models.dart';

/// Trash surface — soft-deleted ledger rows with explicit restore,
/// mirroring the web's /transactions/trash contract.
class TrashPage extends StatefulWidget {
  const TrashPage({
    super.key,
    required this.loadDeleted,
    required this.onRestore,
  });

  final Future<List<DeletedTransaction>> Function() loadDeleted;
  final Future<void> Function(String transactionId) onRestore;

  @override
  State<TrashPage> createState() => _TrashPageState();
}

class _TrashPageState extends State<TrashPage> {
  late Future<List<DeletedTransaction>> _deleted;
  bool _restored = false;

  @override
  void initState() {
    super.initState();
    _deleted = widget.loadDeleted();
  }

  Future<void> _refresh() async {
    final next = widget.loadDeleted();
    setState(() {
      _deleted = next;
    });
    try {
      await next;
    } catch (_) {}
  }

  Future<void> _restore(DeletedTransaction item) async {
    try {
      await widget.onRestore(item.transaction.id);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không khôi phục được — thử lại')),
        );
      }
      return;
    }
    _restored = true;
    if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Đã khôi phục')));
    }
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Back returns whether anything was restored so the caller can
      // reload the live surfaces (activity feed, dashboard balances).
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_restored);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Thùng rác')),
        body: FutureBuilder(
          future: _deleted,
          builder: (context, snap) {
            if (!snap.hasData) {
              return const Center(child: CircularProgressIndicator());
            }
            final items = snap.data!;
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (items.isEmpty)
                    const Card(child: ListTile(title: Text('Thùng rác trống'))),
                  for (final item in items)
                    _DeletedTile(item: item, onRestore: () => _restore(item)),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _DeletedTile extends StatelessWidget {
  const _DeletedTile({required this.item, required this.onRestore});

  final DeletedTransaction item;
  final VoidCallback onRestore;

  @override
  Widget build(BuildContext context) {
    final tx = item.transaction;
    final deletedLabel = formatDeletedAtLabel(item.deletedAt);
    final accountLine = tx.destinationAccount == null
        ? tx.account
        : '${tx.account} → ${tx.destinationAccount}';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text(
          '${tx.category} · $accountLine · ${tx.occurredOn}'
          '${deletedLabel.isEmpty ? '' : '\nĐã xóa lúc $deletedLabel'}',
        ),
        isThreeLine: deletedLabel.isNotEmpty,
        trailing: TextButton(
          onPressed: onRestore,
          child: const Text('Khôi phục'),
        ),
      ),
    );
  }
}
