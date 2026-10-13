import 'dart:async';

import 'package:flutter/material.dart';

import '../../domain/bulk.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/transaction_query.dart';
import '../capture/category_picker.dart';

/// Full transaction activity — soft-delete via long-press (the same
/// soft_delete_money_transaction RPC the web trash flow uses), tap to
/// edit, and a select mode for bulk review / category correction.
/// Search and filters run in [loadPage]; the list pages in on scroll.
class ActivityPage extends StatefulWidget {
  const ActivityPage({
    super.key,
    required this.loadPage,
    required this.onDelete,
    this.onOpenTrash,
    this.onEdit,
    this.onBulkReview,
    this.onBulkCategory,
    this.loadCategories,
    this.loadAccounts,
  });

  /// One page of the feed for a search/filter query.
  final TransactionPageLoader loadPage;
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

  /// Feeds the account filter — null hides it.
  final Future<List<AccountSummary>> Function()? loadAccounts;

  @override
  State<ActivityPage> createState() => ActivityPageState();
}

/// Debounce before a typed search hits the backend.
const _searchDebounce = Duration(milliseconds: 350);

/// Distance from the list end at which the next page is requested.
const _loadMoreThreshold = 300.0;

class ActivityPageState extends State<ActivityPage> {
  TransactionQuery _query = TransactionQuery.none;
  List<Transaction>? _rows;
  Object? _error;
  bool _hasMore = false;
  bool _loadingMore = false;
  bool _moreFailed = false;

  /// Bumped per first-page request so a slow older response (previous
  /// query) can never overwrite a newer one.
  int _gen = 0;
  bool _selecting = false;
  bool _searching = false;
  bool _onlyNeedsReview = false;
  final Set<String> _selected = {};
  final _search = TextEditingController();
  final _scroll = ScrollController();
  Timer? _debounce;
  List<AccountSummary> _accounts = const [];
  List<Category> _categories = const [];

  @override
  void initState() {
    super.initState();
    _scroll.addListener(_onScroll);
    _loadFirst();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  /// Loads page one for the active query. [keep] leaves the current rows
  /// on screen meanwhile (reload after an edit) instead of a spinner.
  Future<void> _loadFirst({bool keep = false}) async {
    final gen = ++_gen;
    setState(() {
      if (!keep) _rows = null;
      _error = null;
      _moreFailed = false;
      _loadingMore = false;
    });
    try {
      final page = await widget.loadPage(_query, offset: 0);
      if (!mounted || gen != _gen) return;
      setState(() {
        _rows = page.rows;
        _hasMore = page.hasMore;
      });
    } catch (e) {
      if (!mounted || gen != _gen) return;
      setState(() {
        _rows = null;
        _error = e;
      });
    }
  }

  Future<void> _loadMore() async {
    final rows = _rows;
    if (rows == null || !_hasMore || _loadingMore) return;
    final gen = _gen;
    setState(() {
      _loadingMore = true;
      _moreFailed = false;
    });
    try {
      final page = await widget.loadPage(_query, offset: rows.length);
      if (!mounted || gen != _gen) return;
      setState(() {
        _rows = [...rows, ...page.rows];
        _hasMore = page.hasMore;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted || gen != _gen) return;
      setState(() {
        _loadingMore = false;
        _moreFailed = true;
      });
    }
  }

  void _onScroll() {
    if (_moreFailed) return; // wait for the explicit retry
    if (_scroll.position.extentAfter < _loadMoreThreshold) _loadMore();
  }

  void _setQuery(TransactionQuery q) {
    _query = q;
    _loadFirst();
  }

  void _onSearchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(_searchDebounce, () {
      if (!mounted || text == _query.text) return;
      _setQuery(_query.copyWith(text: text));
    });
  }

  void _closeSearch() {
    _debounce?.cancel();
    final had = _query.text.isNotEmpty;
    _search.clear();
    setState(() => _searching = false);
    if (had) _setQuery(_query.copyWith(text: ''));
  }

  void _clearFilters() {
    _debounce?.cancel();
    _search.clear();
    setState(() => _searching = false);
    _setQuery(TransactionQuery.none);
  }

  Future<void> _refresh() => _loadFirst(keep: true);

  /// Public reload for the nav shell: back to page one, query kept.
  void reload() => _refresh();

  Future<void> _openFilters() async {
    try {
      if (widget.loadAccounts != null && _accounts.isEmpty) {
        _accounts = await widget.loadAccounts!();
      }
      if (widget.loadCategories != null && _categories.isEmpty) {
        _categories = await widget.loadCategories!();
      }
    } catch (_) {
      // Filters still work for what loaded; the pickers just stay short.
    }
    if (!mounted) return;
    final result = await showModalBottomSheet<TransactionQuery>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _FilterSheet(
        initial: _query,
        accounts: _accounts,
        categories: _categories,
      ),
    );
    if (result != null) _setQuery(result);
  }

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

