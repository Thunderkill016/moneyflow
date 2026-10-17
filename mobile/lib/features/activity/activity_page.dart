import 'dart:async';

import 'package:flutter/material.dart';

import '../../data/recent_searches.dart';
import '../../domain/bulk.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/register.dart' show transactionDeleteErrorMessage;
import '../../domain/report.dart' show unnamedPayeeBucket, vnNow;
import '../../domain/transaction_query.dart';
import '../../theme/mf_theme.dart';
import '../capture/category_picker.dart';
import '../shared/empty_state.dart';
import '../shared/timed_snack_bar.dart';

/// Full transaction activity — soft-delete via long-press (the same
/// soft_delete_money_transaction RPC the web trash flow uses), tap to
/// edit, and a select mode for bulk review / category correction.
/// Search and filters run in [loadPage]; the list pages in on scroll.
class ActivityPage extends StatefulWidget {
  const ActivityPage({
    super.key,
    required this.loadPage,
    this.onDelete,
    this.onOpenTrash,
    this.onEdit,
    this.onBulkReview,
    this.onBulkCategory,
    this.loadCategories,
    this.loadAccounts,
    this.initialQuery,
    this.title,
    this.onCapture,
    this.initialOnlyNeedsReview = false,
  });

  /// One page of the feed for a search/filter query.
  final TransactionPageLoader loadPage;

  /// Soft-delete entry — null hides the affordance entirely (demo has no
  /// ledger writes, so a delete that no-ops while claiming success would
  /// be a lie the row then disproves).
  final Future<void> Function(String transactionId)? onDelete;

  /// Pre-filtered opening state — the reports drill-in pushes the page
  /// already scoped to a row's dimension and period. The filters behave
  /// like any user-set ones: chips render them and can be removed.
  final TransactionQuery? initialQuery;

  /// AppBar title while neither searching nor selecting — the drill-in
  /// names the slice ("Ăn uống · Tháng 10/2026"); null keeps 'Hoạt động'.
  final String? title;

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

  /// "Ghi khoản đầu tiên" on the empty feed — the host opens its
  /// capture flow. Null leaves the empty state as plain informational
  /// text, never a dead button.
  final VoidCallback? onCapture;

  /// Opens with the "Cần xem lại" filter already on — the dashboard
  /// attention card's needs-review row lands here instead of making the
  /// user find the chip.
  final bool initialOnlyNeedsReview;

  @override
  State<ActivityPage> createState() => ActivityPageState();
}

/// Debounce before a typed search hits the backend.
const _searchDebounce = Duration(milliseconds: 350);

/// Distance from the list end at which the next page is requested.
const _loadMoreThreshold = 300.0;

/// First-build fade-in applies to the first screenful only — beyond it
/// the wrap is skipped entirely so paging stays allocation-cheap.
const _fadeInMaxItems = 20;

class ActivityPageState extends State<ActivityPage> {
  late TransactionQuery _query = widget.initialQuery ?? TransactionQuery.none;
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
  late bool _onlyNeedsReview = widget.initialOnlyNeedsReview;
  final Set<String> _selected = {};

  /// Rows whose swipe-mark-reviewed write is in flight — the RPC has no
  /// per-call idempotency key, so the guard IS the double-submit defense.
  final Set<String> _reviewBusy = {};
  final _search = TextEditingController();
  final _scroll = ScrollController();
  Timer? _debounce;
  List<AccountSummary> _accounts = const [];
  List<Category> _categories = const [];

