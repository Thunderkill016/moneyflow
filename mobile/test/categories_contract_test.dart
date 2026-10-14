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
        // upsert_financial_category raises this on unique_violation.
        'category_name_taken',
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
        categoryErrorMessage(Exception('category_kind_locked')),
        'Không đổi được loại sau khi tạo.',
      );
      expect(
        categoryErrorMessage(Exception('invalid_category_name')),
        'Tên danh mục cần từ 1 đến 60 ký tự.',
      );
      expect(
        categoryErrorMessage(Exception('something_weird')),
        'Không thể cập nhật danh mục. Hãy thử lại.',
      );
      // set_category_archived's required-param guard — unreachable via
      // the UI but mapped honestly if it ever surfaces.
      expect(
        categoryErrorMessage(Exception('archive_state_required')),
        contains('tải lại'),
      );
    });
  });

  group('vietnamCategoryPack', () {
    /// Mirrors handle_new_user in the initial schema migration — the
    /// names every real account starts with. A pack item colliding with
    /// one of these would always render as disabled "Đã có" clutter.
    const seededDefaults = {
      (TransactionKind.expense, 'Ăn uống'),
      (TransactionKind.expense, 'Di chuyển'),
      (TransactionKind.expense, 'Mua sắm'),
      (TransactionKind.expense, 'Nhà ở'),
      (TransactionKind.expense, 'Hóa đơn'),
      (TransactionKind.expense, 'Giải trí'),
      (TransactionKind.expense, 'Sức khỏe'),
      (TransactionKind.expense, 'Giáo dục'),
      (TransactionKind.income, 'Lương'),
      (TransactionKind.income, 'Thưởng'),
      (TransactionKind.income, 'Thu nhập khác'),
    };

    test('every item is a valid draft in the writable vocabulary', () {
      for (final item in vietnamCategoryPack) {
        expect(isValidCategoryName(item.name), isTrue, reason: item.name);
        expect(
          pickableCategoryIcons.contains(item.icon),
          isTrue,
          reason: '${item.name} icon ${item.icon} must be pickable',
        );
        expect(
          categoryColorKeys.contains(item.color),
          isTrue,
          reason: '${item.name} color ${item.color} must be a palette key',
        );
      }
      // No duplicate (kind, name) pairs inside the pack itself.
      expect(
        {for (final i in vietnamCategoryPack) (i.kind, i.name)}.length,
        vietnamCategoryPack.length,
      );
    });

    test('no item duplicates a signup default name', () {
      for (final item in vietnamCategoryPack) {
        expect(
          seededDefaults.contains((item.kind, item.name)),
          isFalse,
          reason: '${item.name} already ships as a default',
        );
      }
    });

    test('missing/present checks honor kind and normalized names', () {
      const present = [
        Category(
          id: 'x1',
          name: 'Hiếu  hỉ', // double space — still counts as present
          kind: TransactionKind.expense,
          isArchived: true, // archived names are not re-offered either
        ),
        // Same name on the OTHER kind does not block the expense item.
        Category(id: 'x2', name: 'Lì xì', kind: TransactionKind.income),
      ];
      expect(missingCategoryPackItems(present).map((i) => i.name), [
        'Lì xì',
        'Con cái',
        'Về quê',
        'Gia đình',
        'Lì xì nhận',
        'Bán đồ',
        'Hoàn tiền',
      ]);
      expect(
        categoryPackItemPresent((
          name: 'Lì xì',
          kind: TransactionKind.expense,
          icon: 'gift',
          color: 'red',
        ), present),
        isFalse,
      );
      expect(missingCategoryPackItems(const []).length, 8);
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

    test('delete RPC refusal tokens map to the same honest copy', () {
      // delete_financial_category raises these — the FK string shape is
      // gone under SECURITY DEFINER.
      expect(
        categoryDeleteErrorMessage(Exception('category_in_use')),
        contains('hãy ẩn thay'),
      );
      expect(
        categoryDeleteErrorMessage(Exception('category_default_locked')),
        contains('mặc định'),
      );
      expect(
        categoryDeleteErrorMessage(Exception('category_not_found')),
        contains('không còn tồn tại'),
      );
    });
  });
}
