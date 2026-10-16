// "Sự kiện" — event/occasion budgets (D2, RESEARCH_TOP_FINANCE_APPS §10:
// Money Lover's date-ranged occasion budget adapted to one ledger). An
// event holds no money — creating or editing one writes no ledger row;
// spent is the server's live aggregate over real expense legs inside
// [start_date, end_date]. The card shows progress plus days remaining;
// the pushed detail lists the exact feed rows that counted — read-only,
// so the spent figure cannot move under the reader mid-view.

import 'package:flutter/material.dart';

import '../../data/neon/real_store.dart' show newIdempotencyKey;
import '../../domain/budget.dart' show BudgetState;
import '../../domain/datetime_label.dart';
import '../../domain/events.dart';
import '../../domain/models.dart';
import '../../domain/money.dart';
import '../../domain/report.dart' show vnToday, ymd;
import '../../theme/mf_theme.dart';
import '../shared/empty_state.dart';
import '../shared/timed_snack_bar.dart';

/// What the page's one fetch resolves to — events plus the category list
/// scope labels resolve names from. Loading both together keeps a scoped
/// label off the "N danh mục" fallback in the normal path.
typedef EventsData = ({List<EventBudget> events, List<Category> categories});

class EventsPage extends StatefulWidget {
  const EventsPage({
    super.key,
    required this.loadEvents,
    this.loadCategories,
    this.loadTransactions,
    this.onCreate,
    this.onUpdate,
    this.onDelete,
  });

  /// Every live event — the page sections active/upcoming/closed itself.
  final Future<List<EventBudget>> Function() loadEvents;

  /// Category names for scope labels and the form's picker — wired to
  /// loadAllCategories so an archived scope member still resolves by
  /// name (archiving a category never rewrites history). Absent leaves
  /// scope labels on their honest count fallback and hides create/edit.
  final Future<List<Category>> Function()? loadCategories;

  /// The feed rows an event's spent figure aggregated — the caller owns
  /// the [start, nextDay(end)) bound math. Absent hides the drill
  /// section; a read-only surface never fakes a list.
  final Future<({List<Transaction> rows, bool truncated})> Function(
    EventBudget event,
  )?
  loadTransactions;

  /// create_event_budget — null hides the FAB and empty-state action.
  final Future<void> Function(EventDraft draft)? onCreate;

  /// update_event_budget — the stale-write guard rides the row's
  /// updated_at, so a same-row edit elsewhere fails closed.
  final Future<void> Function(EventBudget event, EventDraft draft)? onUpdate;

  /// soft_delete_event_budget — tombstone; ledger rows stay.
  final Future<void> Function(String eventId)? onDelete;

  @override
  State<EventsPage> createState() => _EventsPageState();
}

class _EventsPageState extends State<EventsPage> {
  late Future<EventsData> _data;

