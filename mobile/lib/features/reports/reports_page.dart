import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../../data/export_files.dart';
import '../../theme/mf_theme.dart';
import '../../domain/budget.dart';
import '../../domain/export_csv.dart';
import '../../domain/money.dart';
import '../../domain/spoken_vnd.dart';
import '../../domain/models.dart';
import '../../domain/net_worth.dart';
import '../../domain/report.dart';
import '../../domain/transaction_query.dart';
import '../../domain/weekly_buckets.dart';
import '../shared/timed_snack_bar.dart';

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
  /// totals beside it. [deltas] is the expense-category MoM column —
  /// null when the prior window's read failed or came back capped, so
  /// the section can explain the missing column instead of drawing
  /// arrows on a partial baseline.
  late Future<
    ({
      PeriodReport report,
      bool truncated,
      List<WeeklyBucket> buckets,
      Map<String, CategoryDelta>? deltas,
    })
  >
  _report;
  late ReportPeriod _period;

  /// Net-worth series — period-independent, so it lives outside the
  /// report future; `null` while [ReportsPage.loadAccounts] is unwired.
  late Future<({List<NetWorthPoint> points, bool truncated, int accountCount})>?
  _netWorth;

  /// Months in the trailing net-worth window — matches the domain
  /// default so the label and the fold never disagree.
  static const _netWorthMonths = 6;

  /// Oldest day the range picker offers — comfortably past the web's
  /// custom-window cap, so the limit the picker enforces is [lastDate].
  static final _pickerFirstDate = DateTime(2020);

  @override
  void initState() {
    super.initState();
    _period = MonthPeriod.of(vnNow());
    _report = _load();
    _netWorth = _loadNetWorth();
  }

  Future<
    ({
      PeriodReport report,
      bool truncated,
      List<WeeklyBucket> buckets,
      Map<String, CategoryDelta>? deltas,
    })
  >
  _load() async {
    final period = _period;
    // The prior window feeds only the MoM delta column — its read is a
    // companion, so a failure degrades the column to an honest note
    // instead of blanking a report that loaded fine (and a capped read
    // can never pose as a real "0" baseline).
    final currentRead = _rowsFor(period);
    final previousRead = _rowsFor(period.prev)
        .then<({List<Transaction> rows, bool truncated})?>(
          (v) => v,
          onError: (_) => null,
        );
    final range = await currentRead;
    final prevRange = await previousRead;
    return (
      report: buildPeriodReport(range.rows),
      truncated: range.truncated,
      buckets: weeklyIncomeExpense(range.rows, period.from, period.to),
      deltas: prevRange == null || prevRange.truncated
          ? null
          : expenseCategoryDeltas(
              current: range.rows,
              previous: prevRange.rows,
            ),
    );
  }

  /// Current balances + the trailing ledger window → month-end series.
  /// The range read covers [_netWorthMonths] calendar months ending at
  /// next month's first day (exclusive) — the fold filters the same
  /// window, so a capped read marks itself truncated rather than
  /// understating early months.
  Future<({List<NetWorthPoint> points, bool truncated, int accountCount})>?
  _loadNetWorth() {
    final loadBalances = widget.loadAccounts;
    if (loadBalances == null) return null;
    return () async {
      final now = vnNow();
      final current = '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
      final first = shiftBudgetMonth(current, -(_netWorthMonths - 1));
      final beyond = shiftBudgetMonth(current, 1);
      final results = await Future.wait([
        loadBalances(),
        _rowsForWindow(first, beyond),
      ]);
      final range = results[1] as ({List<Transaction> rows, bool truncated});
      final accounts = results[0] as List<AccountSummary>;
      return (
        accountCount: accounts.length,
        points: netWorthTrend(
          accounts: accounts,
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
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(content: Text(message)),
    );
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

  /// Total cards drill into the period's own query — Thu/Chi by kind,
  /// the balance cards unfiltered — so every headline number can be
  /// traced to the rows behind it. Null [onOpenActivity] keeps them inert.
  VoidCallback? _totalTap(TransactionKind? kind) {
    final open = widget.onOpenActivity;
    if (open == null) return null;
    return () {
      final q = _periodQuery();
      open(kind == null ? q : q.copyWith(kind: kind), _period.label);
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
    // The "can't report a future day" bound anchors on the VN civil
    // date — the same calendar occurred_on is written on.
    final today = dayOnly(vnNow());
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
    final today = dayOnly(vnNow());
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
    final next = _period.next(vnNow());
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
                : () => _select(MonthPeriod.of(vnNow())),
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
                final deltas = snap.data!.deltas;
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
                      // D13 disclosure: excluded rows would otherwise
                      // leave the totals (or the empty card) unexplained.
                      if (r.excludedCount > 0)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text(
                            'Đã loại ${r.excludedCount} khoản khỏi báo cáo'
                            '${r.excludedExpense > 0 ? ' · chi ${formatMoney(r.excludedExpense)}' : ''}'
                            '${r.excludedIncome > 0 ? ' · thu ${formatMoney(r.excludedIncome)}' : ''}',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodySmall,
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
                              child: _TotalCard(
                                label: 'Thu',
                                amount: r.income,
                                semanticsLabel: 'Xem các khoản thu trong kỳ',
                                onTap: _totalTap(TransactionKind.income),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _TotalCard(
                                label: 'Chi',
                                amount: r.expense,
                                semanticsLabel: 'Xem các khoản chi trong kỳ',
                                onTap: _totalTap(TransactionKind.expense),
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
                                semanticsLabel: 'Xem mọi giao dịch trong kỳ',
                                onTap: _totalTap(null),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: _TotalCard(
                                label: 'Tiết kiệm',
                                // Negative rates stay negative: spending
                                // beyond income is not rounded up to 0%.
                                text: r.savingsRatePercent == null
                                    ? '—'
                                    : '${r.savingsRatePercent}%',
                                subtitle: 'của thu trong kỳ',
                                semanticsLabel: 'Xem mọi giao dịch trong kỳ',
                                onTap: _totalTap(null),
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
                          deltas: deltas,
                          deltaNote: deltas == null
                              ? 'Chưa so được với kỳ trước — dữ liệu kỳ '
                                    'trước chưa tải đủ'
                              : '▲/▼ so với kỳ trước',
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

  /// Spoken equivalent of the bars — the chart itself is not readable
  /// by a screen reader.
  String _summary() =>
      'Thu chi theo tuần: ${[for (final b in buckets) '${b.label} thu ${spokenVnd(b.income)}, chi ${spokenVnd(b.expense)}'].join('; ')}';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final incomeColor = context.mf.incomeText;
    final expenseColor = context.mf.expenseText;
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
        Semantics(
          label: _summary(),
          child: Card(
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
        ),
      ],
    );
  }
}

/// One named breakdown — title, honest empty label, and a progress-bar row
/// per entry in the existing card style. When [onRowTap] is set, rows
/// whose [CategoryShare.id] resolves drill into the filtered activity
/// feed; key-less rows and a missing seam stay read-only. [deltas] turns
/// on the MoM column (the expense-category section); [deltaNote] is the
/// small anchor/explanation line under the title.
class _ShareSection extends StatelessWidget {
  const _ShareSection({
    required this.title,
    required this.rows,
    required this.emptyLabel,
    this.onRowTap,
    this.deltas,
    this.deltaNote,
  });

  final String title;
  final List<CategoryShare> rows;
  final String emptyLabel;
  final void Function(CategoryShare row)? onRowTap;

  /// Per-bucket MoM deltas keyed by [categoryDeltaKey] — the expense
  /// category section's comparison column. Other sections leave it null.
  final Map<String, CategoryDelta>? deltas;

  /// Small line under the title: the ▲/▼ anchor ("so với kỳ trước")
  /// when deltas show, or the honest reason the column is absent.
  final String? deltaNote;

  /// Rows the comparison section renders: the period's breakdown plus
  /// any bucket that existed only in the prior window — a category that
  /// fell to zero keeps its ▼ delta visible as an honest 0 ₫ row
  /// instead of silently leaving the comparison. Sections without
  /// [deltas], or an empty breakdown (whose 'Chưa có khoản chi' card
  /// already says the period is bare), render [rows] untouched.
  List<CategoryShare> get _visibleRows {
    final map = deltas;
    if (map == null || rows.isEmpty) return rows;
    final present = {for (final r in rows) categoryDeltaKey(r)};
    return [
      ...rows,
      for (final e in map.entries)
        if (!present.contains(e.key))
          CategoryShare(
            name: e.value.name,
            amount: 0,
            share: 0,
            id: e.value.id,
          ),
    ];
  }

  /// The row's MoM cell — right-aligned under the amount column. Null
  /// when the section carries no deltas or a key somehow has none
  /// (never rendered as a guess). It lives in the subtitle, not
  /// [ListTile.trailing]: trailing is height-capped and would clip a
  /// third line at large text scales.
  Widget? _deltaCell(CategoryShare row) {
    final map = deltas;
    if (map == null) return null;
    final delta = map[categoryDeltaKey(row)];
    if (delta == null) return null;
    return Align(
      alignment: Alignment.centerRight,
      child: _CategoryDeltaText(delta: delta),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 20),
        Text(title, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        if (rows.isEmpty) Card(child: ListTile(title: Text(emptyLabel))),
        if (rows.isNotEmpty && deltaNote != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Text(
              deltaNote!,
              style: Theme.of(
                context,
              ).textTheme.labelSmall?.copyWith(color: context.mf.textSoft),
            ),
          ),
        for (final c in _visibleRows) _rowCard(context, c),
      ],
    );
  }

  Widget _rowCard(BuildContext context, CategoryShare c) {
    final delta = _deltaCell(c);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(c.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            LinearProgressIndicator(value: (c.share / 100).clamp(0.0, 1.0)),
            if (c.count != null)
              Text(
                '${c.count} giao dịch',
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ?delta,
          ],
        ),
        isThreeLine: c.count != null || delta != null,
        trailing: Text(
          '${formatMoney(c.amount)}\n${c.share}%',
          textAlign: TextAlign.end,
        ),
        onTap: onRowTap == null || c.id == null ? null : () => onRowTap!(c),
      ),
    );
  }
}

/// One MoM delta cell — ▲/▼ with the amount, "mới" when the category
/// had no prior-window expense, "Không đổi" for a real zero change.
/// Direction is carried by the arrow/word first, colour second —
/// expense-red for a rise, income-green for a fall (spending less is
/// the good direction), soft ink for the neutral states.
class _CategoryDeltaText extends StatelessWidget {
  const _CategoryDeltaText({required this.delta});

  final CategoryDelta delta;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mf = context.mf;
    final style = theme.textTheme.labelSmall;
    if (delta.previous == null) {
      return Text(
        'mới',
        semanticsLabel: 'danh mục mới — kỳ trước chưa có khoản chi nào',
        style: style?.copyWith(color: mf.textSoft),
      );
    }
    final change = delta.change;
    if (change == 0) {
      return Text(
        'Không đổi',
        semanticsLabel: 'không đổi so với kỳ trước',
        style: style?.copyWith(color: mf.textSoft),
      );
    }
    final up = change > 0;
    final amount = formatMoney(change.abs());
    return Text(
      '${up ? '▲' : '▼'} $amount',
      semanticsLabel: '${up ? 'tăng' : 'giảm'} $amount so với kỳ trước',
      style: style?.copyWith(
        color: up ? mf.expenseText : mf.incomeText,
        fontWeight: FontWeight.w600,
      ),
    );
  }
}

/// One headline total. Money cards pass [amount]; the savings-rate card
/// passes preformatted [text] (a percentage, not money). A non-null
/// [onTap] makes the whole card a labelled button into the rows behind it.
class _TotalCard extends StatelessWidget {
  const _TotalCard({
    required this.label,
    this.amount,
    this.text,
    this.subtitle,
    this.semanticsLabel,
    this.onTap,
  });

  final String label;
  final int? amount;
  final String? text;
  final String? subtitle;
  final String? semanticsLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final base = theme.textTheme.titleLarge?.copyWith(
      fontWeight: FontWeight.w800,
    );
    final card = Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: theme.textTheme.labelLarge),
              const SizedBox(height: 6),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  text ?? formatMoney(amount!),
                  style: text != null ? base : mfMoneyStyle(base),
                ),
              ),
              if (subtitle != null)
                Text(
                  subtitle!,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: context.mf.textSoft,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    if (onTap == null) return card;
    return Semantics(button: true, label: semanticsLabel, child: card);
  }
}

/// Trailing net-worth strip — current balances walked backwards over
/// monthly deltas (domain/net_worth.dart). Honest by construction:
/// fewer than two active months renders a reason, not a flat line that
/// pretends to be a trend; a capped range read labels itself.
class _NetWorthSection extends StatelessWidget {
  const _NetWorthSection({required this.future});

  final Future<({List<NetWorthPoint> points, bool truncated, int accountCount})>
  future;

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
                Text(
                  'Gồm ${snap.data!.accountCount} tài khoản · '
                  '${ReportsPageState._netWorthMonths} tháng gần nhất',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: context.mf.textSoft,
                  ),
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
                    child: Semantics(
                      label:
                          'Tài sản ròng từ ${formatMoney(points.first.balanceMinor)} '
                          'đến ${formatMoney(points.last.balanceMinor)} '
                          'qua ${points.length} tháng',
                      child: CustomPaint(
                        painter: _NetWorthPainter(
                          points: points,
                          // Ink, not the brand orange: orange is never money.
                          lineColor: theme.colorScheme.onSurface,
                          zeroColor: theme.colorScheme.outlineVariant,
                          currentColor: theme.colorScheme.tertiary,
                        ),
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
