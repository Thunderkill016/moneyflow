// Month-close digest — the month-boundary counterpart of
// weekly_digest.dart (D9, RESEARCH_TOP_FINANCE_APPS.md §10). The VN
// bookkeeping boundary that actually matters is the month (lương → hết
// tháng), so the same opt-in one-shot contract repeats there: calm copy,
// transfers never counted, integer đồng, an honest prior-month baseline,
// and a quiet month never producing a ping.
//
// The one-shot fires on the LAST local day of the month at the shared
// digest time (default 19:00). It cannot be a dayOfMonth repeating
// alarm — day 31 exists in only seven months — so it re-arms on every
// refresh exactly like the weekly digest, and the copy is rebuilt from
// the freshest ledger read each time.

import 'models.dart';
import 'money.dart';
import 'report.dart' show dateAdd, dayOnly, parseYmd, vnNow, ymd;

/// 19:00 on the month's last day — evening, when the month has
/// effectively closed. Defaults only; the settings surface's shared
/// digest time feeds the hour/minute overrides.
const monthCloseHour = 19;
const monthCloseMinute = 0;

/// The just-closed month plus the full month before it — the compare
/// baseline for the digest copy ("so với tháng trước").
class MonthCloseWindow {
  const MonthCloseWindow({
    required this.start,
    required this.end,
    required this.previousStart,
    required this.previousEnd,
  });

  /// Inclusive YYYY-MM-DD bounds of the described (just-closed) month.
  final String start;
  final String end;

  /// Inclusive bounds of the full month immediately before it.
  final String previousStart;
  final String previousEnd;

  /// [from, to) range covering BOTH windows — the contract
  /// loadTransactionsInRange takes (exclusive upper bound).
  String get loadFrom => previousStart;
  String get loadTo => ymd(dateAdd(parseYmd(end), 1));
}

/// The next last-day-of-month at [hour]:[minute] local strictly after
/// [now]. A last day already past the fire time rolls to the next
/// month's last day — never schedule into the past.
DateTime nextMonthCloseFire(
  DateTime now, {
  int hour = monthCloseHour,
  int minute = monthCloseMinute,
}) {
  var lastDay = DateTime(now.year, now.month + 1, 0).day;
  var fire = DateTime(now.year, now.month, lastDay, hour, minute);
  if (!fire.isAfter(now)) {
    final next = DateTime(now.year, now.month + 1);
    lastDay = DateTime(next.year, next.month + 1, 0).day;
    fire = DateTime(next.year, next.month, lastDay, hour, minute);
  }
  return fire;
}

/// The month [fireDate] closes and the full month before it. Anchored
/// on the VN civil calendar like every ledger date: a last-local-day
/// 19:00 fire on a device west of UTC+7 is already the 1st of the next
/// month in Saigon, so the closed month is the one containing the VN
/// day BEFORE the fire — that lands October whether the device reads
/// Oct 31 or already Nov 1.
MonthCloseWindow monthCloseWindow(DateTime fireDate) {
  final vnDay = dayOnly(vnNow(fireDate));
  final anchor = dateAdd(vnDay, -1);
  final start = DateTime(anchor.year, anchor.month);
  final end = DateTime(anchor.year, anchor.month + 1, 0);
  final prevStart = DateTime(anchor.year, anchor.month - 1);
  final prevEnd = DateTime(anchor.year, anchor.month, 0);
  return MonthCloseWindow(
    start: ymd(start),
    end: ymd(end),
    previousStart: ymd(prevStart),
    previousEnd: ymd(prevEnd),
  );
}

/// Totals for one closed month — mirrors [WeeklyDigest]'s shape with
/// month bounds. The compare baseline is the WHOLE previous month: both
/// windows are complete calendar months, so the copy can say "tháng
/// trước" without the equal-length caveat a mid-period card needs.
class MonthCloseDigest {
  const MonthCloseDigest({
    required this.window,
    required this.income,
    required this.expense,
    required this.transactionCount,
    required this.topCategory,
    required this.topCategoryAmount,
    required this.expenseChangePercent,
  });

  final MonthCloseWindow window;
  final int income;
  final int expense;

  /// Non-transfer rows inside the closed month — same "moving money
  /// between own accounts is not activity" rule as the weekly digest.
  final int transactionCount;

  /// Highest-expense category name of the closed month, or null.
  final String? topCategory;
  final int topCategoryAmount;

  /// Expense vs the previous full month: positive = chi nhiều hơn,
  /// null = no prior-month expense to compare against (a divide-by-zero
  /// would invent a direction — the web's rule).
  final int? expenseChangePercent;
}

/// Build the digest from transactions already covering both windows —
/// whole-row sums by kind, exactly like buildFinancialReport.
MonthCloseDigest buildMonthCloseDigest(
  List<Transaction> transactions, {
  required DateTime fireDate,
}) {
  final window = monthCloseWindow(fireDate);
  bool inRange(Transaction t, String from, String to) =>
      t.occurredOn.compareTo(from) >= 0 && t.occurredOn.compareTo(to) <= 0;

  var income = 0, expense = 0, previousExpense = 0, count = 0;
  final categoryTotals = <String, int>{};
  for (final t in transactions) {
    if (inRange(t, window.start, window.end)) {
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
    // tiebreak keeps the digest deterministic (same rule as the week).
    final ranked = categoryTotals.entries.toList()
      ..sort((a, b) {
        final byAmount = b.value.compareTo(a.value);
        return byAmount != 0 ? byAmount : a.key.compareTo(b.key);
      });
    topCategory = ranked.first.key;
    topCategoryAmount = ranked.first.value;
  }

  return MonthCloseDigest(
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

/// "Tháng 10/2026" from the window's start — the digest always
/// describes a closed month, so the label names it explicitly.
String _monthLabel(String monthStart) =>
    'tháng ${int.parse(monthStart.substring(5, 7))}/'
    '${monthStart.substring(0, 4)}';

/// Notification copy for [digest] — calm and factual, mirroring the
/// weekly clause list ("cao hơn ~N% so với tháng trước"). Returns null
/// for a month with no recorded rows: a quiet month must never produce
/// a ping.
({String title, String body})? monthCloseCopy(MonthCloseDigest digest) {
  if (digest.transactionCount == 0) return null;
  final clauses = <String>[
    digest.expense > 0
        ? 'chi ${formatMoney(digest.expense)}'
        : 'chưa ghi khoản chi nào',
    if (digest.income > 0) 'thu ${formatMoney(digest.income)}',
    if (digest.topCategory != null) 'nhiều nhất: ${digest.topCategory}',
    if (digest.expenseChangePercent != null)
      if (digest.expenseChangePercent == 0)
        'ngang tháng trước'
      else if (digest.expenseChangePercent! > 0)
        'cao hơn ~${digest.expenseChangePercent}% so với tháng trước'
      else
        'thấp hơn ~${digest.expenseChangePercent!.abs()}% so với tháng trước',
  ];
  return (
    title: 'Tổng kết ${_monthLabel(digest.window.start)}',
    body: clauses.join(' · '),
  );
}
