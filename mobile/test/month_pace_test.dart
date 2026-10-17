import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/month_pace.dart';

BudgetProgress _budget({
  required int limitMinor,
  String monthStart = '2026-10-01',
  BudgetPeriod period = BudgetPeriod.monthly,
}) => BudgetProgress(
  id: 'b1',
  categoryId: 'cat-1',
  categoryName: 'Ăn uống',
  monthStart: monthStart,
  limitMinor: limitMinor,
  spentMinor: 0,
  period: period,
);

Transaction _tx(
  String day, {
  int amount = 100000,
  TransactionKind kind = TransactionKind.expense,
  bool refund = false,
  String? occurredOn,
}) => Transaction(
  id: 'tx-$day-$amount-${kind.name}-$refund-${occurredOn ?? ''}',
  kind: kind,
  categoryId: 'cat-1',
  category: 'Ăn uống',
  note: '',
  accountId: 'acc-1',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: occurredOn ?? '2026-10-$day',
  isRefund: refund,
);

void main() {
  final today = DateTime(2026, 10, 16); // Oct has 31 days, day 16 elapsed

  test('no monthly budget → null', () {
    expect(buildMonthPace(rows: const [], budgets: const [], today: today), isNull);
    expect(
      buildMonthPace(
        rows: const [],
        budgets: [
          _budget(
            limitMinor: 7000000,
            monthStart: '2026-10-12',
            period: BudgetPeriod.weekly,
          ),
        ],
        today: today,
      ),
      isNull,
    );
    expect(
      buildMonthPace(
        rows: const [],
        budgets: [_budget(limitMinor: 3100000, monthStart: '2026-09-01')],
        today: today,
      ),
      isNull,
    );
  });

  test('cumulative sums expense per day, refunds net, transfers skip', () {
    final pace = buildMonthPace(
      rows: [
        _tx('01', amount: 500000),
        _tx('01', amount: 200000),
        _tx('03', amount: 300000),
        _tx('05', kind: TransactionKind.income, amount: 400000, refund: true),
        _tx('07', kind: TransactionKind.transfer, amount: 900000),
        _tx('20', amount: 999000), // future day — out of the MTD window
        _tx('01', amount: 100000, occurredOn: '2026-09-01'),
      ],
      budgets: [_budget(limitMinor: 31000000)],
      today: today,
    );
    expect(pace, isNotNull);
    expect(pace!.daysInMonth, 31);
    expect(pace.elapsedDays, 16);
    expect(pace.cumulativeMinor.length, 16);
    expect(pace.cumulativeMinor[0], 700000); // day 1: two expenses
    expect(pace.cumulativeMinor[2], 1000000); // day 3 adds 300k
    expect(pace.cumulativeMinor[4], 600000); // day 5: −400k refund
    expect(pace.cumulativeMinor[15], 600000); // flat after last activity
    expect(pace.actualToDateMinor, 600000);
  });

  test('ideal line is limit × elapsed ÷ daysInMonth, floored', () {
    final pace = buildMonthPace(
      rows: const [],
      budgets: [_budget(limitMinor: 3100000)],
      today: today,
    );
    // 3.1M × 16 ÷ 31 = 1,600,000 exactly.
    expect(pace!.idealToDateMinor, 1600000);
    expect(pace.budgetLimitMinor, 3100000);
  });

  test('status bands: over above +10%, on inside, under below −10%', () {
    MonthPaceStatus? statusFor(int actual) => buildMonthPace(
      rows: [_tx('01', amount: actual)],
      budgets: [_budget(limitMinor: 3100000)],
      today: today,
    )!.status;

    // Ideal at day 16 = 1,600,000 → bands: under <1.44M, on ≤1.76M, over >1.76M.
    expect(statusFor(1430000), MonthPaceStatus.under);
    expect(statusFor(1600000), MonthPaceStatus.on);
    expect(statusFor(1760000), MonthPaceStatus.on); // exactly +10% still on
    expect(statusFor(1770000), MonthPaceStatus.over);
  });

  test('day 1 of the month reads pace against one ideal day', () {
    final first = DateTime(2026, 10, 1);
    final pace = buildMonthPace(
      rows: [_tx('01', amount: 150000)],
      budgets: [_budget(limitMinor: 3100000)],
      today: first,
    );
    expect(pace!.elapsedDays, 1);
    expect(pace.idealToDateMinor, 100000); // 3.1M ÷ 31
    expect(pace.status, MonthPaceStatus.over); // 150k > 110k
  });

  test('status labels are words, never colour-only', () {
    expect(monthPaceStatusLabel(MonthPaceStatus.over), 'Nhanh hơn nhịp');
    expect(monthPaceStatusLabel(MonthPaceStatus.on), 'Đúng nhịp tháng');
    expect(monthPaceStatusLabel(MonthPaceStatus.under), 'Chậm hơn nhịp');
  });
}
