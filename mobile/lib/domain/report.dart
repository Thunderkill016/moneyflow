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

/// Vietnam keeps a fixed UTC+7 offset with no daylight-saving rules, so a
/// constant duration IS the timezone — no tz database needed.
const vnUtcOffset = Duration(hours: 7);

/// The Asia/Saigon civil clock at [instant] (default: now). Ledger-facing
/// dates — `occurred_on`, `p_month_start`, `p_paid_on`, report windows —
/// anchor on this calendar no matter which zone the device reports: a
/// phone set to New York still writes the Vietnamese day the bank SMS
/// meant. The returned value's `year`/`month`/`day` fields carry the VN
/// civil date, so feed it to [ymd], [dayOnly], [MonthPeriod.of] or any
/// helper that reads calendar fields. It is a shifted instant, NOT a
/// wall clock — never persist it, only the calendar fields.
DateTime vnNow([DateTime? instant]) =>
    (instant ?? DateTime.now()).toUtc().add(vnUtcOffset);

/// VN civil "today" as YYYY-MM-DD — the single "hôm nay" rule shared by
/// capture defaults, planning RPCs, parsers and report windows.
String vnToday([DateTime? instant]) => ymd(vnNow(instant));

/// First of the VN civil month containing [instant] (default: now) —
/// the `p_month_start` window boundary the planning RPCs expect.
String vnMonthStart([DateTime? instant]) {
  final d = vnNow(instant);
  return '${d.year}-${_two(d.month)}-01';
}

/// Monday of the VN civil week containing [instant] (default: now) —
/// the weekly-budget anchor (D12). Vietnam's civil week starts on
/// Monday, the same convention the commitment month grid renders.
String vnWeekStart([DateTime? instant]) {
  final d = vnNow(instant);
  return ymd(dateAdd(dayOnly(d), 1 - d.weekday));
}

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
    this.id,
    this.count,
  });

  final String name;
  final int amount;
  final int share; // percent of the section's denominator, rounded

  /// Drill-in key behind the row — what produced it depends on the
  /// section: category_id for the category breakdowns, account_id for
  /// the account one, the trimmed payee text for the payee section (''
  /// there means the payee-less bucket). Null when the row has no stable
  /// key (a feed row that carried no id), so a section can disable
  /// drill-in instead of filtering on a guess.
  final String? id;

  /// Transactions behind the row — only the payee section counts them
  /// today (a ranking reads as "N khoản · tổng X"), so other sections
  /// leave it null rather than render a number nobody asked for.
  final int? count;
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
    this.excludedCount = 0,
    this.excludedExpense = 0,
    this.excludedIncome = 0,
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

  /// Rows the user flagged "Loại khỏi báo cáo" (D13): count and the
  /// expense/income đồng they carried, so the page can disclose "N
  /// khoản · X ₫ đã loại" instead of silently shrinking the totals.
  /// Zero when nothing was excluded.
  final int excludedCount;
  final int excludedExpense;
  final int excludedIncome;
}

