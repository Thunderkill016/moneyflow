import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../data/export_files.dart';
import '../../theme/mf_theme.dart';
import '../../domain/budget.dart';
import '../../domain/export_csv.dart';
import '../../domain/money.dart';
import '../../domain/models.dart';
import '../../domain/net_worth.dart';
import '../../domain/report.dart';
import '../../domain/transaction_query.dart';
import '../../domain/weekly_buckets.dart';

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
    this.loadAccounts,
    this.pickRange,
    this.shareFile,
    this.tempDir,
    this.loadArchive,
    this.onOpenActivity,
  });

  final Future<List<Transaction>> Function() loadTransactions;

  /// Server-side range query (inclusive [from], exclusive [to], YYYY-MM-DD).
  /// Preferred over [loadTransactions] — the recent-feed page is capped, so
  /// filtering it client-side silently understates a busy period.
  /// `truncated` tells the page the range hit the store's row cap so the
  /// report can label itself instead of presenting partial totals as whole.
  final Future<({List<Transaction> rows, bool truncated})> Function(
    String from,
    String to,
  )?
  loadRange;

  /// Account-balance read for the net-worth trend — the reconstruction
  /// starts from CURRENT balances and walks backwards over transaction
  /// deltas. Null hides the section (a surface that cannot read balances
  /// cannot honestly draw the series).
  final Future<List<AccountSummary>> Function()? loadAccounts;

  /// Custom-window picker — injectable so tests don't fight the system
  /// dialog. Defaults to [showDateRangePicker].
  final Future<DateTimeRange?> Function(BuildContext context)? pickRange;

  /// Share-sheet seam for exports — defaults to the system share sheet
  /// ([shareFileToSheet]). Injected in tests to capture the call.
  final ExportSharer? shareFile;

  /// Temp-dir seam for export files (default: the app temp dir).
  final ExportTempDir? tempDir;

  /// Full-archive loader (`export_user_archive` RPC). Null — demo mode —
  /// hides the JSON backup item entirely, like the web's capability gate.
  final Future<Object?> Function()? loadArchive;

  /// Breakdown drill-in (the Monarch pattern): tapping a share row opens
  /// the activity feed pre-filtered to that row's dimension AND the
  /// current period, titled "name · period". Null leaves rows read-only —
  /// surfaces that cannot host a feed just don't offer it.
  final Future<void> Function(TransactionQuery query, String title)?
  onOpenActivity;

  @override
  State<ReportsPage> createState() => ReportsPageState();
}

class ReportsPageState extends State<ReportsPage> {
  /// [buckets] feeds the Thu/Chi weekly chart — computed on the same
  /// range read as the report so the chart can never disagree with the
  /// totals beside it.
  late Future<
    ({PeriodReport report, bool truncated, List<WeeklyBucket> buckets})
  >
  _report;
  late ReportPeriod _period;

  /// Net-worth series — period-independent, so it lives outside the
  /// report future; `null` while [ReportsPage.loadAccounts] is unwired.
  late Future<({List<NetWorthPoint> points, bool truncated})>? _netWorth;

  /// Months in the trailing net-worth window — matches the domain
  /// default so the label and the fold never disagree.
  static const _netWorthMonths = 6;

  /// Oldest day the range picker offers — comfortably past the web's
  /// custom-window cap, so the limit the picker enforces is [lastDate].
  static final _pickerFirstDate = DateTime(2020);

  @override
  void initState() {
    super.initState();
    _period = MonthPeriod.of(DateTime.now());
    _report = _load();
    _netWorth = _loadNetWorth();
  }

  Future<({PeriodReport report, bool truncated, List<WeeklyBucket> buckets})>
  _load() async {
    final period = _period;
    final range = await _rowsFor(period);
    return (
      report: buildPeriodReport(range.rows),
      truncated: range.truncated,
      buckets: weeklyIncomeExpense(range.rows, period.from, period.to),
    );
  }

  /// Current balances + the trailing ledger window → month-end series.
  /// The range read covers [_netWorthMonths] calendar months ending at
  /// next month's first day (exclusive) — the fold filters the same
  /// window, so a capped read marks itself truncated rather than
  /// understating early months.
  Future<({List<NetWorthPoint> points, bool truncated})>? _loadNetWorth() {
    final loadBalances = widget.loadAccounts;
    if (loadBalances == null) return null;
    return () async {
      final now = DateTime.now();
      final current = '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
      final first = shiftBudgetMonth(current, -(_netWorthMonths - 1));
      final beyond = shiftBudgetMonth(current, 1);
      final results = await Future.wait([
        loadBalances(),
        _rowsForWindow(first, beyond),
      ]);
      final range = results[1] as ({List<Transaction> rows, bool truncated});
      return (
        points: netWorthTrend(
          accounts: results[0] as List<AccountSummary>,
          transactions: range.rows,
          currentMonthStart: current,
          months: _netWorthMonths,
        ),
        truncated: range.truncated,
      );
    }();
  }

