// Budget display state — pure helpers for the planning surface.
// States mirror the three conditions competitors render: healthy,
// approaching the limit, and over. The pace value positions the
// "Hôm nay" marker on the progress bar.

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
