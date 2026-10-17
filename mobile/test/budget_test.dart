import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/budget.dart';
import 'package:moneyflow/domain/models.dart';

BudgetProgress _bp(
  String categoryId,
  String monthStart,
  int limitMinor,
  int spentMinor, {
  BudgetPeriod period = BudgetPeriod.monthly,
}) => BudgetProgress(
  id: 'bp-$categoryId-$monthStart-${period.key}',
  categoryId: categoryId,
  categoryName: categoryId,
  monthStart: monthStart,
  limitMinor: limitMinor,
  spentMinor: spentMinor,
  period: period,
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
      expect(rollover.periodsIncluded, 2);
    });

    test('underspend carries positive; overspend carries negative', () {
      final under = budgetRollover(
        priorBudgets: [_bp('cat-food', '2026-09-01', 2000000, 1500000)],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(under.carry, 500000);
      expect(under.periodsIncluded, 1);

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
      expect(rollover.periodsIncluded, 1);
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
      expect(rollover.periodsIncluded, 0);
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
          const BudgetRollover(carry: 0, periodsIncluded: 2),
          fmt,
        ),
        isNull,
      );
    });

    test('names the carry direction and the month span', () {
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: 300000, periodsIncluded: 1),
          fmt,
        ),
        'Chuyển từ tháng trước: +300000₫',
      );
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: -300000, periodsIncluded: 1),
          fmt,
        ),
        'Trừ vì vượt hạn mức tháng trước: −300000₫',
      );
      // Netting three months is not "tháng trước" — the label says so.
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: 100, periodsIncluded: 3),
          fmt,
        ),
        'Chuyển từ 3 tháng trước đó: +100₫',
      );
    });
  });

  group('budgetAlerts', () {
    test('no rows for the month means no alerts', () {
      expect(
        budgetAlerts([
          _bp('cat-food', '2026-09-01', 2000000, 5000000),
        ], monthStart: '2026-10-01'),
        isEmpty,
      );
    });

    test('rows under 80% stay quiet — the card is not a noise feed', () {
      // 395.000 * 5 = 1.975.000 < 500.000 * 4 = 2.000.000.
      expect(
        budgetAlerts([
          _bp('cat-food', '2026-10-01', 500000, 395000),
        ], monthStart: '2026-10-01'),
        isEmpty,
      );
    });

    test('exactly 80% alerts nearLimit with the remaining headroom', () {
      final alerts = budgetAlerts([
        _bp('cat-food', '2026-10-01', 500000, 400000),
      ], monthStart: '2026-10-01');
      expect(alerts, hasLength(1));
      expect(alerts.single.state, BudgetState.nearLimit);
      expect(alerts.single.amountMinor, 100000);
      expect(alerts.single.categoryName, 'cat-food');
    });

    test('past the limit alerts over with the overshoot amount', () {
      final alerts = budgetAlerts([
        _bp('cat-food', '2026-10-01', 500000, 532000),
      ], monthStart: '2026-10-01');
      expect(alerts.single.state, BudgetState.over);
      expect(alerts.single.amountMinor, 32000);
    });

    test('exactly at the limit reads nearLimit ("còn 0"), not over', () {
      final alerts = budgetAlerts([
        _bp('cat-food', '2026-10-01', 500000, 500000),
      ], monthStart: '2026-10-01');
      expect(alerts.single.state, BudgetState.nearLimit);
      expect(alerts.single.amountMinor, 0);
    });

    test('prior-month carry can push an on-limit row into over — the '
        'same math the Kế hoạch tile renders', () {
      // Own month: 400.000 / 500.000 = 80% → near on raw figures. The
      // −200.000 carried overspend drops the effective limit to 300.000
      // → over by 100.000. An alert that ignored the carry would say
      // "sắp tới" where planning already says "vượt".
      final alerts = budgetAlerts([
        _bp('cat-food', '2026-10-01', 500000, 400000),
        _bp('cat-food', '2026-09-01', 500000, 700000),
      ], monthStart: '2026-10-01');
      expect(alerts.single.state, BudgetState.over);
      expect(alerts.single.amountMinor, 100000);
    });

    test('a positive carry can lift an over row back to near', () {
      // Over on raw figures (532 > 500) but +100.000 carried underspend
      // raises the effective limit to 600.000 → 68.000 left → near.
      final alerts = budgetAlerts([
        _bp('cat-food', '2026-10-01', 500000, 532000),
        _bp('cat-food', '2026-09-01', 500000, 400000),
      ], monthStart: '2026-10-01');
      expect(alerts.single.state, BudgetState.nearLimit);
      expect(alerts.single.amountMinor, 68000);
    });

    test('prior-month rows never alert for themselves', () {
      final alerts = budgetAlerts([
        _bp('cat-food', '2026-09-01', 500000, 900000),
      ], monthStart: '2026-10-01');
      expect(alerts, isEmpty);
    });

    test('ordering: over rows first by breach size, then near by '
        'tightest headroom, ties on name', () {
      final alerts = budgetAlerts([
        _bp('cat-bills', '2026-10-01', 500000, 480000), // near, còn 20k
        _bp('cat-food', '2026-10-01', 500000, 550000), // over 50k
        _bp('cat-fun', '2026-10-01', 500000, 800000), // over 300k
        _bp('cat-transport', '2026-10-01', 500000, 450000), // near 50k
        _bp('cat-calm', '2026-10-01', 500000, 100000), // ok — excluded
      ], monthStart: '2026-10-01');
      expect(alerts.map((a) => a.categoryId), [
        'cat-fun', // over 300k first
        'cat-food', // over 50k
        'cat-bills', // near, tightest headroom (20k)
        'cat-transport', // near, 50k
      ]);
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

  group('averageMonthlyIncome', () {
    test('sums income over the 3 completed months, divides by all of them', () {
      final avg = averageMonthlyIncome([
        _expense(
          'i1',
          'cat-salary',
          15000000,
          '2026-07-05',
          kind: TransactionKind.income,
        ),
        _expense(
          'i2',
          'cat-salary',
          15000000,
          '2026-08-05',
          kind: TransactionKind.income,
        ),
        _expense(
          'i3',
          'cat-salary',
          15000000,
          '2026-09-05',
          kind: TransactionKind.income,
        ),
      ], '2026-10-01');
      expect(avg, 15000000);
    });

    test('a quiet month still divides — real evidence, not missing data', () {
      final avg = averageMonthlyIncome([
        _expense(
          'i1',
          'cat-salary',
          15000000,
          '2026-09-05',
          kind: TransactionKind.income,
        ),
      ], '2026-10-01');
      expect(avg, 5000000); // 15.000.000 / 3
    });

    test('expense and transfer rows never feed the basis', () {
      final avg = averageMonthlyIncome([
        _expense('e1', 'cat-food', 900000, '2026-08-10'),
        _expense(
          'x1',
          'cat-transfer',
          5000000,
          '2026-09-10',
          kind: TransactionKind.transfer,
        ),
      ], '2026-10-01');
      expect(avg, 0);
    });

    test('the viewed month never leaks into its own basis', () {
      // Anchored on October: October rows are "future" to the window —
      // the month is still earning, so it cannot flatter the average.
      final avg = averageMonthlyIncome([
        _expense(
          'i1',
          'cat-salary',
          90000000,
          '2026-10-05',
          kind: TransactionKind.income,
        ),
      ], '2026-10-01');
      expect(avg, 0);
    });
  });

  // -- D12: weekly budget periods --------------------------------------------
  // Civil facts asserted here: 2026-10-12 is a Monday (week 10-12..10-18);
  // 2026-10-13 is a Tuesday; 2026-12-28 is a Monday whose week ends
  // 2027-01-03 — the year-straddling label case.
  group('budgetPeriodStart', () {
    test('monthly anchors on the 1st of the containing month', () {
      expect(
        budgetPeriodStart(DateTime(2026, 10, 17), BudgetPeriod.monthly),
        '2026-10-01',
      );
    });

    test('weekly anchors on the Monday of the containing week', () {
      // Sunday belongs to the week that STARTED the prior Monday.
      expect(
        budgetPeriodStart(DateTime(2026, 10, 18), BudgetPeriod.weekly),
        '2026-10-12',
      );
      expect(
        budgetPeriodStart(DateTime(2026, 10, 12), BudgetPeriod.weekly),
        '2026-10-12',
      );
    });
  });

  group('shiftBudgetPeriod', () {
    test('weekly shifts in 7-day steps across month and year edges', () {
      expect(
        shiftBudgetPeriod('2026-10-12', BudgetPeriod.weekly, 1),
        '2026-10-19',
      );
      expect(
        shiftBudgetPeriod('2026-10-12', BudgetPeriod.weekly, -1),
        '2026-10-05',
      );
      expect(
        shiftBudgetPeriod('2026-12-28', BudgetPeriod.weekly, 1),
        '2027-01-04',
      );
    });

    test('monthly delegates to shiftBudgetMonth', () {
      expect(
        shiftBudgetPeriod('2026-12-01', BudgetPeriod.monthly, 1),
        '2027-01-01',
      );
    });

    test('a non-Monday weekly anchor throws like the RPC does', () {
      expect(
        () => shiftBudgetPeriod('2026-10-13', BudgetPeriod.weekly, 0),
        throwsFormatException,
      );
      expect(
        () => shiftBudgetPeriod('not-a-date', BudgetPeriod.weekly, 0),
        throwsFormatException,
      );
    });
  });

  group('budgetPeriodEnd / budgetPeriodPace / budgetPeriodLabel', () {
    test('the end anchor is the next period start — exclusive bound', () {
      expect(budgetPeriodEnd('2026-10-12', BudgetPeriod.weekly), '2026-10-19');
      expect(budgetPeriodEnd('2026-10-01', BudgetPeriod.monthly), '2026-11-01');
    });

    test('weekly pace counts today inside the week', () {
      // Monday itself reads 1/7 — never 0 like a not-yet-started month.
      expect(
        budgetPeriodPace(
          '2026-10-12',
          BudgetPeriod.weekly,
          DateTime(2026, 10, 12),
        ),
        closeTo(1 / 7, 1e-9),
      );
      expect(
        budgetPeriodPace(
          '2026-10-12',
          BudgetPeriod.weekly,
          DateTime(2026, 10, 18),
        ),
        1,
      );
      // A future week is 0, a past week 1.
      expect(
        budgetPeriodPace(
          '2026-10-19',
          BudgetPeriod.weekly,
          DateTime(2026, 10, 12),
        ),
        0,
      );
      expect(
        budgetPeriodPace(
          '2026-10-05',
          BudgetPeriod.weekly,
          DateTime(2026, 10, 12),
        ),
        1,
      );
    });

    test('labels: month, week, and a year-straddling week', () {
      expect(
        budgetPeriodLabel('2026-10-01', BudgetPeriod.monthly),
        'tháng 10/2026',
      );
      expect(
        budgetPeriodLabel('2026-10-12', BudgetPeriod.weekly),
        'tuần 12/10 – 18/10/2026',
      );
      // 2026-12-28..2027-01-03 — both ends carry their year.
      expect(
        budgetPeriodLabel('2026-12-28', BudgetPeriod.weekly),
        'tuần 28/12/2026 – 3/1/2027',
      );
    });

    test('the noun is the cadence word copy builds phrases from', () {
      expect(budgetPeriodNoun(BudgetPeriod.monthly), 'tháng');
      expect(budgetPeriodNoun(BudgetPeriod.weekly), 'tuần');
    });
  });

  group('weekly rollover / alerts / carry-forward', () {
    test('a weekly carry nets prior WEEKS only — monthly rows never mix', () {
      final rollover = budgetRollover(
        priorBudgets: [
          // Prior week 10-05: underspent +100k.
          _bp(
            'cat-food',
            '2026-10-05',
            600000,
            500000,
            period: BudgetPeriod.weekly,
          ),
          // Same-Monday-anchored MONTHLY row for 10-01 — different
          // cadence, different window; it must not leak into the week.
          _bp('cat-food', '2026-10-01', 2000000, 100),
          // The viewed week itself — never self-carries.
          _bp(
            'cat-food',
            '2026-10-12',
            600000,
            50000,
            period: BudgetPeriod.weekly,
          ),
          // Outside the 12-week window — 2026-07-13 is 13 weeks back.
          _bp(
            'cat-food',
            '2026-07-06',
            600000,
            100,
            period: BudgetPeriod.weekly,
          ),
        ],
        categoryId: 'cat-food',
        monthStart: '2026-10-12',
        period: BudgetPeriod.weekly,
      );
      expect(rollover.carry, 100000);
      expect(rollover.periodsIncluded, 1);
    });

    test('a monthly call ignores weekly rows in the same list', () {
      final rollover = budgetRollover(
        priorBudgets: [
          _bp('cat-food', '2026-09-01', 2000000, 1700000),
          _bp(
            'cat-food',
            '2026-09-28',
            600000,
            100,
            period: BudgetPeriod.weekly,
          ),
        ],
        categoryId: 'cat-food',
        monthStart: '2026-10-01',
      );
      expect(rollover.carry, 300000);
      expect(rollover.periodsIncluded, 1);
    });

    test('the rollover label speaks in weeks on the weekly surface', () {
      String fmt(int v) => '$v₫';
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: 60000, periodsIncluded: 1),
          fmt,
          period: BudgetPeriod.weekly,
        ),
        'Chuyển từ tuần trước: +60000₫',
      );
      expect(
        budgetRolloverLabel(
          const BudgetRollover(carry: -40000, periodsIncluded: 2),
          fmt,
          period: BudgetPeriod.weekly,
        ),
        'Trừ vì vượt hạn mức 2 tuần trước đó: −40000₫',
      );
    });

    test('budgetAlerts on the weekly period reads weekly rows only', () {
      final alerts = budgetAlerts(
        [
          // Weekly row over its limit — the alert target.
          _bp(
            'cat-food',
            '2026-10-12',
            150000,
            172000,
            period: BudgetPeriod.weekly,
          ),
          // A same-anchor-ish monthly row must not alert here nor feed
          // the weekly carry (it is over its own limit — if it leaked,
          // it would double-count as a second alert).
          _bp('cat-food', '2026-10-01', 500000, 600000),
        ],
        monthStart: '2026-10-12',
        period: BudgetPeriod.weekly,
      );
      // With no prior weekly rows the carry is 0: 172k − 150k = 22k over.
      expect(alerts.single.state, BudgetState.over);
      expect(alerts.single.amountMinor, 22000);
    });

    test('a monthly alerts call never sees the weekly row', () {
      final alerts = budgetAlerts([
        _bp(
          'cat-food',
          '2026-10-12',
          150000,
          172000,
          period: BudgetPeriod.weekly,
        ),
      ], monthStart: '2026-10-01');
      expect(alerts, isEmpty);
    });

    test('carry-forward proposes last week\'s limits for the viewed week', () {
      final drafts = budgetsToCarryForward(
        previousBudgets: [
          _bp(
            'cat-food',
            '2026-10-05',
            600000,
            500000,
            period: BudgetPeriod.weekly,
          ),
          // Last MONTH's monthly limit is not a weekly carry source.
          _bp('cat-food', '2026-09-01', 2000000, 100),
        ],
        currentBudgets: const [],
        monthStart: '2026-10-12',
        period: BudgetPeriod.weekly,
      );
      expect(drafts, hasLength(1));
      expect(drafts.single.monthStart, '2026-10-12');
      expect(drafts.single.limitMinor, 600000);
      expect(drafts.single.period, BudgetPeriod.weekly);
    });
  });
}
