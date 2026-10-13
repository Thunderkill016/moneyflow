import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/net_worth.dart';

AccountSummary _account(String id, int balance) => AccountSummary(
  id: id,
  name: id,
  kind: AccountKind.bank,
  currencyCode: 'VND',
  initialBalance: balance,
  balance: balance,
);

Transaction _tx(
  String id,
  TransactionKind kind,
  int amount,
  String occurredOn,
) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'cat-1',
  category: 'Danh mục',
  note: '',
  accountId: 'acc-1',
  account: 'Bank',
  amount: amount,
  occurredOn: occurredOn,
);

void main() {
  group('netWorthTrend', () {
    const current = '2026-10-01';
    final accounts = [_account('a1', 5000000), _account('a2', 1500000)];

    test('the last point is the current balance, marked not-a-month-end', () {
      final points = netWorthTrend(
        accounts: accounts,
        transactions: const [],
        currentMonthStart: current,
      );
      expect(points.length, 6);
      expect(points.last.balanceMinor, 6500000);
      expect(points.last.isCurrent, isTrue);
      expect(points.last.monthStart, current);
      // Every earlier point is a closed month-end.
      expect(points.first.isCurrent, isFalse);
      expect(points.first.monthStart, '2026-05-01');
    });

    test('income adds back, expense subtracts — walking backwards', () {
      final points = netWorthTrend(
        accounts: accounts,
        transactions: [
          _tx('t1', TransactionKind.income, 2000000, '2026-10-05'),
          _tx('t2', TransactionKind.expense, 500000, '2026-10-10'),
          _tx('t3', TransactionKind.expense, 1000000, '2026-09-15'),
        ],
        currentMonthStart: current,
      );
      // October delta = +2.000.000 − 500.000 = +1.500.000, so September
      // ended at 6.500.000 − 1.500.000 = 5.000.000.
      expect(points[5].balanceMinor, 6500000);
      expect(points[4].balanceMinor, 5000000);
      // September delta = −1.000.000 → August ended at 6.000.000.
      expect(points[3].balanceMinor, 6000000);
      // No activity before that — flat tail, honest, not decaying.
      expect(points[2].balanceMinor, 6000000);
      expect(points[0].balanceMinor, 6000000);
    });

    test('transfers are net-worth neutral but still count as activity', () {
      final points = netWorthTrend(
        accounts: accounts,
        transactions: [
          _tx('t1', TransactionKind.transfer, 900000, '2026-09-20'),
          _tx('t2', TransactionKind.income, 1000000, '2026-10-02'),
        ],
        currentMonthStart: current,
      );
      // The September transfer moved no net worth — month-end equals
      // the balance before October's income.
      expect(points[4].balanceMinor, 5500000);
      // …but it did happen — the month counts as active for the
      // "ít nhất 2 tháng" evidence test.
      expect(points[4].hasActivity, isTrue);
    });

    test('negative balances reconstruct honestly, never clamped', () {
      final points = netWorthTrend(
        accounts: [_account('a1', -500000)],
        transactions: [
          _tx('t1', TransactionKind.income, 3000000, '2026-10-01'),
        ],
        currentMonthStart: current,
      );
      // Before October's +3.000.000 the position was −3.500.000.
      expect(points[4].balanceMinor, -3500000);
      expect(points[5].balanceMinor, -500000);
    });

    test('rows outside the window never leak into the fold', () {
      final points = netWorthTrend(
        accounts: accounts,
        transactions: [
          // Before May — belongs to a month-end earlier than the window.
          _tx('old', TransactionKind.expense, 999000000, '2026-04-30'),
          // Future-dated — not a month of its own in the series.
          _tx('future', TransactionKind.expense, 999000000, '2026-11-05'),
        ],
        currentMonthStart: current,
      );
      expect(points.first.balanceMinor, 6500000);
      expect(points.last.balanceMinor, 6500000);
    });

    test('a partial current month folds whatever has happened so far', () {
      // "Now" mid-October: one expense already posted.
      final points = netWorthTrend(
        accounts: accounts,
        transactions: [
          _tx('t1', TransactionKind.expense, 200000, '2026-10-14'),
        ],
        currentMonthStart: current,
      );
      // The live point already reflects the spend; September's end is
      // the live balance plus what October spent so far.
      expect(points[5].balanceMinor, 6500000);
      expect(points[4].balanceMinor, 6700000);
      expect(points[5].hasActivity, isTrue);
    });
  });

  group('netWorthActiveMonths + mom label', () {
    const current = '2026-10-01';

    test('fewer than two active months fails the evidence test', () {
      final points = netWorthTrend(
        accounts: [_account('a1', 1000000)],
        transactions: [_tx('t1', TransactionKind.expense, 1000, '2026-10-03')],
        currentMonthStart: current,
      );
      expect(netWorthActiveMonths(points), 1);
    });

    test('the MoM label reads the last two points, signed', () {
      String fmt(int v) => '$v₫';
      final points = netWorthTrend(
        accounts: [_account('a1', 1000000)],
        transactions: [_tx('t1', TransactionKind.income, 250000, '2026-10-03')],
        currentMonthStart: current,
      );
      // 1.000.000 now vs 750.000 at September's end.
      expect(netWorthMomLabel(points, fmt), '+250000₫ so với tháng trước');

      final flat = netWorthTrend(
        accounts: [_account('a1', 1000000)],
        transactions: [_tx('t1', TransactionKind.expense, 1, '2026-09-03')],
        currentMonthStart: current,
      );
      expect(netWorthMomLabel(flat, fmt), 'Không đổi so với tháng trước');

      final down = netWorthTrend(
        accounts: [_account('a1', 1000000)],
        transactions: [
          _tx('t1', TransactionKind.expense, 300000, '2026-10-03'),
        ],
        currentMonthStart: current,
      );
      expect(netWorthMomLabel(down, fmt), '−300000₫ so với tháng trước');
    });

    test('an empty series yields no label, never a fabricated delta', () {
      String fmt(int v) => '$v₫';
      expect(netWorthMomLabel(const [], fmt), isNull);
      expect(
        netWorthMomLabel([
          const NetWorthPoint(
            monthStart: '2026-10-01',
            balanceMinor: 5,
            isCurrent: true,
            hasActivity: true,
          ),
        ], fmt),
        isNull,
      );
    });
  });
}
