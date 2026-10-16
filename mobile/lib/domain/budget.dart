// Budget display state — pure helpers for the planning surface.
// States mirror the three conditions competitors render: healthy,
// approaching the limit, and over. The pace value positions the
// "Hôm nay" marker on the progress bar.
//
// The rollover / carry-forward / suggestion helpers below are ports of
// src/lib/planning/budgets.ts — same windows, same integer-đồng math.

import 'models.dart';

/// Spend status of one monthly budget.
enum BudgetState { ok, nearLimit, over }

/// A budget is "near" once it has consumed >= 80% of the limit — the
/// point where a heads-up is still actionable. Over is strictly above
/// the limit; a zero/negative limit can only be over.
BudgetState budgetState({required int spentMinor, required int limitMinor}) {
  if (spentMinor > limitMinor) return BudgetState.over;
  // Integer compare for spent/limit >= 0.8 without floats.
  if (limitMinor > 0 && spentMinor * 5 >= limitMinor * 4) {
    return BudgetState.nearLimit;
  }
  return BudgetState.ok;
}

/// Fraction of [monthStart]'s month already elapsed at [now], clamped to
/// 0..1 — past months read 1, future months 0. Drives the "Hôm nay" tick
/// on the budget pace bar.
double monthPace(String monthStart, DateTime now) {
  final y = int.parse(monthStart.substring(0, 4));
  final m = int.parse(monthStart.substring(5, 7));
  if (now.year < y || (now.year == y && now.month < m)) return 0;
  if (now.year > y || (now.year == y && now.month > m)) return 1;
  final daysInMonth = DateTime(y, m + 1, 0).day;
  return (now.day / daysInMonth).clamp(0.0, 1.0);
}

// -- Month arithmetic -------------------------------------------------------

final _monthStartPattern = RegExp(r'^\d{4}-\d{2}-01$');

/// Shift a `YYYY-MM-01` month start by [offset] whole months — port of the
/// web's `shiftBudgetMonth`. Throws [FormatException] on a malformed input,
/// matching the web's `invalid_budget_month_shift`.
String shiftBudgetMonth(String monthStart, int offset) {
  if (!_monthStartPattern.hasMatch(monthStart)) {
    throw FormatException('invalid_budget_month_shift', monthStart);
  }
  final year = int.parse(monthStart.substring(0, 4));
  final month = int.parse(monthStart.substring(5, 7));
  // The web rejects years below 0002 (year 1 has no representable previous
  // month) and months outside 1..12 — a regex-shaped but impossible month
  // must throw, not silently roll into the next year.
  if (year < 2 || month < 1 || month > 12) {
    throw FormatException('invalid_budget_month_shift', monthStart);
  }
  final absolute = year * 12 + (month - 1) + offset;
  final y = absolute ~/ 12;
  final m = absolute % 12;
  if (y < 1 || y > 9999) {
    throw FormatException('budget_month_out_of_range', monthStart);
  }
  return '${y.toString().padLeft(4, '0')}-${(m + 1).toString().padLeft(2, '0')}-01';
}

// -- Rollover (chuyển từ tháng trước) ----------------------------------------

/// How far back a rollover may reach, counted in whole months before the
/// viewed month — `BUDGET_ROLLOVER_LOOKBACK_MONTHS` on the web. The bound
/// is applied twice: once at the `budget_progress` range read and again
/// inside [budgetRollover].
const budgetRolloverLookbackMonths = 12;

/// First month_start inside the rollover window for a viewed month.
String budgetRolloverWindowStart(String monthStart) =>
    shiftBudgetMonth(monthStart, -budgetRolloverLookbackMonths);

/// Signed carry into the viewed month for one category — port of the
/// web's `BudgetRollover`.
class BudgetRollover {
  const BudgetRollover({required this.carry, required this.monthsIncluded});

  /// Signed đồng carried into the viewed month: prior underspend adds to
  /// what the category may still absorb, prior overspend subtracts.
  final int carry;

