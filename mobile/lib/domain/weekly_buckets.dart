// Weekly income/expense buckets for the period bar chart — the same
// integer-đồng, transfer-excluded totals contract as report.dart.
// Deterministic: bucket boundaries derive only from the [from, to)
// window, so the same period always draws the same groups.

import 'models.dart';
import 'report.dart' show daysBetween, parseYmd;

/// One bar group: a label plus the week's Thu/Chi totals in đồng.
class WeeklyBucket {
  const WeeklyBucket({
    required this.label,
    required this.income,
    required this.expense,
  });

  /// Axis label — "1–7" inside a single month, "28/9" when the bucket
  /// crosses a month boundary (the day range alone would mislead).
  final String label;
  final int income;
  final int expense;
}

/// Week-sized groups cover every window up to this many buckets; longer
/// custom ranges merge into this many equal spans so the chart stays
/// one screen wide instead of pretending 90 groups fit.
const maxWeeklyGroups = 12;

const _daysPerWeek = 7;

/// Fold [rows] (any dates) into chronological Thu/Chi buckets covering
/// [from] inclusive / [to] exclusive — the `loadTransactionsInRange`
/// contract. Rows outside the window are ignored, transfers never count
/// (product invariant), and a split expense contributes its parent-row
/// amount exactly once — the same rule [buildPeriodReport] applies.
///
/// A month window yields its natural 4–5 week slices (1–7, 8–14, …).
/// Windows past [maxWeeklyGroups] weeks re-chunk into that many equal
/// spans; empty weeks still appear — a gap in the chart is the truth.
List<WeeklyBucket> weeklyIncomeExpense(
  List<Transaction> rows,
  String from,
  String to,
) {
  final start = parseYmd(from);
  final spanDays = daysBetween(start, parseYmd(to));
  if (spanDays <= 0) return const [];

  // >12 weeks of 7-day slices would crowd the axis — widen the span so
  // the group count never exceeds the cap (e.g. 100 days → 12×9-day).
  final groupDays = spanDays > maxWeeklyGroups * _daysPerWeek
      ? (spanDays / maxWeeklyGroups).ceil()
      : _daysPerWeek;
  final groupCount = (spanDays / groupDays).ceil();
  final income = List<int>.filled(groupCount, 0);
  final expense = List<int>.filled(groupCount, 0);

  for (final t in rows) {
    if (t.occurredOn.compareTo(from) < 0 || t.occurredOn.compareTo(to) >= 0) {
      continue;
    }
    final dayIndex = daysBetween(start, parseYmd(t.occurredOn));
    final bucket = dayIndex ~/ groupDays;
    if (t.kind == TransactionKind.income) {
      // Hoàn tiền (D15) nets the week's Chi, never its Thu.
      if (t.isRefund) {
        expense[bucket] -= t.amount;
      } else {
        income[bucket] += t.amount;
      }
    } else if (t.kind == TransactionKind.expense) {
      expense[bucket] += t.amount;
    }
  }

  return [
    for (var i = 0; i < groupCount; i++)
      WeeklyBucket(
        label: _label(start, i, groupDays, spanDays),
        income: income[i],
        expense: expense[i],
      ),
  ];
}

/// The bucket covering [index] * [groupDays] from [start], clipped to the
/// window — named "d–d" when start and end share a month, else the
/// bucket's first day as "d/m".
String _label(DateTime start, int index, int groupDays, int spanDays) {
  final first = DateTime(
    start.year,
    start.month,
    start.day + index * groupDays,
  );
  final lastDay = (index + 1) * groupDays - 1;
  final last = DateTime(
    start.year,
    start.month,
    start.day + (lastDay >= spanDays ? spanDays - 1 : lastDay),
  );
  if (first.month == last.month) return '${first.day}–${last.day}';
  return '${first.day}/${first.month}';
}
