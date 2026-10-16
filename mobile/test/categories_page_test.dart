import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/categories.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/categories/categories_page.dart';

const _food = Category(
  id: 'c1',
  name: 'Ăn uống',
  kind: TransactionKind.expense,
  icon: 'bowl',
  color: 'coral',
  isDefault: true,
);
const _coffee = Category(
  id: 'c2',
  name: 'Cà phê',
  kind: TransactionKind.expense,
  icon: 'coffee',
  color: 'amber',
);
const _salary = Category(
  id: 'c3',
  name: 'Lương',
  kind: TransactionKind.income,
  icon: 'wallet',
  color: 'green',
  isDefault: true,
);
const _old = Category(
  id: 'c4',
  name: 'Cũ',
  kind: TransactionKind.expense,
  isArchived: true,
);

class _Harness {
  final List<Category> categories = const [_food, _coffee, _salary, _old];
  final saved = <CategoryDraft>[];
  final archivedCalls = <(String, bool)>[];
  final deleted = <String>[];
  final merged = <(String, String)>[];
  Object? saveError;
  Object? mergeError;
  bool deleteResult = true;
  bool noMerge = false;

  Widget page() => MaterialApp(
    home: CategoriesPage(
      loadCategories: () async => categories,
      onSave: (draft) async {
        if (saveError != null) throw saveError!;
        saved.add(draft);
      },
      onSetArchived: (id, archived) async => archivedCalls.add((id, archived)),
      onDelete: (id) async {
        deleted.add(id);
        return deleteResult;
      },
      onMerge: noMerge
          ? null
          : (sourceId, targetId) async {
              if (mergeError != null) throw mergeError!;
              merged.add((sourceId, targetId));
            },
    ),
  );
}

/// The overflow menu of the row showing [name].
Finder _menuOf(String name) => find.descendant(
  of: find.ancestor(of: find.text(name), matching: find.byType(Card)),
  matching: find.byType(PopupMenuButton<String>),
);

