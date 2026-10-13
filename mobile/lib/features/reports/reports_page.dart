import 'dart:convert';

import 'package:flutter/material.dart';

import '../../data/export_files.dart';
import '../../domain/export_csv.dart';
import '../../domain/money.dart';
import '../../domain/models.dart';
import '../../domain/report.dart';
import '../../domain/transaction_query.dart';

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
  late Future<({PeriodReport report, bool truncated})> _report;
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

  Future<({PeriodReport report, bool truncated})> _load() async {
    final range = await _rowsFor(_period);
    return (report: buildPeriodReport(range.rows), truncated: range.truncated);
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
  /// document, written and shared unmodified.
  Future<void> _exportArchive() async {
    final load = widget.loadArchive;
    if (load == null) return;
    try {
      final doc = await load();
      // The RPC answers a jsonb document — anything else isn't an archive
      // we can honestly hand over.
      if (doc is! Map && doc is! List) {
        throw const FormatException('unexpected archive shape');
      }
      final body = '${const JsonEncoder.withIndent('  ').convert(doc)}\n';
      final file = await writeExportFile(
        exportBackupFilename(DateTime.now()),
        body,
        tempDir: widget.tempDir,
      );
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
