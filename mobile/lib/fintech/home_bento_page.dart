import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'fintech_models.dart';
import 'fintech_store.dart';
import 'fintech_theme.dart';
import 'fintech_widgets.dart';
import 'quick_capture_sheet.dart';

class HomeBentoPage extends StatelessWidget {
  const HomeBentoPage({
    super.key,
    required this.store,
    required this.onOpenCapture,
    required this.onSelectTab,
  });

  final FintechStore store;
  final Future<void> Function({
    CaptureInputMode mode,
    TxKind kind,
    String? walletId,
    String? categoryId,
    int amount,
    String? note,
  }) onOpenCapture;
  final ValueChanged<int> onSelectTab;

  @override
  Widget build(BuildContext context) {
    final now = store.now;
    final monthStr = '${now.month.toString().padLeft(2, '0')}/${now.year}';
    final netCashflow = store.monthIncome - store.monthExpense;
    final sevenDays = store.sevenDayExpenses();
    final recentTxs = store.transactions.take(5).toList();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 112),
      children: [
        // Top Header Bar
        Row(
          children: [
            const FinBrandMark(size: 36),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'MoneyFlow',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w800,
                      color: FintechColors.textPrimary,
                      letterSpacing: -0.3,
                    ),
                  ),
                  Text(
                    'Kỳ tháng $monthStr',
                    style: const TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: FintechColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            _HeaderCircleAction(
              icon: Icons.mic_rounded,
              color: FintechColors.cyan,
              tooltip: 'Nói để ghi',
              onTap: () => onOpenCapture(mode: CaptureInputMode.voice),
            ),
            const SizedBox(width: 8),
            _HeaderCircleAction(
              icon: Icons.qr_code_scanner_rounded,
              color: FintechColors.indigoBright,
              tooltip: 'Quét bill',
              onTap: () => onOpenCapture(mode: CaptureInputMode.bill),
            ),
            const SizedBox(width: 8),
            _HeaderCircleAction(
              icon: store.hideBalance
                  ? Icons.visibility_off_rounded
                  : Icons.visibility_rounded,
              color: FintechColors.textSecondary,
              tooltip: 'Ẩn/Hiện số dư',
              onTap: () => store.toggleHideBalance(),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Hero Net Worth Mesh Card
        Container(
          padding: const EdgeInsets.all(18),
          decoration: heroMeshDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'TỔNG TÀI SẢN',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 1.1,
                        color: FintechColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerRight,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: (netCashflow >= 0
                                  ? FintechColors.emerald
                                  : FintechColors.coral)
                              .withValues(alpha: 0.16),
                          borderRadius: BorderRadius.circular(99),
                          border: Border.all(
                            color: (netCashflow >= 0
                                    ? FintechColors.emerald
                                    : FintechColors.coral)
                                .withValues(alpha: 0.4),
                          ),
                        ),
                        child: Text(
                          store.hideBalance
                              ? 'Tháng này •••'
                              : '${netCashflow >= 0 ? "+" : ""}${formatVnd(netCashflow, compact: true)} tháng này',
                          maxLines: 1,
                          style: tabularStyle(
                            TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: netCashflow >= 0
                                  ? FintechColors.emerald
                                  : FintechColors.coral,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  store.hideBalance
                      ? '•••••••••• ₫'
                      : formatVnd(store.totalBalance),
                  style: tabularStyle(
                    const TextStyle(
                      fontSize: 33,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                      letterSpacing: -0.8,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: _HeroCashflowMini(
                      label: 'Thu tháng này',
                      value: store.hideBalance
                          ? '••••••'
                          : '+ ${formatVnd(store.monthIncome, compact: true)}',
                      icon: Icons.south_west_rounded,
                      color: FintechColors.emerald,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _HeroCashflowMini(
                      label: 'Chi tháng này',
                      value: store.hideBalance
                          ? '••••••'
                          : '- ${formatVnd(store.monthExpense, compact: true)}',
                      icon: Icons.north_east_rounded,
                      color: FintechColors.coral,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Ultra-fast 1-Tap Quick Capture Strip
        SizedBox(
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _QuickPresetChip(
                icon: Icons.bolt_rounded,
                label: 'Ghi nhanh',
                accent: FintechColors.cyan,
                filled: true,
                onTap: () => onOpenCapture(),
              ),
              const SizedBox(width: 8),
              _QuickPresetChip(
                icon: Icons.restaurant_rounded,
                label: 'Ăn sáng 45k',
                accent: const Color(0xFFF97316),
                onTap: () => _quickLog(
                  context,
                  amount: 45000,
                  categoryId: 'food',
                  walletId: 'cash',
                  note: 'Ăn sáng',
                ),
              ),
              const SizedBox(width: 8),
              _QuickPresetChip(
                icon: Icons.coffee_rounded,
                label: 'Cà phê 39k',
                accent: const Color(0xFFA855F7),
                onTap: () => _quickLog(
                  context,
                  amount: 39000,
                  categoryId: 'coffee',
                  walletId: 'momo',
                  note: 'Cà phê nhanh',
                ),
              ),
              const SizedBox(width: 8),
              _QuickPresetChip(
                icon: Icons.directions_car_rounded,
                label: 'Grab 50k',
                accent: FintechColors.cyan,
                onTap: () => _quickLog(
                  context,
                  amount: 50000,
                  categoryId: 'transport',
                  walletId: 'momo',
                  note: 'Di chuyển Grab',
                ),
              ),
              const SizedBox(width: 8),
              _QuickPresetChip(
                icon: Icons.local_gas_station_rounded,
                label: 'Đổ xăng 80k',
                accent: FintechColors.amber,
                onTap: () => _quickLog(
                  context,
                  amount: 80000,
                  categoryId: 'transport',
                  walletId: 'cash',
                  note: 'Đổ xăng',
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 2x2 Bento Analytics Grid
        Row(
          children: [
            Expanded(
              child: _SevenDayBentoCard(
                points: sevenDays,
                hideBalance: store.hideBalance,
                onTap: () => onSelectTab(2),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _MonthlyBudgetBentoCard(
                spent: store.monthExpense,
                budget: store.totalMonthlyBudget,
                ratio: store.budgetUsageRatio,
                hideBalance: store.hideBalance,
                onTap: () => onSelectTab(2),
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),

        // Apple Wallet Strip Header
        Row(
          children: [
            const Expanded(
              child: Text(
                'Ví & Ngân hàng',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: FintechColors.textPrimary,
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => onSelectTab(1),
              child: const Text(
                'Tất cả →',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: FintechColors.indigoBright,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 128,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: store.wallets.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final wallet = store.wallets[index];
              return AppleWalletCard(
                wallet: wallet,
                hideBalance: store.hideBalance,
                width: 178,
                onTap: () => onSelectTab(1),
              );
            },
          ),
        ),
        const SizedBox(height: 18),

        // Recent Activity Header
        Row(
          children: [
            const Expanded(
              child: Text(
                'Giao dịch gần đây',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: FintechColors.textPrimary,
                ),
              ),
            ),
            const SizedBox(width: 8),
            GestureDetector(
              onTap: () => onSelectTab(3),
              child: const Text(
                'Sổ thu chi →',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: FintechColors.indigoBright,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),
        for (var i = 0; i < recentTxs.length; i++) ...[
          TxTileRow(
            tx: recentTxs[i],
            store: store,
            onDelete: () => _confirmDeleteTx(context, recentTxs[i]),
          ),
          if (i < recentTxs.length - 1) const SizedBox(height: 8),
        ],
      ],
    );
  }

  Future<void> _quickLog(
    BuildContext context, {
    required int amount,
    required String categoryId,
    required String walletId,
    required String note,
  }) async {
    HapticFeedback.mediumImpact();
    final tx = FinTx(
      id: 'quick-${DateTime.now().microsecondsSinceEpoch}',
      kind: TxKind.expense,
      amount: amount,
      categoryId: categoryId,
      walletId: walletId,
      note: note,
      timestamp: DateTime.now(),
      source: TxSource.quick,
    );
    await store.addTransaction(tx);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Đã ghi $note · ${formatVnd(amount)}'),
          action: SnackBarAction(
            label: 'Hoàn tác',
            textColor: FintechColors.cyan,
            onPressed: () => store.deleteTransaction(tx.id),
          ),
        ),
      );
  }

  Future<void> _confirmDeleteTx(BuildContext context, FinTx tx) async {
    await store.deleteTransaction(tx.id);
    if (!context.mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Đã xoá "${tx.note}"'),
          action: SnackBarAction(
            label: 'Khôi phục',
            textColor: FintechColors.cyan,
            onPressed: () => store.addTransaction(tx),
          ),
        ),
      );
  }
}

class _HeaderCircleAction extends StatelessWidget {
  const _HeaderCircleAction({
    required this.icon,
    required this.color,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final Color color;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: InkWell(
        borderRadius: BorderRadius.circular(99),
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: FintechColors.surface,
            shape: BoxShape.circle,
            border: Border.all(color: FintechColors.borderSubtle),
          ),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
    );
  }
}

class _HeroCashflowMini extends StatelessWidget {
  const _HeroCashflowMini({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.24),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 15, color: color),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10.5,
                    color: Colors.white.withValues(alpha: 0.7),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    value,
                    style: tabularStyle(
                      const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickPresetChip extends StatelessWidget {
  const _QuickPresetChip({
    required this.icon,
    required this.label,
    required this.accent,
    required this.onTap,
    this.filled = false,
  });

  final IconData icon;
  final String label;
  final Color accent;
  final VoidCallback onTap;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(99),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: filled ? accent.withValues(alpha: 0.18) : FintechColors.surface,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: filled ? accent.withValues(alpha: 0.6) : FintechColors.borderSubtle,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: accent),
            const SizedBox(width: 5),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: FintechColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SevenDayBentoCard extends StatelessWidget {
  const _SevenDayBentoCard({
    required this.points,
    required this.hideBalance,
    required this.onTap,
  });

  final List<DailySpendPoint> points;
  final bool hideBalance;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final maxAmount = points.fold<int>(1, (m, p) => max(m, p.amount));
    final todayAmount = points.isNotEmpty ? points.last.amount : 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 146,
        padding: const EdgeInsets.all(14),
        decoration: bentoDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Nhịp chi 7 ngày',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: FintechColors.textSecondary,
              ),
            ),
            const SizedBox(height: 2),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                hideBalance ? 'Hôm nay •••' : 'Hôm nay ${formatVnd(todayAmount, compact: true)}',
                style: tabularStyle(
                  const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: FintechColors.textPrimary,
                  ),
                ),
              ),
            ),
            const Spacer(),
            SizedBox(
              height: 58,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: points.map((pt) {
                  final frac = (pt.amount / maxAmount).clamp(0.14, 1.0);
                  return Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Container(
                          width: 10,
                          height: 30 * frac,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(5),
                            gradient: pt.isToday
                                ? const LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [FintechColors.cyan, FintechColors.indigo],
                                  )
                                : null,
                            color: pt.isToday
                                ? null
                                : FintechColors.indigoBright.withValues(alpha: 0.32),
                          ),
                        ),
                        const SizedBox(height: 4),
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Text(
                            pt.label,
                            style: TextStyle(
                              fontSize: 9.5,
                              fontWeight: pt.isToday ? FontWeight.w700 : FontWeight.w500,
                              color: pt.isToday
                                  ? FintechColors.cyan
                                  : FintechColors.textMuted,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MonthlyBudgetBentoCard extends StatelessWidget {
  const _MonthlyBudgetBentoCard({
    required this.spent,
    required this.budget,
    required this.ratio,
    required this.hideBalance,
    required this.onTap,
  });

  final int spent;
  final int budget;
  final double ratio;
  final bool hideBalance;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final pct = (ratio * 100).round();
    final remaining = budget - spent;
    final over = remaining < 0;
    final barColor = over
        ? FintechColors.coral
        : (ratio > 0.8 ? FintechColors.amber : FintechColors.emerald);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 146,
        padding: const EdgeInsets.all(14),
        decoration: bentoDecoration(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    'Hạn mức tháng',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: FintechColors.textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  '$pct%',
                  style: tabularStyle(
                    TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: barColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                hideBalance
                    ? '••••••••'
                    : (over
                        ? 'Vượt ${formatVnd(remaining.abs(), compact: true)}'
                        : 'Còn ${formatVnd(remaining, compact: true)}'),
                style: tabularStyle(
                  const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    color: FintechColors.textPrimary,
                  ),
                ),
              ),
            ),
            const Spacer(),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                minHeight: 8,
                value: ratio.clamp(0.0, 1.0),
                backgroundColor: FintechColors.surfaceElevated,
                valueColor: AlwaysStoppedAnimation<Color>(barColor),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              hideBalance
                  ? 'Ngân sách ẩn'
                  : 'Đã chi ${formatVnd(spent, compact: true)} / ${formatVnd(budget, compact: true)}',
              style: tabularStyle(
                const TextStyle(
                  fontSize: 11,
                  color: FintechColors.textSecondary,
                ),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