  /// How many prior budgeted months contributed — kept for honest
  /// labelling ("tháng trước" would be a lie when the carry nets three).
  final int monthsIncluded;
}

/// Carry-forward into [monthStart] for one category — port of the web's
/// `budgetRollover`. Each prior month that has a budget row contributes
/// `limit − spent`; months with no budget row contribute nothing (the
/// category was not being tracked that month). Rows outside the lookback
/// window or at/after the viewed month are ignored, so an unfiltered
/// history is safe to pass.
BudgetRollover budgetRollover({
  required List<BudgetProgress> priorBudgets,
  required String categoryId,
  required String monthStart,
}) {
  final windowStart = budgetRolloverWindowStart(monthStart);
  var carry = 0;
  var monthsIncluded = 0;
  for (final row in priorBudgets) {
    if (row.categoryId != categoryId) continue;
    if (row.monthStart.compareTo(monthStart) >= 0) continue;
    if (row.monthStart.compareTo(windowStart) < 0) continue;
    carry += row.limitMinor - row.spentMinor;
    monthsIncluded += 1;
  }
  return BudgetRollover(carry: carry, monthsIncluded: monthsIncluded);
}

/// The cap the viewed month effectively works against: `limit + carry`.
/// May fall to zero or below when carried overspend outweighs the month's
/// own limit — a non-positive effective limit is fully consumed, never
/// "no budget".
int budgetEffectiveLimit(int limitMinor, int carry) => limitMinor + carry;

/// What the category may still absorb this month once prior under/
/// overspend is folded in: `limit + carry − spent`. Negative means over
/// even when this month's own spending stayed under its own limit.
int budgetEffectiveAvailable({
  required int spentMinor,
  required int limitMinor,
  required int carry,
}) => budgetEffectiveLimit(limitMinor, carry) - spentMinor;

/// Threshold on the effective figures — port of `budgetEffectiveThreshold`.
/// A negative available is always [BudgetState.over], covering the edge
/// where carried overspend pushes the effective limit to zero or below.
BudgetState budgetEffectiveState({
  required int spentMinor,
  required int limitMinor,
  required int carry,
}) {
  if (budgetEffectiveAvailable(
        spentMinor: spentMinor,
        limitMinor: limitMinor,
        carry: carry,
      ) <
      0) {
    return BudgetState.over;
  }
  return budgetState(
    spentMinor: spentMinor,
    limitMinor: budgetEffectiveLimit(limitMinor, carry),
  );
}

/// One honest line explaining where the carry came from, or null when
/// nothing carried — port of the web's `budgetRolloverLabel`. The card
/// stays quiet rather than printing "+0 ₫" noise.
String? budgetRolloverLabel(
  BudgetRollover rollover,
  String Function(int) format,
) {
  if (rollover.carry == 0) return null;
  final months = rollover.monthsIncluded > 1
      ? '${rollover.monthsIncluded} tháng trước đó'
      : 'tháng trước';
  final amount = format(rollover.carry.abs());
  return rollover.carry > 0
      ? 'Chuyển từ $months: +$amount'
      : 'Trừ vì vượt hạn mức $months: −$amount';
}

// -- Threshold alerts (80%/100% in-app badges) --------------------------------

/// One category whose [monthStart] budget crossed a spend threshold —
/// the in-app alert line the dashboard remainder card surfaces (D3).
/// Wraps the same carry-aware effective math the Kế hoạch tile renders,
/// so a badge can never disagree with the row it summarizes.
class BudgetAlert {
  const BudgetAlert({
    required this.categoryId,
    required this.categoryName,
    required this.state,
    required this.amountMinor,
  });

  final String categoryId;
  final String categoryName;

  /// Never [BudgetState.ok] — only [BudgetState.nearLimit] (>= 80%
  /// consumed) and [BudgetState.over] (past the effective limit) alert.
  final BudgetState state;

  /// đồng magnitude behind the state: amount past the effective limit
  /// when [state] is over, đồng still available when near.
  final int amountMinor;
}

