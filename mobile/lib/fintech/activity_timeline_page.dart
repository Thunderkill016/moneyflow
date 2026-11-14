import 'package:flutter/material.dart';

import 'fintech_models.dart';
import 'fintech_store.dart';
import 'fintech_theme.dart';
import 'fintech_widgets.dart';

class ActivityTimelinePage extends StatefulWidget {
  const ActivityTimelinePage({super.key, required this.store});

  final FintechStore store;

  @override
  State<ActivityTimelinePage> createState() => _ActivityTimelinePageState();
}

class _ActivityTimelinePageState extends State<ActivityTimelinePage> {
  final TextEditingController _searchCtrl = TextEditingController();
  TxKind? _filterKind;

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final q = _searchCtrl.text.trim().toLowerCase();

    final filtered = store.transactions.where((tx) {
      if (_filterKind != null && tx.kind != _filterKind) return false;
      if (q.isNotEmpty) {
        final catName = categoryById(tx.categoryId).name.toLowerCase();
        final walletName = store.walletById(tx.walletId).name.toLowerCase();
        final hit = tx.note.toLowerCase().contains(q) ||
            catName.contains(q) ||
            walletName.contains(q);
        if (!hit) return false;
      }
      return true;
    }).toList();

    // Group by calendar date descending
    final groups = <String, List<FinTx>>{};
    final groupDates = <String, DateTime>{};
    for (final tx in filtered) {
      final key =
          '${tx.timestamp.year}-${tx.timestamp.month.toString().padLeft(2, '0')}-${tx.timestamp.day.toString().padLeft(2, '0')}';
      groups.putIfAbsent(key, () => []).add(tx);
      groupDates.putIfAbsent(key, () => tx.timestamp);
    }

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Sổ thu chi',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: FintechColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: FintechColors.surface,
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: FintechColors.borderSubtle),
                    ),
                    child: Text(
                      '${filtered.length} giao dịch',
                      style: tabularStyle(
                        const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: FintechColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              TextField(
                controller: _searchCtrl,
                onChanged: (_) => setState(() {}),
                style: const TextStyle(fontSize: 13.5, color: FintechColors.textPrimary),
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'Tìm theo tên, danh mục, ngân hàng…',
                  prefixIcon: const Icon(Icons.search_rounded, size: 19, color: FintechColors.textMuted),
                  suffixIcon: q.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.close_rounded, size: 17),
                          onPressed: () => setState(() => _searchCtrl.clear()),
                        )
                      : null,
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 34,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _FilterKindChip(
                      label: 'Tất cả',
                      active: _filterKind == null,
                      color: FintechColors.indigoBright,
                      onTap: () => setState(() => _filterKind = null),
                    ),
                    const SizedBox(width: 8),
                    _FilterKindChip(
                      label: 'Chi tiêu',
                      active: _filterKind == TxKind.expense,
                      color: FintechColors.coral,
                      onTap: () => setState(() => _filterKind = TxKind.expense),
                    ),
                    const SizedBox(width: 8),
                    _FilterKindChip(
                      label: 'Thu nhập',
                      active: _filterKind == TxKind.income,
                      color: FintechColors.emerald,
                      onTap: () => setState(() => _filterKind = TxKind.income),
                    ),
                    const SizedBox(width: 8),
                    _FilterKindChip(
                      label: 'Chuyển ví',
                      active: _filterKind == TxKind.transfer,
                      color: FintechColors.sky,
                      onTap: () => setState(() => _filterKind = TxKind.transfer),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: groups.isEmpty
              ? const Center(
                  child: Text(
                    'Không tìm thấy giao dịch phù hợp.',
                    style: TextStyle(color: FintechColors.textSecondary, fontSize: 13.5),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 112),
                  itemCount: groups.length,
                  itemBuilder: (context, index) {
                    final key = groups.keys.elementAt(index);
                    final dayTxs = groups[key]!;
                    final dayDate = groupDates[key]!;
                    final dailyNet = dayTxs.fold<int>(0, (sum, tx) {
                      if (tx.kind == TxKind.income) return sum + tx.amount;
                      if (tx.kind == TxKind.expense) return sum - tx.amount;
                      return sum;
                    });

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    formatVnDayLabel(dayDate, store.now),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: FintechColors.textSecondary,
                                    ),
                                  ),
                                ),
                                if (dailyNet != 0) const SizedBox(width: 8),
                                if (dailyNet != 0)
                                  Text(
                                    store.hideBalance
                                        ? '••••••'
                                        : formatVnd(dailyNet, signed: true),
                                    style: tabularStyle(
                                      TextStyle(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: dailyNet > 0
                                            ? FintechColors.emerald
                                            : FintechColors.textSecondary,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          for (var i = 0; i < dayTxs.length; i++) ...[
                            Dismissible(
                              key: ValueKey(dayTxs[i].id),
                              direction: DismissDirection.endToStart,
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(right: 18),
                                decoration: BoxDecoration(
                                  color: FintechColors.coral.withValues(alpha: 0.2),
                                  borderRadius: BorderRadius.circular(18),
                                ),
                                child: const Icon(Icons.delete_outline_rounded, color: FintechColors.coral),
                              ),
                              onDismissed: (_) {
                                final removed = dayTxs[i];
                                store.deleteTransaction(removed.id);
                                ScaffoldMessenger.of(context)
                                  ..hideCurrentSnackBar()
                                  ..showSnackBar(
                                    SnackBar(
                                      content: Text('Đã xoá "${removed.note}"'),
                                      action: SnackBarAction(
                                        label: 'Hoàn tác',
                                        textColor: FintechColors.cyan,
                                        onPressed: () => store.addTransaction(removed),
                                      ),
                                    ),
                                  );
                              },
                              child: TxTileRow(tx: dayTxs[i], store: store),
                            ),
                            if (i < dayTxs.length - 1) const SizedBox(height: 8),
                          ],
                        ],
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

class _FilterKindChip extends StatelessWidget {
  const _FilterKindChip({
    required this.label,
    required this.active,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool active;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 140),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 6),
        decoration: BoxDecoration(
          color: active ? color.withValues(alpha: 0.2) : FintechColors.surface,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: active ? color : FintechColors.borderSubtle,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: active ? FontWeight.w700 : FontWeight.w500,
            color: active ? FintechColors.textPrimary : FintechColors.textSecondary,
          ),
        ),
      ),
    );
  }
}
