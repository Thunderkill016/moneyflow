import 'package:flutter/material.dart';

import '../../domain/bulk.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../capture/category_picker.dart';

/// Full transaction activity — soft-delete via long-press (the same
/// soft_delete_money_transaction RPC the web trash flow uses), tap to
/// edit, and a select mode for bulk review / category correction.
class ActivityPage extends StatefulWidget {
  const ActivityPage({
    super.key,
    required this.loadTransactions,
    required this.onDelete,
    this.onOpenTrash,
    this.onEdit,
    this.onBulkReview,
    this.onBulkCategory,
    this.loadCategories,
  });

  final Future<List<Transaction>> Function() loadTransactions;
  final Future<void> Function(String transactionId) onDelete;

  /// Tap-to-edit entry — null keeps rows read-only (demo has no writes).
  final Future<void> Function(Transaction tx)? onEdit;

  /// Trash entry — null hides the action (demo deletes are no-ops, so a
  /// trash surface there would always be empty and misleading).
  final VoidCallback? onOpenTrash;

  /// Bulk writes — null (demo) hides the select mode entirely.
  final Future<void> Function(List<String> ids, {required bool reviewed})?
  onBulkReview;
  final Future<void> Function(List<String> ids, String categoryId)?
  onBulkCategory;
  final Future<List<Category>> Function()? loadCategories;

  @override
  State<ActivityPage> createState() => ActivityPageState();
}

class ActivityPageState extends State<ActivityPage> {
  late Future<List<Transaction>> _txs;
  bool _selecting = false;
  bool _onlyNeedsReview = false;
  final Set<String> _selected = {};

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

  bool get _canSelect => widget.onBulkReview != null;

  void _exitSelect() => setState(() {
    _selecting = false;
    _selected.clear();
  });

  void _toggle(Transaction t) => setState(() {
    if (!_selected.remove(t.id)) {
      if (_selected.length >= maxBulkSelection) {
        _snack('Chọn tối đa $maxBulkSelection giao dịch một lần');
        return;
      }
      _selected.add(t.id);
    }
  });

  void _snack(String message) => ScaffoldMessenger.of(
    context,
  ).showSnackBar(SnackBar(content: Text(message)));

  String _bulkError(Object e) {
    final msg = e.toString();
    if (msg.contains('bulk_transfer_category_locked')) {
      return 'Khoản chuyển không có danh mục';
    }
    if (msg.contains('bulk_split_transaction_locked')) {
      return 'Khoản chia danh mục không đổi hàng loạt được';
    }
    if (msg.contains('bulk_transaction_kind_mismatch') ||
        msg.contains('category_kind_mismatch')) {
      return 'Danh mục không khớp loại giao dịch';
    }
    if (msg.contains('recurring_payment_locked')) {
      return 'Khoản trả định kỳ không đổi danh mục được';
    }
    if (msg.contains('transaction_selection_not_found')) {
      return 'Có giao dịch vừa bị xóa — tải lại rồi thử lại';
    }
    return 'Không thực hiện được — thử lại';
  }

  Future<void> _runBulk(Future<void> Function() action, String done) async {
    try {
      await action();
    } catch (e) {
      if (mounted) _snack(_bulkError(e));
      return;
    }
    if (!mounted) return;
    _snack(done);
    _exitSelect();
    _refresh();
  }

  Future<void> _bulkReview(bool reviewed) => _runBulk(
    () => widget.onBulkReview!(_selected.toList(), reviewed: reviewed),
    reviewed ? 'Đã đánh dấu đã xem' : 'Đã đánh dấu cần xem lại',
  );

  Future<void> _bulkCategory(List<Transaction> all) async {
    final selected = [
      for (final t in all)
        if (_selected.contains(t.id)) t,
    ];
    final blocker = bulkCategoryBlocker(selected);
    if (blocker != null) {
      _snack(blocker);
      return;
    }
    final kind = bulkCategoryKind(selected)!;
    final categories = await widget.loadCategories!();
    if (!mounted) return;
    final picked = await showCategoryPicker(
      context,
      categories: [
        for (final c in categories)
          if (c.kind == kind) c,
      ],
    );
    if (picked == null) return;
    await _runBulk(
      () => widget.onBulkCategory!(_selected.toList(), picked.id),
      'Đã đổi danh mục sang "${picked.name}"',
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
      await widget.onDelete(tx.id);
      _refresh();
    }
  }

