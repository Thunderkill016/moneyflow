import 'dart:math';

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'fintech_models.dart';
import 'fintech_store.dart';
import 'fintech_theme.dart';

class AnalyticsPage extends StatefulWidget {
  const AnalyticsPage({super.key, required this.store});

  final FintechStore store;

  @override
  State<AnalyticsPage> createState() => _AnalyticsPageState();
}

class _AnalyticsPageState extends State<AnalyticsPage> {
  bool _onlyLast7Days = false;
  int _touchedIndex = -1;

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final breakdown = store.categorySpendBreakdown(daysBack: _onlyLast7Days ? 7 : null);
    final totalPeriodExpense = breakdown.values.fold<int>(0, (s, v) => s + v);
    final sixMonths = store.sixMonthCashflow();
    final budgetEntries = kDefaultCategories
        .where((c) => c.kind == TxKind.expense && (store.budgets[c.id] ?? 0) > 0)
        .toList();
    final monthCatSpend = store.categorySpendBreakdown();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 112),
      children: [
        // Header + Period Segmented Toggle
        Row(
          children: [
            const Expanded(
              child: Text(
                'Phân tích',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: FintechColors.textPrimary,
                  letterSpacing: -0.5,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.all(3),
              decoration: bentoDecoration(
                fill: FintechColors.surface,
                borderColor: FintechColors.borderSubtle,
                radius: 14,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _PeriodPill(
                    label: 'Tháng này',
                    active: !_onlyLast7Days,
                    onTap: () => setState(() {
                      _onlyLast7Days = false;
                      _touchedIndex = -1;
                    }),
                  ),
                  _PeriodPill(
                    label: '7 ngày',
                    active: _onlyLast7Days,
                    onTap: () => setState(() {
                      _onlyLast7Days = true;
                      _touchedIndex = -1;
                    }),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Interactive Category Donut Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: bentoDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Cơ cấu chi tiêu',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: FintechColors.textPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    store.hideBalance ? '••••••' : formatVnd(totalPeriodExpense),
                    style: tabularStyle(
                      const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w700,
                        color: FintechColors.coral,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              if (breakdown.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 28),
                  child: Center(
                    child: Text(
                      'Chưa có khoản chi trong kỳ này.',
                      style: TextStyle(color: FintechColors.textSecondary, fontSize: 13),
                    ),
                  ),
                )
              else
                Row(
                  children: [
                    SizedBox(
                      width: 138,
                      height: 138,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          PieChart(
                            PieChartData(
                              sectionsSpace: 3,
                              centerSpaceRadius: 42,
                              pieTouchData: PieTouchData(
                                touchCallback: (event, response) {
                                  if (!event.isInterestedForInteractions ||
                                      response?.touchedSection == null) {
                                    return;
                                  }
                                  setState(() {
                                    _touchedIndex =
                                        response!.touchedSection!.touchedSectionIndex;
                                  });
                                },
                              ),
                              sections: _buildPieSections(breakdown, totalPeriodExpense),
                            ),
                          ),
                          Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                _touchedIndex >= 0 &&
                                        _touchedIndex < breakdown.length
                                    ? categoryById(
                                        breakdown.keys.elementAt(_touchedIndex),
                                      ).name
                                    : 'Tổng chi',
                                style: const TextStyle(
                                  fontSize: 10.5,
                                  color: FintechColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                store.hideBalance
                                    ? '•••'
                                    : formatVnd(
                                        _touchedIndex >= 0 &&
                                                _touchedIndex < breakdown.length
                                            ? breakdown.values.elementAt(_touchedIndex)
                                            : totalPeriodExpense,
                                        compact: true,
                                      ),
                                style: tabularStyle(
                                  const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: FintechColors.textPrimary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        children: breakdown.entries.take(5).map((entry) {
                          final cat = categoryById(entry.key);
                          final pct = totalPeriodExpense > 0
                              ? ((entry.value / totalPeriodExpense) * 100).round()
                              : 0;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 7),
                            child: Row(
                              children: [
                                Container(
                                  width: 9,
                                  height: 9,
                                  decoration: BoxDecoration(
                                    color: cat.color,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 7),
                                Expanded(
                                  child: Text(
                                    cat.name,
                                    style: const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: FintechColors.textPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Text(
                                  '$pct%',
                                  style: tabularStyle(
                                    const TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: FintechColors.textSecondary,
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
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 6-Month Cashflow Line Chart
        Container(
          padding: const EdgeInsets.all(16),
          decoration: bentoDecoration(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Dòng tiền 6 tháng',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: FintechColors.textPrimary,
                      ),
                    ),
                  ),
                  _LegendDot(color: FintechColors.emerald, label: 'Thu'),
                  const SizedBox(width: 10),
                  _LegendDot(color: FintechColors.coral, label: 'Chi'),
                ],
              ),
              const SizedBox(height: 14),
              SizedBox(
                height: 168,
                child: _buildCashflowChart(sixMonths),
              ),
            ],
          ),
        ),
        const SizedBox(height: 18),

        // Category Budgets Bento
        const Text(
          'Hạn mức từng danh mục',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: FintechColors.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'Chạm để điều chỉnh hạn mức tháng',
          style: TextStyle(
            fontSize: 12,
            color: FintechColors.textSecondary,
          ),
        ),
        const SizedBox(height: 10),
        for (final cat in budgetEntries) ...[
          _CategoryBudgetCard(
            category: cat,
            spent: monthCatSpend[cat.id] ?? 0,
            limit: store.budgets[cat.id] ?? cat.defaultBudget,
            hideBalance: store.hideBalance,
            onTap: () => _editCategoryBudget(
              context,
              cat,
              store.budgets[cat.id] ?? cat.defaultBudget,
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  List<PieChartSectionData> _buildPieSections(
    Map<String, int> breakdown,
    int total,
  ) {
    final entries = breakdown.entries.toList();
    return List.generate(entries.length, (i) {
      final entry = entries[i];
      final cat = categoryById(entry.key);
      final isTouched = i == _touchedIndex;
      return PieChartSectionData(
        value: entry.value.toDouble(),
        color: cat.color,
        radius: isTouched ? 26 : 21,
        showTitle: false,
      );
    });
  }

  Widget _buildCashflowChart(List<MonthlyFlowPoint> points) {
    var maxVal = 1000000;
    for (final p in points) {
      maxVal = max(maxVal, max(p.income, p.expense));
    }
    final maxY = (maxVal * 1.15).toDouble();

    return LineChart(
      LineChartData(
        minY: 0,
        maxY: maxY,
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: maxY / 3,
          getDrawingHorizontalLine: (_) => const FlLine(
            color: FintechColors.borderSubtle,
            strokeWidth: 1,
          ),
        ),
        borderData: FlBorderData(show: false),
        titlesData: FlTitlesData(
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 38,
              interval: maxY / 2,
              getTitlesWidget: (val, meta) {
                if (val == 0) return const SizedBox.shrink();
                return Text(
                  formatVnd(val.round(), compact: true),
                  style: tabularStyle(
                    const TextStyle(
                      fontSize: 10,
                      color: FintechColors.textMuted,
                    ),
                  ),
                );
              },
            ),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 1,
              getTitlesWidget: (val, meta) {
                final idx = val.round();
                if (idx < 0 || idx >= points.length) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    points[idx].monthLabel,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: FintechColors.textSecondary,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        lineBarsData: [
          LineChartBarData(
            isCurved: true,
            color: FintechColors.emerald,
            barWidth: 2.8,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  FintechColors.emerald.withValues(alpha: 0.24),
                  FintechColors.emerald.withValues(alpha: 0.0),
                ],
              ),
            ),
            spots: List.generate(
              points.length,
              (i) => FlSpot(i.toDouble(), points[i].income.toDouble()),
            ),
          ),
          LineChartBarData(
            isCurved: true,
            color: FintechColors.coral,
            barWidth: 2.8,
            dotData: const FlDotData(show: false),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  FintechColors.coral.withValues(alpha: 0.2),
                  FintechColors.coral.withValues(alpha: 0.0),
                ],
              ),
            ),
            spots: List.generate(
              points.length,
              (i) => FlSpot(i.toDouble(), points[i].expense.toDouble()),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _editCategoryBudget(
    BuildContext context,
    CategoryMeta cat,
    int currentLimit,
  ) async {
    final ctrl = TextEditingController(text: currentLimit.toString());
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'Hạn mức · ${cat.name}',
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
        ),
        content: TextField(
          controller: ctrl,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'Số tiền tối đa mỗi tháng (VND)',
            suffixText: '₫',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Huỷ'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Cập nhật'),
          ),
        ],
      ),
    );
    if (saved == true) {
      final val = int.tryParse(ctrl.text.trim());
      if (val != null && val > 0) {
        await widget.store.updateBudget(cat.id, val);
      }
    }
    ctrl.dispose();
  }
}

class _PeriodPill extends StatelessWidget {
  const _PeriodPill({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
        decoration: BoxDecoration(
          color: active ? FintechColors.indigo.withValues(alpha: 0.28) : Colors.transparent,
          borderRadius: BorderRadius.circular(11),
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

class _LegendDot extends StatelessWidget {
  const _LegendDot({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w600,
            color: FintechColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _CategoryBudgetCard extends StatelessWidget {
  const _CategoryBudgetCard({
    required this.category,
    required this.spent,
    required this.limit,
    required this.hideBalance,
    required this.onTap,
  });

  final CategoryMeta category;
  final int spent;
  final int limit;
  final bool hideBalance;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ratio = limit > 0 ? (spent / limit).clamp(0.0, 1.0) : 0.0;
    final over = spent > limit;
    final barColor = over ? FintechColors.coral : category.color;

    return InkWell(
      borderRadius: BorderRadius.circular(18),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(13),
        decoration: bentoDecoration(radius: 18),
        child: Column(
          children: [
            Row(
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: category.color.withValues(alpha: 0.16),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(category.icon, size: 17, color: category.color),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    category.name,
                    style: const TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: FintechColors.textPrimary,
                    ),
                  ),
                ),
                Text(
                  hideBalance
                      ? '•••• / ••••'
                      : '${formatVnd(spent, compact: true)} / ${formatVnd(limit, compact: true)}',
                  style: tabularStyle(
                    TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: over ? FintechColors.coral : FintechColors.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 9),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                minHeight: 6,
                value: ratio,
                backgroundColor: FintechColors.surfaceElevated,
                valueColor: AlwaysStoppedAnimation<Color>(barColor),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
