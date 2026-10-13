// Period report — mirrors the totals contract of src/lib/reports.ts.
// Transfers never count as income or expense (product invariant).

import 'models.dart';

/// Bucket label for expense rows recorded without a payee. The web drops
/// payee-less rows from its payee list; mobile keeps them in an honest
/// named bucket so the section still sums to the whole period's spending.
const unnamedPayeeBucket = 'Không tên';

/// Longest pickable custom window, in days — same cap as the web's
/// CUSTOM_RANGE_MAX_DAYS (roughly three years; beyond that is an export
/// job, not a report).
const customRangeMaxDays = 1096;

String _two(int v) => v.toString().padLeft(2, '0');

/// YYYY-MM-DD for a calendar date — the string form the store contract uses.
String ymd(DateTime d) => '${d.year}-${_two(d.month)}-${_two(d.day)}';

/// Local-midnight DateTime for a YYYY-MM-DD string.
DateTime parseYmd(String s) {
  final p = s.split('-');
  return DateTime(int.parse(p[0]), int.parse(p[1]), int.parse(p[2]));
}

/// Drops the time part so date comparisons never race the clock.
DateTime dayOnly(DateTime d) => DateTime(d.year, d.month, d.day);

/// Calendar-day arithmetic — `DateTime(y, m, d + n)` normalizes overflow,
/// unlike `Duration` addition which can drift across DST boundaries.
DateTime dateAdd(DateTime d, int days) =>
    DateTime(d.year, d.month, d.day + days);

/// Whole days from [from] to [to]; UTC fields keep DST out of the count.
int daysBetween(DateTime from, DateTime to) => DateTime.utc(
  to.year,
  to.month,
  to.day,
).difference(DateTime.utc(from.year, from.month, from.day)).inDays;

/// A bounded report window: [from] inclusive / [to] exclusive, YYYY-MM-DD —
/// exactly the `loadTransactionsInRange` contract.
sealed class ReportPeriod {
  const ReportPeriod();

  /// Inclusive lower bound, YYYY-MM-DD.
  String get from;

  /// Exclusive upper bound, YYYY-MM-DD.
  String get to;

  /// Human vi period title ("Tháng 10/2026", or the picked dates).
  String get label;

  /// The window immediately before this one — always available.
  ReportPeriod get prev;

  /// The window immediately after this one, or null when it would lie
  /// entirely in the future — there is nothing to report there (web rule).
  ReportPeriod? next(DateTime today);
}

/// A whole calendar month — the default reports landing, like the web.
class MonthPeriod extends ReportPeriod {
  const MonthPeriod(this.year, this.month);

  /// The month containing [date].
  factory MonthPeriod.of(DateTime date) => MonthPeriod(date.year, date.month);

  final int year;
  final int month;

  @override
  String get from => '$year-${_two(month)}-01';

  @override
  String get to {
    final n = DateTime(year, month + 1);
    return '${n.year}-${_two(n.month)}-01';
  }

  @override
  String get label => 'Tháng $month/$year';

  @override
  ReportPeriod get prev {
    final p = DateTime(year, month - 1);
    return MonthPeriod(p.year, p.month);
  }

  @override
  ReportPeriod? next(DateTime today) {
    final n = DateTime(year, month + 1);
    // A month that has not started yet has nothing to report.
    if (DateTime(n.year, n.month).isAfter(dayOnly(today))) return null;
    return MonthPeriod(n.year, n.month);
  }
}

/// A hand-picked window between two calendar dates (both inclusive),
/// mirroring the web's `period=custom` range.
class CustomPeriod extends ReportPeriod {
  /// [start] <= [end], both inclusive YYYY-MM-DD.
  const CustomPeriod(this.start, this.end);

  final String start;
  final String end;

  /// Days covered (both bounds counted).
  int get spanDays => daysBetween(parseYmd(start), parseYmd(end)) + 1;

  @override
  String get from => start;

  @override
  String get to => ymd(dateAdd(parseYmd(end), 1));

  /// The dates themselves are the title, like the web's custom-period
  /// heading: "5/10 – 20/10/2026", carrying both years when they differ.
  @override
  String get label {
    String dayMonth(String s) =>
        '${int.parse(s.substring(8))}/${int.parse(s.substring(5, 7))}';
    final sameYear = start.substring(0, 4) == end.substring(0, 4);
    return sameYear
        ? '${dayMonth(start)} – ${dayMonth(end)}/${end.substring(0, 4)}'
        : '${dayMonth(start)}/${start.substring(0, 4)} – '
              '${dayMonth(end)}/${end.substring(0, 4)}';
  }