  Future<void> _openEdit(Transaction t) async {
    // update_money_transaction rejects multi-line splits — say so
    // instead of failing on save.
    if (t.isSplit) {
      _snack('Khoản chia danh mục chưa sửa được — xóa rồi ghi lại');
      return;
    }
    await widget.onEdit!(t);
    _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _txs,
      builder: (context, snap) {
        final all = snap.data ?? const <Transaction>[];
        final visible = _onlyNeedsReview
            ? [
                for (final t in all)
                  if (t.reviewStatus == TransactionReviewStatus.needsReview) t,
              ]
            : all;
        final reviewCount = needsReviewCount(all);
        return Scaffold(
          appBar: AppBar(
            leading: _selecting
                ? IconButton(
                    icon: const Icon(Icons.close),
                    tooltip: 'Thoát chọn',
                    onPressed: _exitSelect,
                  )
                : null,
            title: Text(
              _selecting ? 'Đã chọn ${_selected.length}' : 'Hoạt động',
            ),
            actions: [
              if (!_selecting && _canSelect)
                IconButton(
                  icon: const Icon(Icons.checklist),
                  tooltip: 'Chọn nhiều',
                  onPressed: () => setState(() => _selecting = true),
                ),
              if (_selecting)
                TextButton(
                  onPressed: () => setState(() {
                    final ids = visible.take(maxBulkSelection).map((t) => t.id);
                    _selected
                      ..clear()
                      ..addAll(ids);
                  }),
                  child: const Text('Chọn tất cả'),
                ),
              if (!_selecting && widget.onOpenTrash != null)
                IconButton(
                  icon: const Icon(Icons.delete_outline),
                  tooltip: 'Thùng rác',
                  onPressed: widget.onOpenTrash,
                ),
            ],
          ),
          bottomNavigationBar: _selecting
              ? _BulkBar(
                  enabled: _selected.isNotEmpty,
                  onReviewed: () => _bulkReview(true),
                  onNeedsReview: () => _bulkReview(false),
                  onCategory:
                      widget.onBulkCategory == null ||
                          widget.loadCategories == null
                      ? null
                      : () => _bulkCategory(all),
                )
              : null,
          body: snap.hasError
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('Không tải được hoạt động'),
                      const SizedBox(height: 12),
                      FilledButton(
                        onPressed: _refresh,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                )
              : !snap.hasData
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (_canSelect && (reviewCount > 0 || _onlyNeedsReview))
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: FilterChip(
                              label: Text('Cần xem lại ($reviewCount)'),
                              selected: _onlyNeedsReview,
                              onSelected: (v) =>
                                  setState(() => _onlyNeedsReview = v),
                            ),
                          ),
                        ),
                      if (all.isEmpty)
                        const Card(
                          child: ListTile(
                            title: Text('Chưa có giao dịch nào'),
                            subtitle: Text(
                              'Bấm "Ghi" ở thanh dưới để thêm khoản đầu tiên',
                            ),
                          ),
                        )
                      else if (visible.isEmpty)
                        const Card(
                          child: ListTile(
                            title: Text('Không còn khoản nào cần xem lại'),
                          ),
                        ),
                      for (final t in visible)
                        _TxTile(
                          tx: t,
                          selecting: _selecting,
                          selected: _selected.contains(t.id),
                          onTap: _selecting
                              ? () => _toggle(t)
                              : widget.onEdit == null
                              ? null
                              : () => _openEdit(t),
                          onLongPress: _selecting
                              ? () => _toggle(t)
                              : () => _confirmDelete(t),
                        ),
                    ],
                  ),
                ),
        );
      },
    );
  }
}

class _BulkBar extends StatelessWidget {
  const _BulkBar({
    required this.enabled,
    required this.onReviewed,
    required this.onNeedsReview,
    required this.onCategory,
  });

  final bool enabled;
  final VoidCallback onReviewed;
  final VoidCallback onNeedsReview;
  final VoidCallback? onCategory;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 8,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Wrap(
            alignment: WrapAlignment.spaceEvenly,
            spacing: 4,
            children: [
              TextButton.icon(
                onPressed: enabled ? onReviewed : null,
                icon: const Icon(Icons.done_all),
                label: const Text('Đã xem'),
              ),
              TextButton.icon(
                onPressed: enabled ? onNeedsReview : null,
                icon: const Icon(Icons.flag_outlined),
                label: const Text('Cần xem lại'),
              ),
              if (onCategory != null)
                TextButton.icon(
                  onPressed: enabled ? onCategory : null,
                  icon: const Icon(Icons.category_outlined),
                  label: const Text('Đổi danh mục'),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TxTile extends StatelessWidget {
  const _TxTile({
    required this.tx,
    required this.onLongPress,
    this.onTap,
    this.selecting = false,
    this.selected = false,
  });
  final Transaction tx;
  final VoidCallback onLongPress;
  final VoidCallback? onTap;
  final bool selecting;
  final bool selected;

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
    final needsReview = tx.reviewStatus == TransactionReviewStatus.needsReview;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      color: selected ? Theme.of(context).colorScheme.primaryContainer : null,
      child: ListTile(
        leading: selecting
            ? Icon(selected ? Icons.check_circle : Icons.circle_outlined)
            : null,
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text(
          '${tx.category} · $accountLine · ${tx.occurredOn}'
          '${needsReview ? '\nCần xem lại' : ''}',
        ),
        isThreeLine: needsReview,
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
