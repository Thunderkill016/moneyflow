import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/budget.dart';

void main() {
  group('budgetState', () {
    test('well under the limit is ok', () {
      expect(
        budgetState(spentMinor: 45000, limitMinor: 2000000),
        BudgetState.ok,
      );
    });

    test('exactly 80% of the limit is already nearLimit', () {
      expect(
        budgetState(spentMinor: 400000, limitMinor: 500000),
        BudgetState.nearLimit,
      );
    });

    test('just under the limit stays nearLimit', () {
      expect(
        budgetState(spentMinor: 499999, limitMinor: 500000),
        BudgetState.nearLimit,
      );
    });

    test('79% is still ok', () {
      // 395000 * 5 = 1975000 < 500000 * 4 = 2000000
      expect(
        budgetState(spentMinor: 395000, limitMinor: 500000),
        BudgetState.ok,
      );
    });

    test('over the limit is over', () {
      expect(
        budgetState(spentMinor: 532000, limitMinor: 500000),
        BudgetState.over,
      );
    });

    test('exactly at the limit is nearLimit, not over', () {
      expect(
        budgetState(spentMinor: 500000, limitMinor: 500000),
        BudgetState.nearLimit,
      );
    });

    test('a zero limit with any spend is over; zero spend is ok', () {
      expect(budgetState(spentMinor: 1, limitMinor: 0), BudgetState.over);
      expect(budgetState(spentMinor: 0, limitMinor: 0), BudgetState.ok);
    });
  });

  group('monthPace', () {
    test('mid-month returns day/daysInMonth', () {
      // 2026-10 has 31 days; day 15 -> 15/31.
      expect(
        monthPace('2026-10-01', DateTime(2026, 10, 15)),
        closeTo(15 / 31, 1e-9),
      );
    });

    test('past month clamps to 1', () {
      expect(monthPace('2026-09-01', DateTime(2026, 10, 15)), 1);
    });

    test('future month clamps to 0', () {
      expect(monthPace('2026-11-01', DateTime(2026, 10, 15)), 0);
    });

    test('last day of a short month reaches 1', () {
      // 2026-02 has 28 days.
      expect(monthPace('2026-02-01', DateTime(2026, 2, 28)), 1);
    });
  });
}