  /// Sticky "anything changed" flag — returned on pop so the shell could
  /// reload if it cared. Event writes never touch the ledger, so today
  /// the pop result is unused; the contract stays for parity with the
  /// other tracking surfaces.
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _data = _load();
  }

  Future<EventsData> _load() async {
    final events = await widget.loadEvents();
    final categories = widget.loadCategories == null
        ? const <Category>[]
        : await widget.loadCategories!();
    return (events: events, categories: categories);
  }

  /// Every mutation refetches — the server owns spent/state, so the list
  /// never trusts a local guess.
  Future<void> _refresh() async {
    final next = _load();
    setState(() {
      _data = next;
    });
    try {
      await next;
    } catch (_) {
      // The FutureBuilder renders the honest error state already.
    }
  }

  void _snack(String message) {
    showTimedSnackBar(
      ScaffoldMessenger.of(context),
      SnackBar(content: Text(message)),
    );
  }

  /// Categories for the form's scope picker — lazily loaded only when a
  /// write fires, like the debts repayment pickers.
  Future<List<Category>?> _categoriesForForm() async {
    if (widget.loadCategories == null) return null;
    try {
      return await widget.loadCategories!();
    } catch (_) {
      _snack('Không tải được danh mục — thử lại');
      return null;
    }
  }

  Future<bool> _create() async {
    if (widget.onCreate == null) return false;
    final categories = await _categoriesForForm();
    if (categories == null || !mounted) return false;
    final saved = await showEventFormDialog(
      context,
      categories: categories,
      onSave: widget.onCreate!,
    );
    if (saved) {
      _changed = true;
      _snack('Đã tạo sự kiện');
      _refresh();
    }
    return saved;
  }

  /// Edit from the detail surface — returns whether a save landed so the
  /// detail can pop its now-stale snapshot.
  Future<bool> _edit(EventBudget event) async {
    if (widget.onUpdate == null) return false;
    final categories = await _categoriesForForm();
    if (categories == null || !mounted) return false;
    final saved = await showEventFormDialog(
      context,
      categories: categories,
      editing: event,
      onSave: (draft) => widget.onUpdate!(event, draft),
    );
    if (saved) {
      _changed = true;
      _snack('Đã lưu sự kiện');
      _refresh();
    }
    return saved;
  }

  Future<bool> _delete(EventBudget event) async {
    if (widget.onDelete == null) return false;
    final ok = await _confirm(
      'Xóa sự kiện "${event.name}"? Các giao dịch đã ghi vẫn giữ trong sổ.',
    );
    if (!ok) return false;
    try {
      await widget.onDelete!(event.id);
    } catch (e) {
      if (mounted) {
        _snack(eventErrorMessage(e, fallback: 'Không xóa được — thử lại'));
      }
      await _refresh();
      return false;
    }
    _changed = true;
    _snack('Đã xóa sự kiện');
    await _refresh();
    return true;
  }

  Future<bool> _confirm(String message) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Đồng ý'),
          ),
        ],
      ),
    );
    return ok == true;
  }

  Future<void> _openDetail(EventBudget event, List<Category> categories) {
    return Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => EventDetailPage(
          event: event,
          categories: categories,
          loadTransactions: widget.loadTransactions,
          onEdit: widget.onUpdate == null ? null : () => _edit(event),
          onDelete: widget.onDelete == null ? null : () => _delete(event),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.of(context).pop(_changed);
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Sự kiện')),
        body: FutureBuilder<EventsData>(
          future: _data,
          builder: (context, snap) {
            // Same failure contract as debts/accounts: a friendly line,
            // never a forever spinner.
            if (snap.hasError) {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text('Không tải được sự kiện'),
                    const SizedBox(height: 8),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 24),
                      child: Text(
                        'Kiểm tra kết nối mạng rồi thử lại.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
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
            final events = snap.data!.events;
            final categories = snap.data!.categories;
            final today = vnToday();
            final active = _section(events, today, EventPhase.active)
              ..sort((a, b) => a.endDate.compareTo(b.endDate));
            final upcoming = _section(events, today, EventPhase.upcoming)
              ..sort((a, b) => a.startDate.compareTo(b.startDate));
            final closed = _section(events, today, EventPhase.closed)
              ..sort((a, b) => b.endDate.compareTo(a.endDate));
            return RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                children: [
                  if (events.isEmpty)
                    EmptyStateCard(
                      icon: Icons.celebration_outlined,
                      title: 'Chưa có sự kiện nào',
                      message:
                          'Đặt hạn mức cho một dịp — Tết, đám cưới, chuyến đi — '
                          'và xem đã chi bao nhiêu trong khoảng ngày đó.',
                      actionLabel: widget.onCreate == null
                          ? null
                          : 'Thêm sự kiện',
                      onAction: widget.onCreate == null ? null : _create,
                    ),
                  for (final (label, section) in [
                    ('Đang diễn ra', active),
                    ('Sắp tới', upcoming),
                    ('Đã kết thúc', closed),
                  ])
                    if (section.isNotEmpty) ...[
                      Text(
                        label,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      for (final e in section)
                        EventCard(
                          event: e,
                          categories: categories,
                          today: today,
                          onTap: () => _openDetail(e, categories),
                        ),
                      const SizedBox(height: 12),
                    ],
                ],
              ),
            );
          },
        ),
        floatingActionButton: widget.onCreate == null
            ? null
            : FloatingActionButton.extended(
                onPressed: _create,
                icon: const Icon(Icons.add),
                label: const Text('Thêm sự kiện'),
              ),
      ),
    );
  }

  List<EventBudget> _section(
    List<EventBudget> events,
    String today,
    EventPhase phase,
  ) => [
    for (final e in events)
      if (e.phaseAt(today) == phase) e,
  ];
}

