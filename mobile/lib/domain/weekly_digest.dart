// Weekly digest — the notification counterpart of src/lib/weekly-summary.ts
// (which the web renders as an in-app card, not a scheduled push). Same calm
// semantics: a Mon–Sun window, transfers never counted, an equal-length
// prior week as the compare baseline, integer đồng, no guilt wording.
//
// The device-local one-shot fires Sunday 19:00 and describes the Mon–Sun
// week that ends on the fire day — by then the week has just closed, which
// is the moment "nhìn lại tuần" makes sense. The copy is rebuilt from the
// freshest ledger read on every app load (see refreshWeeklyDigest), so a
// pending digest always quotes the newest numbers this device has seen; a
// weekly REPEAT is deliberately not used because it would freeze one
// week's totals forever.

import 'models.dart';
import 'money.dart';
import 'report.dart' show dateAdd, dayOnly, parseYmd, ymd;

/// 19:00 Sunday — evening, after the week has effectively closed.
const weeklyDigestHour = 19;

/// Mon–Sun digest window plus the equal-length week before it — the
/// same "kỳ liền trước cùng số ngày" baseline reportRange uses.
class WeeklyDigestWindow {
  const WeeklyDigestWindow({
    required this.start,
    required this.end,
    required this.previousStart,
    required this.previousEnd,
  });

  /// Inclusive YYYY-MM-DD bounds of the described week.
  final String start;
  final String end;

  /// Inclusive bounds of the previous Mon–Sun (the compare baseline).
  final String previousStart;
  final String previousEnd;

  /// [from, to) range covering BOTH windows — the contract
  /// loadTransactionsInRange takes (exclusive upper bound).
  String get loadFrom => previousStart;
  String get loadTo => ymd(dateAdd(parseYmd(end), 1));
}

/// Next Sunday 19:00 local strictly after [now]. A Sunday already past
/// 19:00 rolls a full week forward — never schedule into the past.
DateTime nextWeeklyDigestFire(DateTime now) {
  // dateAdd keeps only the calendar fields — the hour is re-applied after
  // the day shift so the fire time lands at 19:00, not midnight.
  var day = dateAdd(dayOnly(now), (DateTime.sunday - now.weekday) % 7);
  var fire = DateTime(day.year, day.month, day.day, weeklyDigestHour);
  if (!fire.isAfter(now)) {
    day = dateAdd(day, 7);
    fire = DateTime(day.year, day.month, day.day, weeklyDigestHour);
  }
  return fire;
}

/// The Mon–Sun week [fireDate] closes (callers always pass a Sunday from
/// [nextWeeklyDigestFire]) and the Mon–Sun right before it.
WeeklyDigestWindow weeklyDigestWindow(DateTime fireDate) {
  final end = dayOnly(fireDate);
  final start = dateAdd(end, -6);
  return WeeklyDigestWindow(
    start: ymd(start),
    end: ymd(end),
    previousStart: ymd(dateAdd(start, -7)),
    previousEnd: ymd(dateAdd(start, -1)),
  );
}

/// Totals for one described week — mirrors the web's WeeklySummary shape
/// minus the in-app-only fields (range labels come from the window).
class WeeklyDigest {
  const WeeklyDigest({
    required this.window,
    required this.income,
    required this.expense,
    required this.transactionCount,
    required this.topCategory,
    required this.topCategoryAmount,
    required this.expenseChangePercent,
  });

  final WeeklyDigestWindow window;
  final int income;
  final int expense;

  /// Non-transfer rows inside the week — moving money between own
  /// accounts is not spending activity, so transfers can never make a
  /// quiet week look busy.
  final int transactionCount;

  /// Highest-expense category name this week, or null.
  final String? topCategory;
  final int topCategoryAmount;

  /// Expense vs the previous Mon–Sun: positive = chi nhiều hơn, null =
  /// no prior expense to compare against (a divide-by-zero would invent
  /// a direction — the web's rule).
  final int? expenseChangePercent;
}

/// Build the digest from transactions already covering both windows —
/// whole-row sums by kind, exactly like buildFinancialReport.
WeeklyDigest buildWeeklyDigest(
  List<Transaction> transactions, {
  required DateTime fireDate,
}) {
  final window = weeklyDigestWindow(fireDate);
  bool inRange(Transaction t, String from, String to) =>
      t.occurredOn.compareTo(from) >= 0 && t.occurredOn.compareTo(to) <= 0;

  var income = 0, expense = 0, previousExpense = 0, count = 0;
  final categoryTotals = <String, int>{};
  for (final t in transactions) {
    if (inRange(t, window.start, window.end)) {
      // Transfers are skipped entirely — never income/expense and not
      // spending activity worth a ping.
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
    } else if (t.kind == TransactionKind.expense &&
        inRange(t, window.previousStart, window.previousEnd)) {
      previousExpense += t.amount;
    }
  }

  String? topCategory;
  var topCategoryAmount = 0;
  if (categoryTotals.isNotEmpty) {
    // Name order pins ties — List.sort is unstable, so an explicit
    // tiebreak keeps the digest deterministic.
    final ranked = categoryTotals.entries.toList()
      ..sort((a, b) {
        final byAmount = b.value.compareTo(a.value);
        return byAmount != 0 ? byAmount : a.key.compareTo(b.key);
      });
    topCategory = ranked.first.key;
    topCategoryAmount = ranked.first.value;
  }

  return WeeklyDigest(
    window: window,
    income: income,
    expense: expense,
    transactionCount: count,
    topCategory: topCategory,
    topCategoryAmount: topCategoryAmount,
    expenseChangePercent: previousExpense == 0
        ? null
        : ((expense - previousExpense) / previousExpense * 100).round(),
  );
}

/// "d/m" like the web's formatWeekDayLabel.
String _dayMonth(String ymdDate) =>
    '${int.parse(ymdDate.substring(8))}/${int.parse(ymdDate.substring(5, 7))}';

/// Notification copy for [digest] — calm and factual, mirroring the web's
/// compare line ("khoảng N% so với tuần trước"). Returns null for a week
/// with no recorded rows: a quiet week must never produce a ping.
({String title, String body})? weeklyDigestCopy(WeeklyDigest digest) {
  if (digest.transactionCount == 0) return null;
  final clauses = <String>[
    digest.expense > 0
        ? 'chi ${formatMoney(digest.expense)}'
        : 'chưa ghi khoản chi nào',
    if (digest.income > 0) 'thu ${formatMoney(digest.income)}',
    if (digest.topCategory != null) 'nhiều nhất: ${digest.topCategory}',
    if (digest.expenseChangePercent != null)
      if (digest.expenseChangePercent == 0)
        'ngang tuần trước'
      else if (digest.expenseChangePercent! > 0)
        'cao hơn ~${digest.expenseChangePercent}% so với tuần trước'
      else
        'thấp hơn ~${digest.expenseChangePercent!.abs()}% so với tuần trước',
  ];
  return (
    title: 'Tóm tắt tuần này',
    body:
        'Tuần ${_dayMonth(digest.window.start)} – '
        '${_dayMonth(digest.window.end)}: ${clauses.join(' · ')}',
  );
}