  String _dateLabel() {
    final from = _query.dateFrom, to = _query.dateTo;
    if (from != null && to != null) return '$from → $to';
    return from != null ? 'Từ $from' : 'Đến $to';
  }

  String _amountLabel() {
    final lo = _query.minAmount, hi = _query.maxAmount;
    if (lo != null && hi != null) {
      return '${formatMoney(lo)} – ${formatMoney(hi)}';
    }
    return lo != null ? 'Từ ${formatMoney(lo)}' : 'Đến ${formatMoney(hi!)}';
  }

  Widget _filterChips() {
    final q = _query;
    Widget chip(String label, VoidCallback onRemove) => InputChip(
      label: Text(label),
      onDeleted: onRemove,
      deleteButtonTooltipMessage: 'Bỏ bộ lọc $label',
    );
    String nameOf<T>(
      Iterable<T> items,
      bool Function(T) test,
      String Function(T) name,
      String fallback,
    ) {
      for (final i in items) {
        if (test(i)) return name(i);
      }
      return fallback;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Wrap(
        spacing: 8,
        runSpacing: 4,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          if (q.searchTerm.isNotEmpty)
            chip('"${q.searchTerm}"', () {
              _search.clear();
              _setQuery(q.copyWith(text: ''));
            }),
          if (q.kind != null)
            chip(
              kindFilterLabel(q.kind!),
              () => _setQuery(q.copyWith(clearKind: true)),
            ),
          if (q.accountId != null)
            chip(
              nameOf(
                _accounts,
                (a) => a.id == q.accountId,
                (a) => a.name,
                'Tài khoản',
              ),
              () => _setQuery(q.copyWith(clearAccount: true)),
            ),
          if (q.categoryId != null)
            chip(
              nameOf(
                _categories,
                (c) => c.id == q.categoryId,
                (c) => c.name,
                'Danh mục',
              ),
              () => _setQuery(q.copyWith(clearCategory: true)),
            ),
          if (q.dateFrom != null || q.dateTo != null)
            chip(_dateLabel(), () => _setQuery(q.copyWith(clearDates: true))),
          if (q.minAmount != null || q.maxAmount != null)
            chip(
              _amountLabel(),
              () => _setQuery(q.copyWith(clearAmounts: true)),
            ),
          TextButton(onPressed: _clearFilters, child: const Text('Xóa bộ lọc')),
        ],
      ),
    );
  }

  Widget _emptyState() {
    if (!_query.isEmpty) {
      return const Card(
        child: ListTile(title: Text('Không có giao dịch khớp bộ lọc')),
      );
    }
    return const Card(
      child: ListTile(
        title: Text('Chưa có giao dịch nào'),
        subtitle: Text('Bấm "Ghi" ở thanh dưới để thêm khoản đầu tiên'),
      ),
    );
  }

  Widget _footer() {
    if (_loadingMore) {
      return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_moreFailed) {
      return Card(
        child: ListTile(
          title: const Text('Không tải thêm được'),
          trailing: TextButton(
            onPressed: _loadMore,
            child: const Text('Thử lại'),
          ),
        ),
      );
    }
    return const SizedBox.shrink();
  }

  @override
  Widget build(BuildContext context) {
    final all = _rows ?? const <Transaction>[];
    final visible = _onlyNeedsReview
        ? [
            for (final t in all)
              if (t.reviewStatus == TransactionReviewStatus.needsReview) t,
          ]
        : all;
    final reviewCount = needsReviewCount(all);
    final showSearch = _searching && !_selecting;
    return Scaffold(
      appBar: AppBar(
        leading: _selecting
            ? IconButton(
                icon: const Icon(Icons.close),
                tooltip: 'Thoát chọn',
                onPressed: _exitSelect,
              )
            : showSearch
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                tooltip: 'Đóng tìm kiếm',
                onPressed: _closeSearch,
              )
            : null,
        title: _selecting
            ? Text('Đã chọn ${_selected.length}')
            : showSearch
            ? TextField(
                controller: _search,
                autofocus: true,
                textInputAction: TextInputAction.search,
                decoration: const InputDecoration(
                  hintText: 'Tìm ghi chú, nơi nhận, danh mục, tài khoản',
                  border: InputBorder.none,
                ),
                onChanged: _onSearchChanged,
              )
            : const Text('Hoạt động'),
        actions: [
          if (!_selecting && !_searching)
            IconButton(
              icon: const Icon(Icons.search),
              tooltip: 'Tìm kiếm',
              onPressed: () => setState(() => _searching = true),
            ),
          if (!_selecting)
            IconButton(
              icon: Badge(
                isLabelVisible: _query.filterCount > 0,
                label: Text('${_query.filterCount}'),
                child: const Icon(Icons.filter_list),
              ),
              tooltip: 'Bộ lọc',
              onPressed: _openFilters,
            ),
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
                  widget.onBulkCategory == null || widget.loadCategories == null
                  ? null
                  : () => _bulkCategory(all),
            )
          : null,
      body: _error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Không tải được hoạt động'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: _loadFirst,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            )
          : _rows == null
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (!_query.isEmpty) _filterChips(),
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
                    _emptyState()
                  else if (visible.isEmpty)
                    Card(
                      child: ListTile(
                        title: Text(
                          _hasMore
                              ? 'Chưa thấy khoản cần xem lại trong phần đã tải'
                              : 'Không còn khoản nào cần xem lại',
                        ),
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
                  _footer(),
                ],
              ),
            ),
    );
  }
}

