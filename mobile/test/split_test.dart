import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/split.dart';

void main() {
  group('validateSplit', () {
    test('accepts two distinct categories with positive amounts', () {
      expect(
        validateSplit([
          (categoryId: 'a', amount: 30000),
          (categoryId: 'b', amount: 20000),
        ]),
        isNull,
      );
    });

    test('rejects fewer than two lines', () {
      expect(validateSplit([]), isNotNull);
      expect(validateSplit([(categoryId: 'a', amount: 1)]), isNotNull);
    });

    test('rejects more than the RPC cap', () {
      final lines = [
        for (var i = 0; i <= maxSplitLines; i++)
          (categoryId: 'c$i', amount: 1000),
      ];
      expect(validateSplit(lines), contains('Tối đa'));
      expect(validateSplit(lines.take(maxSplitLines).toList()), isNull);
    });

    test('rejects a missing category', () {
      expect(
        validateSplit([
          (categoryId: 'a', amount: 1000),
          (categoryId: null, amount: 1000),
        ]),
        'Chọn danh mục cho mọi dòng',
      );
    });

    test('rejects missing, zero or negative amounts', () {
      for (final bad in [null, 0, -5]) {
        expect(
          validateSplit([
            (categoryId: 'a', amount: 1000),
            (categoryId: 'b', amount: bad),
          ]),
          'Số tiền mỗi dòng phải lớn hơn 0',
        );
      }
    });

    test('rejects duplicate categories', () {
      expect(
        validateSplit([
          (categoryId: 'a', amount: 1000),
          (categoryId: 'a', amount: 2000),
        ]),
        'Mỗi danh mục chỉ dùng một dòng',
      );
    });
  });

  test('splitTotal sums integer đồng', () {
    expect(
      splitTotal([
        (categoryId: 'a', amount: 45000),
        (categoryId: 'b', amount: 25500),
      ]),
      70500,
    );
    expect(splitTotal(const []), 0);
  });
}
