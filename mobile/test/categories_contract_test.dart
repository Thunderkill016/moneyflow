import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/categories.dart';
import 'package:moneyflow/domain/models.dart';

const _food = Category(
  id: 'c1',
  name: 'Ăn uống',
  kind: TransactionKind.expense,
);
const _salary = Category(
  id: 'c2',
  name: 'Ăn uống',
  kind: TransactionKind.income,
);

void main() {
  group('normalizeCategoryName (parity with src/lib/categories.ts)', () {
    test('trims and collapses internal whitespace', () {
      expect(normalizeCategoryName('  Cà phê  '), 'Cà phê');
      expect(normalizeCategoryName('Cà   phê'), 'Cà phê');
      expect(normalizeCategoryName('Cà\tphê\nsáng'), 'Cà phê sáng');
      expect(normalizeCategoryName('   '), '');
    });
  });

  group('isValidCategoryName', () {
    test('bounds are 1..60 after normalize', () {
      expect(isValidCategoryName(''), isFalse);
      expect(isValidCategoryName('   '), isFalse);
      expect(isValidCategoryName('A' * 60), isTrue);
      expect(isValidCategoryName('A' * 61), isFalse);
    });
  });

  group('isCategoryNameUnique', () {
    test('uniqueness is per kind — same name may exist on the other kind', () {
      expect(
        isCategoryNameUnique('Ăn uống', TransactionKind.expense, [
          _food,
          _salary,
        ]),
        isFalse,
      );
      // Income "Ăn uống" exists already, so a second one is still blocked.
      expect(
        isCategoryNameUnique('Ăn uống', TransactionKind.income, [
          _food,
          _salary,
        ]),
        isFalse,
      );
      expect(
        isCategoryNameUnique('Quà tặng', TransactionKind.expense, [_food]),
        isTrue,
      );
    });

    test('normalizes before comparing and excludes the edited row', () {
      expect(
        isCategoryNameUnique('Ăn   uống', TransactionKind.expense, [_food]),
        isFalse,
      );
      expect(
        isCategoryNameUnique('Ăn uống', TransactionKind.expense, [
          _food,
        ], excludeId: 'c1'),
        isTrue,
      );
    });
  });

  group('validateCategoryDraft', () {
    CategoryDraft draft({
      String? id,
      String name = 'Mới',
      TransactionKind kind = TransactionKind.expense,
    }) => (id: id, name: name, kind: kind, icon: 'spark', color: 'violet');

    test('rejects a non-writable kind', () {
      expect(
        validateCategoryDraft(draft(kind: TransactionKind.transfer), const []),
        'Loại danh mục chưa hợp lệ.',
      );
    });

    test('rejects empty and overlong names', () {
      expect(
        validateCategoryDraft(draft(name: '  '), const []),
        'Tên danh mục cần từ 1 đến 60 ký tự.',
      );
      expect(
        validateCategoryDraft(draft(name: 'A' * 61), const []),
        'Tên danh mục cần từ 1 đến 60 ký tự.',
      );
    });

    test('duplicate messages name the kind like the web', () {
      expect(
        validateCategoryDraft(draft(name: 'Ăn uống'), [_food]),
        'Đã có danh mục chi tiêu cùng tên.',
      );
      expect(
        validateCategoryDraft(
          draft(name: 'Ăn uống', kind: TransactionKind.income),
          [_salary],
        ),
        'Đã có danh mục thu nhập cùng tên.',
      );
    });

    test('edit of the same row to the same name passes', () {
      expect(
        validateCategoryDraft(draft(id: 'c1', name: 'Ăn uống'), [_food]),
        isNull,
      );
    });
  });

  group('defaultCategoryMeta', () {
    test('matches the web defaults', () {
      expect(defaultCategoryMeta(TransactionKind.income), (
        icon: 'wallet',
        color: 'green',
      ));
      expect(defaultCategoryMeta(TransactionKind.expense), (
        icon: 'spark',
        color: 'violet',
      ));
    });
  });

  group('categoryErrorMessage', () {
    test('unique violations map to the duplicate message', () {
      for (final raw in [
        'duplicate key value violates unique constraint '
            '"categories_user_id_name_kind_key"',
        'unique constraint failed',
      ]) {
        expect(
          categoryErrorMessage(Exception(raw)),
          'Đã có danh mục cùng tên trong loại này.',
        );
      }
    });

    test('sentinels and unknown errors map honestly', () {
      expect(
        categoryErrorMessage(Exception('category_not_found')),
        'Không tìm thấy danh mục.',
      );
      expect(
        categoryErrorMessage(Exception('saved_unread')),
        'Đã lưu nhưng chưa tải lại được danh mục.',
      );
      expect(
        categoryErrorMessage(Exception('something_weird')),
        'Không thể cập nhật danh mục. Hãy thử lại.',
      );
    });
  });

  group('categoryDeleteErrorMessage', () {
    test('FK-restrict failures point at archive instead', () {
      expect(
        categoryDeleteErrorMessage(
          Exception(
            'update or delete on table "categories" violates foreign key '
            'constraint on table "transaction_entries"',
          ),
        ),
        contains('hãy ẩn thay'),
      );
      expect(
        categoryDeleteErrorMessage(Exception('opaque')),
        'Không xóa được danh mục. Hãy thử lại.',
      );
    });
  });
}
