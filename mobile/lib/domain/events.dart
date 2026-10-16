// Event/occasion budgets (D2) — date-ranged scoped spend limits for the
// budgeting moments a VN user actually plans around (Tết, đám cưới, du
// lịch, tựu trường). Mirrors
// supabase/migrations/20261016180000_event_budgets.sql: an event holds no
// money — creating one posts nothing, and `spent` is always a live
// aggregate over real transaction_entries legs inside [startDate,
// endDate]. The view and [eventSpentOfTransaction] share one predicate,
// so the progress figure and the transaction drill can never disagree.

import 'budget.dart' show BudgetState, budgetState;
import 'models.dart';

/// Lifecycle derived from the window, never stored: `upcoming` before
/// start_date, `active` inside [start, end] inclusive, `closed` once
/// end_date has passed (the brief's "closed when end_date passes").
enum EventPhase { upcoming, active, closed }

/// YYYY-MM-DD string compare is the civil-date order — occurred_on and
/// the event bounds share the same lexicographic contract.
EventPhase eventPhase({
  required String startDate,
  required String endDate,
  required String today,
}) {
  if (today.compareTo(startDate) < 0) return EventPhase.upcoming;
  if (today.compareTo(endDate) > 0) return EventPhase.closed;
  return EventPhase.active;
}

DateTime _utcDay(String ymd) => DateTime.utc(
  int.parse(ymd.substring(0, 4)),
  int.parse(ymd.substring(5, 7)),
  int.parse(ymd.substring(8, 10)),
);

/// [ymd] shifted by whole days — the `occurred_on < to` exclusive bound
/// the range read expects is `addDaysToYmd(endDate, 1)`. UTC fields keep
/// DST out of the arithmetic.
String addDaysToYmd(String ymd, int days) {
  final d = _utcDay(ymd).add(Duration(days: days));
  return '${d.year.toString().padLeft(4, '0')}-'
      '${d.month.toString().padLeft(2, '0')}-'
      '${d.day.toString().padLeft(2, '0')}';
}

/// Inclusive day count of the window — a one-day event reads 1.
int eventTotalDays(String startDate, String endDate) =>
    _utcDay(endDate).difference(_utcDay(startDate)).inDays + 1;

/// Whole days of the window elapsed at [today] — 0 before start, the
/// full count once closed. "Elapsed" counts today itself while the
/// event is running (day 3 of 8 reads 3, matching the pace tick).
int eventDaysElapsed({
  required String startDate,
  required String endDate,
  required String today,
}) {
  if (today.compareTo(startDate) < 0) return 0;
  final elapsed = _utcDay(today).difference(_utcDay(startDate)).inDays + 1;
  final total = eventTotalDays(startDate, endDate);
  return elapsed > total ? total : elapsed;
}

/// Whole days until the window opens — only meaningful while
/// [eventPhase] is upcoming; 0 once start is reached.
int eventDaysUntilStart({required String startDate, required String today}) {
  final d = _utcDay(startDate).difference(_utcDay(today)).inDays;
  return d > 0 ? d : 0;
}

/// Days still inside the window at [today] (today included while
/// active) — 0 once the event has closed.
int eventDaysRemaining({
  required String startDate,
  required String endDate,
  required String today,
}) =>
    eventTotalDays(startDate, endDate) -
    eventDaysElapsed(startDate: startDate, endDate: endDate, today: today);

/// Fraction of the window elapsed at [today], clamped to 0..1 — the
/// "hôm nay" marker on the progress bar (the monthPace analog).
double eventPace({
  required String startDate,
  required String endDate,
  required String today,
}) {
  final total = eventTotalDays(startDate, endDate);
  if (total <= 0) return 0;
  return (eventDaysElapsed(
            startDate: startDate,
            endDate: endDate,
            today: today,
          ) /
          total)
      .clamp(0.0, 1.0);
}

/// Event row — mirrors public.event_budget_progress. `spentMinor` is the
/// server's live aggregate over real ledger legs, never a stored or
/// client-guessed figure.
class EventBudget {
  const EventBudget({
    required this.id,
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.limitMinor,
    required this.spentMinor,
    this.categoryIds = const [],
    this.updatedAt,
  });

  final String id;
  final String name;

  /// Inclusive YYYY-MM-DD bounds — both endpoints count.
  final String startDate;
  final String endDate;
  final int limitMinor;
  final int spentMinor;

