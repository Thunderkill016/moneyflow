import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/report.dart';

Transaction tx(TransactionKind kind, int amount, {String category = 'X'}) =>
    Transaction(
      id: 't',
      kind: kind,
      categoryId: 'c',
      category: category,
      note: '',
      accountId: 'a',
      account: 'A',
      amount: amount,
      occurredOn: '2026-10-01',
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
    });
  });
}