/// Chip/button label for a kind filter.
String kindFilterLabel(TransactionKind k) => switch (k) {
  TransactionKind.expense => 'Chi tiêu',
  TransactionKind.income => 'Thu nhập',
  TransactionKind.transfer => 'Chuyển khoản',
};

/// Earliest/latest day the range picker offers.
final _pickerFirstDate = DateTime(2000);
final _pickerLastDate = DateTime(2100);

String _isoDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

DateTime? _parseIso(String? s) => s == null ? null : DateTime.tryParse(s);

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({
    required this.initial,
    required this.accounts,
    required this.categories,
  });

  final TransactionQuery initial;
  final List<AccountSummary> accounts;
  final List<Category> categories;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late TransactionQuery _q = widget.initial;
  late final _min = TextEditingController(
    text: widget.initial.minAmount?.toString() ?? '',
  );
  late final _max = TextEditingController(
    text: widget.initial.maxAmount?.toString() ?? '',
  );
  String? _amountError;

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  void _setKind(TransactionKind? k) => setState(() {
    final cat = widget.categories.where((c) => c.id == _q.categoryId);
    // A category of another kind could never match — drop it.
    final stale = k != null && cat.isNotEmpty && cat.first.kind != k;
    _q = k == null ? _q.copyWith(clearKind: true) : _q.copyWith(kind: k);
    if (stale) _q = _q.copyWith(clearCategory: true);
  });

  Future<void> _pickCategory() async {
    final picked = await showCategoryPicker(
      context,
      categories: [
        for (final c in widget.categories)
          if (_q.kind == null || c.kind == _q.kind) c,
      ],
      selectedId: _q.categoryId,
    );
    if (picked != null) setState(() => _q = _q.copyWith(categoryId: picked.id));
  }

  Future<void> _pickDates() async {
    final from = _parseIso(_q.dateFrom), to = _parseIso(_q.dateTo);
    final range = await showDateRangePicker(
      context: context,
      firstDate: _pickerFirstDate,
      lastDate: _pickerLastDate,
      initialDateRange: from != null && to != null
          ? DateTimeRange(start: from, end: to)
          : null,
    );
    if (range != null) {
      setState(
        () => _q = _q.copyWith(
          dateFrom: _isoDate(range.start),
          dateTo: _isoDate(range.end),
        ),
      );
    }
  }

  void _apply() {
    final lo = parseMoneyInput(_min.text), hi = parseMoneyInput(_max.text);
    final bad =
        (_min.text.trim().isNotEmpty && lo == null) ||
        (_max.text.trim().isNotEmpty && hi == null);
    if (bad) {
      setState(() => _amountError = 'Số tiền không hợp lệ');
      return;
    }
    if (lo != null && hi != null && lo > hi) {
      setState(() => _amountError = 'Số tiền tối thiểu lớn hơn tối đa');
      return;
    }
    var q = _q.copyWith(clearAmounts: true);
    if (lo != null || hi != null) q = q.copyWith(minAmount: lo, maxAmount: hi);
    Navigator.pop(context, q);
  }

  void _reset() => setState(() {
    _q = TransactionQuery(text: _q.text);
    _min.clear();
    _max.clear();
    _amountError = null;
  });

  @override
  Widget build(BuildContext context) {
    final cats = widget.categories.where((c) => c.id == _q.categoryId);
    final catName = cats.isEmpty ? null : cats.first.name;
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bộ lọc', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                ChoiceChip(
                  label: const Text('Tất cả'),
                  selected: _q.kind == null,
                  onSelected: (_) => _setKind(null),
                ),
                for (final k in TransactionKind.values)
                  ChoiceChip(
                    label: Text(kindFilterLabel(k)),
                    selected: _q.kind == k,
                    onSelected: (_) => _setKind(k),
                  ),
              ],
            ),
            if (widget.accounts.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String?>(
                initialValue: _q.accountId,
                decoration: const InputDecoration(labelText: 'Tài khoản'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('Tất cả')),
                  for (final a in widget.accounts)
                    DropdownMenuItem(value: a.id, child: Text(a.name)),
                ],
                onChanged: (v) => setState(
                  () => _q = v == null
                      ? _q.copyWith(clearAccount: true)
                      : _q.copyWith(accountId: v),
                ),
              ),
            ],
            if (widget.categories.isNotEmpty)
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Danh mục'),
                subtitle: Text(catName ?? 'Tất cả'),
                onTap: _pickCategory,
                trailing: catName == null
                    ? const Icon(Icons.chevron_right)
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        tooltip: 'Bỏ danh mục',
                        onPressed: () => setState(
                          () => _q = _q.copyWith(clearCategory: true),
                        ),
                      ),
              ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Khoảng ngày'),
              subtitle: Text(
                _q.dateFrom == null && _q.dateTo == null
                    ? 'Tất cả'
                    : '${_q.dateFrom ?? '…'} → ${_q.dateTo ?? '…'}',
              ),
              onTap: _pickDates,
              trailing: _q.dateFrom == null && _q.dateTo == null
                  ? const Icon(Icons.chevron_right)
                  : IconButton(
                      icon: const Icon(Icons.clear),
                      tooltip: 'Bỏ khoảng ngày',
                      onPressed: () =>
                          setState(() => _q = _q.copyWith(clearDates: true)),
                    ),
            ),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _min,
                    keyboardType: TextInputType.text,
                    decoration: const InputDecoration(
                      labelText: 'Từ số tiền',
                      hintText: 'vd 50k',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _max,
                    keyboardType: TextInputType.text,
                    decoration: const InputDecoration(
                      labelText: 'Đến số tiền',
                      hintText: 'vd 2tr',
                    ),
                  ),
                ),
              ],
            ),
            if (_amountError != null)
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  _amountError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                TextButton(onPressed: _reset, child: const Text('Đặt lại')),
                const Spacer(),
                FilledButton(onPressed: _apply, child: const Text('Áp dụng')),
              ],
            ),
          ],
        ),
      ),
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
