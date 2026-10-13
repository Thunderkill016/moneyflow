import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/categories.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/categories/categories_page.dart';
import 'package:moneyflow/features/categories/vietnam_pack_sheet.dart';

/// Opens the real modal route so the tests exercise the same sheet the
/// banner shows — not a naked widget. The returned notifier fills with
/// the sheet's pop value once it closes (tests read it after "Xong").
Future<ValueNotifier<bool?>> _openSheet(
  WidgetTester t, {
  List<Category> existing = const [],
  required Future<void> Function(CategoryDraft) onSave,
  VoidCallback? onAdded,
}) async {
  final popped = ValueNotifier<bool?>(null);
  await t.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => FilledButton(
          onPressed: () async {
            // Bypass the helper so the test can inject onAdded, exactly
            // like showVietnamCategoryPackSheet wires it.
            popped.value = await showModalBottomSheet<bool>(
              context: context,
              isScrollControlled: true,
              showDragHandle: true,
              builder: (ctx) => VietnamCategoryPackSheet(
                existing: existing,
                onSave: onSave,
                onAdded: onAdded,
              ),
            );
          },
          child: const Text('open'),
        ),
      ),
    ),
  );
  await t.tap(find.text('open'));
  await t.pumpAndSettle();
  return popped;
}

CheckboxListTile _tile(WidgetTester t, String name) =>
    t.widget<CheckboxListTile>(find.widgetWithText(CheckboxListTile, name));