  /// Rows in [from, to) for the trend — the server range read when wired,
  /// else the recent feed filtered the same way (demo parity with
  /// [_rowsFor]).
  Future<({List<Transaction> rows, bool truncated})> _rowsForWindow(
    String from,
    String to,
  ) async {
    final load = widget.loadRange;
    if (load != null) return load(from, to);
    final all = await widget.loadTransactions();
    return (
      rows: all
          .where(
            (t) =>
                t.occurredOn.compareTo(from) >= 0 &&
                t.occurredOn.compareTo(to) < 0,
          )
          .toList(),
      truncated: false,
    );
  }

  /// Rows for [period] — the server-side range query when wired, else the
  /// recent feed scoped to the same inclusive/exclusive window (the demo
  /// fallback the report body already relies on).
  Future<({List<Transaction> rows, bool truncated})> _rowsFor(
    ReportPeriod period,
  ) async {
    final load = widget.loadRange;
    if (load != null) return load(period.from, period.to);
    final all = await widget.loadTransactions();
    final rows = all.where((t) {
      final on = t.occurredOn;
      return on.compareTo(period.from) >= 0 && on.compareTo(period.to) < 0;
    }).toList();
    return (rows: rows, truncated: false);
  }

  Future<void> _refresh() async {
    setState(() {
      _report = _load();
      _netWorth = _loadNetWorth();
    });
    try {
      await _report;
    } catch (_) {
      /* surfaced by the FutureBuilder */
    }
    try {
      await _netWorth;
    } catch (_) {
      /* surfaced by the section's own FutureBuilder */
    }
  }

  /// Public reload for the nav shell after a capture save — refreshes the
  /// period the reader is looking at, not just the current month.
  void reload() => _refresh();

