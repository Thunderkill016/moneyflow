import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/budget.dart';
import 'package:moneyflow/domain/models.dart';

BudgetProgress _bp(
  String categoryId,
  String monthStart,
  int limitMinor,
  int spentMinor,
) => BudgetProgress(
  id: 'bp-$categoryId-$monthStart',
  categoryId: categoryId,
  categoryName: categoryId,
  monthStart: monthStart,
  limitMinor: limitMinor,
  spentMinor: spentMinor,
);

Transaction _expense(
  String id,
  String categoryId,
  int amount,
  String occurredOn, {
  TransactionKind kind = TransactionKind.expense,
  List<TransactionSplitLine> splitLines = const [],
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: categoryId,
  category: categoryId,
  note: '',
  accountId: 'acc-1',
  account: 'Bank',
  amount: amount,
  occurredOn: occurredOn,
  splitCount: splitLines.length,
  splitLines: splitLines,
);

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

  group('shiftBudgetMonth', () {
    test('shifts backward and forward across year boundaries', () {
      expect(shiftBudgetMonth('2026-01-01', -1), '2025-12-01');
      expect(shiftBudgetMonth('2026-01-01', -3), '2025-10-01');
      expect(shiftBudgetMonth('2026-12-01', 1), '2027-01-01');
      expect(shiftBudgetMonth('2026-10-01', 0), '2026-10-01');
    });

    test('rejects malformed months and impossible months', () {
      expect(() => shiftBudgetMonth('2026-13-01', -1), throwsFormatException);
      expect(() => shiftBudgetMonth('2026-10-15', -1), throwsFormatException);
      // Year 1 has no representable previous month — the web's
      // invalid_budget_month_shift rule.
      expect(() => shiftBudgetMonth('0001-01-01', -1), throwsFormatException);
    });
  });

  group('budgetRollover', () {
    test('nets prior under- and overspend into a signed carry', () {
      final rollover = budgetRollover(
        priorBudgets: [
          _bp('cat-food', '2026-09-01', 2000000, 1700000), // +300k
          _bp('cat-food', '2026-08-01', 2000000, 2300000), // −300k
        ],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(rollover.carry, 0);
      expect(rollover.monthsIncluded, 2);
    });

    test('underspend carries positive; overspend carries negative', () {
      final under = budgetRollover(
        priorBudgets: [_bp('cat-food', '2026-09-01', 2000000, 1500000)],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(under.carry, 500000);
      expect(under.monthsIncluded, 1);

      final over = budgetRollover(
        priorBudgets: [_bp('cat-food', '2026-09-01', 2000000, 2600000)],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(over.carry, -600000);
    });

    test('ignores other categories, the viewed month, and older history', () {
      final rollover = budgetRollover(
        priorBudgets: [
          // Same category, current month — must not self-carry.
          _bp('cat-food', '2026-10-01', 2000000, 0),
          // Other category's underspend — must not leak across categories.
          _bp('cat-bills', '2026-09-01', 9000000, 100),
          // Outside the 12-month window — older history stays out.
          _bp('cat-food', '2025-09-01', 8000000, 0),
          _bp('cat-food', '2026-09-01', 2000000, 1800000),
        ],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(rollover.carry, 200000);
      expect(rollover.monthsIncluded, 1);
    });

    test('a row exactly at the window edge still counts', () {
      // 2025-10-01 is exactly 12 months before 2026-10-01 — inside.
      final rollover = budgetRollover(
        priorBudgets: [_bp('cat-food', '2025-10-01', 1000000, 500000)],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(rollover.carry, 500000);
    });

    test('no prior rows means a zero carry', () {
      final rollover = budgetRollover(
        priorBudgets: const [],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(rollover.carry, 0);
      expect(rollover.monthsIncluded, 0);
    });
  });

  group('budgetEffective*', () {
    test('effective limit and available fold the carry in', () {
      expect(budgetEffectiveLimit(2000000, 300000), 2300000);
      expect(budgetEffectiveLimit(2000000, -500000), 1500000);
      expect(
        budgetEffectiveAvailable(
          spentMinor: 400000,
          limitMinor: 2000000,
          carry: 300000,
        ),
        1900000,
      );
    });

    test('carried overspend can push an on-limit month into over', () {
      // Own limit 2.000.000, spent 1.900.000 — under on raw figures, but
      // −500.000 carried overspend makes the effective limit 1.500.000.
      expect(
        budgetEffectiveState(
          spentMinor: 1900000,
          limitMinor: 2000000,
          carry: -500000,
        ),
        BudgetState.over,
      );
    });

    test('a zero-or-negative effective limit cannot read as "no budget"', () {
      expect(
        budgetEffectiveState(
          spentMinor: 0,
          limitMinor: 1000000,
          carry: -1000000,
        ),
        BudgetState.ok,
      );
      expect(
        budgetEffectiveState(
          spentMinor: 1,
          limitMinor: 1000000,
          carry: -1000000,
        ),
        BudgetState.over,
      );
    });
  });

  group('budgetRolloverLabel', () {
    String fmt(int v) => '$v₫';

    test('a zero carry stays silent', () {
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: 0, monthsIncluded: 2),
          fmt,
        ),
        isNull,
      );
    });

    test('names the carry direction and the month span', () {
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: 300000, monthsIncluded: 1),
          fmt,
        ),
        'Chuyển từ tháng trước: +300000₫',
      );
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: -300000, monthsIncluded: 1),
          fmt,
        ),
        'Trừ vì vượt hạn mức tháng trước: −300000₫',
      );
      // Netting three months is not "tháng trước" — the label says so.
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: 100, monthsIncluded: 3),
          fmt,
        ),
        'Chuyển từ 3 tháng trước đó: +100₫',
      );
    });
  });

  group('budgetsToCarryForward', () {
    test('proposes only prior-month limits with no current decision', () {
      final drafts = budgetsToCarryForward(
        previousBudgets: [
          _bp('cat-food', '2026-09-01', 2000000, 1700000),
          _bp('cat-bills', '2026-09-01', 1200000, 1150000),
          // A zero/negative previous limit reads as "not planned",
          // not "may spend nothing" — never carried as a zero cap.
          _bp('cat-fun', '2026-09-01', 0, 0),
        ],
        currentBudgets: [
          // Already decided this month — never touched.
          _bp('cat-bills', '2026-10-01', 900000, 100000),
        ],
        monthStart: '2026-10-01',
      );
      expect(drafts, hasLength(1));
      expect(drafts.single.categoryId, 'cat-food');
      expect(drafts.single.monthStart, '2026-10-01');
      expect(drafts.single.limitMinor, 2000000);
    });

    test('a malformed target month throws before proposing anything', () {
      expect(
        () => budgetsToCarryForward(
          previousBudgets: const [],
          currentBudgets: const [],
          monthStart: '2026-13-01',
        ),
        throwsFormatException,
      );
    });
  });

  group('budgetSuggestions', () {
    test('averages the trailing window per expense category', () {
      // Viewing October: the window is Jul+Aug+Sep. Months that recorded
      // nothing still count toward the average.
      final suggestions = budgetSuggestions([
        _expense('t1', 'cat-food', 600000, '2026-07-10'),
        _expense('t2', 'cat-food', 900000, '2026-08-12'),
        _expense('t3', 'cat-food', 1200000, '2026-09-05'),
        _expense('t4', 'cat-transport', 660000, '2026-09-15'),
        // Rows inside the viewed month never feed the suggestion.
        _expense('t5', 'cat-food', 9999000, '2026-10-01'),
      ], '2026-10-01');
      // 2.700.000 / 3 = 900.000 — the web's exact figure.
      expect(suggestions['cat-food']?.amount, 900000);
      expect(suggestions['cat-food']?.monthsWithData, 3);
      expect(suggestions['cat-transport']?.amount, 220000);
      expect(suggestions['cat-transport']?.monthsWithData, 1);
    });

    test('distributes split lines and ignores non-expense rows', () {
      final split = Transaction(
        id: 'split-1',
        kind: TransactionKind.expense,
        categoryId: 'cat-food',
        category: 'Ăn uống',
        note: '',
        accountId: 'acc-1',
        account: 'Bank',
        amount: 300000,
        occurredOn: '2026-08-10',
        splitCount: 2,
        splitLines: const [
          TransactionSplitLine(
            categoryId: 'cat-food',
            category: 'Ăn uống',
            amount: 200000,
          ),
          TransactionSplitLine(
            categoryId: 'cat-transport',
            category: 'Di chuyển',
            amount: 100000,
          ),
        ],
      );
      final suggestions = budgetSuggestions([
        split,
        _expense(
          't-out',
          'cat-food',
          500000,
          '2026-08-11',
          kind: TransactionKind.transfer,
        ),
        _expense(
          't-in',
          'cat-salary',
          9000000,
          '2026-08-25',
          kind: TransactionKind.income,
        ),
      ], '2026-10-01');
      // Split lines land on their own categories — the same per-entry
      // attribution budget_progress.spent_minor uses.
      expect(suggestions['cat-food']?.amount, 66667); // 200k / 3
      expect(suggestions['cat-transport']?.amount, 33333); // 100k / 3
      expect(suggestions.containsKey('cat-salary'), isFalse);
    });

    test('anchors the window on the viewed month', () {
      // Viewing June back: only Mar+Apr+May feed the average — June rows
      // are the viewer's "future" and must not leak in.
      final suggestions = budgetSuggestions([
        _expense('t1', 'cat-food', 300000, '2026-04-10'),
        _expense('t2', 'cat-food', 600000, '2026-05-10'),
        _expense('t3', 'cat-food', 900000, '2026-06-10'),
      ], '2026-06-01');
      expect(suggestions['cat-food']?.amount, 300000); // 900k / 3
      expect(suggestions['cat-food']?.monthsWithData, 2);
    });

    test('averages under the floor produce no suggestion', () {
      final suggestions = budgetSuggestions([
        _expense('t1', 'cat-small', 15000, '2026-09-10'),
      ], '2026-10-01');
      // 15.000 / 3 = 5.000 — below the 10.000 ₫ signal floor.
      expect(suggestions.containsKey('cat-small'), isFalse);
    });
  });
}
