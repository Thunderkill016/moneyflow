import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/bulk.dart';
import 'package:moneyflow/domain/models.dart';

Transaction _tx(
  String id,
  TransactionKind kind, {
  int splitCount = 0,
  TransactionReviewStatus review = TransactionReviewStatus.reviewed,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'c',
  category: 'C',
  note: '',
  accountId: 'a',
  account: 'A',
  amount: 1000,
  occurredOn: '2026-10-01',
  splitCount: splitCount,
  reviewStatus: review,
);

void main() {
  group('bulkCategoryBlocker', () {
    test('same-kind plain rows can share a category', () {
      final sel = [
        _tx('1', TransactionKind.expense),
        _tx('2', TransactionKind.expense),
      ];
      expect(bulkCategoryBlocker(sel), isNull);
      expect(bulkCategoryKind(sel), TransactionKind.expense);
    });

    test('empty selection is blocked', () {
      expect(bulkCategoryBlocker(const []), isNotNull);
      expect(bulkCategoryKind(const []), isNull);
    });

    test('transfers have no category', () {
      expect(
        bulkCategoryBlocker([
          _tx('1', TransactionKind.expense),
          _tx('2', TransactionKind.transfer),
        ]),
        'Khoản chuyển không có danh mục',
      );
    });

    test('split rows are locked', () {
      expect(
        bulkCategoryBlocker([_tx('1', TransactionKind.expense, splitCount: 2)]),
        contains('chia danh mục'),
      );
    });

    test('mixed expense/income is blocked', () {
      expect(
        bulkCategoryBlocker([
          _tx('1', TransactionKind.expense),
          _tx('2', TransactionKind.income),
        ]),
        contains('cùng loại'),
      );
    });
  });

  test('needsReviewCount counts only needs_review rows', () {
    expect(
      needsReviewCount([
        _tx('1', TransactionKind.expense),
        _tx(
          '2',
          TransactionKind.expense,
          review: TransactionReviewStatus.needsReview,
        ),
        _tx(
          '3',
          TransactionKind.income,
          review: TransactionReviewStatus.needsReview,
        ),
      ]),
      2,
    );
  });
}