  /// "Tìm gần đây" — last persisted searches, newest first. Loaded
  /// when the search field opens; a prefs failure just means no chips.
  List<String> _recent = const [];

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
    // Rebuild so the "Tìm gần đây" chips hide the moment typing starts.
    setState(() {});
    _debounce?.cancel();
    _debounce = Timer(_searchDebounce, () {
      if (!mounted || text == _query.text) return;
      _recordSearch(text);
      _setQuery(_query.copyWith(text: text));
    });
  }

  /// Persists a non-empty applied query for the "Tìm gần đây" chips —
  /// best-effort like the last-capture picks; a failed write only means
  /// the chip row won't remember this term.
  void _recordSearch(String text) {
    RecentSearches.record(text)
        .then((list) {
          if (mounted) setState(() => _recent = list);
        })
        .catchError((_) {});
  }

  Future<void> _loadRecent() async {
    try {
      final list = await RecentSearches.load();
      if (mounted) setState(() => _recent = list);
    } catch (_) {
      /* no prefs backend → no saved searches */
    }
  }

  void _openSearch() {
    setState(() => _searching = true);
    _loadRecent();
  }

  /// A tapped recent chip fills the field and applies immediately —
  /// re-running a saved search is the whole point of the row.
  void _applyRecent(String text) {
    _search.text = text;
    _search.selection = TextSelection.collapsed(offset: text.length);
    _debounce?.cancel();
    _recordSearch(text);
    _setQuery(_query.copyWith(text: text));
  }

  Future<void> _clearRecent() async {
    setState(() => _recent = const []);
    await RecentSearches.clear().catchError((_) {});
  }

  void _closeSearch() {
    _debounce?.cancel();
    // A pending debounce never fires after close — record the typed
    // term here so quick-open searches still land in "Tìm gần đây".
    _recordSearch(_search.text);
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

  /// Vietnam date (UTC+7) so "Hôm nay" matches ledger days — the shared
  /// civil-date rule in domain/report.dart.
  String get _today => _isoDate(vnNow());

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

  void _snack(String message) => showTimedSnackBar(
    ScaffoldMessenger.of(context),
    SnackBar(content: Text(message)),
  );

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

  /// Swipe-to-review (Monarch's gesture, D5): a needs-review row swiped
  /// right marks reviewed through the same bulk-review seam select mode
  /// uses — one id in the list. The tile itself never dismisses: the
  /// flag flip (or removal under the "Cần xem lại" filter) is the
  /// visible result, and a failure snaps it back with the error snack.
  Future<bool> _swipeReview(Transaction t) async {
    if (_reviewBusy.contains(t.id)) return false;
    _reviewBusy.add(t.id);
    try {
      await widget.onBulkReview!([t.id], reviewed: true);
    } catch (e) {
      if (mounted) _snack(_bulkError(e));
      return false;
    } finally {
      _reviewBusy.remove(t.id);
    }
    if (!mounted) return false;
    _flipReviewFlag(t.id, needsReview: false);
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(
        content: const Text('Đã đánh dấu đã xem'),
        action: SnackBarAction(
          label: 'Hoàn tác',
          onPressed: () => _restoreReviewFlag(t.id),
        ),
      ),
    );
    return false;
  }

  /// The undo path of a swipe — re-flags through the same seam. Local
  /// state only mutates after the write lands, so the row's visible
  /// state is always what the server holds.
  Future<void> _restoreReviewFlag(String id) async {
    if (_reviewBusy.contains(id)) return;
    _reviewBusy.add(id);
    try {
      await widget.onBulkReview!([id], reviewed: false);
    } catch (e) {
      if (mounted) _snack(_bulkError(e));
      return;
    } finally {
      _reviewBusy.remove(id);
    }
    if (mounted) _flipReviewFlag(id, needsReview: true);
  }

  /// Patches one loaded row's flag in place — no refetch: the write
  /// already landed, so the local copy just mirrors the new truth
  /// (paging offsets stay stable, unlike a page-one reload).
  void _flipReviewFlag(String id, {required bool needsReview}) {
    final rows = _rows;
    if (rows == null) return;
    setState(() {
      _rows = [
        for (final t in rows)
          t.id == id ? t.copyWith(needsReview: needsReview) : t,
      ];
    });
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
      try {
        await widget.onDelete!(tx.id);
      } catch (e) {
        if (mounted) _snack(transactionDeleteErrorMessage(e));
        return;
      }
      _refresh();
      if (!mounted) return;
      final open = widget.onOpenTrash;
      showTimedSnackBar(
        ScaffoldMessenger.of(context),
        SnackBar(
          content: const Text('Đã chuyển vào thùng rác'),
          action: open == null
              ? null
              : SnackBarAction(label: 'Mở thùng rác', onPressed: open),
        ),
      );
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
    // Ledger dates arrive ISO — the chip speaks dd/MM/yyyy like the
    // feed's day headers, never the wire format.
    final from = _query.dateFrom, to = _query.dateTo;
    if (from != null && to != null) {
      return '${_dayLabel(from)} → ${_dayLabel(to)}';
    }
    return from != null ? 'Từ ${_dayLabel(from)}' : 'Đến ${_dayLabel(to!)}';
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
          if (q.payee != null)
            chip(
              // '' is the payee-less bucket the report section groups.
              q.payee!.isEmpty
                  ? 'Người nhận: $unnamedPayeeBucket'
                  : 'Người nhận: ${q.payee}',
              () => _setQuery(q.copyWith(clearPayee: true)),
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
      return EmptyStateCard(
        icon: Icons.search_off,
        title: 'Không có giao dịch khớp bộ lọc',
        message: 'Nới hoặc xóa bớt điều kiện lọc để xem thêm.',
        actionLabel: 'Xóa bộ lọc',
        onAction: _clearFilters,
      );
    }
    return EmptyStateCard(
      icon: Icons.receipt_long_outlined,
      title: 'Chưa có giao dịch nào',
      message: 'Khoản đầu tiên bạn ghi sẽ hiện ở đây.',
      actionLabel: widget.onCapture == null ? null : 'Ghi khoản đầu tiên',
      onAction: widget.onCapture,
    );
  }

  /// "Tìm gần đây" — recent-query chips shown while the search field is
  /// still empty; each tap refills the field and runs the search.
  /// "Xóa" clears the persisted list — the store lives in prefs, so the
  /// chips would otherwise outlive what the user meant to keep.
  Widget _recentSearches() {
    final text = Theme.of(context).textTheme;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 8, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.history,
                  size: 16,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 6),
                Expanded(child: Text('Tìm gần đây', style: text.labelLarge)),
                TextButton(onPressed: _clearRecent, child: const Text('Xóa')),
              ],
            ),
            Wrap(
              spacing: 8,
              children: [
                for (final s in _recent)
                  ActionChip(label: Text(s), onPressed: () => _applyRecent(s)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _tile(Transaction t) {
    final tile = _TxTile(
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
          : widget.onDelete == null
          ? null
          : () => _confirmDelete(t),
      onDelete: _selecting || widget.onDelete == null
          ? null
          : () => _confirmDelete(t),
    );
    // Swipe-right = "Đã xem" on flagged rows only — no review seam (demo)
    // or select mode keeps the row plain, and an already-reviewed row
    // has nothing for the gesture to do.
    final swipeable =
        !_selecting &&
        widget.onBulkReview != null &&
        !_reviewBusy.contains(t.id) &&
        t.reviewStatus == TransactionReviewStatus.needsReview;
    if (!swipeable) return tile;
    return Dismissible(
      key: ValueKey('swipe-${t.id}'),
      direction: DismissDirection.startToEnd,
      confirmDismiss: (_) => _swipeReview(t),
      background: const _SwipeReviewBackground(),
      child: tile,
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
    // Fixed-height header band ahead of the lazy feed — the eager
    // `ListView(children:)` this replaced built every loaded row on each
    // "Xem thêm" press; the builder only ever mounts a viewport's worth.
    final headers = <Widget>[
      if (showSearch && _search.text.trim().isEmpty && _recent.isNotEmpty)
        _recentSearches(),
      if (!_query.isEmpty) _filterChips(),
      if (_canSelect && (reviewCount > 0 || _onlyNeedsReview))
        Align(
          alignment: Alignment.centerLeft,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: FilterChip(
              label: Text('Cần xem lại ($reviewCount${_hasMore ? '+' : ''})'),
              selected: _onlyNeedsReview,
              onSelected: (v) => setState(() => _onlyNeedsReview = v),
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
    ];
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
            : Text(widget.title ?? 'Hoạt động'),
        actions: [
          if (!_selecting && !_searching)
            IconButton(
              icon: const Icon(Icons.search),
              tooltip: 'Tìm kiếm',
              onPressed: _openSearch,
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
              child: const Text('Chọn mục đang hiện'),
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
              child: ListView.builder(
                controller: _scroll,
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                itemCount: headers.length + visible.length + 1,
                itemBuilder: (context, i) {
                  if (i < headers.length) return headers[i];
                  final j = i - headers.length;
                  if (j >= visible.length) return _footer();
                  final t = visible[j];
                  final tile = j < _fadeInMaxItems
                      ? _FadeInTile(order: j, child: _tile(t))
                      : _tile(t);
                  // The day header rides inside its first row's cell —
                  // one lazily-built item per transaction, keyed so a
                  // reload reuses the row's element instead of
                  // rebuilding it.
                  return Column(
                    key: ValueKey('tx-${t.id}'),
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (j == 0 || visible[j - 1].occurredOn != t.occurredOn)
                        _DayHeader(label: _dayHeader(t.occurredOn, _today)),
                      tile,
                    ],
                  );
                },
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

  /// Exact-payee input — the same field the reports payee drill-in
  /// filters on. The unnamed bucket ('' payee) projects as a blank
  /// field: applying blank clears the filter, which matches what the
  /// chip row's X does for a drilled-in bucket.
  late final _payee = TextEditingController(text: widget.initial.payee ?? '');
  String? _amountError;

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    _payee.dispose();
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
    final payee = _payee.text.trim();
    q = payee.isEmpty ? q.copyWith(clearPayee: true) : q.copyWith(payee: payee);
    Navigator.pop(context, q);
  }

  void _reset() => setState(() {
    _q = TransactionQuery(text: _q.text);
    _min.clear();
    _max.clear();
    _payee.clear();
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
            TextField(
              controller: _payee,
              decoration: const InputDecoration(
                labelText: 'Người nhận',
                hintText: 'vd. Grab, Quán A',
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

/// Subtle first-build fade for feed rows — a slight per-row stagger so a
/// fresh page settles in a wave instead of popping whole. Only the first
/// [_fadeInMaxItems] rows get wrapped, and MediaQuery.disableAnimations
/// skips the effect entirely.
class _FadeInTile extends StatelessWidget {
  const _FadeInTile({required this.order, required this.child});

  /// Position in the stagger — later rows start deeper into the window.
  final int order;
  final Widget child;

  static const _duration = Duration(milliseconds: 350);
  static const _staggerStep = 0.045;
  static const _latestStart = 0.55;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
      return child;
    }
    final start = (order * _staggerStep).clamp(0.0, _latestStart);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: _duration,
      curve: Interval(start, 1, curve: Curves.easeOut),
      builder: (context, value, child) => Opacity(opacity: value, child: child),
      child: child,
    );
  }
}

/// Cap so a large text scale shrinks the amount instead of overflowing.
const _trailingMaxWidth = 132.0;

class _TxTile extends StatelessWidget {
  const _TxTile({
    required this.tx,
    required this.onLongPress,
    this.onTap,
    this.onDelete,
    this.selecting = false,
    this.selected = false,
  });
  final Transaction tx;
  final VoidCallback? onLongPress;
  final VoidCallback? onTap;

  /// Visible delete affordance — the web row's delete button. Long-press
  /// stays as the shortcut, but a gesture nobody can see is a feature
  /// nobody finds.
  final VoidCallback? onDelete;
  final bool selecting;
  final bool selected;

  @override
  Widget build(BuildContext context) {
    final kind = switch (tx.kind) {
      TransactionKind.income => MoneySignKind.income,
      TransactionKind.expense => MoneySignKind.expense,
      TransactionKind.transfer => MoneySignKind.transfer,
    };
    // Same semantic money tokens as the dashboard tile — one source of
    // truth for income/expense/transfer color across money lists.
    final mf = context.mf;
    final color = switch (tx.kind) {
      TransactionKind.income => mf.incomeText,
      TransactionKind.expense => mf.expenseText,
      TransactionKind.transfer => mf.transferText,
    };
    final accountLine = tx.destinationAccount == null
        ? tx.account
        : '${tx.account} → ${tx.destinationAccount}';
    final needsReview = tx.reviewStatus == TransactionReviewStatus.needsReview;

    final kindWord = switch (tx.kind) {
      TransactionKind.income => 'Thu',
      TransactionKind.expense => 'Chi',
      TransactionKind.transfer => 'Chuyển',
    };
    final label = [
      '$kindWord ${formatMoney(tx.amount)}',
      tx.category,
      accountLine,
      _dayLabel(tx.occurredOn),
      if (needsReview) 'cần xem lại',
      if (tx.isRefund) 'hoàn tiền',
    ].join(', ');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              container: true,
              button: true,
              label: label,
              selected: selecting ? selected : null,
              onTap: onTap,
              onLongPress: onLongPress,
              excludeSemantics: true,
              child: Container(
                color: selected
                    ? Theme.of(context).colorScheme.primaryContainer
                    : null,
                child: ListTile(
                  leading: selecting
                      ? Icon(
                          selected ? Icons.check_circle : Icons.circle_outlined,
                        )
                      : MfKindIcon(tx.kind.name),
                  title: Text(tx.note.isEmpty ? tx.category : tx.note),
                  subtitle: Text(
                    '${tx.category} · $accountLine'
                    '${needsReview ? '\nCần xem lại' : ''}'
                    // D15 ledger-side label: the row is money-in but
                    // nets the expense category it reimburses — the
                    // ledger shows it, honestly named.
                    '${tx.isRefund ? '\nHoàn tiền' : ''}'
                    // D13 ledger-side disclosure: the row stays here
                    // (money really moved) but tells you reports skip it.
                    '${tx.excludedFromReports ? '\nĐã loại khỏi báo cáo' : ''}',
                  ),
                  isThreeLine:
                      needsReview || tx.excludedFromReports || tx.isRefund,
                  trailing: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: _trailingMaxWidth,
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        FittedBox(
                          fit: BoxFit.scaleDown,
                          alignment: Alignment.centerRight,
                          child: Text(
                            formatMoneyWithKind(tx.amount, kind),
                            maxLines: 1,
                            style: mfMoneyStyle(
                              TextStyle(
                                color: color,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _dayLabel(tx.occurredOn),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.labelSmall
                              ?.copyWith(color: context.mf.textSoft),
                        ),
                      ],
                    ),
                  ),
                  // The amount column shrinks under the 48dp padding so the
                  // delete icon keeps its own strip at the card edge.
                  contentPadding: const EdgeInsets.only(left: 16, right: 4),
                  onTap: onTap,
                  onLongPress: onLongPress,
                ),
              ),
            ),
          ),
          // Sibling of the merged Semantics — TalkBack reaches the button;
          // it would be invisible inside an excludeSemantics subtree.
          if (onDelete != null)
            Padding(
              padding: const EdgeInsets.only(right: 4),
              child: IconButton(
                icon: Icon(
                  Icons.delete_outline,
                  size: 20,
                  color: Theme.of(context).colorScheme.error,
                ),
                tooltip: 'Xóa giao dịch',
                visualDensity: VisualDensity.compact,
                onPressed: onDelete,
              ),
            ),
        ],
      ),
    );
  }
}

/// Reveal under a needs-review row swiped right — the check icon and
/// "Đã xem" words carry the action so the color never works alone.
class _SwipeReviewBackground extends StatelessWidget {
  const _SwipeReviewBackground();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: scheme.primaryContainer,
        borderRadius: BorderRadius.circular(12),
      ),
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.only(left: 20),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.done, color: scheme.onPrimaryContainer),
          const SizedBox(width: 6),
          Text(
            'Đã xem',
            style: TextStyle(
              color: scheme.onPrimaryContainer,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

class _DayHeader extends StatelessWidget {
  const _DayHeader({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8, bottom: 8),
    child: Semantics(
      header: true,
      child: Text(label, style: Theme.of(context).textTheme.titleSmall),
    ),
  );
}

/// "Hôm nay" / "Hôm qua" / dd/MM/yyyy for a feed day header.
String _dayHeader(String occurredOn, String today) {
  if (occurredOn == today) return 'Hôm nay';
  final t = DateTime.tryParse(today), d = DateTime.tryParse(occurredOn);
  if (t != null && d != null && t.difference(d).inDays == 1) return 'Hôm qua';
  return _dayLabel(occurredOn);
}

/// 'yyyy-MM-dd' → 'dd/MM/yyyy' (the reference's date format). An
/// unexpected shape is shown as stored rather than guessed at.
String _dayLabel(String isoDay) {
  final p = isoDay.split('-');
  return p.length == 3 ? '${p[2]}/${p[1]}/${p[0]}' : isoDay;
}