  /// Equal-length window immediately before — the same "kỳ trước cùng số
  /// ngày" rule the web applies to custom ranges.
  @override
  ReportPeriod get prev {
    final prevEnd = dateAdd(parseYmd(start), -1);
    final prevStart = dateAdd(prevEnd, -(spanDays - 1));
    return CustomPeriod(ymd(prevStart), ymd(prevEnd));
  }

  /// Equal-length window immediately after, clamped to today; null when it
  /// would start in the future.
  @override
  ReportPeriod? next(DateTime today) {
    final todayDay = dayOnly(today);
    final nextStart = dateAdd(parseYmd(end), 1);
    if (nextStart.isAfter(todayDay)) return null;
    var nextEnd = dateAdd(nextStart, spanDays - 1);
    if (nextEnd.isAfter(todayDay)) nextEnd = todayDay;
    return CustomPeriod(ymd(nextStart), ymd(nextEnd));
  }
}

/// One named row's amount and share inside a period report.
class CategoryShare {
  const CategoryShare({
    required this.name,
    required this.amount,
    required this.share,
  });

  final String name;
  final int amount;
  final int share; // percent of the section's denominator, rounded
}

/// Totals for a bounded period: income, expense, net, savings rate and the
/// named breakdowns (sorted desc, percent rounded like the web).
class PeriodReport {
  const PeriodReport({
    required this.income,
    required this.expense,
    required this.net,
    required this.transactionCount,
    required this.savingsRatePercent,
    required this.categories,
    required this.incomeCategories,
    required this.payees,
    required this.accounts,
  });

  final int income;
  final int expense;
  final int net;
  final int transactionCount;
  final int? savingsRatePercent;

  /// Expense by category — shares divide by total expense.
  final List<CategoryShare> categories;

  /// Income by category — shares divide by total income.
  final List<CategoryShare> incomeCategories;

  /// Expense by recorded payee. Rows without a payee group under
  /// [unnamedPayeeBucket] so the section sums to the whole period.
  final List<CategoryShare> payees;

  /// Expense by the account it left from. Whole rows like the web —
  /// transfers are excluded by kind, since moving money between the user's
  /// own accounts is not spending.
  final List<CategoryShare> accounts;
}

/// Sorted largest-first share rows; [denominator] is the section's total
/// (expense or income). Name order pins ties that `List.sort` — unstable,
/// unlike the web's — would otherwise leave arbitrary.
List<CategoryShare> _shares(Map<String, int> totals, int denominator) =>
    [
      for (final e in totals.entries)
        CategoryShare(
          name: e.key,
          amount: e.value,
          share: denominator == 0 ? 0 : (e.value / denominator * 100).round(),
        ),
    ]..sort((a, b) {
      final byAmount = b.amount.compareTo(a.amount);
      return byAmount != 0 ? byAmount : a.name.compareTo(b.name);
    });

/// Build a period report from transactions already scoped to the range.
/// Matching the web: `income`/`expense` sum whole rows by kind; `net` is
/// income - expense; savings rate is null when income is zero.
PeriodReport buildPeriodReport(List<Transaction> items) {
  var income = 0, expense = 0;
  final categoryTotals = <String, int>{};
  final incomeCategoryTotals = <String, int>{};
  final payeeTotals = <String, int>{};
  final accountTotals = <String, int>{};
  void bump(Map<String, int> totals, String name, int amount) {
    totals[name] = (totals[name] ?? 0) + amount;
  }

  for (final item in items) {
    if (item.kind == TransactionKind.income) {
      income += item.amount;
      if (item.category.isNotEmpty) {
        bump(incomeCategoryTotals, item.category, item.amount);
      }
    } else if (item.kind == TransactionKind.expense) {
      expense += item.amount;
      if (item.category.isNotEmpty) {
        bump(categoryTotals, item.category, item.amount);
      }
      // Payee-less expenses still happened — they group under an honest
      // bucket instead of silently leaving the section's total.
      final payee = (item.payee ?? '').trim();
      bump(
        payeeTotals,
        payee.isEmpty ? unnamedPayeeBucket : payee,
        item.amount,
      );
      if (item.account.isNotEmpty) {
        bump(accountTotals, item.account, item.amount);
      }
    }
  }
  final net = income - expense;
  return PeriodReport(
    income: income,
    expense: expense,
    net: net,
    transactionCount: items.length,
    savingsRatePercent: income == 0 ? null : ((net / income) * 100).round(),
    categories: _shares(categoryTotals, expense),
    incomeCategories: _shares(incomeCategoryTotals, income),
    payees: _shares(payeeTotals, expense),
    accounts: _shares(accountTotals, expense),
  );
}
