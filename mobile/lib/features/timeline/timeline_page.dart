import 'dart:async';

import 'package:flutter/material.dart';

import '../../domain/money.dart';
import '../../domain/timeline.dart';
import '../../domain/transaction_query.dart';
import '../../domain/models.dart';
import '../shared/empty_state.dart';

/// Debounce before a typed search hits the backend — same cadence as the
/// activity feed.
const _timelineSearchDebounce = Duration(milliseconds: 350);

/// "Dòng thời gian (đã duyệt)" — the read-only approved-ledger view,
/// mirroring src/components/transactions/timeline-workspace.tsx. Only
/// reviewed rows appear; mutation stays on the activity/capture surfaces.
class TimelinePage extends StatefulWidget {
  const TimelinePage({required this.loadPage, this.today, super.key});

  /// Same paged feed contract as the activity tab — the timeline filters
  /// the reviewed subset client-side (review_status is patched onto feed
  /// rows by the store, not queryable as a TransactionQuery field).
  final TransactionPageLoader loadPage;

  /// YYYY-MM-DD override for tests; defaults to the Vietnam date so
  /// "Hôm nay" matches ledger days, not the device's timezone.
  final String? today;

  @override
  State<TimelinePage> createState() => _TimelinePageState();
}

class _TimelinePageState extends State<TimelinePage> {
  final _search = TextEditingController();
  final _scroll = ScrollController();
  Timer? _debounce;

  final List<Transaction> _rows = [];
  bool _loading = true;
  bool _hasMore = true;
  bool _loadingMore = false;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
    _scroll.addListener(_maybeLoadMore);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  String get _today {
    if (widget.today != null) return widget.today!;
    final vn = DateTime.now().toUtc().add(const Duration(hours: 7));
    String two(int v) => v.toString().padLeft(2, '0');
    return '${vn.year}-${two(vn.month)}-${two(vn.day)}';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _rows.clear();
      _hasMore = true;
    });
    try {
      final page = await widget.loadPage(
        TransactionQuery(text: _query),
        offset: 0,
      );
      if (!mounted) return;
      setState(() {
        _rows.addAll(page.rows);
        _hasMore = page.hasMore;
        _loading = false;
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Không tải được dòng thời gian.';
          _loading = false;
        });
      }
    }
  }

  void _maybeLoadMore() {
    if (_loadingMore ||
        !_hasMore ||
        !_scroll.hasClients ||
        _scroll.position.pixels < _scroll.position.maxScrollExtent - 200) {
      return;
    }
    _loadingMore = true;
    widget
        .loadPage(TransactionQuery(text: _query), offset: _rows.length)
        .then((page) {
          if (!mounted) return;
          setState(() {
            _rows.addAll(page.rows);
            _hasMore = page.hasMore;
          });
        })
        .catchError((_) {})
        .whenComplete(() => _loadingMore = false);
  }

  void _onSearchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(_timelineSearchDebounce, () {
      if (!mounted) return;
      _query = text;
      _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final reviewed = _rows
        .where((t) => t.reviewStatus == TransactionReviewStatus.reviewed)
        .toList();
    final totals = timelineTotals(_rows);
    final groups = timelineDayGroups(_rows, today: _today);

    return Scaffold(
      appBar: AppBar(title: const Text('Dòng thời gian')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: TextField(
              controller: _search,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Tìm trong dòng thời gian…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _search.clear();
                          _onSearchChanged('');
                        },
                      ),
              ),
            ),
          ),
          if (!_loading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Row(
                children: [
                  _SummaryChip(label: 'Đã duyệt', value: '${totals.count}'),
                  _SummaryChip(
                    label: 'Tiền vào',
                    value: formatMoneyWithKind(
                      totals.income,
                      MoneySignKind.income,
                    ),
                  ),
                  _SummaryChip(
                    label: 'Tiền ra',
                    value: formatMoneyWithKind(
                      totals.expense,
                      MoneySignKind.expense,
                    ),
                  ),
                  _SummaryChip(
                    label: 'Còn lại',
                    value: formatMoneyWithKind(
                      totals.net,
                      totals.net >= 0
                          ? MoneySignKind.income
                          : MoneySignKind.expense,
                    ),
                  ),
                ],
              ),
            ),
          Expanded(child: _body(reviewed, groups)),
        ],
      ),
    );
  }

  Widget _body(List<Transaction> reviewed, List<TimelineDayGroup> groups) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(_error!),
            const SizedBox(height: 8),
            FilledButton.tonal(onPressed: _load, child: const Text('Thử lại')),
          ],
        ),
      );
    }
    if (groups.isEmpty) {
      if (reviewed.isNotEmpty || _query.isNotEmpty) {
        return const EmptyStateCard(
          icon: Icons.search_off,
          title: 'Không tìm thấy giao dịch đã duyệt',
          message: 'Thử đổi từ khóa tìm kiếm.',
        );
      }
      return const EmptyStateCard(
        icon: Icons.timeline,
        title: 'Chưa có giao dịch đã duyệt',
        message:
            'Ghi giao dịch mới rồi duyệt trong Hoạt động để đưa vào dòng '
            'thời gian tin cậy.',
      );
    }
    return ListView.builder(
      controller: _scroll,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: groups.length,
      itemBuilder: (context, i) => _DayGroup(group: groups[i]),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(label, style: Theme.of(context).textTheme.labelSmall),
          Text(
            value,
            style: Theme.of(
              context,
            ).textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _DayGroup extends StatelessWidget {
  const _DayGroup({required this.group});

  final TimelineDayGroup group;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 8),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  '${group.label} · ${group.displayDate}',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              Text(
                'Tổng: ${formatMoneyWithKind(group.netForDay, group.netForDay >= 0 ? MoneySignKind.income : MoneySignKind.expense)}',
                style: Theme.of(context).textTheme.labelMedium,
              ),
            ],
          ),
        ),
        for (final tx in group.transactions) _TimelineTile(tx: tx),
      ],
    );
  }
}

/// Read-only row — no edit affordances; mutations live on the activity
/// feed and capture surfaces by contract.
class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.tx});

  final Transaction tx;

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
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        title: Text(tx.note.isEmpty ? tx.category : tx.note),
        subtitle: Text('${tx.category} · $accountLine'),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              formatMoneyWithKind(tx.amount, kind),
              style: TextStyle(color: color, fontWeight: FontWeight.w600),
            ),
            const Text('Đã duyệt', style: TextStyle(fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
