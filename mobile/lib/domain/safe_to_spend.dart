// "Còn lại tháng này" — the month remainder derived from this month's
// budget headroom minus unpaid recurring commitments, and its per-day
// equivalent spread over the days left (Simplifi's spending plan /
// PocketGuard "In My Pocket" pattern). It answers "tháng này còn được
// tiêu bao nhiêu" from planning data — it is never an account balance,
// never negative as an allowance, and labels its inputs instead of
// claiming an absolute cash figure.

import 'commitments.dart';
import 'models.dart';

/// Result of [safeDailySpend] — the month figure plus the inputs the
/// card needs to explain it honestly.
class SafeDailySpend {
  const SafeDailySpend({
    required this.perDayMinor,
    required this.remainingMinor,
    required this.daysLeft,
    required this.reservedMinor,
    required this.shortfallMinor,
  });

  /// Integer đồng safe to spend on each remaining day — floored, >= 0.
  final int perDayMinor;

  /// Budget headroom left after reserving due commitments, clamped at 0.
  final int remainingMinor;

  /// Days left in the month, today included — always >= 1.
  final int daysLeft;

  /// Commitments still owed inside the month that were reserved against
  /// the headroom — disclosed so the basis line can say what was
  /// subtracted instead of implying the figure is raw budget slack.
  final int reservedMinor;

  /// How far the reserved commitments overshoot the headroom: 0 when the
  /// plan still covers them, positive when it does not. This is the
  /// honest "thiếu" figure — never folded into [remainingMinor] as a
  /// fake negative allowance.
  final int shortfallMinor;
}

/// Computes the safe daily spend for [today]'s month, or null when no
/// budget covers this month (the tile renders a setup nudge instead).
///
/// - Each budget contributes max(0, limit − spent): an overspent budget
///   adds nothing back and can never push the envelope negative.
/// - An unpaid commitment whose dueDay is still ahead (today included)
///   is reserved in full — it must be paid before discretionary spend.
/// - A non-monthly commitment (interval > 1) due in a LATER month reserves
///   proportionally — `amount ÷ months until due`, floored — rather than
///   its full amount: a yearly bill due in 4 months is funded in monthly
///   slices, not charged whole against this month's envelope (the web has
///   no interval concept, so this proportional-reserve choice is
///   mobile-first; the due month itself still reserves in full — the
///   months remaining are the funding slots left before it arrives).
/// - Paid or archived commitments and ones whose dueDay already passed
///   are out of scope for the rest of this month.
/// - The result is integer đồng: floor division, clamped at 0 — the card
///   reports "0 ₫" rather than a negative allowance; when commitments
///   overshoot the headroom the overrun is exposed separately as
///   [SafeDailySpend.shortfallMinor] so the card can say "thiếu" with a
///   real amount instead of hiding it behind the 0.
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
    // Monthly budgets only — the card's contract is "còn lại THÁNG
    // này". A weekly row that happened to anchor on the 1st (a Monday
    // can be the 1st) must not fold its smaller limit into the month's
    // headroom.
    if (b.period != BudgetPeriod.monthly) continue;
    if (b.monthStart != monthStart) continue;
    hasBudget = true;
    final left = b.limitMinor - b.spentMinor;
    if (left > 0) headroom += left;
  }
  if (!hasBudget) return null;

  var reserved = 0;
  for (final c in commitments) {
    if (c.isArchived || c.paidThisMonth) continue;
    final dueMonth = commitmentDueMonth(c, monthStart: monthStart);
    final monthsLeft = monthDiff(monthStart, dueMonth) ?? 0;
    if (monthsLeft < 0) {
      // A missed cycle stays owed in full — it cannot be "already
      // handled" the way a passed due-day inside the month can.
      reserved += c.amountMinor;
    } else if (monthsLeft == 0) {
      if (c.dueDay >= today.day) reserved += c.amountMinor;
    } else {
      // Proportional reserve: the due month's payment is funded across
      // the `monthsLeft` monthly slots still ahead, floored to đồng.
      reserved += c.amountMinor ~/ monthsLeft;
    }
  }

  // Day 0 of next month is this month's last day — leap-month safe.
  final daysInMonth = DateTime(today.year, today.month + 1, 0).day;
  final daysLeft = daysInMonth - today.day + 1;

  final remaining = headroom - reserved;
  return SafeDailySpend(
    perDayMinor: remaining <= 0 ? 0 : remaining ~/ daysLeft,
    remainingMinor: remaining < 0 ? 0 : remaining,
    daysLeft: daysLeft,
    reservedMinor: reserved,
    shortfallMinor: remaining < 0 ? -remaining : 0,
  );
}
