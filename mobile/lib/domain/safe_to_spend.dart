// "Chi được hôm nay" — a safe-per-day spend figure derived from this
// month's budget headroom minus unpaid recurring commitments, spread over
// the days left in the month (Simplifi's spending plan / PocketGuard's
// "In My Pocket" pattern). It answers "how much can I spend today" from
// planning data — it is never an account balance and never negative.

import 'models.dart';

/// Result of [safeDailySpend] — the daily figure plus the inputs the tile
/// needs to explain it honestly.
class SafeDailySpend {
  const SafeDailySpend({
    required this.perDayMinor,
    required this.remainingMinor,
    required this.daysLeft,
  });

  /// Integer đồng safe to spend on each remaining day — floored, >= 0.
  final int perDayMinor;

  /// Budget headroom left after reserving due commitments, clamped at 0.
  final int remainingMinor;

  /// Days left in the month, today included — always >= 1.
  final int daysLeft;
}

/// Computes the safe daily spend for [today]'s month, or null when no
/// budget covers this month (the tile renders a setup nudge instead).
///
/// - Each budget contributes max(0, limit − spent): an overspent budget
///   adds nothing back and can never push the envelope negative.
/// - An unpaid commitment whose dueDay is still ahead (today included)
///   is reserved in full — it must be paid before discretionary spend.
/// - Paid or archived commitments and ones whose dueDay already passed
///   are out of scope for the rest of this month.
/// - The result is integer đồng: floor division, clamped at 0 — the tile
///   reports "0 ₫" rather than a negative allowance.
SafeDailySpend? safeDailySpend({
  required List<BudgetProgress> budgets,
  required List<RecurringCommitment> commitments,
  required DateTime today,
}) {
  final monthStart =
      '${today.year}-${today.month.toString().padLeft(2, '0')}-01';
  var headroom = 0;
  var hasBudget = false;
  for (final b in budgets) {
    if (b.monthStart != monthStart) continue;
    hasBudget = true;
    final left = b.limitMinor - b.spentMinor;
    if (left > 0) headroom += left;
  }
  if (!hasBudget) return null;

  var reserved = 0;
  for (final c in commitments) {
    if (c.isArchived || c.paidThisMonth) continue;
    if (c.dueDay >= today.day) reserved += c.amountMinor;
  }

  // Day 0 of next month is this month's last day — leap-month safe.
  final daysInMonth = DateTime(today.year, today.month + 1, 0).day;
  final daysLeft = daysInMonth - today.day + 1;

  final remaining = headroom - reserved;
  return SafeDailySpend(
    perDayMinor: remaining <= 0 ? 0 : remaining ~/ daysLeft,
    remainingMinor: remaining < 0 ? 0 : remaining,
    daysLeft: daysLeft,
  );
}