  /// The category scope: empty = every expense counts ("Tất cả danh
  /// mục"); otherwise only legs in these categories feed `spentMinor`.
  final List<String> categoryIds;

  /// Row updated_at — handed back as `expected_updated_at` on an edit
  /// so a stale write fails instead of silently winning.
  final String? updatedAt;

  bool get isScoped => categoryIds.isNotEmpty;

  EventPhase phaseAt(String today) =>
      eventPhase(startDate: startDate, endDate: endDate, today: today);

  /// Spend state vocabulary shared with the monthly budgets — the same
  /// 80% heads-up / over-limit line.
  BudgetState get spendState =>
      budgetState(spentMinor: spentMinor, limitMinor: limitMinor);

  /// Remaining đồng inside the limit — negative when over.
  int get remainingMinor => limitMinor - spentMinor;
}

/// What the form carries to the store. [idempotencyKey] is minted per
/// dialog instance: a submit retry after a lost response replays the
/// same logical create; the update RPC ignores the field entirely.
class EventDraft {
  const EventDraft({
    required this.name,
    required this.startDate,
    required this.endDate,
    required this.limitMinor,
    this.categoryIds = const [],
    required this.idempotencyKey,
  });

  final String name;
  final String startDate;
  final String endDate;
  final int limitMinor;
  final List<String> categoryIds;
  final String idempotencyKey;
}

/// The in-scope spend one transaction contributes to [event] — the same
/// per-entry accounting event_budget_progress performs: expense kind
/// only (transfers/income are structurally out), occurred_on inside the
/// inclusive window, and for a scoped event only legs whose category is
/// in the scope set. A split expense contributes just its in-scope
/// lines — matching the view, which sums per entry, not per
/// transaction.
int eventSpentOfTransaction(EventBudget event, Transaction tx) {
  if (tx.kind != TransactionKind.expense) return 0;
  if (tx.occurredOn.compareTo(event.startDate) < 0 ||
      tx.occurredOn.compareTo(event.endDate) > 0) {
    return 0;
  }
  if (!event.isScoped) return tx.amount;
  if (tx.splitLines.length >= 2) {
    var total = 0;
    for (final line in tx.splitLines) {
      if (event.categoryIds.contains(line.categoryId)) total += line.amount;
    }
    return total;
  }
  return event.categoryIds.contains(tx.categoryId) ? tx.amount : 0;
}

/// "Tất cả danh mục" for an unscoped event; otherwise the resolved
/// names joined by '·'. An id that no longer resolves (archived scope
/// member when only active categories were loaded) degrades to an
/// honest placeholder — the scope is still real, only the label dimmed.
String eventScopeLabel(EventBudget event, List<Category> categories) {
  if (!event.isScoped) return 'Tất cả danh mục';
  return [
    for (final id in event.categoryIds)
      categories.where((c) => c.id == id).map((c) => c.name).firstOrNull ??
          'Danh mục đã ẩn',
  ].join(' · ');
}

/// Error-token → Vietnamese copy for the events surface — same contract
/// as debtErrorMessage: the RPC raises a code, the UI answers in plain
/// language.
String eventErrorMessage(Object e, {required String fallback}) {
  final msg = e.toString();
  if (msg.contains('stale_write')) {
    return 'Sự kiện vừa thay đổi ở nơi khác — tải lại rồi thử lại';
  }
  if (msg.contains('event_end_before_start')) {
    return 'Ngày kết thúc phải từ ngày bắt đầu trở đi';
  }
  if (msg.contains('invalid_event_name')) return 'Tên sự kiện chưa hợp lệ';
  if (msg.contains('invalid_event_dates')) return 'Ngày sự kiện chưa hợp lệ';
  if (msg.contains('invalid_category_scope')) {
    return 'Phạm vi danh mục chưa hợp lệ';
  }
  if (msg.contains('expense_category_required')) {
    return 'Sự kiện chỉ tính các danh mục chi';
  }
  if (msg.contains('category_not_found')) {
    return 'Danh mục không còn tồn tại — tải lại rồi thử lại';
  }
  if (msg.contains('amount_')) return 'Hạn mức không hợp lệ';
  if (msg.contains('idempotency_intent')) {
    return 'Thao tác này đã được ghi — tải lại để xem bản mới';
  }
  // event_not_found (deleted elsewhere) means the local row was stale.
  if (msg.contains('not_found')) {
    return 'Sự kiện không còn tồn tại — tải lại rồi thử lại';
  }
  return fallback;
}
