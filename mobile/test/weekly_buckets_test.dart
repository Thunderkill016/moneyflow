import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/weekly_buckets.dart';

Transaction _tx(
  String id,
  TransactionKind kind,
  int amount,
  String on, {
  int splitCount = 0,
  bool isRefund = false,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'c',
  category: 'X',
  note: '',
  accountId: 'a',
  account: 'A',
  amount: amount,
  occurredOn: on,
  splitCount: splitCount,
  isRefund: isRefund,
);

void main() {
  group('weeklyIncomeExpense windows', () {
    test('a 31-day month yields five week slices with day labels', () {
      final b = weeklyIncomeExpense(const [], '2026-10-01', '2026-11-01');
      expect(b.map((x) => x.label), ['1–7', '8–14', '15–21', '22–28', '29–31']);
      expect(b.every((x) => x.income == 0 && x.expense == 0), isTrue);
    });

    test('a 28-day month yields four slices', () {
      final b = weeklyIncomeExpense(const [], '2026-02-01', '2026-03-01');
      expect(b.map((x) => x.label), ['1–7', '8–14', '15–21', '22–28']);
    });

    test('weeks crossing a month boundary label by their first day', () {
      // 14-day custom window starting Jan 26 — the first bucket spans
      // Jan 26 → Feb 1, so "26/1" names it (a bare "26–1" would mislead);
      // the second stays inside February and keeps the day-range form.
      final b = weeklyIncomeExpense(const [], '2026-01-26', '2026-02-09');
      expect(b.map((x) => x.label), ['26/1', '2–8']);
    });

    test('long custom windows cap at twelve groups covering the span', () {
      // 100 days → 12 equal 9-day spans (12*9 = 108 ≥ 100).
      final b = weeklyIncomeExpense(const [], '2026-01-01', '2026-04-11');
      expect(b, hasLength(maxWeeklyGroups));
      expect(b.first.label, '1–9');
    });

    test('an empty or reversed window returns nothing', () {
      expect(
        weeklyIncomeExpense(const [], '2026-10-01', '2026-10-01'),
        isEmpty,
      );
    });
  });

  group('weeklyIncomeExpense totals', () {
    test('boundary days land in the right week', () {
      final b = weeklyIncomeExpense(
        [
          _tx('d7', TransactionKind.expense, 700, '2026-10-07'),
          _tx('d8', TransactionKind.expense, 800, '2026-10-08'),
        ],
        '2026-10-01',
        '2026-11-01',
      );
      expect(b[0].expense, 700);
      expect(b[1].expense, 800);
      expect(b.sublist(2).every((x) => x.expense == 0), isTrue);
    });

    test('rows outside the window are ignored; `to` is exclusive', () {
      final b = weeklyIncomeExpense(
        [
          _tx('before', TransactionKind.income, 100, '2026-09-30'),
          _tx('edge', TransactionKind.income, 200, '2026-11-01'),
          _tx('inside', TransactionKind.income, 300, '2026-10-31'),
        ],
        '2026-10-01',
        '2026-11-01',
      );
      expect(b.last.income, 300);
      expect(b.fold<int>(0, (s, x) => s + x.income), 300);
    });

    test('transfers never count; a split counts once at the parent row', () {
      final b = weeklyIncomeExpense(
        [
          _tx('tr', TransactionKind.transfer, 500000, '2026-10-03'),
          // The feed carries the parent amount — buildPeriodReport sums
          // it once; the chart must not expand split lines.
          _tx(
            'split',
            TransactionKind.expense,
            90000,
            '2026-10-03',
            splitCount: 2,
          ),
        ],
        '2026-10-01',
        '2026-11-01',
      );
      expect(b[0].expense, 90000);
      expect(b[0].income, 0);
    });

    test('D15 a refund nets that week\'s Chi, never its Thu', () {
      final b = weeklyIncomeExpense(
        [
          _tx('e', TransactionKind.expense, 100000, '2026-10-03'),
          _tx('r', TransactionKind.income, 30000, '2026-10-04', isRefund: true),
          _tx('i', TransactionKind.income, 50000, '2026-10-05'),
        ],
        '2026-10-01',
        '2026-11-01',
      );
      expect(b[0].expense, 70000); // 100k spend − 30k refund
      expect(b[0].income, 50000); // salary only — refund is not Thu
    });

    test('empty weeks still appear between active ones', () {
      final b = weeklyIncomeExpense(
        [
          _tx('w1', TransactionKind.expense, 100, '2026-10-01'),
          _tx('w5', TransactionKind.income, 900, '2026-10-31'),
        ],
        '2026-10-01',
        '2026-11-01',
      );
      expect(b, hasLength(5));
      expect(b[0].expense, 100);
      expect(b[3].income, 0);
      expect(b[4].income, 900);
    });
  });
}
