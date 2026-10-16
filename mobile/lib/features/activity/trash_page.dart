import 'package:flutter/material.dart';

import '../../domain/datetime_label.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../theme/mf_theme.dart';
import '../shared/empty_state.dart';
import '../shared/timed_snack_bar.dart';

/// Trash surface — soft-deleted ledger rows with explicit restore,
/// mirroring the web's /transactions/trash contract.
class TrashPage extends StatefulWidget {
  const TrashPage({
    super.key,
    required this.loadDeleted,
    required this.onRestore,
    this.onDelete,
  });

  final Future<List<DeletedTransaction>> Function() loadDeleted;
  final Future<void> Function(String transactionId) onRestore;

  /// Permanent delete (hard delete). Null hides every destructive
  /// affordance — demo mode never fakes a purge.
  final Future<void> Function(String transactionId)? onDelete;

  @override
  State<TrashPage> createState() => _TrashPageState();
}

class _TrashPageState extends State<TrashPage> {
  late Future<List<DeletedTransaction>> _deleted;
  bool _changed = false;

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
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          const SnackBar(content: Text('Không khôi phục được — thử lại')),
        );
      }
      return;
    }
    _changed = true;
    if (mounted) {
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        const SnackBar(content: Text('Đã khôi phục')),
      );
    }
    await _refresh();
  }

  Future<bool> _confirm({
    required String title,
    required String body,
    required String confirmLabel,
  }) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(body),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return ok ?? false;
  }

  Future<void> _purgeOne(DeletedTransaction item) async {
    final onDelete = widget.onDelete;
    if (onDelete == null) return;
    final ok = await _confirm(
      title: 'Xóa vĩnh viễn?',
      body: 'Giao dịch sẽ bị xóa khỏi thùng rác và không thể khôi phục.',
      confirmLabel: 'Xóa vĩnh viễn',
    );
    if (!ok || !mounted) return;
    try {
      await onDelete(item.transaction.id);
    } catch (e) {
      debugPrint('permanent delete failed: $e');
      if (mounted) {
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          const SnackBar(content: Text('Không xóa được — thử lại.')),
        );
      }
      return;
    }
    _changed = true;
    if (mounted) {
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        const SnackBar(content: Text('Đã xóa vĩnh viễn')),
      );
    }
    await _refresh();
  }

  Future<void> _purgeAll(List<DeletedTransaction> items) async {
    final onDelete = widget.onDelete;
    if (onDelete == null || items.isEmpty) return;
    final ok = await _confirm(
      title: 'Dọn sạch thùng rác?',
      body:
          'Xóa vĩnh viễn ${items.length} giao dịch trong thùng rác. '
          'Không thể khôi phục.',
      confirmLabel: 'Xóa hết',
    );
    if (!ok || !mounted) return;
    try {
      for (final item in items) {
        await onDelete(item.transaction.id);
      }
    } catch (_) {
      if (mounted) {
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          const SnackBar(
            content: Text('Chưa dọn hết — một số giao dịch vẫn còn.'),
          ),
        );
      }
      await _refresh();
      return;
    }
    _changed = true;
    if (mounted) {
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        const SnackBar(content: Text('Đã dọn sạch thùng rác')),
      );
    }
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Back returns whether anything changed (restored or purged) so
      // the caller can reload the live surfaces (feed, balances).
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Thùng rác'),
          actions: [
            if (widget.onDelete != null)
              // Latest snapshot decides visibility — an empty list hides it.
              FutureBuilder<List<DeletedTransaction>>(
                future: _deleted,
                builder: (context, snap) {
                  final items = snap.data ?? const <DeletedTransaction>[];
                  if (items.isEmpty) return const SizedBox.shrink();
                  return IconButton(
                    tooltip: 'Dọn sạch thùng rác',
                    onPressed: () => _purgeAll(items),
                    icon: const Icon(Icons.delete_sweep_outlined),
                  );
                },
              ),
          ],
        ),
        body: FutureBuilder(
          future: _deleted,
          builder: (context, snap) {
            // Same failure contract as the dashboard: an explicit
            // friendly message + retry, never a forever spinner.
            if (snap.hasError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được thùng rác'),
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
            final items = snap.data!;
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (items.isEmpty)
                    const EmptyStateCard(
                      icon: Icons.delete_outline,
                      title: 'Thùng rác trống',
                      message: 'Giao dịch đã xóa sẽ nằm ở đây để khôi phục.',
                    ),
                  for (final item in items)
                    _DeletedTile(
                      item: item,
                      onRestore: () => _restore(item),
                      onDelete: widget.onDelete == null
                          ? null
                          : () => _purgeOne(item),
                    ),
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
  const _DeletedTile({
    required this.item,
    required this.onRestore,
    this.onDelete,
  });

  final DeletedTransaction item;
  final VoidCallback onRestore;

  /// Permanent delete affordance — null hides it (demo honesty).
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final tx = item.transaction;
    final mf = context.mf;
    final (kind, color) = switch (tx.kind) {
      TransactionKind.income => (MoneySignKind.income, mf.incomeText),
      TransactionKind.expense => (MoneySignKind.expense, mf.expenseText),
      TransactionKind.transfer => (MoneySignKind.transfer, mf.transferText),
    };
    final deletedLabel = formatDeletedAtLabel(item.deletedAt);
    final accountLine = tx.destinationAccount == null
        ? tx.account
        : '${tx.account} → ${tx.destinationAccount}';

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text(
          '${tx.category} · $accountLine · ${formatYmdAsDmy(tx.occurredOn)}'
          '${deletedLabel.isEmpty ? '' : '\nĐã xóa lúc $deletedLabel'}',
        ),
        isThreeLine: deletedLabel.isNotEmpty,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              formatMoneyWithKind(tx.amount, kind),
              maxLines: 1,
              style: mfMoneyStyle(
                TextStyle(color: color, fontWeight: FontWeight.w700),
              ),
            ),
            const SizedBox(width: 4),
            TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onRestore,
              child: const Text('Khôi phục'),
            ),
            if (onDelete != null)
              IconButton(
                tooltip: 'Xóa vĩnh viễn',
                onPressed: onDelete,
                icon: const Icon(Icons.delete_forever_outlined),
              ),
          ],
        ),
      ),
    );
  }
}
