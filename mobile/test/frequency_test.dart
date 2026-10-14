import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/frequency.dart';
import 'package:moneyflow/domain/models.dart';

Transaction _tx(
  String id,
  TransactionKind kind,
  String categoryId,
  String occurredOn,
) => Transaction(
  id: id,
  kind: kind,
  categoryId: categoryId,
  category: '',
  note: '',
  accountId: 'a1',
  account: '',
  amount: 1000,
  occurredOn: occurredOn,
);

void main() {
  group('frequentCategoryIds', () {
    test('ranks by usage count, most used first', () {
      final txs = [
        _tx('1', TransactionKind.expense, 'cat-a', '2026-10-01'),
        _tx('2', TransactionKind.expense, 'cat-b', '2026-10-02'),
        _tx('3', TransactionKind.expense, 'cat-a', '2026-10-03'),
        _tx('4', TransactionKind.expense, 'cat-a', '2026-10-04'),
        _tx('5', TransactionKind.expense, 'cat-b', '2026-10-05'),
      ];
      expect(frequentCategoryIds(txs, TransactionKind.expense), [
        'cat-a',
        'cat-b',
      ]);
    });

    test('ties break toward the most recent occurredOn', () {
      final txs = [
        _tx('1', TransactionKind.expense, 'cat-old', '2026-10-01'),
        _tx('2', TransactionKind.expense, 'cat-new', '2026-10-09'),
      ];
      expect(frequentCategoryIds(txs, TransactionKind.expense), [
        'cat-new',
        'cat-old',
      ]);
    });

    test('other kinds never leak in — income excludes expense ids', () {
      final txs = [
        _tx('1', TransactionKind.expense, 'cat-food', '2026-10-01'),
        _tx('2', TransactionKind.income, 'cat-salary', '2026-10-02'),
      ];
      expect(frequentCategoryIds(txs, TransactionKind.income), ['cat-salary']);
      expect(frequentCategoryIds(txs, TransactionKind.expense), ['cat-food']);
    });

    test('transfers carry no category signal', () {
      final txs = [
        _tx('1', TransactionKind.transfer, 'cat-x', '2026-10-01'),
        _tx('2', TransactionKind.transfer, 'cat-x', '2026-10-02'),
      ];
      expect(frequentCategoryIds(txs, TransactionKind.expense), isEmpty);
      expect(frequentCategoryIds(txs, TransactionKind.transfer), isEmpty);
    });

    test('limit caps the ranked list', () {
      final txs = [
        for (var i = 0; i < 12; i++)
          _tx('t$i', TransactionKind.expense, 'cat-$i', '2026-10-01'),
      ];
      expect(
        frequentCategoryIds(txs, TransactionKind.expense, limit: 8),
        hasLength(8),
      );
    });

    test('empty feed ranks nothing', () {
      expect(frequentCategoryIds(const [], TransactionKind.expense), isEmpty);
    });
  });
}