/// One event row: name, window + scope, the spent/limit tick bar with a
/// "hôm nay" pace marker, and the phase line. Closed events dim — the
/// window has fully elapsed so the numbers are final, not live.
class EventCard extends StatelessWidget {
  const EventCard({
    super.key,
    required this.event,
    required this.categories,
    required this.today,
    this.onTap,
  });

  final EventBudget event;
  final List<Category> categories;
  final String today;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final mf = context.mf;
    final phase = event.phaseAt(today);
    final ratio = event.limitMinor <= 0
        ? 1.0
        : (event.spentMinor / event.limitMinor).clamp(0.0, 1.0);
    final (status, color) = switch (event.spendState) {
      BudgetState.over => (
        'Vượt ${formatMoney(event.remainingMinor.abs())}',
        mf.expenseText,
      ),
      BudgetState.nearLimit => (
        'Sắp tới hạn mức · còn ${formatMoney(event.remainingMinor)}',
        mf.warningText,
      ),
      BudgetState.ok => (
        'Còn ${formatMoney(event.remainingMinor)}',
        mf.incomeText,
      ),
    };
    final phaseLine = switch (phase) {
      EventPhase.active =>
        eventDaysRemaining(
                  startDate: event.startDate,
                  endDate: event.endDate,
                  today: today,
                ) ==
                0
            ? 'Hôm nay là ngày cuối'
            : 'Còn ${eventDaysRemaining(startDate: event.startDate, endDate: event.endDate, today: today)} ngày',
      EventPhase.upcoming =>
        'Bắt đầu sau ${eventDaysUntilStart(startDate: event.startDate, today: today)} ngày',
      EventPhase.closed => 'Đã kết thúc',
    };
    final dimmed = phase == EventPhase.closed;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
          child: Opacity(
            opacity: dimmed ? 0.72 : 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(event.name, style: text.titleMedium)),
                    Text(
                      phaseLine,
                      style: text.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  '${formatYmdAsDmy(event.startDate)} – '
                  '${formatYmdAsDmy(event.endDate)} · '
                  '${eventScopeLabel(event, categories)}',
                  style: text.bodySmall,
                ),
                const SizedBox(height: 10),
                Semantics(
                  label: 'Đã chi ${(ratio * 100).round()}% hạn mức sự kiện',
                  child: MfTickBar(
                    ratio: ratio,
                    color: dimmed ? null : color,
                    marker: eventPace(
                      startDate: event.startDate,
                      endDate: event.endDate,
                      today: today,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Đã chi ${formatMoney(event.spentMinor)} / '
                  '${formatMoney(event.limitMinor)} · $status',
                  style: text.bodySmall?.copyWith(
                    color: dimmed ? null : color,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Pushed read-only view of one event: the full progress figure plus the
/// feed rows that produced it. Editing/deleting is delegated back to the
/// list (which owns the form + store seams); a successful write pops
/// this page so the reader never stares at a stale snapshot.
class EventDetailPage extends StatelessWidget {
  const EventDetailPage({
    super.key,
    required this.event,
    required this.categories,
    this.loadTransactions,
    this.onEdit,
    this.onDelete,
  });

  final EventBudget event;
  final List<Category> categories;
  final Future<({List<Transaction> rows, bool truncated})> Function(
    EventBudget event,
  )?
  loadTransactions;

  /// Resolves to true when the write landed — the detail then pops so
  /// the list's refreshed row is what the reader returns to.
  final Future<bool> Function()? onEdit;
  final Future<bool> Function()? onDelete;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final mf = context.mf;
    final today = vnToday();
    final phase = event.phaseAt(today);
    final ratio = event.limitMinor <= 0
        ? 1.0
        : (event.spentMinor / event.limitMinor).clamp(0.0, 1.0);
    final (status, color) = switch (event.spendState) {
      BudgetState.over => (
        'Vượt ${formatMoney(event.remainingMinor.abs())}',
        mf.expenseText,
      ),
      BudgetState.nearLimit => (
        'Sắp tới hạn mức · còn ${formatMoney(event.remainingMinor)}',
        mf.warningText,
      ),
      BudgetState.ok => (
        'Còn ${formatMoney(event.remainingMinor)}',
        mf.incomeText,
      ),
    };
    return Scaffold(
      appBar: AppBar(
        title: Text(event.name),
        actions: [
          if (onEdit != null)
            IconButton(
              tooltip: 'Sửa sự kiện',
              icon: const Icon(Icons.edit_outlined),
              onPressed: () async {
                if (await onEdit!() && context.mounted) {
                  Navigator.of(context).pop(true);
                }
              },
            ),
          if (onDelete != null)
            IconButton(
              tooltip: 'Xóa sự kiện',
              icon: const Icon(Icons.delete_outline),
              onPressed: () async {
                if (await onDelete!() && context.mounted) {
                  Navigator.of(context).pop(true);
                }
              },
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${formatYmdAsDmy(event.startDate)} – '
                    '${formatYmdAsDmy(event.endDate)} · '
                    '${eventScopeLabel(event, categories)}',
                    style: text.bodySmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Đã chi ${formatMoney(event.spentMinor)}',
                    style: text.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  Text(
                    'hạn mức ${formatMoney(event.limitMinor)} · $status',
                    style: text.bodyMedium?.copyWith(color: color),
                  ),
                  const SizedBox(height: 10),
                  MfTickBar(
                    ratio: ratio,
                    color: phase == EventPhase.closed ? null : color,
                    marker: eventPace(
                      startDate: event.startDate,
                      endDate: event.endDate,
                      today: today,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(switch (phase) {
                    EventPhase.active =>
                      eventDaysRemaining(
                                startDate: event.startDate,
                                endDate: event.endDate,
                                today: today,
                              ) ==
                              0
                          ? 'Hôm nay là ngày cuối'
                          : 'Còn ${eventDaysRemaining(startDate: event.startDate, endDate: event.endDate, today: today)} ngày · '
                                'ngày ${eventDaysElapsed(startDate: event.startDate, endDate: event.endDate, today: today)}'
                                '/${eventTotalDays(event.startDate, event.endDate)}',
                    EventPhase.upcoming =>
                      'Bắt đầu sau ${eventDaysUntilStart(startDate: event.startDate, today: today)} ngày · '
                          '${eventTotalDays(event.startDate, event.endDate)} ngày',
                    EventPhase.closed =>
                      'Đã kết thúc · ${eventTotalDays(event.startDate, event.endDate)} ngày',
                  }, style: text.bodySmall),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (loadTransactions != null) ...[
            Text(
              'Giao dịch được tính',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 4),
            _EventTransactionsList(
              event: event,
              loadTransactions: loadTransactions!,
            ),
          ],
        ],
      ),
    );
  }
}

/// The drill list — feed rows filtered by the same
/// [eventSpentOfTransaction] predicate the progress view uses, so the
/// listed total and the card's spent figure can never disagree. A
/// partial split shows only its in-scope share, marked "một phần".
class _EventTransactionsList extends StatefulWidget {
  const _EventTransactionsList({
    required this.event,
    required this.loadTransactions,
  });

  final EventBudget event;
  final Future<({List<Transaction> rows, bool truncated})> Function(
    EventBudget event,
  )
  loadTransactions;

  @override
  State<_EventTransactionsList> createState() => _EventTransactionsListState();
}

class _EventTransactionsListState extends State<_EventTransactionsList> {
  late Future<({List<Transaction> rows, bool truncated})> _rows;

  @override
  void initState() {
    super.initState();
    _rows = widget.loadTransactions(widget.event);
  }

  void _retry() {
    final next = widget.loadTransactions(widget.event);
    setState(() {
      _rows = next;
    });
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return FutureBuilder<({List<Transaction> rows, bool truncated})>(
      future: _rows,
      builder: (context, snap) {
        if (snap.hasError) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Không tải được giao dịch', style: text.bodySmall),
              TextButton(onPressed: _retry, child: const Text('Thử lại')),
            ],
          );
        }
        if (!snap.hasData) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        final event = widget.event;
        // (row, its in-scope share) — a scoped split contributes only the
        // legs whose category is in the scope set.
        final counted = [
          for (final tx in snap.data!.rows)
            (tx, eventSpentOfTransaction(event, tx)),
        ].where((r) => r.$2 > 0).toList();
        if (counted.isEmpty) {
          return Text(
            'Chưa có giao dịch chi nào trong khoảng này.',
            style: text.bodySmall,
          );
        }
        final total = counted.fold(0, (s, r) => s + r.$2);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${counted.length} giao dịch · tổng ${formatMoney(total)}'
              '${snap.data!.truncated ? ' (phần gần nhất)' : ''}',
              style: text.bodySmall,
            ),
            const SizedBox(height: 4),
            for (final (tx, share) in counted)
              ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.south_east, size: 18),
                title: Text(
                  tx.note.isNotEmpty
                      ? tx.note
                      : (tx.payee?.isNotEmpty ?? false)
                      ? tx.payee!
                      : tx.category,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                subtitle: Text(
                  '${formatYmdAsDmy(tx.occurredOn)} · ${tx.category}'
                  // A scoped split's share differs from the row total —
                  // label it so the figure never reads as the whole
                  // transaction.
                  '${tx.isSplit && share != tx.amount ? ' · một phần' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                trailing: Text(formatMoney(share)),
              ),
          ],
        );
      },
    );
  }
}

/// Create/edit form — name, window, total limit, and the category scope
/// ("Tất cả danh mục" or a picked set; only expense categories may join,
/// the server re-checks). The idempotency key is minted per dialog open:
/// a submit retry after a lost response replays the same logical create;
/// a new dialog is always a new intent.
///
/// An edit preserves scope ids the picker cannot show (a scope member
/// whose category is now archived): [preservedScopeIds] rides along
/// silently-reported instead of silently dropped.
Future<bool> showEventFormDialog(
  BuildContext context, {
  required List<Category> categories,
  EventBudget? editing,
  required Future<void> Function(EventDraft draft) onSave,
}) async {
  // The picker only offers live expense categories — income kinds can
  // never feed spend, and an archived row is a label, not a choice.
  final pickable = [
    for (final c in categories)
      if (c.kind == TransactionKind.expense && !c.isArchived) c.id,
  ];
  final pickableIds = pickable.toSet();
  final selected = <String>{
    for (final id in editing?.categoryIds ?? const <String>[])
      if (pickableIds.contains(id)) id,
  };
  final preservedScopeIds = <String>{
    for (final id in editing?.categoryIds ?? const <String>[])
      if (!pickableIds.contains(id)) id,
  };
  final name = TextEditingController(text: editing?.name ?? '');
  final limit = TextEditingController(
    text: editing == null ? '' : '${editing.limitMinor}',
  );
  final today = DateTime.parse(vnToday());
  DateTime? start = editing == null ? today : DateTime.parse(editing.startDate);
  DateTime? end = editing == null ? today : DateTime.parse(editing.endDate);
  String? error;
  var submitting = false;
  final idempotencyKey = newIdempotencyKey();
  final saved = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setDlg) => AlertDialog(
        title: Text(editing == null ? 'Thêm sự kiện' : 'Sửa sự kiện'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              TextField(
                controller: name,
                autofocus: editing == null,
                decoration: const InputDecoration(
                  labelText: 'Tên sự kiện',
                  hintText: 'vd: Tết 2027, Đám cưới em, Đà Lạt 3 ngày',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: limit,
                decoration: const InputDecoration(
                  labelText: 'Hạn mức tổng',
                  hintText: 'vd: 20tr',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _DateField(
                      label: 'Từ ngày',
                      value: start,
                      enabled: !submitting,
                      onPick: (d) => setDlg(() {
                        start = d;
                        // A picked start ahead of the end drags the end
                        // forward — the pair can never submit inverted.
                        if (end != null && end!.isBefore(d)) end = d;
                      }),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _DateField(
                      label: 'Đến ngày',
                      value: end,
                      enabled: !submitting,
                      onPick: (d) => setDlg(() {
                        end = d;
                        if (start != null && start!.isAfter(d)) start = d;
                      }),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text('Phạm vi', style: Theme.of(ctx).textTheme.labelLarge),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilterChip(
                    label: const Text('Tất cả danh mục'),
                    selected: selected.isEmpty,
                    onSelected: submitting
                        ? null
                        : (_) => setDlg(() => selected.clear()),
                  ),
                  for (final c in categories)
                    if (pickableIds.contains(c.id))
                      FilterChip(
                        label: Text(c.name),
                        selected: selected.contains(c.id),
                        onSelected: submitting
                            ? null
                            : (v) => setDlg(
                                () => v
                                    ? selected.add(c.id)
                                    : selected.remove(c.id),
                              ),
                      ),
                ],
              ),
              if (preservedScopeIds.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 6),
                  child: Text(
                    '${preservedScopeIds.length} danh mục đã ẩn vẫn nằm '
                    'trong phạm vi',
                    style: Theme.of(ctx).textTheme.bodySmall,
                  ),
                ),
              const SizedBox(height: 6),
              Text(
                'Chi tiêu được tính từ các giao dịch chi trong khoảng ngày.',
                style: Theme.of(ctx).textTheme.bodySmall,
              ),
              if (error != null) ...[
                const SizedBox(height: 12),
                Text(
                  error!,
                  style: TextStyle(color: Theme.of(ctx).colorScheme.error),
                ),
              ],
            ],
          ),
        ),
        actions: [
          TextButton(
            // No cancel mid-flight — the RPC is already on the wire.
            onPressed: submitting ? null : () => Navigator.pop(ctx, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: submitting
                ? null
                : () async {
                    final n = name.text.trim();
                    final lim = parseMoneyInput(limit.text);
                    final s = start;
                    final e = end;
                    if (n.isEmpty) {
                      setDlg(() => error = 'Nhập tên sự kiện');
                      return;
                    }
                    if (lim == null || lim <= 0) {
                      setDlg(() => error = 'Hạn mức không hợp lệ');
                      return;
                    }
                    if (s == null || e == null || e.isBefore(s)) {
                      setDlg(
                        () =>
                            error = 'Ngày kết thúc phải từ ngày bắt đầu trở đi',
                      );
                      return;
                    }
                    setDlg(() => submitting = true);
                    try {
                      await onSave(
                        EventDraft(
                          name: n,
                          startDate: ymd(s),
                          endDate: ymd(e),
                          limitMinor: lim,
                          categoryIds: [...preservedScopeIds, ...selected]
                            ..sort(),
                          idempotencyKey: idempotencyKey,
                        ),
                      );
                    } catch (err) {
                      setDlg(() {
                        submitting = false;
                        error = eventErrorMessage(
                          err,
                          fallback: 'Không lưu được — thử lại',
                        );
                      });
                      return;
                    }
                    if (ctx.mounted) Navigator.pop(ctx, true);
                  },
            child: Text(editing == null ? 'Tạo' : 'Lưu'),
          ),
        ],
      ),
    ),
  );
  return saved ?? false;
}

/// One date picker field — same InputDecorator+InkWell shape the debts
/// form uses, minus the clear affordance (both bounds are required).
class _DateField extends StatelessWidget {
  const _DateField({
    required this.label,
    required this.value,
    required this.enabled,
    required this.onPick,
  });

  final String label;
  final DateTime? value;
  final bool enabled;
  final ValueChanged<DateTime> onPick;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: enabled
          ? () async {
              final picked = await showDatePicker(
                context: context,
                initialDate: value ?? DateTime.now(),
                firstDate: DateTime(2000),
                // Events can be planned far ahead (Tết 2028) and logged
                // retroactively — the bound only stops typos.
                lastDate: DateTime.now().add(const Duration(days: 365 * 20)),
              );
              if (picked != null) onPick(picked);
            }
          : null,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          border: const OutlineInputBorder(),
        ),
        child: Text(
          value == null
              ? '—'
              : '${value!.day.toString().padLeft(2, '0')}/'
                    '${value!.month.toString().padLeft(2, '0')}/'
                    '${value!.year}',
        ),
      ),
    );
  }
}