/// Sorted largest-first share rows; [denominator] is the section's total
/// (expense or income). Name order pins ties that `List.sort` — unstable,
/// unlike the web's — would otherwise leave arbitrary. [names] carries
/// each key's display label and [ids] the drill-in key behind it — null
/// there marks a row grouped by name only, which no filter can rebuild.
/// [counts] is optional per-bucket transaction counts (the payee ranking).
List<CategoryShare> _shares(
  Map<String, int> totals,
  int denominator, {
  required Map<String, String> names,
  required Map<String, String?> ids,
  Map<String, int> counts = const {},
}) =>
    [
      for (final e in totals.entries)
        CategoryShare(
          name: names[e.key] ?? e.key,
          amount: e.value,
          share: denominator == 0 ? 0 : (e.value / denominator * 100).round(),
          id: ids[e.key],
          count: counts[e.key],
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
  // Id-backed sections key on the stored id so a drill-in can rebuild the
  // exact row set; two categories sharing a name stay two rows, which is
  // more honest than merging what one category_id filter could never
  // reproduce. The display name rides along in the names map.
  final categoryTotals = <String, int>{};
  final categoryNames = <String, String>{};
  final categoryIds = <String, String?>{};
  final incomeCategoryTotals = <String, int>{};
  final incomeCategoryNames = <String, String>{};
  final incomeCategoryIds = <String, String?>{};
  final accountTotals = <String, int>{};
  final accountNames = <String, String>{};
  final accountIds = <String, String?>{};
  // Payees have no id — the trimmed text itself is the drill-in key.
  final payeeTotals = <String, int>{};
  final payeeNames = <String, String>{};
  final payeeIds = <String, String?>{};
  final payeeCounts = <String, int>{};
  // Flagged-out rows still get tallied for the disclosure line — hiding
  // that they exist would make the totals look unexplained.
  var excludedCount = 0, excludedExpense = 0, excludedIncome = 0;

  void bump(
    Map<String, int> totals,
    Map<String, String> names,
    Map<String, String?> ids,
    String id,
    String name,
    int amount,
  ) {
    final key = id.isEmpty ? 'name:$name' : id;
    totals[key] = (totals[key] ?? 0) + amount;
    names[key] ??= name;
    ids[key] ??= id.isEmpty ? null : id;
  }

  for (final item in items) {
    if (item.excludedFromReports) {
      excludedCount++;
      if (item.kind == TransactionKind.income) {
        excludedIncome += item.amount;
      } else if (item.kind == TransactionKind.expense) {
        excludedExpense += item.amount;
      }
      continue;
    }
    if (item.kind == TransactionKind.income) {
      if (item.isRefund) {
        // Hoàn tiền (D15): money back against an EXPENSE category — the
        // row nets the spend it reimburses and never counts as Thu.
        // Every expense-side section nets too so they still sum to the
        // period's spending; payeeCounts counts it because the row is a
        // real transaction at that payee.
        expense -= item.amount;
        if (item.category.isNotEmpty) {
          bump(
            categoryTotals,
            categoryNames,
            categoryIds,
            item.categoryId,
            item.category,
            -item.amount,
          );
        }
        final payee = (item.payee ?? '').trim();
        payeeTotals[payee] = (payeeTotals[payee] ?? 0) - item.amount;
        payeeNames[payee] ??= payee.isEmpty ? unnamedPayeeBucket : payee;
        payeeIds[payee] ??= payee;
        payeeCounts[payee] = (payeeCounts[payee] ?? 0) + 1;
        if (item.account.isNotEmpty) {
          bump(
            accountTotals,
            accountNames,
            accountIds,
            item.accountId,
            item.account,
            -item.amount,
          );
        }
      } else {
        income += item.amount;
        if (item.category.isNotEmpty) {
          bump(
            incomeCategoryTotals,
            incomeCategoryNames,
            incomeCategoryIds,
            item.categoryId,
            item.category,
            item.amount,
          );
        }
      }
    } else if (item.kind == TransactionKind.expense) {
      expense += item.amount;
      if (item.category.isNotEmpty) {
        bump(
          categoryTotals,
          categoryNames,
          categoryIds,
          item.categoryId,
          item.category,
          item.amount,
        );
      }
      // Payee-less expenses still happened — they group under an honest
      // bucket instead of silently leaving the section's total.
      final payee = (item.payee ?? '').trim();
      payeeTotals[payee] = (payeeTotals[payee] ?? 0) + item.amount;
      payeeNames[payee] ??= payee.isEmpty ? unnamedPayeeBucket : payee;
      payeeIds[payee] ??= payee;
      payeeCounts[payee] = (payeeCounts[payee] ?? 0) + 1;
      if (item.account.isNotEmpty) {
        bump(
          accountTotals,
          accountNames,
          accountIds,
          item.accountId,
          item.account,
          item.amount,
        );
      }
    }
  }
  final net = income - expense;
  return PeriodReport(
    income: income,
    expense: expense,
    net: net,
    transactionCount: items.length - excludedCount,
    excludedCount: excludedCount,
    excludedExpense: excludedExpense,
    excludedIncome: excludedIncome,
    savingsRatePercent: income == 0 ? null : ((net / income) * 100).round(),
    categories: _shares(
      categoryTotals,
      expense,
      names: categoryNames,
      ids: categoryIds,
    ),
    incomeCategories: _shares(
      incomeCategoryTotals,
      income,
      names: incomeCategoryNames,
      ids: incomeCategoryIds,
    ),
    payees: _shares(
      payeeTotals,
      expense,
      names: payeeNames,
      ids: payeeIds,
      counts: payeeCounts,
    ),
    accounts: _shares(
      accountTotals,
      expense,
      names: accountNames,
      ids: accountIds,
    ),
  );
}

/// The bucket an expense lands in for the category breakdown — the
/// stored category_id when the feed row carried one, else its display
/// name under the same 'name:' guard `buildPeriodReport` groups on, so
/// a delta key always names the same bucket its row summed.
String _expenseBucketKey(Transaction t) =>
    t.categoryId.isEmpty ? 'name:${t.category}' : t.categoryId;

/// Expense totals per category bucket for [items], plus the display
/// label and drill-in id each bucket carries. Transfers and income
/// never contribute — the "Chi theo danh mục" section counts expense
/// rows only, and only ones carrying a category label (uncategorised
/// spend joins no bucket, exactly like the breakdown).
Map<String, ({int total, String name, String? id})> _expenseBuckets(
  List<Transaction> items,
) {
  final buckets = <String, ({int total, String name, String? id})>{};
  for (final t in items) {
    // Excluded rows left the breakdown — a delta bucket for them would
    // invent a comparison the section itself never shows.
    if (t.excludedFromReports) continue;
    // Refund income nets the expense bucket it reimburses (D15) —
    // the delta map must see the same netted totals the breakdown shows.
    final netsCategory = t.kind == TransactionKind.income && t.isRefund;
    if (t.kind != TransactionKind.expense && !netsCategory) continue;
    if (t.category.isEmpty) continue;
    final key = _expenseBucketKey(t);
    final b = buckets[key];
    buckets[key] = (
      total: (b?.total ?? 0) + (netsCategory ? -t.amount : t.amount),
      // First row wins the label/id — the same '??=' rule the
      // breakdown's bump() applies, so they can never disagree.
      name: b?.name ?? t.category,
      id: b?.id ?? (t.categoryId.isEmpty ? null : t.categoryId),
    );
  }
  return buckets;
}

/// One expense category's change against the prior window, in integer
/// đồng. [previous] is null when the bucket had no expense in the prior
/// window — an honest "mới", never a baseline of 0 posing as data.
/// [name]/[id] are carried so a bucket that exists only in the prior
/// window can still render its honest zero-current row.
class CategoryDelta {
  const CategoryDelta({
    required this.name,
    this.id,
    required this.current,
    this.previous,
  });

  /// The bucket's display label — first row wins, like the breakdown.
  final String name;

  /// Drill-in key — the stored category_id, or null when the bucket
  /// grouped on its name (no filter can rebuild a name-only row).
  final String? id;

  /// Expense total in the viewed window (0 for a bucket that only
  /// existed in the prior one).
  final int current;

  /// Expense total in the window immediately before, or null when the
  /// category recorded no prior expense at all.
  final int? previous;

  /// Signed change vs the prior window; a missing baseline counts as
  /// zero spend then, so a new 500k row rose by 500k. Callers that show
  /// "mới" for a null [previous] never read this as a real arrow.
  int get change => current - (previous ?? 0);
}

/// Month-over-month deltas for the expense-category section, keyed by
/// the same bucket the report groups on — [categoryDeltaKey] maps a
/// rendered row to its entry. The map covers BOTH windows, so a
/// category that fell to zero this period still reports its honest
/// negative change; the caller renders those prior-only buckets as
/// zero rows rather than letting the comparison silently drop them.
Map<String, CategoryDelta> expenseCategoryDeltas({
  required List<Transaction> current,
  required List<Transaction> previous,
}) {
  final cur = _expenseBuckets(current);
  final prev = _expenseBuckets(previous);
  return {
    for (final key in {...cur.keys, ...prev.keys})
      key: CategoryDelta(
        name: (cur[key] ?? prev[key])!.name,
        id: (cur[key] ?? prev[key])!.id,
        current: cur[key]?.total ?? 0,
        previous: prev[key]?.total,
      ),
  };
}

/// Expense totals per payee bucket for [items], keyed by the trimmed
/// payee text — the same key `buildPeriodReport` uses (`payeeIds`
/// stores the text itself, so a rendered row's [CategoryShare.id] is
/// its bucket key verbatim). Payee-less spend groups under '' with the
/// [unnamedPayeeBucket] label, refunds net, and excluded rows skip —
/// every rule the payee section itself applies.
Map<String, ({int total, String name, String? id})> _payeeBuckets(
  List<Transaction> items,
) {
  final buckets = <String, ({int total, String name, String? id})>{};
  for (final t in items) {
    if (t.excludedFromReports) continue;
    final netsPayee = t.kind == TransactionKind.income && t.isRefund;
    if (t.kind != TransactionKind.expense && !netsPayee) continue;
    final payee = (t.payee ?? '').trim();
    final b = buckets[payee];
    buckets[payee] = (
      total: (b?.total ?? 0) + (netsPayee ? -t.amount : t.amount),
      name: b?.name ?? (payee.isEmpty ? unnamedPayeeBucket : payee),
      // The row's drill-in id IS the trimmed text verbatim — the
      // breakdown's `payeeIds[payee] ??= payee` carries '' too, so the
      // unnamed bucket still drills like any rendered row.
      id: b?.id ?? payee,
    );
  }
  return buckets;
}

/// Month-over-month deltas for the "Chi theo người nhận" section — the
/// Money Lover Insider pattern (top payee + delta) the category
/// section already carries. Same coverage contract as
/// [expenseCategoryDeltas]: both windows merge so a payee that fell to
/// zero still reports its honest negative change.
Map<String, CategoryDelta> expensePayeeDeltas({
  required List<Transaction> current,
  required List<Transaction> previous,
}) {
  final cur = _payeeBuckets(current);
  final prev = _payeeBuckets(previous);
  return {
    for (final key in {...cur.keys, ...prev.keys})
      key: CategoryDelta(
        name: (cur[key] ?? prev[key])!.name,
        id: (cur[key] ?? prev[key])!.id,
        current: cur[key]?.total ?? 0,
        previous: prev[key]?.total,
      ),
  };
}

/// The delta-map key a breakdown row answers to — its stored id, or the
/// 'name:' bucket guard when the feed row carried no category_id (the
/// same rule the delta map's keys were built with).
String categoryDeltaKey(CategoryShare row) => row.id ?? 'name:${row.name}';
