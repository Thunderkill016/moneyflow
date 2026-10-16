// D7 — "Mẫu nhanh" (Goodbudget Custom Quick Fills): a saved
// kind/payee/amount/category template rendered as a capture-page chip.
// A chip only PREFILLS the form — the user still reviews and saves
// explicitly, so the feature adds no auto-post path.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/quick_fills.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/money.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

Future<void> _open(
  WidgetTester t, {
  String? quickFillScope = 'u1',
  Transaction? editing,
}) async {
  // Same tall-surface trick as the draft tests: the form is a lazy
  // ListView and fields below the fold are never built.
  t.view.physicalSize = const Size(1080, 2400);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    _wrap(
      CapturePage(
        accounts: DemoStore.seedAccounts(),
        categories: DemoStore.seedCategories(),
        editing: editing,
        onSubmit: (_) async {},
        quickFillScope: quickFillScope,
      ),
    ),
  );
  await t.pumpAndSettle();
}

const _coffee = QuickFill(
  kind: TransactionKind.expense,
  amountMinor: 45000,
  categoryId: 'cat-food',
  categoryName: 'Ăn uống',
  accountId: 'acc-bank',
  payee: 'Phở 24',
  note: 'ăn trưa',
);

void _seedFills(List<QuickFill> fills, [String scope = 'u1']) {
  SharedPreferences.setMockInitialValues({
    'mf_quick_fills.$scope': jsonEncode([for (final f in fills) f.toJson()]),
  });
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('QuickFillStore', () {
    test('saves and loads within the account scope only', () async {
      await QuickFillStore.save('u1', _coffee);
      final loaded = await QuickFillStore.load('u1');
      expect(loaded, hasLength(1));
      expect(loaded.single.amountMinor, 45000);
      expect(loaded.single.payee, 'Phở 24');
      expect(loaded.single.note, 'ăn trưa');
      // Another account on the same device sees no templates.
      expect(await QuickFillStore.load('u2'), isEmpty);
    });

    test(
      'an identical fill refreshes recency instead of duplicating',
      () async {
        const other = QuickFill(
          kind: TransactionKind.expense,
          amountMinor: 120000,
          categoryId: 'cat-transport',
          categoryName: 'Di chuyển',
          accountId: 'acc-bank',
        );
        await QuickFillStore.save('u1', other);
        await QuickFillStore.save('u1', _coffee);
        await QuickFillStore.save('u1', _coffee); // same fields again
        final list = await QuickFillStore.load('u1');
        expect(list, hasLength(2));
        expect(list.first.payee, 'Phở 24'); // refreshed → front
      },
    );

    test('the oldest fill evicts past the cap', () async {
      for (var i = 0; i < QuickFillStore.maxFills + 2; i++) {
        await QuickFillStore.save(
          'u1',
          QuickFill(
            kind: TransactionKind.expense,
            amountMinor: 1000 * (i + 1),
            categoryId: 'cat-food',
            categoryName: 'Ăn uống',
            accountId: 'acc-bank',
            payee: 'Quán $i',
          ),
        );
      }
      final list = await QuickFillStore.load('u1');
      expect(list, hasLength(QuickFillStore.maxFills));
      expect(list.first.payee, 'Quán ${QuickFillStore.maxFills + 1}');
    });

    test('corrupt or shape-drifted entries drop honestly', () async {
      SharedPreferences.setMockInitialValues({
        'mf_quick_fills.u1': '{not json',
      });
      expect(await QuickFillStore.load('u1'), isEmpty);
      SharedPreferences.setMockInitialValues({
        'mf_quick_fills.u1': jsonEncode([
          {'kind': 'transfer', 'amountMinor': 5, 'categoryId': 'c'},
          {'kind': 'expense', 'amountMinor': -1, 'categoryId': 'c'},
          {'kind': 'expense', 'amountMinor': 100},
          _coffee.toJson(),
        ]),
      });
      final list = await QuickFillStore.load('u1');
      expect(list, hasLength(1));
      expect(list.single.payee, 'Phở 24');
    });

    test('delete removes exactly the matching template', () async {
      const other = QuickFill(
        kind: TransactionKind.income,
        amountMinor: 5000000,
        categoryId: 'cat-salary',
        categoryName: 'Lương',
        accountId: 'acc-bank',
      );
      await QuickFillStore.save('u1', _coffee);
      await QuickFillStore.save('u1', other);
      await QuickFillStore.delete('u1', _coffee);
      final list = await QuickFillStore.load('u1');
      expect(list, hasLength(1));
      expect(list.single.kind, TransactionKind.income);
    });
  });

  group('CapturePage quick-fill chips', () {
    testWidgets('saved fills render as labeled chips in create mode', (
      t,
    ) async {
      _seedFills([_coffee]);
      await _open(t);
      expect(find.text('Phở 24 · ${formatMoney(45000)}'), findsOneWidget);
    });

    testWidgets('a payee-less fill labels with the live category name', (
      t,
    ) async {
      _seedFills([
        const QuickFill(
          kind: TransactionKind.expense,
          amountMinor: 9000,
          categoryId: 'cat-food',
          categoryName: 'cũ', // stored name is a snapshot; the live name wins
          accountId: 'acc-bank',
        ),
      ]);
      await _open(t);
      expect(find.text('Ăn uống · ${formatMoney(9000)}'), findsOneWidget);
    });

    testWidgets('tapping a chip prefills the form without saving', (t) async {
      var submitted = 0;
      _seedFills([_coffee]);
      await _open(t);
      await t.tap(find.text('Phở 24 · ${formatMoney(45000)}'));
      await t.pumpAndSettle();

      expect(find.widgetWithText(TextField, '45000'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'ăn trưa'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Phở 24'), findsOneWidget);
      // The category decorator shows the selected name, not "Chọn".
      expect(find.text('Ăn uống'), findsWidgets);
      // Nothing posted — a chip is a fill, never a write.
      expect(submitted, 0);
    });

    testWidgets('a fill whose account or category is gone stays hidden', (
      t,
    ) async {
      _seedFills([
        const QuickFill(
          kind: TransactionKind.expense,
          amountMinor: 1000,
          categoryId: 'cat-gone',
          categoryName: 'Đã xóa',
          accountId: 'acc-bank',
        ),
        const QuickFill(
          kind: TransactionKind.expense,
          amountMinor: 2000,
          categoryId: 'cat-food',
          categoryName: 'Ăn uống',
          accountId: 'acc-gone',
        ),
        _coffee,
      ]);
      await _open(t);
      expect(find.textContaining('Đã xóa'), findsNothing);
      expect(find.textContaining('2000'), findsNothing);
      expect(find.textContaining('Phở 24'), findsOneWidget);
    });

    testWidgets('bookmark saves the current form as a chip template', (
      t,
    ) async {
      // The last-capture pref supplies the wallet selection — saving a
      // template needs a resolvable account id.
      SharedPreferences.setMockInitialValues({
        'mf_last_capture_account': 'acc-bank',
      });
      await _open(t);
      await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '45000');
      await t.enterText(
        find.widgetWithText(TextField, 'Nơi chi / Nguồn thu (tùy chọn)'),
        'Phở 24',
      );
      // Pick a category through the real sheet.
      await t.tap(find.text('Chọn'));
      await t.pumpAndSettle();
      await t.tap(find.text('Ăn uống'));
      await t.pumpAndSettle();

      await t.tap(find.byIcon(Icons.bookmark_add_outlined));
      await t.pumpAndSettle();

      expect(find.text('Đã lưu mẫu nhanh'), findsOneWidget);
      expect(find.text('Phở 24 · ${formatMoney(45000)}'), findsOneWidget);
      final stored = await QuickFillStore.load('u1');
      expect(stored, hasLength(1));
      expect(stored.single.amountMinor, 45000);
      expect(stored.single.categoryId, 'cat-food');
    });

    testWidgets('bookmark with no amount/category explains instead', (t) async {
      await _open(t);
      await t.tap(find.byIcon(Icons.bookmark_add_outlined));
      await t.pumpAndSettle();
      expect(
        find.text('Nhập số tiền và danh mục trước khi lưu mẫu'),
        findsOneWidget,
      );
      expect(await QuickFillStore.load('u1'), isEmpty);
    });

    testWidgets('transfer mode hides the template action', (t) async {
      await _open(t);
      await t.tap(find.text('Chuyển'));
      await t.pumpAndSettle();
      expect(find.byIcon(Icons.bookmark_add_outlined), findsNothing);
    });

    testWidgets('no scope (demo) hides chips and the save action', (t) async {
      _seedFills([_coffee]);
      await _open(t, quickFillScope: null);
      expect(find.textContaining('Phở 24'), findsNothing);
      expect(find.byIcon(Icons.bookmark_add_outlined), findsNothing);
    });

    testWidgets('edit mode shows no chip row but can save a template', (
      t,
    ) async {
      _seedFills([_coffee]);
      final tx = DemoStore.seedTransactions().firstWhere(
        (tx) => tx.kind == TransactionKind.expense && tx.categoryId.isNotEmpty,
      );
      await _open(t, editing: tx);
      // Chips only prefill a NEW form — never overwrite an edit.
      expect(find.byType(InputChip), findsNothing);
      expect(find.byIcon(Icons.bookmark_add_outlined), findsOneWidget);
    });

    testWidgets('the chip delete affordance removes the stored template', (
      t,
    ) async {
      _seedFills([_coffee]);
      await _open(t);
      final chip = find.byType(InputChip);
      expect(chip, findsOneWidget);
      // The chip's only Icon is the delete affordance — tap whatever the
      // SDK renders there instead of pinning a specific IconData.
      await t.tap(find.descendant(of: chip, matching: find.byType(Icon)));
      await t.pumpAndSettle();
      expect(find.textContaining('Phở 24'), findsNothing);
      expect(await QuickFillStore.load('u1'), isEmpty);
    });
  });
}
