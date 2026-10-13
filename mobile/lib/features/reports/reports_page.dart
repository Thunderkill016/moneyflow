import 'package:flutter/material.dart';

import '../../domain/money.dart';
import '../../domain/models.dart';
import '../../domain/report.dart';

/// Period report — mirrors the web /reports: month navigation plus a
/// custom range, totals (Thu/Chi/Còn lại/tiết kiệm) and the income/expense
/// breakdowns. Every period loads through the server-side range query when
/// available — the recent feed is capped and would silently understate a
/// busy window.
class ReportsPage extends StatefulWidget {
  const ReportsPage({
    super.key,
    required this.loadTransactions,
    this.loadRange,
    this.pickRange,
  });

  final Future<List<Transaction>> Function() loadTransactions;

  /// Server-side range query (inclusive [from], exclusive [to], YYYY-MM-DD).
  /// Preferred over [loadTransactions] — the recent-feed page is capped, so
  /// filtering it client-side silently understates a busy period.
  final Future<List<Transaction>> Function(String from, String to)? loadRange;

  /// Custom-window picker — injectable so tests don't fight the system
  /// dialog. Defaults to [showDateRangePicker].
  final Future<DateTimeRange?> Function(BuildContext context)? pickRange;

  @override
  State<ReportsPage> createState() => ReportsPageState();
}

class ReportsPageState extends State<ReportsPage> {
  late Future<PeriodReport> _report;
  late ReportPeriod _period;

  /// Oldest day the range picker offers — comfortably past the web's
  /// custom-window cap, so the limit the picker enforces is [lastDate].
  static final _pickerFirstDate = DateTime(2020);

  @override
  void initState() {
    super.initState();
    _period = MonthPeriod.of(DateTime.now());
    _report = _load();
  }

  Future<PeriodReport> _load() async {
    final period = _period;
    final load = widget.loadRange;
    final all = load != null
        ? await load(period.from, period.to)
        : await widget.loadTransactions();
    // The feed fallback (demo mode) applies the same inclusive/exclusive
    // scoping the server query does.
    final scoped = all.where((t) {
      final on = t.occurredOn;
      return on.compareTo(period.from) >= 0 && on.compareTo(period.to) < 0;
    }).toList();
    return buildPeriodReport(scoped);
  }

