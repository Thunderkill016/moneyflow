// "Đúng nhịp tháng" — the month-pace read the Copilot-style spending
// progress graph made canonical: cumulative month-to-date expense drawn
// against a linear ideal-pace line, plus a three-band status the card
// can label (never colour alone). The same rows feed the Tóm tắt card,
// so both cards tell one story — expense nets refunds, transfers never
// count, excluded_from_reports rows still spent real money and stay in.
// Integer đồng throughout; no invented figures — no monthly budget for
// this month means no pace, and the caller renders its nudge instead.

import 'models.dart';
import 'report.dart' show dayOnly, daysBetween, ymd;

/// The ±10% band around the ideal line that still reads "Đúng nhịp" —
/// inside it, ordinary week-to-week noise is not worth a warning.
enum MonthPaceStatus { under, on, over }

/// One honest pace read for [today]'s month — everything the dashboard
/// chart needs to draw without recomputing.
class MonthPace {
  const MonthPace({
    required this.cumulativeMinor,
    required this.actualToDateMinor,
    required this.idealToDateMinor,
    required this.budgetLimitMinor,
    required this.daysInMonth,
    required this.elapsedDays,
    required this.status,
  });

  /// Cumulative expense through each elapsed day — index 0 is the 1st,
  /// length equals [elapsedDays]. Monotone non-decreasing is NOT
  /// guaranteed (a refund can pull a day negative), so painters read
  /// values as given.
  final List<int> cumulativeMinor;

  /// Month-to-date expense (net of refunds) — the last cumulative value.
  final int actualToDateMinor;

  /// Where the ideal line stands today: limit × elapsed ÷ daysInMonth,
  /// floored.
  final int idealToDateMinor;

  /// Sum of this month's monthly budget limits — the ideal line's
  /// endpoint on the last day of the month.
  final int budgetLimitMinor;

  final int daysInMonth;
  final int elapsedDays;
  final MonthPaceStatus status;
}

MonthPace? buildMonthPace({
  required List<Transaction> rows,
  required List<BudgetProgress> budgets,
  required DateTime today,
}) {
  final todayDay = dayOnly(today);
  final monthStartDay = DateTime(todayDay.year, todayDay.month);
  final monthStart = ymd(monthStartDay);
  final daysInMonth = DateTime(todayDay.year, todayDay.month + 1, 0).day;
  final elapsedDays = daysBetween(monthStartDay, todayDay) + 1;

  var limit = 0;
  for (final b in budgets) {
    // Monthly budgets only — same scoping rule safeDailySpend uses, so
    // the ideal line and the remainder figure describe the same plan.
    if (b.period != BudgetPeriod.monthly || b.monthStart != monthStart) {
      continue;
    }
    limit += b.limitMinor;
  }
  if (limit <= 0) return null;

  final start = ymd(monthStartDay);
  final end = ymd(todayDay);
  final perDay = List<int>.filled(elapsedDays, 0);
  for (final t in rows) {
    if (t.occurredOn.compareTo(start) < 0 || t.occurredOn.compareTo(end) > 0) {
      continue;
    }
    final dayIdx = int.parse(t.occurredOn.substring(8, 10)) - 1;
    if (dayIdx < 0 || dayIdx >= elapsedDays) continue;
    if (t.kind == TransactionKind.expense) {
      perDay[dayIdx] += t.amount;
    } else if (t.kind == TransactionKind.income && t.isRefund) {
      // Refund nets the spend it reimburses — the MonthSummary netting.
      perDay[dayIdx] -= t.amount;
    }
  }
  final cumulative = List<int>.filled(elapsedDays, 0);
  var running = 0;
  for (var i = 0; i < elapsedDays; i++) {
    running += perDay[i];
    cumulative[i] = running;
  }
  final actual = running;

  // Ideal line stands at limit × elapsed ÷ days — integer floor so the
  // status never reads a fraction of a đồng.
  final ideal = (limit * elapsedDays) ~/ daysInMonth;
  final status = ideal <= 0
      // Unreachable (limit > 0 ⇒ ideal > 0 once a day elapsed), kept as
      // an honest fallback rather than a divide-by-zero.
      ? (actual > 0 ? MonthPaceStatus.over : MonthPaceStatus.on)
      : actual * 10 > ideal * 11
      ? MonthPaceStatus.over
      : actual * 10 < ideal * 9
      ? MonthPaceStatus.under
      : MonthPaceStatus.on;

  return MonthPace(
    cumulativeMinor: cumulative,
    actualToDateMinor: actual,
    idealToDateMinor: ideal,
    budgetLimitMinor: limit,
    daysInMonth: daysInMonth,
    elapsedDays: elapsedDays,
    status: status,
  );
}

/// The status label — words carry the state so the chart never relies
/// on its line colour alone.
String monthPaceStatusLabel(MonthPaceStatus status) => switch (status) {
  MonthPaceStatus.over => 'Nhanh hơn nhịp',
  MonthPaceStatus.on => 'Đúng nhịp tháng',
  MonthPaceStatus.under => 'Chậm hơn nhịp',
};
