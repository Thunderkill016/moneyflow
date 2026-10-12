import 'package:flutter/material.dart';

import '../../domain/money.dart';
import '../../domain/models.dart';
import '../../domain/report.dart';

/// Month report — mirrors the web /reports totals: income, expense, net,
/// savings rate and the expense category breakdown.
class ReportsPage extends StatefulWidget {
  const ReportsPage({super.key, required this.loadTransactions});

  final Future<List<Transaction>> Function() loadTransactions;

  @override
  State<ReportsPage> createState() => _ReportsPageState();
}

class _ReportsPageState extends State<ReportsPage> {
  late Future<PeriodReport> _report;

  @override
  void initState() {
    super.initState();
    _report = _load();
  }

  Future<PeriodReport> _load() async {
    final now = DateTime.now();
    final monthStart = DateTime(now.year, now.month);
    final monthEnd = DateTime(now.year, now.month + 1);
    String d(DateTime x) =>
        '${x.year}-${x.month.toString().padLeft(2, '0')}-${x.day.toString().padLeft(2, '0')}';
    final all = await widget.loadTransactions();
    final scoped = all.where((t) {
      final on = t.occurredOn;
      return on.compareTo(d(monthStart)) >= 0 && on.compareTo(d(monthEnd)) < 0;
    }).toList();
    return buildPeriodReport(scoped);
  }

  Future<void> _refresh() async {
    setState(() { _report = _load(); });
    try {
      await _report;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
  }

  @override
  Widget build(BuildContext context) {
    final monthLabel = 'Tháng ${DateTime.now().month}/${DateTime.now().year}';
    return Scaffold(
      appBar: AppBar(title: Text('Báo cáo · $monthLabel')),
      body: FutureBuilder(
        future: _report,
        builder: (context, snap) {
          if (!snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snap.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('${snap.error}', textAlign: TextAlign.center),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _refresh,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }
          final r = snap.data!;
          return RefreshIndicator(
            onRefresh: _refresh,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _TotalCard(label: 'Thu', amount: r.income),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _TotalCard(label: 'Chi', amount: r.expense),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _TotalCard(label: 'Còn lại', amount: r.net),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Tiết kiệm',
                                style: Theme.of(context).textTheme.labelLarge,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                r.savingsRatePercent == null
                                    ? '—'
                                    : '${r.savingsRatePercent}%',
                                style: Theme.of(context).textTheme.titleLarge
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  'Chi theo danh mục',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                if (r.categories.isEmpty)
                  const Card(
                    child: ListTile(title: Text('Chưa có khoản chi nào')),
                  ),
                for (final c in r.categories)
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
            ),
          );
        },
      ),
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