void main() {
  testWidgets('lists every pack item with existing names disabled Đã có', (
    t,
  ) async {
    var saves = 0;
    await _openSheet(
      t,
      existing: const [
        Category(id: 'c1', name: 'Hiếu hỉ', kind: TransactionKind.expense),
      ],
      onSave: (_) async => saves++,
    );

    // Pack sections split expense vs income like the manager does.
    expect(find.text('Chi tiêu'), findsOneWidget);
    expect(find.text('Thu nhập'), findsOneWidget);
    for (final item in vietnamCategoryPack) {
      expect(find.text(item.name), findsOneWidget);
    }
    expect(_tile(t, 'Hiếu hỉ').onChanged, isNull);
    expect(find.text('Đã có'), findsOneWidget);
    // The other seven start checked and the button counts them.
    expect(_tile(t, 'Lì xì').onChanged, isNotNull);
    expect(_tile(t, 'Lì xì').value, isTrue);
    expect(find.text('Thêm 7 danh mục'), findsOneWidget);
    expect(saves, 0);
  });

  testWidgets('one tap writes every checked item with its pack identity', (
    t,
  ) async {
    final drafts = <CategoryDraft>[];
    var addedFlag = false;
    final popped = await _openSheet(
      t,
      onSave: (d) async => drafts.add(d),
      onAdded: () => addedFlag = true,
    );

    await t.tap(find.text('Thêm 8 danh mục'));
    await t.pumpAndSettle();

    expect(drafts.length, vietnamCategoryPack.length);
    for (final item in vietnamCategoryPack) {
      final draft = drafts.singleWhere((d) => d.name == item.name);
      expect(draft.id, isNull);
      expect(draft.kind, item.kind);
      expect(draft.icon, item.icon);
      expect(draft.color, item.color);
    }
    // Per-item honest statuses + the tally the summary reconciles with.
    expect(find.text('Đã thêm'), findsNWidgets(8));
    expect(find.text('Đã thêm 8 · đã có 0'), findsOneWidget);
    expect(addedFlag, isTrue);

    await t.tap(find.text('Xong'));
    await t.pumpAndSettle();
    expect(popped.value, isTrue);
  });

  testWidgets('unchecking a row excludes it from the write', (t) async {
    final drafts = <CategoryDraft>[];
    await _openSheet(t, onSave: (d) async => drafts.add(d));

    await t.tap(find.widgetWithText(CheckboxListTile, 'Con cái'));
    await t.pumpAndSettle();
    expect(find.text('Thêm 7 danh mục'), findsOneWidget);

    await t.tap(find.text('Thêm 7 danh mục'));
    await t.pumpAndSettle();
    expect(drafts.length, 7);
    expect(drafts.any((d) => d.name == 'Con cái'), isFalse);
  });

  testWidgets('a failed item reports its error without blocking others', (
    t,
  ) async {
    final drafts = <CategoryDraft>[];
    await _openSheet(
      t,
      onSave: (d) async {
        drafts.add(d);
        if (d.name == 'Về quê') throw Exception('socket closed');
      },
    );

    await t.tap(find.text('Thêm 8 danh mục'));
    await t.pumpAndSettle();

    // Everything was attempted; only the failed row shows the mapped
    // error, the rest show Đã thêm.
    expect(drafts.length, 8);
    expect(find.text('Đã thêm'), findsNWidgets(7));
    expect(
      find.text('Không thể cập nhật danh mục. Hãy thử lại.'),
      findsOneWidget,
    );
    expect(find.text('Đã thêm 7 · đã có 0 · lỗi 1'), findsOneWidget);
  });

  testWidgets('pack banner on CategoriesPage adds rows, then disappears', (
    t,
  ) async {
    final categories = <Category>[
      const Category(
        id: 'c1',
        name: 'Ăn uống',
        kind: TransactionKind.expense,
        isDefault: true,
      ),
    ];
    await t.pumpWidget(
      MaterialApp(
        home: CategoriesPage(
          loadCategories: () async => categories,
          onSave: (draft) async {
            categories.add(
              Category(
                id: 'new-${draft.name}',
                name: draft.name,
                kind: draft.kind,
                icon: draft.icon,
                color: draft.color,
              ),
            );
          },
          onSetArchived: (_, _) async {},
        ),
      ),
    );
    await t.pumpAndSettle();

    expect(find.text('Gói danh mục Việt Nam'), findsOneWidget);
    await t.tap(find.text('Gói danh mục Việt Nam'));
    await t.pumpAndSettle();
    await t.tap(find.text('Thêm 8 danh mục'));
    await t.pumpAndSettle();
    await t.tap(find.text('Xong'));
    await t.pumpAndSettle();

    // The refresh re-lists the page: pack rows landed and the offer
    // card is gone now that nothing is missing. The page list is
    // lazy — scroll the income section into view before asserting.
    expect(find.text('Hiếu hỉ'), findsOneWidget);
    await t.scrollUntilVisible(find.text('Hoàn tiền'), 100);
    expect(find.text('Hoàn tiền'), findsOneWidget);
    expect(find.text('Gói danh mục Việt Nam'), findsNothing);
  });

  testWidgets('demo-mode pack add reaches the capture picker', (t) async {
    final store = DemoCategoryStore();
    await t.pumpWidget(
      MaterialApp(
        home: CategoriesPage(
          loadCategories: store.loadAll,
          onSave: (draft) => store
              .save(
                name: draft.name,
                kind: draft.kind,
                icon: draft.icon,
                color: draft.color,
              )
              .then((_) {}),
          onSetArchived: (id, archived) =>
              store.setArchived(id, archived).then((_) {}),
          onDelete: store.delete,
        ),
      ),
    );
    await t.pumpAndSettle();

    await t.tap(find.text('Gói danh mục Việt Nam'));
    await t.pumpAndSettle();
    await t.tap(find.text('Thêm 8 danh mục'));
    await t.pumpAndSettle();
    await t.tap(find.text('Xong'));
    await t.pumpAndSettle();

    // Session store holds the additions; the capture picker lists them.
    expect(store.active.any((c) => c.name == 'Hiếu hỉ'), isTrue);
    await t.pumpWidget(
      MaterialApp(
        home: CapturePage(
          accounts: DemoStore.seedAccounts(),
          categories: store.active,
          onSubmit: (_) async {},
        ),
      ),
    );
    await t.pumpAndSettle();
    await t.tap(find.text('Chọn'));
    await t.pumpAndSettle();
    expect(find.text('Hiếu hỉ'), findsOneWidget);
    expect(find.text('Lì xì nhận'), findsNothing); // income kind hidden
  });
}