/// Threshold alerts for [monthStart]'s budgets — the row seam for "vượt
/// hạn mức" / "sắp tới hạn mức" lines. [budgetRows] is one window read
/// (`budget_progress` over `[budgetRolloverWindowStart(monthStart),
/// monthStart]`); rows at [monthStart] are evaluated and earlier rows
/// feed their carry, exactly like the planning surface. Rows for other
/// months are ignored, so a month-scoped read stays safe to pass — the
/// carry then simply reads as zero, matching a caller with no history.
///
/// Ordering is total: [BudgetState.over] first (largest violation
/// first), then [BudgetState.nearLimit] (smallest headroom first), ties
/// on category name then id — Dart's sort is not stable.
List<BudgetAlert> budgetAlerts(
  List<BudgetProgress> budgetRows, {
  required String monthStart,
}) {
  final alerts = <BudgetAlert>[];
  for (final b in budgetRows) {
    if (b.monthStart != monthStart) continue;
    final carry = budgetRollover(
      priorBudgets: budgetRows,
      categoryId: b.categoryId,
      monthStart: monthStart,
    ).carry;
    final state = budgetEffectiveState(
      spentMinor: b.spentMinor,
      limitMinor: b.limitMinor,
      carry: carry,
    );
    if (state == BudgetState.ok) continue;
    alerts.add(
      BudgetAlert(
        categoryId: b.categoryId,
        categoryName: b.categoryName,
        state: state,
        amountMinor: budgetEffectiveAvailable(
          spentMinor: b.spentMinor,
          limitMinor: b.limitMinor,
          carry: carry,
        ).abs(),
      ),
    );
  }
  alerts.sort((a, b) {
    final byState = (a.state == BudgetState.over ? 0 : 1).compareTo(
      b.state == BudgetState.over ? 0 : 1,
    );
    if (byState != 0) return byState;
    // Over: the deepest breach first. Near: the tightest headroom first.
    final byAmount = a.state == BudgetState.over
        ? b.amountMinor.compareTo(a.amountMinor)
        : a.amountMinor.compareTo(b.amountMinor);
    if (byAmount != 0) return byAmount;
    final byName = a.categoryName.compareTo(b.categoryName);
    return byName != 0 ? byName : a.categoryId.compareTo(b.categoryId);
  });
  return alerts;
}

// -- Carry-forward (dùng hạn mức tháng trước) --------------------------------

/// One pending budget write — the web's `SaveBudgetInput` shape minus the
/// version token (bulk fill creates fresh rows, so there is no stale read
/// to guard against).
typedef BudgetDraft = ({String categoryId, String monthStart, int limitMinor});

/// Last month's limits that this month has no decision for yet — port of
/// `budgetsToCarryForward`. Additive only: a category already budgeted this
/// month is never touched; non-positive previous limits are skipped rather
/// than carried as zero (a zero limit reads as "may spend nothing", not
/// "not planned").
List<BudgetDraft> budgetsToCarryForward({
  required List<BudgetProgress> previousBudgets,
  required List<BudgetProgress> currentBudgets,
  required String monthStart,
}) {
  // Rejects a malformed target month before anything is proposed.
  shiftBudgetMonth(monthStart, 0);

  final alreadyDecided = {
    for (final b in currentBudgets)
      if (b.monthStart == monthStart) b.categoryId,
  };
  return [
    for (final b in previousBudgets)
      if (b.limitMinor > 0 && !alreadyDecided.contains(b.categoryId))
        (
          categoryId: b.categoryId,
          monthStart: monthStart,
          limitMinor: b.limitMinor,
        ),
  ];
}

// -- Trailing-average suggestions --------------------------------------------

/// Completed months looked back when suggesting a limit — the web's
/// `BUDGET_SUGGESTION_MONTHS`.
const budgetSuggestionMonths = 3;

