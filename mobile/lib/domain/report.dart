// Period report — mirrors the totals contract of src/lib/reports.ts.
// Transfers never count as income or expense (product invariant).

import 'models.dart';

/// One category's expense share inside a period report.
class CategoryShare {
  const CategoryShare({
    required this.name,
    required this.amount,
    required this.share,
  });

  final String name;
  final int amount;
  final int share; // percent of total expense, rounded
}

/// Totals for a bounded period: income, expense, net, savings rate and the
/// per-category expense breakdown (sorted desc, percent rounded like the web).
class PeriodReport {
  const PeriodReport({
    required this.income,
    required this.expense,
    required this.net,
    required this.transactionCount,
    required this.savingsRatePercent,
    required this.categories,
  });

  final int income;
  final int expense;
  final int net;
  final int transactionCount;
  final int? savingsRatePercent;
  final List<CategoryShare> categories;
}

/// Build a period report from transactions already scoped to the range.
/// Matching the web: `income`/`expense` sum whole rows by kind; `net` is
/// income - expense; savings rate is null when income is zero.
PeriodReport buildPeriodReport(List<Transaction> items) {
  var income = 0, expense = 0;
  final categoryTotals = <String, int>{};
  for (final item in items) {
    if (item.kind == TransactionKind.income) {
      income += item.amount;
    } else if (item.kind == TransactionKind.expense) {
      expense += item.amount;
      final name = item.category;
      if (name.isNotEmpty) {
        categoryTotals[name] = (categoryTotals[name] ?? 0) + item.amount;
      }
    }
  }
  final net = income - expense;
  final categories =
      categoryTotals.entries
          .map(
            (e) => CategoryShare(
              name: e.key,
              amount: e.value,
              share: expense == 0 ? 0 : ((e.value / expense) * 100).round(),
            ),
          )
          .toList()
        ..sort((a, b) => b.amount.compareTo(a.amount));
  return PeriodReport(
    income: income,
    expense: expense,
    net: net,
    transactionCount: items.length,
    savingsRatePercent: income == 0 ? null : ((net / income) * 100).round(),
    categories: categories,
  );
}
