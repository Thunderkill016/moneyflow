import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/report.dart';

Transaction tx(
  TransactionKind kind,
  int amount, {
  String category = 'X',
  String account = 'A',
  String? payee,
}) => Transaction(
  id: 't',
  kind: kind,
  categoryId: 'c',
  category: category,
  note: '',
  accountId: 'a',
  account: account,
  amount: amount,
  occurredOn: '2026-10-01',
  payee: payee,
);

void main() {
  group('buildPeriodReport', () {
    test('sums income and expense, excludes transfers', () {
      final r = buildPeriodReport([
        tx(TransactionKind.income, 15000000),
        tx(TransactionKind.expense, 45000),
        tx(TransactionKind.expense, 32000),
        tx(TransactionKind.transfer, 500000),
      ]);
      expect(r.income, 15000000);
      expect(r.expense, 77000);
      expect(r.net, 14923000);
      expect(r.transactionCount, 4);
    });

    test(
      'savingsRatePercent mirrors web rounding; null when income is zero',
      () {
        // net/income = (1tr-700k)/1tr = 30%
        final withIncome = buildPeriodReport([
          tx(TransactionKind.income, 1000000),
          tx(TransactionKind.expense, 700000),
        ]);
        expect(withIncome.savingsRatePercent, 30);

        final noIncome = buildPeriodReport([tx(TransactionKind.expense, 1000)]);
        expect(noIncome.savingsRatePercent, isNull);

        // 1/3 -> 33% (Math.round equivalence)
        final third = buildPeriodReport([
          tx(TransactionKind.income, 3000),
          tx(TransactionKind.expense, 2000),
        ]);
        expect(third.savingsRatePercent, 33);
      },
    );

    test('category shares sorted desc with rounded percent', () {
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 50000, category: 'Ăn uống'),
        tx(TransactionKind.expense, 30000, category: 'Di chuyển'),
        tx(TransactionKind.expense, 20000, category: 'Khác'),
        tx(TransactionKind.income, 99000, category: 'Lương'),
      ]);
      expect(r.categories.map((c) => c.name), ['Ăn uống', 'Di chuyển', 'Khác']);
      expect(r.categories.map((c) => c.share), [50, 30, 20]);
    });

    test('empty period yields zeroed report with null rate', () {
      final r = buildPeriodReport(const []);
      expect(r.income, 0);
      expect(r.expense, 0);
      expect(r.net, 0);
      expect(r.transactionCount, 0);
      expect(r.savingsRatePercent, isNull);
      expect(r.categories, isEmpty);
      expect(r.incomeCategories, isEmpty);
      expect(r.payees, isEmpty);
      expect(r.accounts, isEmpty);
    });
  });

  group('buildPeriodReport breakdowns', () {
    test('income groups by category with shares of total income', () {
      final r = buildPeriodReport([
        tx(TransactionKind.income, 12000000, category: 'Lương'),
        tx(TransactionKind.income, 3000000, category: 'Thưởng'),
        // An expense under the same name must not join the income split.
        tx(TransactionKind.expense, 500000, category: 'Lương'),
      ]);
      expect(r.incomeCategories.map((c) => c.name), ['Lương', 'Thưởng']);
      expect(r.incomeCategories.map((c) => c.amount), [12000000, 3000000]);
      expect(r.incomeCategories.map((c) => c.share), [80, 20]);
      // The expense still lands in the expense breakdown.
      expect(r.categories.map((c) => c.name), ['Lương']);
    });

    test('payee-less expenses group under the honest "Không tên" bucket', () {
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 50000, payee: 'Quán gần nhà'),
        tx(TransactionKind.expense, 30000), // no payee
        tx(TransactionKind.expense, 20000, payee: '   '), // blank = unnamed
        tx(TransactionKind.income, 90000, payee: 'Công ty'),
      ]);
      // Income rows never join the payee (expense) section; the 50k/50k
      // tie resolves by name so the order is deterministic.
      expect(r.payees.map((c) => c.name), ['Không tên', 'Quán gần nhà']);
      expect(r.payees.map((c) => c.amount), [50000, 50000]);
      // Shares divide by total expense (100.000), sorted desc.
      expect(r.payees.map((c) => c.share), [50, 50]);
    });

    test('expense groups by the account it left from', () {
      final r = buildPeriodReport([
        tx(TransactionKind.expense, 70000, account: 'Tiền mặt'),
        tx(TransactionKind.expense, 30000, account: 'Ví MoMo'),
        tx(TransactionKind.income, 15000000, account: 'Ngân hàng VCB'),
        tx(TransactionKind.transfer, 500000, account: 'Ngân hàng VCB'),
      ]);
      // Only expense rows — a transfer out of VCB must not inflate it.
      expect(r.accounts.map((c) => c.name), ['Tiền mặt', 'Ví MoMo']);
      expect(r.accounts.map((c) => c.share), [70, 30]);
    });

    test('transfers never appear in any breakdown', () {
      final r = buildPeriodReport([
        tx(
          TransactionKind.transfer,
          500000,
          category: 'Chuyển khoản',
          account: 'VCB',
          payee: 'Me',
        ),
      ]);
      expect(r.categories, isEmpty);
      expect(r.incomeCategories, isEmpty);
      expect(r.payees, isEmpty);
      expect(r.accounts, isEmpty);
      expect(r.transactionCount, 1); // the row still counts as activity
    });
  });

  group('MonthPeriod', () {
    test('bounds cover the whole calendar month', () {
      final p = MonthPeriod(2026, 10);
      expect(p.from, '2026-10-01');
      expect(p.to, '2026-11-01');
      expect(p.label, 'Tháng 10/2026');
    });

    test('prev crosses the year boundary', () {
      final prev = MonthPeriod(2026, 1).prev;
      expect(prev.from, '2025-12-01');
      expect(prev.to, '2026-01-01');
      expect(prev.label, 'Tháng 12/2025');
    });

    test('next is null while viewing the current month', () {
      final today = DateTime(2026, 10, 15);
      expect(MonthPeriod(2026, 10).next(today), isNull);
      final next = MonthPeriod(2026, 9).next(today);
      expect(next?.from, '2026-10-01');
      expect(next?.to, '2026-11-01');
    });
  });

  group('CustomPeriod', () {
    test('label names the picked dates like the web', () {
      expect(
        const CustomPeriod('2026-10-05', '2026-10-20').label,
        '5/10 – 20/10/2026',
      );
      // Different years keep both years on the label.
      expect(
        const CustomPeriod('2025-12-28', '2026-01-03').label,
        '28/12/2025 – 3/1/2026',
      );
    });

    test('bounds are inclusive-from / exclusive-to', () {
      const p = CustomPeriod('2026-10-05', '2026-10-07');
      expect(p.from, '2026-10-05');
      expect(p.to, '2026-10-08');
      expect(p.spanDays, 3);
    });

    test('prev/next shift by the window span', () {
      const p = CustomPeriod('2026-10-05', '2026-10-07');
      final prev = p.prev;
      expect(prev.from, '2026-10-02');
      expect(prev.to, '2026-10-05'); // exclusive: ends on the 4th
      final next = p.next(DateTime(2026, 10, 20))!;
      expect(next.from, '2026-10-08');
      expect(next.to, '2026-10-11');
    });

    test('next clamps to today and is null when fully future', () {
      const p = CustomPeriod('2026-10-01', '2026-10-10');
      final next = p.next(DateTime(2026, 10, 15))!;
      expect(next.from, '2026-10-11');
      expect(next.to, '2026-10-16'); // clamped: the 15th inclusive
      expect(p.next(DateTime(2026, 10, 10)), isNull);
    });
  });
}
