// In-app month summary — the D9 dashboard card, mirroring the web's
// src/lib/weekly-summary.ts contract lifted to the month boundary:
// month-to-date income/expense/net, row count, top expense category,
// and the expense delta against the equal-length window immediately
// before the month (reportRange's "kỳ trước cùng số ngày" rule — the
// trailing N days ending the day before the 1st, so both spans hold
// exactly the same day count).
//
// Calm, non-judgmental copy; integer đồng; transfers never count.

import 'models.dart';
import 'report.dart' show dateAdd, daysBetween, dayOnly, ymd;

class MonthSummary {
  const MonthSummary({
    required this.monthStart,
    required this.monthEnd,
    required this.compareDays,
    required this.income,
    required this.expense,
    required this.net,
    required this.transactionCount,
    required this.topCategory,
    required this.topCategoryAmount,
    required this.expenseChangePercent,
  });

  /// Inclusive YYYY-MM-DD bounds of the month-to-date window
  /// (monthStart .. today).
  final String monthStart;
  final String monthEnd;

  /// Days in the current window — also the length of the compare
  /// window, so the "N ngày liền trước" label can name the baseline.
  final int compareDays;

  final int income;
  final int expense;
  final int net;

  /// Non-transfer rows in the month-to-date window.
  final int transactionCount;

  /// Highest-expense category this month-to-date, or null.
  final String? topCategory;
  final int topCategoryAmount;

  /// Expense vs the previous equal-length span: positive = chi nhiều
  /// hơn, null = no prior expense to compare against (never an invented
  /// direction).
  final int? expenseChangePercent;
}

/// The [from, to) load bounds the summary needs — [compareWindowStart]
/// through tomorrow. Callers pass them to the range loader so one read
/// covers the current window AND its compare baseline.
({String from, String to}) monthSummaryLoadRange(DateTime today) {
  final todayDay = dayOnly(today);
  final monthStart = DateTime(todayDay.year, todayDay.month);
  final elapsed = daysBetween(monthStart, todayDay) + 1;
  return (
    from: ymd(dateAdd(monthStart, -elapsed)),
    to: ymd(dateAdd(todayDay, 1)),
  );
}

/// Build the month-to-date summary from transactions covering
/// [monthSummaryLoadRange] (supersets are fine — bounds filter inside).
MonthSummary buildMonthSummary(
  List<Transaction> transactions, {
  required DateTime today,
}) {
  final todayDay = dayOnly(today);
  final monthStart = DateTime(todayDay.year, todayDay.month);
  final elapsed = daysBetween(monthStart, todayDay) + 1;
  final start = ymd(monthStart);
  final end = ymd(todayDay);
  // Equal-length trailing window ending the day before the 1st — the
  // web's reportRange convention for "cùng số ngày" compares.
  final prevEnd = dateAdd(monthStart, -1);
  final prevStart = dateAdd(prevEnd, -(elapsed - 1));
  final pStart = ymd(prevStart);
  final pEnd = ymd(prevEnd);

  bool inRange(Transaction t, String from, String to) =>
      t.occurredOn.compareTo(from) >= 0 && t.occurredOn.compareTo(to) <= 0;

  var income = 0, expense = 0, previousExpense = 0, count = 0;
  final categoryTotals = <String, int>{};
  for (final t in transactions) {
    if (inRange(t, start, end)) {
      if (t.kind == TransactionKind.expense) {
        expense += t.amount;
        count++;
        if (t.category.isNotEmpty) {
          categoryTotals[t.category] =
              (categoryTotals[t.category] ?? 0) + t.amount;
        }
      } else if (t.kind == TransactionKind.income) {
        income += t.amount;
        count++;
      }
    } else if (t.kind == TransactionKind.expense && inRange(t, pStart, pEnd)) {
      previousExpense += t.amount;
    }
  }

  String? topCategory;
  var topCategoryAmount = 0;
  if (categoryTotals.isNotEmpty) {
    // Name order pins ties — the digest rule; a stable winner keeps the
    // card deterministic across rebuilds.
    final ranked = categoryTotals.entries.toList()
      ..sort((a, b) {
        final byAmount = b.value.compareTo(a.value);
        return byAmount != 0 ? byAmount : a.key.compareTo(b.key);
      });
    topCategory = ranked.first.key;
    topCategoryAmount = ranked.first.value;
  }

  return MonthSummary(
    monthStart: start,
    monthEnd: end,
    compareDays: elapsed,
    income: income,
    expense: expense,
    net: income - expense,
    transactionCount: count,
    topCategory: topCategory,
    topCategoryAmount: topCategoryAmount,
    expenseChangePercent: previousExpense == 0
        ? null
        : ((expense - previousExpense) / previousExpense * 100).round(),
  );
}

/// "d/m" day label, like the web's formatWeekDayLabel.
String formatMonthDayLabel(String ymdDate) =>
    '${int.parse(ymdDate.substring(8))}/${int.parse(ymdDate.substring(5, 7))}';

/// The card's compare line — names the equal-length baseline plainly
/// ("so với N ngày liền trước") so a partial month never masquerades as
/// a whole-month claim. Null when there is no prior expense to compare.
String? monthSummaryCompareLine(int? changePercent, {required int days}) {
  if (changePercent == null) return null;
  if (changePercent == 0) {
    return 'Chi ngang $days ngày liền trước';
  }
  if (changePercent > 0) {
    return 'Chi cao hơn ~$changePercent% so với $days ngày liền trước';
  }
  return 'Chi thấp hơn ~${changePercent.abs()}% so với $days ngày liền trước';
}
