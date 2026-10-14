// Net-worth trend — month-end balances for the trailing months,
// reconstructed backwards from current balances.
//
// The ledger has no balance snapshots, so month-end net worth =
// today's Σ account balances minus the signed delta of every month
// after it. Delta is the same fold `buildPeriodReport` uses: income
// adds, expense subtracts, transfers net to zero across accounts —
// moving money between the user's own accounts is never income or
// expense (product invariant).
//
// Honesty bounds, all declared rather than hidden:
// - an account's `initial_balance` counts from its creation date, but
//   that date is not part of the fold — a mid-window account reads as
//   if its opening balance always existed;
// - the last point is "now", not a true month-end — the month is still
//   accumulating, so the trend labels it separately;
// - soft-deleted rows never reach the caller (the feeds already exclude
//   them), matching every other report figure.

import 'budget.dart';
import 'models.dart';

/// One point of the trailing net-worth series.
class NetWorthPoint {
  const NetWorthPoint({
    required this.monthStart,
    required this.balanceMinor,
    required this.isCurrent,
    required this.hasActivity,
  });

  /// YYYY-MM-01 of the month this point closes.
  final String monthStart;

  /// Net worth at month end — integer đồng, signed (a net-negative
  /// position reports honestly, never clamped to zero).
  final int balanceMinor;

  /// True on the trailing point: it is "now", still accumulating —
  /// every earlier point is a closed month-end.
  final bool isCurrent;

  /// Whether the month recorded at least one transaction — the basis
  /// for the "chưa đủ dữ liệu" empty state (a trend needs ≥2 active
  /// months before a line means anything).
  final bool hasActivity;
}

/// Trailing series for the reports card: [months] month-ends ending at
/// the month containing [today]. [accounts] carries CURRENT balances
/// (the `loadAccounts` read — archived rows already filtered out);
/// [transactions] must cover the whole window for the fold to be exact
/// — a capped range understates the early months, which the reports
/// page fetches through `loadTransactionsInRange` so it never is.
List<NetWorthPoint> netWorthTrend({
  required List<AccountSummary> accounts,
  required List<Transaction> transactions,
  required String currentMonthStart,
  int months = 6,
}) {
  final first = shiftBudgetMonth(currentMonthStart, -(months - 1));
  final beyond = shiftBudgetMonth(currentMonthStart, 1);

  // Per-month signed delta: income − expense. Transfers contribute
  // nothing — the fold buildPeriodReport totals by, and the same
  // reason: money moving between the user's own accounts is not spend.
  final deltaByMonth = <String, int>{};
  final activeMonths = <String>{};
  for (final tx in transactions) {
    // Rows outside the window would corrupt the reconstruction: older
    // rows belong to a month-end before `first`, future rows are already
    // inside `current` but have no month of their own in the series.
    if (tx.occurredOn.compareTo(first) < 0) continue;
    if (tx.occurredOn.compareTo(beyond) >= 0) continue;
    final monthKey = tx.occurredOn.substring(0, 7);
    if (tx.kind == TransactionKind.income) {
      deltaByMonth[monthKey] = (deltaByMonth[monthKey] ?? 0) + tx.amount;
    } else if (tx.kind == TransactionKind.expense) {
      deltaByMonth[monthKey] = (deltaByMonth[monthKey] ?? 0) - tx.amount;
    } else {
      // A transfer still proves the month had ledger activity — it just
      // does not move net worth.
      deltaByMonth.putIfAbsent(monthKey, () => 0);
    }
    activeMonths.add(monthKey);
  }

  final current = accounts.fold<int>(0, (sum, a) => sum + a.balance);
  final points = <NetWorthPoint>[];
  // Walk newest → oldest subtracting each later month's delta: the
  // first point computed IS the current balance (the live figure, not a
  // month-end); each earlier month-end adds back the deltas that
  // happened after it. `insert(0)` keeps the list oldest → newest.
  var laterDeltas = 0;
  for (var i = 0; i < months; i++) {
    final monthStart = shiftBudgetMonth(currentMonthStart, -i);
    final monthKey = monthStart.substring(0, 7);
    points.insert(
      0,
      NetWorthPoint(
        monthStart: monthStart,
        balanceMinor: current - laterDeltas,
        isCurrent: i == 0,
        hasActivity: activeMonths.contains(monthKey),
      ),
    );
    laterDeltas += deltaByMonth[monthKey] ?? 0;
  }
  return points;
}

/// How many distinct window months recorded a transaction — the trend's
/// minimum-evidence test ("ít nhất 2 tháng" before drawing a line).
int netWorthActiveMonths(List<NetWorthPoint> points) =>
    points.where((p) => p.hasActivity).length;

/// Month-over-month delta label for the trailing edge — the difference
/// between the last two points, in the calm report vocabulary. Null when
/// the series has fewer than two points.
String? netWorthMomLabel(
  List<NetWorthPoint> points,
  String Function(int) format,
) {
  if (points.length < 2) return null;
  final delta =
      points[points.length - 1].balanceMinor -
      points[points.length - 2].balanceMinor;
  if (delta == 0) return 'Không đổi so với tháng trước';
  final amount = format(delta.abs());
  return delta > 0
      ? '+$amount so với tháng trước'
      : '−$amount so với tháng trước';
}