void main() {
  testWidgets('groups active rows by kind and archived under "Đã ẩn"', (
    t,
  ) async {
    await t.pumpWidget(_Harness().page());
    await t.pumpAndSettle();

    expect(find.text('Chi tiêu đang dùng'), findsOneWidget);
    expect(find.text('Thu nhập đang dùng'), findsOneWidget);
    expect(find.text('Đã ẩn'), findsOneWidget);
    expect(find.text('Ăn uống'), findsOneWidget);
    expect(find.text('Cà phê'), findsOneWidget);
    expect(find.text('Lương'), findsOneWidget);
    expect(find.text('Cũ'), findsOneWidget);
    expect(find.textContaining('Danh mục mặc định'), findsWidgets);
    expect(find.textContaining('Danh mục tự tạo'), findsWidgets);
  });

  testWidgets('create dialog saves a normalized draft', (t) async {
    final h = _Harness();
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(find.text('Thêm danh mục'));
    await t.pumpAndSettle();
    expect(find.text('Loại'), findsOneWidget);

    await t.enterText(
      find.widgetWithText(TextField, 'Tên danh mục'),
      '  Cà  phê sáng ',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Thêm danh mục'));
    await t.pumpAndSettle();

    final draft = h.saved.single;
    expect(draft.id, isNull);
    expect(draft.name, 'Cà phê sáng');
    expect(draft.kind, TransactionKind.expense);
    // Untouched pickers default to the kind meta like the web dialog.
    expect(draft.icon, 'spark');
    expect(draft.color, 'violet');
  });

  testWidgets('duplicate name in the same kind is rejected client-side', (
    t,
  ) async {
    final h = _Harness();
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(find.text('Thêm danh mục'));
    await t.pumpAndSettle();
    await t.enterText(
      find.widgetWithText(TextField, 'Tên danh mục'),
      'Ăn uống',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Thêm danh mục'));
    await t.pumpAndSettle();

    expect(h.saved, isEmpty);
    expect(find.text('Đã có danh mục chi tiêu cùng tên.'), findsOneWidget);
  });

  testWidgets('edit locks kind and PATCH-shaped draft keeps the id', (t) async {
    final h = _Harness();
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(find.text('Cà phê'));
    await t.pumpAndSettle();
    expect(find.text('Sửa danh mục'), findsOneWidget);
    expect(find.text('Không đổi được loại sau khi tạo'), findsOneWidget);
    // The kind selector renders its value but accepts no change.
    final kindField = t.widget<DropdownButtonFormField<TransactionKind>>(
      find.byWidgetPredicate(
        (w) => w is DropdownButtonFormField<TransactionKind>,
      ),
    );
    expect(kindField.onChanged, isNull);

    await t.enterText(find.widgetWithText(TextField, 'Cà phê'), 'Cà phê sáng');
    await t.tap(find.text('Lưu thay đổi'));
    await t.pumpAndSettle();

    final draft = h.saved.single;
    expect(draft.id, 'c2');
    expect(draft.name, 'Cà phê sáng');
    expect(draft.kind, TransactionKind.expense);
    expect(draft.icon, 'coffee');
    expect(draft.color, 'amber');
  });

  testWidgets('save failure shows the mapped error and keeps the dialog', (
    t,
  ) async {
    final h = _Harness()
      ..saveError = Exception(
        'duplicate key value violates unique constraint '
        '"categories_user_id_name_kind_key"',
      );
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(find.text('Thêm danh mục'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Tên danh mục'), 'Mới');
    await t.tap(find.widgetWithText(FilledButton, 'Thêm danh mục'));
    await t.pumpAndSettle();

    expect(
      find.text('Đã có danh mục cùng tên trong loại này.'),
      findsOneWidget,
    );
    expect(find.text('Thêm danh mục'), findsWidgets); // dialog still open
  });

  testWidgets('archive goes through the confirm dialog, unarchive does not', (
    t,
  ) async {
    // A taller surface keeps the archived row natively visible — the
    // pack banner pushed it off the default 600px height, where the
    // extended FAB would swallow the menu tap.
    t.view.physicalSize = const Size(800, 1400);
    t.view.devicePixelRatio = 1.0;
    addTearDown(t.view.reset);
    final h = _Harness();
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    // Active row -> "Ẩn" -> review dialog -> "Ẩn danh mục".
    await t.tap(_menuOf('Cà phê'));
    await t.pumpAndSettle();
    await t.tap(find.text('Ẩn'));
    await t.pumpAndSettle();
    expect(find.text('Ẩn danh mục?'), findsOneWidget);
    await t.tap(find.text('Ẩn danh mục'));
    await t.pumpAndSettle();
    expect(h.archivedCalls.single, ('c2', true));

    // Archived row -> "Hiện lại" fires immediately, no review.
    await t.tap(_menuOf('Cũ'));
    await t.pumpAndSettle();
    expect(find.text('Sửa'), findsNothing);
    await t.tap(find.text('Hiện lại'));
    await t.pumpAndSettle();
    expect(h.archivedCalls.last, ('c4', false));
  });

  testWidgets('defaults cannot be hard-deleted but can be edited/archived', (
    t,
  ) async {
    final h = _Harness();
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(_menuOf('Ăn uống'));
    await t.pumpAndSettle();
    expect(find.text('Sửa'), findsOneWidget);
    expect(find.text('Ẩn'), findsOneWidget);
    expect(find.text('Xóa hẳn'), findsNothing);
    // Defaults still archive — through the same review dialog; bail via Hủy.
    await t.tap(find.text('Ẩn'));
    await t.pumpAndSettle();
    expect(find.text('Ẩn danh mục?'), findsOneWidget);
    await t.tap(find.text('Hủy'));
    await t.pumpAndSettle();
    expect(h.archivedCalls, isEmpty);

    await t.tap(_menuOf('Cà phê'));
    await t.pumpAndSettle();
    expect(find.text('Xóa hẳn'), findsOneWidget);
    await t.tap(find.text('Xóa hẳn'));
    await t.pumpAndSettle();
    expect(find.text('Xóa hẳn "Cà phê"?'), findsOneWidget);
    await t.tap(find.widgetWithText(FilledButton, 'Xóa hẳn'));
    await t.pumpAndSettle();
    expect(h.deleted.single, 'c2');
  });

  testWidgets('a failed load shows the honest error with retry', (t) async {
    await t.pumpWidget(
      MaterialApp(
        home: CategoriesPage(
          loadCategories: () async => throw Exception('down'),
          onSave: (_) async {},
          onSetArchived: (_, _) async {},
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.textContaining('Không tải được danh mục'), findsOneWidget);
    expect(find.text('Thử lại'), findsOneWidget);
  });

  // -- D14 merge --

  testWidgets('merge affordance rides custom rows only', (t) async {
    final h = _Harness();
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(_menuOf('Cà phê'));
    await t.pumpAndSettle();
    expect(find.text('Gộp vào danh mục khác'), findsOneWidget);
    // Popup menus have no Hủy — dismiss by tapping the barrier.
    await t.tapAt(const Offset(10, 10));
    await t.pumpAndSettle();

    await t.tap(_menuOf('Ăn uống'));
    await t.pumpAndSettle();
    // A default can be a merge TARGET but never the source.
    expect(find.text('Gộp vào danh mục khác'), findsNothing);
    await t.tapAt(const Offset(10, 10));
    await t.pumpAndSettle();

    final bare = _Harness()..noMerge = true;
    await t.pumpWidget(bare.page());
    await t.pumpAndSettle();
    await t.tap(_menuOf('Cà phê'));
    await t.pumpAndSettle();
    expect(find.text('Gộp vào danh mục khác'), findsNothing);
  });

  testWidgets('merge dialog explains, filters targets and confirms', (t) async {
    final h = _Harness();
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(_menuOf('Cà phê'));
    await t.pumpAndSettle();
    await t.tap(find.text('Gộp vào danh mục khác'));
    await t.pumpAndSettle();

    expect(find.text('Gộp "Cà phê"'), findsOneWidget);
    expect(find.textContaining('hạn mức của danh mục đích'), findsOneWidget);
    // Nothing chosen → Gộp disabled; cancel writes nothing.
    expect(
      t
          .widget<FilledButton>(find.widgetWithText(FilledButton, 'Gộp'))
          .onPressed,
      isNull,
    );
    await t.tap(find.text('Hủy'));
    await t.pumpAndSettle();
    expect(h.merged, isEmpty);

    await t.tap(_menuOf('Cà phê'));
    await t.pumpAndSettle();
    await t.tap(find.text('Gộp vào danh mục khác'));
    await t.pumpAndSettle();
    await t.tap(find.byType(DropdownButtonFormField<Category>));
    await t.pumpAndSettle();
    // Same-kind live rows only. The dropdown overlay and the page list
    // behind the dialog both render the name, so counts are the assertion:
    // Ăn uống (a default target) is page row + menu item = 2, while the
    // income row Lương and the archived "Cũ" stay page-only singles.
    expect(find.text('Ăn uống'), findsNWidgets(2));
    expect(find.text('Lương'), findsOneWidget);
    expect(find.text('Cũ'), findsOneWidget);
    await t.tap(find.text('Ăn uống').last);
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(FilledButton, 'Gộp'));
    await t.pumpAndSettle();

    expect(h.merged.single, ('c2', 'c1'));
    expect(find.textContaining('Đã gộp'), findsOneWidget);
  });

  testWidgets('merge errors surface as a snack and the write can retry', (
    t,
  ) async {
    final h = _Harness()..mergeError = Exception('category_kind_mismatch');
    await t.pumpWidget(h.page());
    await t.pumpAndSettle();

    await t.tap(_menuOf('Cà phê'));
    await t.pumpAndSettle();
    await t.tap(find.text('Gộp vào danh mục khác'));
    await t.pumpAndSettle();
    await t.tap(find.byType(DropdownButtonFormField<Category>));
    await t.pumpAndSettle();
    await t.tap(find.text('Ăn uống').last);
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(FilledButton, 'Gộp'));
    await t.pumpAndSettle();

    // Dialog stays open (explicit retry path), error is honest Vietnamese.
    expect(find.text('Gộp "Cà phê"'), findsOneWidget);
    expect(
      find.textContaining('Chỉ gộp được hai danh mục cùng loại'),
      findsOneWidget,
    );
    expect(h.merged, isEmpty);
  });
}