/// Averages below this floor produce no suggestion — `BUDGET_SUGGESTION_
/// MIN_AMOUNT` on the web: a monthly limit under ~10.000 ₫ adds
/// bookkeeping rows, not signal.
const budgetSuggestionMinAmount = 10000;

/// A suggested monthly limit for one expense category.
class BudgetSuggestion {
  const BudgetSuggestion({required this.amount, required this.monthsWithData});

  /// Suggested monthly limit: window total smoothed over every month,
  /// đồng.
  final int amount;

  /// Trailing months that recorded at least one đồng for the category —
  /// kept so the UI can disclose how much of the window saw spend.
  final int monthsWithData;
}

/// Suggested monthly limits from the [windowMonths] completed months
/// before [monthStart], keyed by expense categoryId — port of
/// `budgetSuggestions`.
///
/// The window total divides by the whole window, not just months that
/// recorded spend: a quiet month is real evidence ("the category usually
/// costs nothing"), not missing data. Split rows attribute each line to
/// its own category — the same per-entry accounting `budget_progress`
/// uses — so a suggestion cannot disagree with a saved budget's "Đã chi".
/// Transfers and income never feed a suggestion.
Map<String, BudgetSuggestion> budgetSuggestions(
  List<Transaction> transactions,
  String monthStart, {
  int windowMonths = budgetSuggestionMonths,
}) {
  final windowStart = shiftBudgetMonth(monthStart, -windowMonths);
  final totals = <String, ({int total, Set<String> months})>{};
  void addLine(String categoryId, String monthKey, int amount) {
    if (categoryId.isEmpty || amount <= 0) return;
    final entry = totals.putIfAbsent(
      categoryId,
      () => (total: 0, months: <String>{}),
    );
    entry.months.add(monthKey);
    totals[categoryId] = (total: entry.total + amount, months: entry.months);
  }

  for (final tx in transactions) {
    if (tx.kind != TransactionKind.expense) continue;
    if (tx.occurredOn.compareTo(windowStart) < 0) continue;
    if (tx.occurredOn.compareTo(monthStart) >= 0) continue;
    final monthKey = tx.occurredOn.substring(0, 7);
    if (tx.splitLines.length >= 2) {
      for (final line in tx.splitLines) {
        addLine(line.categoryId, monthKey, line.amount);
      }
      continue;
    }
    addLine(tx.categoryId, monthKey, tx.amount);
  }

  final suggestions = <String, BudgetSuggestion>{};
  for (final entry in totals.entries) {
    final amount = (entry.value.total / windowMonths).round();
    if (amount < budgetSuggestionMinAmount) continue;
    suggestions[entry.key] = BudgetSuggestion(
      amount: amount,
      monthsWithData: entry.value.months.length,
    );
  }
  return suggestions;
}

// -- Funding coverage ("% đã dự phòng") --------------------------------------

/// Average monthly income over the [windowMonths] completed months before
/// [monthStart] — the "% đã dự phòng" basis for the month-ahead view.
///
/// Same whole-window convention as [budgetSuggestions]: the income total
/// divides by every month in the window, not just months that recorded
/// income — a quiet month is real evidence, and dividing by the full
/// window keeps the basis honest instead of flattering sparse history.
/// Returns the rounded đồng average; throws [FormatException] on a
/// malformed month like [budgetSuggestions]. Transfers never count
/// (product invariant); a window with no income rows yields 0, which
/// the UI reads as "no basis", not "funded 0%".
int averageMonthlyIncome(
  List<Transaction> transactions,
  String monthStart, {
  int windowMonths = budgetSuggestionMonths,
}) {
  final windowStart = shiftBudgetMonth(monthStart, -windowMonths);
  var total = 0;
  for (final tx in transactions) {
    if (tx.kind != TransactionKind.income) continue;
    if (tx.occurredOn.compareTo(windowStart) < 0) continue;
    if (tx.occurredOn.compareTo(monthStart) >= 0) continue;
    total += tx.amount;
  }
  return (total / windowMonths).round();
}