  Future<void> _refresh() async {
    setState(() {
      _report = _load();
    });
    try {
      await _report;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
  }

  /// Public reload for the nav shell after a capture save — refreshes the
  /// period the reader is looking at, not just the current month.
  void reload() => _refresh();

  Future<void> _select(ReportPeriod period) async {
    setState(() {
      _period = period;
      _report = _load();
    });
    try {
      await _report;
    } catch (_) {
      /* surfaced by the FutureBuilder; the bar keeps showing the period */
    }
  }

  Future<void> _pickCustom() async {
    final today = dayOnly(DateTime.now());
    final picked = await (widget.pickRange ?? _defaultPickRange)(context);
    if (picked == null || !mounted) return;
    // Honour a reversed pick like the web does — a slip, not an attack.
    var start = dayOnly(picked.start);
    var end = dayOnly(picked.end);
    if (end.isBefore(start)) {
      final swap = start;
      start = end;
      end = swap;
    }
    // A future end reports emptiness as if it were data — clamp to today.
    if (end.isAfter(today)) end = today;
    if (start.isAfter(end)) start = end;
    // Same window-length cap as the web's CUSTOM_RANGE_MAX_DAYS.
    if (daysBetween(start, end) + 1 > customRangeMaxDays) {
      start = dateAdd(end, -(customRangeMaxDays - 1));
    }
    await _select(CustomPeriod(ymd(start), ymd(end)));
  }

  Future<DateTimeRange?> _defaultPickRange(BuildContext context) {
    final today = dayOnly(DateTime.now());
    final current = _period;
    return showDateRangePicker(
      context: context,
      firstDate: _pickerFirstDate,
      lastDate: today,
      initialDateRange: current is CustomPeriod
          ? DateTimeRange(
              start: parseYmd(current.start),
              end: parseYmd(current.end),
            )
          : null,
      helpText: 'Chọn khoảng báo cáo',
      cancelText: 'Hủy',
      confirmText: 'Chọn',
      saveText: 'Chọn',
    );
  }

  @override
  Widget build(BuildContext context) {
    final next = _period.next(DateTime.now());
    final isMonth = _period is MonthPeriod;
    return Scaffold(
      appBar: AppBar(title: const Text('Báo cáo')),
      body: Column(
        children: [
          // The period bar stays mounted during load errors — a failed
          // period must not lose its label or strand the reader on it.
          _PeriodBar(
            label: _period.label,
            onPrev: () => _select(_period.prev),
            onNext: next == null ? null : () => _select(next),
            onPick: _pickCustom,
            onThisMonth: isMonth
                ? null
                : () => _select(MonthPeriod.of(DateTime.now())),
          ),
          Expanded(
            child: FutureBuilder(
              future: _report,
              builder: (context, snap) {
                if (snap.hasError) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'Không tải được báo cáo',
                          textAlign: TextAlign.center,
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
                final r = snap.data!;
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (r.transactionCount == 0)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(24),
                            child: Text(
                              'Không có giao dịch trong kỳ này',
                              textAlign: TextAlign.center,
                            ),
                          ),
                        )
                      else ...[
                        Row(
                          children: [
                            Expanded(
                              child: _TotalCard(label: 'Thu', amount: r.income),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _TotalCard(
                                label: 'Chi',
                                amount: r.expense,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: _TotalCard(
                                label: 'Còn lại',
                                amount: r.net,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Card(
                                child: Padding(
                                  padding: const EdgeInsets.all(16),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Tiết kiệm',
                                        style: Theme.of(
                                          context,
                                        ).textTheme.labelLarge,
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        r.savingsRatePercent == null
                                            ? '—'
                                            : '${r.savingsRatePercent}%',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleLarge
                                            ?.copyWith(
                                              fontWeight: FontWeight.w700,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        _ShareSection(
                          title: 'Chi theo danh mục',
                          rows: r.categories,
                          emptyLabel: 'Chưa có khoản chi trong kỳ này',
                        ),
                        _ShareSection(
                          title: 'Thu theo danh mục',
                          rows: r.incomeCategories,
                          emptyLabel: 'Chưa có khoản thu trong kỳ này',
                        ),
                        _ShareSection(
                          title: 'Chi theo tài khoản',
                          rows: r.accounts,
                          emptyLabel: 'Chưa có khoản chi trong kỳ này',
                        ),
                        _ShareSection(
                          title: 'Chi theo người nhận',
                          rows: r.payees,
                          emptyLabel: 'Chưa có khoản chi trong kỳ này',
                        ),
                      ],
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Chevron navigation + period label + custom-range entry. Kept outside the
/// report body so it cannot disappear with a failed load.
class _PeriodBar extends StatelessWidget {
  const _PeriodBar({
    required this.label,
    required this.onPrev,
    required this.onNext,
    required this.onPick,
    required this.onThisMonth,
  });

  final String label;
  final VoidCallback onPrev;
  final VoidCallback? onNext;
  final VoidCallback onPick;

  /// Shown only while a custom window is up — a way back to the default.
  final VoidCallback? onThisMonth;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
      child: Column(
        children: [
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.chevron_left),
                tooltip: 'Kỳ trước',
                onPressed: onPrev,
              ),
              Expanded(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right),
                tooltip: 'Kỳ sau',
                onPressed: onNext,
              ),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextButton.icon(
                onPressed: onPick,
                icon: const Icon(Icons.date_range, size: 18),
                label: const Text('Tùy chọn'),
              ),
              if (onThisMonth != null)
                TextButton(
                  onPressed: onThisMonth,
                  child: const Text('Tháng này'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// One named breakdown — title, honest empty label, and a progress-bar row
/// per entry in the existing card style.
class _ShareSection extends StatelessWidget {
  const _ShareSection({
    required this.title,
    required this.rows,
    required this.emptyLabel,
  });

  final String title;
  final List<CategoryShare> rows;
  final String emptyLabel;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (rows.isEmpty) Card(child: ListTile(title: Text(emptyLabel))),
        for (final c in rows)
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(c.name),
              subtitle: LinearProgressIndicator(
                value: (c.share / 100).clamp(0.0, 1.0),
              ),
              trailing: Text(
                '${formatMoney(c.amount)}\n${c.share}%',
                textAlign: TextAlign.end,
              ),
            ),
          ),
      ],
    );
  }
}

class _TotalCard extends StatelessWidget {
  const _TotalCard({required this.label, required this.amount});

  final String label;
  final int amount;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            Text(
              formatMoney(amount),
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}