  void _snack(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  /// Inclusive last day of [period] — `to` is exclusive, so the filename
  /// names the last day the reader actually sees covered.
  String _inclusiveEnd(ReportPeriod period) =>
      ymd(dateAdd(parseYmd(period.to), -1));

  /// The visible period as the feed's inclusive date filter — the same
  /// window the report totalled, so a drill-in can never widen it.
  TransactionQuery _periodQuery() =>
      TransactionQuery(dateFrom: _period.from, dateTo: _inclusiveEnd(_period));

  /// Builds a breakdown row's tap handler: [build] turns the row's stored
  /// drill-in key into a query. Rows with a null key (a name-only bucket
  /// no filter reproduces) stay inert; null [onOpenActivity] leaves the
  /// whole section read-only.
  void Function(CategoryShare row)? _rowTap(
    TransactionQuery Function(String key) build,
  ) {
    final open = widget.onOpenActivity;
    if (open == null) return null;
    return (row) {
      final key = row.id;
      if (key == null) return;
      open(build(key), '${row.name} · ${_period.label}');
    };
  }

  /// Export sheet for the shown period. The CSV item is gated on the
  /// loaded report: an empty period says so honestly instead of offering
  /// a header-only file. A failed load leaves the item enabled — the
  /// export refetches anyway and reports its own failure.
  Future<void> _openExport() async {
    int? count;
    try {
      count = (await _report).report.transactionCount;
    } catch (_) {
      count = null;
    }
    if (!mounted) return;
    final period = _period;
    final csvName = exportCsvFilename(period.from, _inclusiveEnd(period));
    await showModalBottomSheet<void>(
      context: context,
      builder: (sheetContext) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.table_rows_outlined),
              title: const Text('Xuất CSV kỳ này'),
              subtitle: Text(
                count == 0 ? 'Không có giao dịch trong kỳ này' : csvName,
              ),
              enabled: count != 0,
              onTap: () {
                Navigator.pop(sheetContext);
                _exportCsv();
              },
            ),
            if (widget.loadArchive != null)
              ListTile(
                leading: const Icon(Icons.archive_outlined),
                title: const Text('Sao lưu toàn bộ (JSON)'),
                subtitle: Text(exportBackupFilename(DateTime.now())),
                onTap: () {
                  Navigator.pop(sheetContext);
                  _exportArchive();
                },
              ),
          ],
        ),
      ),
    );
  }

  /// CSV of the shown period: fetch fresh rows (never the possibly stale
  /// on-screen report), write `<temp>/moneyflow-<from>-<to>.csv`, then
  /// hand it to the share sheet.
  Future<void> _exportCsv() async {
    final period = _period;
    try {
      final range = await _rowsFor(period);
      if (!mounted) return;
      if (range.rows.isEmpty) {
        // The ledger changed under the open page — say so instead of
        // sharing a header-only file.
        _snack('Không có giao dịch trong kỳ này');
        return;
      }
      final file = await writeExportFile(
        exportCsvFilename(period.from, _inclusiveEnd(period)),
        transactionsToCsv(range.rows),
        tempDir: widget.tempDir,
      );
      if (range.truncated && mounted) {
        // The file writes what the range cap could fetch — say so before
        // the share sheet hands over a partial export.
        _snack('Kỳ này có quá nhiều giao dịch — file có thể thiếu một phần');
      }
      await (widget.shareFile ?? shareFileToSheet)(file.path, csvMimeType);
    } catch (_) {
      if (mounted) _snack('Không xuất được file');
    }
  }

  /// Full JSON backup via `export_user_archive` — the real archive v1
  /// document, written and shared unmodified. The doc→file half lives in
  /// [writeArchiveExportFile] so the settings surface runs the same flow.
  Future<void> _exportArchive() async {
    final load = widget.loadArchive;
    if (load == null) return;
    try {
      final file = await writeArchiveExportFile(load, tempDir: widget.tempDir);
      await (widget.shareFile ?? shareFileToSheet)(file.path, jsonMimeType);
    } catch (_) {
      if (mounted) _snack('Không xuất được file');
    }
  }

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
      appBar: AppBar(
        title: const Text('Báo cáo'),
        actions: [
          IconButton(
            icon: const Icon(Icons.download_outlined),
            tooltip: 'Xuất dữ liệu',
            onPressed: _openExport,
          ),
        ],
      ),
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
          // The trend does not follow the period picker — net worth is a
          // point-in-time figure, always "now + trailing months".
          if (_netWorth != null) _NetWorthSection(future: _netWorth!),
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
                final r = snap.data!.report;
                final truncated = snap.data!.truncated;
                final buckets = snap.data!.buckets;
                return RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (truncated)
                        const Card(
                          child: Padding(
                            padding: EdgeInsets.all(12),
                            child: Text(
                              'Kỳ này có quá nhiều giao dịch — báo cáo chỉ '
                              'tải được một phần, số liệu có thể thiếu.',
                            ),
                          ),
                        ),
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
                        // A transfer-only period has bars of all zeros —
                        // an empty grid would fake a trend, so the chart
                        // only mounts when something is drawable.
                        if (buckets.any((b) => b.income > 0 || b.expense > 0))
                          _WeeklyChart(buckets: buckets),
                        _ShareSection(
                          title: 'Chi theo danh mục',
                          rows: r.categories,
                          emptyLabel: 'Chưa có khoản chi trong kỳ này',
                          onRowTap: _rowTap(
                            (id) => _periodQuery().copyWith(
                              kind: TransactionKind.expense,
                              categoryId: id,
                            ),
                          ),
                        ),
                        _ShareSection(
                          title: 'Thu theo danh mục',
                          rows: r.incomeCategories,
                          emptyLabel: 'Chưa có khoản thu trong kỳ này',
                          onRowTap: _rowTap(
                            (id) => _periodQuery().copyWith(
                              kind: TransactionKind.income,
                              categoryId: id,
                            ),
                          ),
                        ),
                        _ShareSection(
                          title: 'Chi theo tài khoản',
                          rows: r.accounts,
                          emptyLabel: 'Chưa có khoản chi trong kỳ này',
                          onRowTap: _rowTap(
                            (id) => _periodQuery().copyWith(
                              kind: TransactionKind.expense,
                              accountId: id,
                            ),
                          ),
                        ),
                        _ShareSection(
                          title: 'Chi theo người nhận',
                          rows: r.payees,
                          emptyLabel: 'Chưa có khoản chi trong kỳ này',
                          onRowTap: _rowTap(
                            (payee) => _periodQuery().copyWith(
                              kind: TransactionKind.expense,
                              payee: payee,
                            ),
                          ),
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

/// Thu/Chi-per-week grouped bar chart — same green/red pair the feed
/// rows use, tooltips off (touch would only echo the axis anyway).
/// Buckets come pre-computed from the period's own range read.
class _WeeklyChart extends StatelessWidget {
  const _WeeklyChart({required this.buckets});

  final List<WeeklyBucket> buckets;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    const incomeColor = Color(0xFF388E3C); // Colors.green.shade700
    const expenseColor = Color(0xFFD32F2F); // Colors.red.shade700
    var maxV = 0;
    for (final b in buckets) {
      if (b.income > maxV) maxV = b.income;
      if (b.expense > maxV) maxV = b.expense;
    }
    // fl_chart rejects a zero ceiling; 15% headroom keeps the tallest
    // bar under the top edge.
    final maxY = maxV <= 0 ? 1.0 : maxV * 1.15;
    final interval = maxY / 2;
    Widget legendDot(Color c, String label) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: c, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: theme.textTheme.labelMedium),
      ],
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text('Thu chi theo tuần', style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 16, 8),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    legendDot(incomeColor, 'Thu'),
                    const SizedBox(width: 12),
                    legendDot(expenseColor, 'Chi'),
                  ],
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 180,
                  child: BarChart(
                    BarChartData(
                      maxY: maxY,
                      minY: 0,
                      // No tooltips — the tap would only repeat what the
                      // axes already say; drill-in lives on the rows below.
                      barTouchData: BarTouchData(enabled: false),
                      borderData: FlBorderData(show: false),
                      gridData: FlGridData(
                        drawVerticalLine: false,
                        horizontalInterval: interval,
                        getDrawingHorizontalLine: (v) => FlLine(
                          color: theme.colorScheme.outlineVariant,
                          strokeWidth: 1,
                        ),
                      ),
                      titlesData: FlTitlesData(
                        topTitles: const AxisTitles(),
                        rightTitles: const AxisTitles(),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 44,
                            interval: interval,
                            getTitlesWidget: (v, meta) => SideTitleWidget(
                              meta: meta,
                              child: Text(
                                formatMoney(v.round(), compact: true),
                                style: theme.textTheme.labelSmall,
                              ),
                            ),
                          ),
                        ),
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 24,
                            getTitlesWidget: (v, meta) {
                              final i = v.round();
                              if (i < 0 || i >= buckets.length) {
                                return const SizedBox.shrink();
                              }
                              return SideTitleWidget(
                                meta: meta,
                                child: Text(
                                  buckets[i].label,
                                  style: theme.textTheme.labelSmall,
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      barGroups: [
                        for (var i = 0; i < buckets.length; i++)
                          BarChartGroupData(
                            x: i,
                            barsSpace: 3,
                            barRods: [
                              BarChartRodData(
                                toY: buckets[i].income.toDouble(),
                                color: incomeColor,
                                width: 7,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(3),
                                ),
                              ),
                              BarChartRodData(
                                toY: buckets[i].expense.toDouble(),
                                color: expenseColor,
                                width: 7,
                                borderRadius: const BorderRadius.vertical(
                                  top: Radius.circular(3),
                                ),
                              ),
                            ],
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// One named breakdown — title, honest empty label, and a progress-bar row
/// per entry in the existing card style. When [onRowTap] is set, rows
/// whose [CategoryShare.id] resolves drill into the filtered activity
/// feed; key-less rows and a missing seam stay read-only.
class _ShareSection extends StatelessWidget {
  const _ShareSection({
    required this.title,
    required this.rows,
    required this.emptyLabel,
    this.onRowTap,
  });

  final String title;
  final List<CategoryShare> rows;
  final String emptyLabel;
  final void Function(CategoryShare row)? onRowTap;

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
              onTap: onRowTap == null || c.id == null
                  ? null
                  : () => onRowTap!(c),
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
            FittedBox(
              fit: BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                formatMoney(amount),
                style: mfMoneyStyle(
                  Theme.of(
                    context,
                  ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Trailing net-worth strip — current balances walked backwards over
/// monthly deltas (domain/net_worth.dart). Honest by construction:
/// fewer than two active months renders a reason, not a flat line that
/// pretends to be a trend; a capped range read labels itself.
class _NetWorthSection extends StatelessWidget {
  const _NetWorthSection({required this.future});

  final Future<({List<NetWorthPoint> points, bool truncated})> future;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return FutureBuilder(
      future: future,
      builder: (context, snap) {
        if (snap.hasError) {
          // The section fails on its own terms — never blocks the
          // period report under it, never silently absent either.
          return const Card(
            margin: EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: Padding(
              padding: EdgeInsets.all(12),
              child: Text('Không tải được tài sản ròng'),
            ),
          );
        }
        if (!snap.hasData) {
          return const Card(
            margin: EdgeInsets.fromLTRB(16, 4, 16, 4),
            child: Padding(
              padding: EdgeInsets.all(12),
              child: LinearProgressIndicator(),
            ),
          );
        }
        final points = snap.data!.points;
        final mom = netWorthMomLabel(points, formatMoney);
        return Card(
          margin: const EdgeInsets.fromLTRB(16, 4, 16, 4),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('Tài sản ròng', style: theme.textTheme.labelLarge),
                    const Spacer(),
                    if (points.isNotEmpty)
                      Text(
                        formatMoney(points.last.balanceMinor),
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                  ],
                ),
                if (snap.data!.truncated)
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      'Dữ liệu 6 tháng có thể thiếu một phần',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.error,
                      ),
                    ),
                  ),
                if (netWorthActiveMonths(points) < 2)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      'Chưa đủ dữ liệu — cần ít nhất 2 tháng có giao '
                      'dịch để vẽ xu hướng',
                      style: theme.textTheme.bodySmall,
                    ),
                  )
                else ...[
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 96,
                    width: double.infinity,
                    child: CustomPaint(
                      painter: _NetWorthPainter(
                        points: points,
                        lineColor: context.mf.brand,
                        zeroColor: theme.colorScheme.outlineVariant,
                        currentColor: theme.colorScheme.tertiary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        _monthTick(points.first.monthStart),
                        style: theme.textTheme.labelSmall,
                      ),
                      const Spacer(),
                      // The last point is "now", not a closed month-end
                      // — the label says so instead of letting a live
                      // figure pose as history.
                      Text('hiện tại', style: theme.textTheme.labelSmall),
                    ],
                  ),
                  if (mom != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(mom, style: theme.textTheme.bodySmall),
                    ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  /// "thg M" — the compact axis tick; the window is always six months so
  /// the year is implied by the period bar above.
  static String _monthTick(String monthStart) =>
      'thg ${int.parse(monthStart.substring(5, 7))}';
}

/// Sparkline for the net-worth points — a polyline across the window
/// with a dashed-ish zero baseline when the series crosses it, and a
/// dot marking "now" (the only non-month-end point).
class _NetWorthPainter extends CustomPainter {
  const _NetWorthPainter({
    required this.points,
    required this.lineColor,
    required this.zeroColor,
    required this.currentColor,
  });

  final List<NetWorthPoint> points;
  final Color lineColor;
  final Color zeroColor;
  final Color currentColor;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;
    var min = points.first.balanceMinor;
    var max = min;
    for (final p in points) {
      if (p.balanceMinor < min) min = p.balanceMinor;
      if (p.balanceMinor > max) max = p.balanceMinor;
    }
    // A flat series still draws a flat line mid-canvas — zero-padding a
    // single value would fake a climb from nothing.
    if (min == max) {
      min -= 1;
      max += 1;
    }
    final span = (max - min).toDouble();
    final dx = size.width / (points.length - 1);
    double yFor(int v) =>
        size.height - ((v - min) / span) * (size.height - 8) - 4;

    // Zero baseline — only drawn when the series actually crosses it;
    // an all-positive run gets no fake axis line.
    if (min < 0 && max > 0) {
      final zeroPaint = Paint()
        ..color = zeroColor
        ..strokeWidth = 1;
      final y = yFor(0);
      canvas.drawLine(Offset(0, y), Offset(size.width, y), zeroPaint);
    }

    final paint = Paint()
      ..color = lineColor
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke
      ..strokeJoin = StrokeJoin.round;
    final path = Path()..moveTo(0, yFor(points.first.balanceMinor));
    for (var i = 1; i < points.length; i++) {
      path.lineTo(dx * i, yFor(points[i].balanceMinor));
    }
    // Soft area under the line, fading to transparent — the reference's
    // "Market" chart.
    final area = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(
      area,
      Paint()
        ..shader = LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            lineColor.withValues(alpha: 0.32),
            lineColor.withValues(alpha: 0),
          ],
        ).createShader(Offset.zero & size),
    );
    canvas.drawPath(path, paint);

    for (var i = 0; i < points.length; i++) {
      canvas.drawCircle(
        Offset(dx * i, yFor(points[i].balanceMinor)),
        i == points.length - 1 ? 3.5 : 2,
        Paint()
          ..color = points[i].isCurrent ? currentColor : lineColor
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(_NetWorthPainter old) =>
      old.points != points || old.lineColor != lineColor;
}
