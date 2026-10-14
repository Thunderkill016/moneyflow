// Widget tests for the "Gõ nhanh" quick-capture field on CapturePage —
// the field proposes (amount/kind/note/category/date) and the user still
// reviews the normal form before saving.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

Future<void> _open(WidgetTester t) async {
  await t.pumpWidget(
    _wrap(
      CapturePage(
        accounts: DemoStore.seedAccounts(),
        categories: DemoStore.seedCategories(),
        onSubmit: (_) async {},
      ),
    ),
  );
  await t.pumpAndSettle();
}

Future<void> _type(WidgetTester t, String text) async {
  await t.enterText(find.byKey(const ValueKey('quick-field')), text);
  await t.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  testWidgets('typing "an trua 45k" prefills amount, expense kind, category', (
    t,
  ) async {
    await _open(t);
    await _type(t, 'an trua 45k');

    // Suggestion line shows the understood parse before any save.
    expect(find.textContaining('Chi'), findsWidgets);
    expect(find.textContaining('45.000 ₫'), findsOneWidget);
    expect(find.textContaining('Ăn uống'), findsWidgets);

    // The real fields carry the prefill — still editable.
    expect(find.widgetWithText(TextField, '45000'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'an trua'), findsOneWidget);
    expect(find.widgetWithText(InputDecorator, 'Ăn uống'), findsOneWidget);
    final seg = t.widget<SegmentedButton<TransactionKind>>(
      find.byType(SegmentedButton<TransactionKind>),
    );
    expect(seg.selected, {TransactionKind.expense});
  });

  testWidgets('an income hint switches the kind and category to income', (
    t,
  ) async {
    await _open(t);
    await _type(t, 'luong 15tr');

    expect(find.textContaining('Thu'), findsWidgets);
    expect(find.textContaining('15.000.000 ₫'), findsOneWidget);
    final seg = t.widget<SegmentedButton<TransactionKind>>(
      find.byType(SegmentedButton<TransactionKind>),
    );
    expect(seg.selected, {TransactionKind.income});
    expect(find.widgetWithText(InputDecorator, 'Lương'), findsOneWidget);
  });

  testWidgets('unparseable text leaves the form untouched', (t) async {
    await _open(t);
    await _type(t, 'hello world');

    expect(find.textContaining('→'), findsNothing);
    // No amount field filled with digits; note stays empty.
    expect(find.widgetWithText(TextField, 'hello world'), findsOneWidget);
    final seg = t.widget<SegmentedButton<TransactionKind>>(
      find.byType(SegmentedButton<TransactionKind>),
    );
    expect(seg.selected, {TransactionKind.expense});
  });

  testWidgets('a hand-edited amount survives a re-parse', (t) async {
    await _open(t);
    await _type(t, 'an trua 45k');
    expect(find.widgetWithText(TextField, '45000'), findsOneWidget);

    // User corrects the amount by hand, then keeps typing in the field.
    await t.enterText(find.widgetWithText(TextField, '45000'), '99999');
    await _type(t, 'an toi 50k');

    // Manual edit wins — the new parse only updates untouched fields.
    expect(find.widgetWithText(TextField, '99999'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'an toi'), findsOneWidget);
    expect(find.textContaining('50.000 ₫'), findsOneWidget);
  });

  testWidgets('"hom qua" moves the date to yesterday', (t) async {
    await _open(t);
    await _type(t, 'an trua 45k hom qua');

    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    final expected =
        'Ngày: ${yesterday.year}-'
        '${yesterday.month.toString().padLeft(2, '0')}-'
        '${yesterday.day.toString().padLeft(2, '0')}';
    expect(find.textContaining('hôm qua'), findsWidgets);
    await t.scrollUntilVisible(
      find.text(expected),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text(expected), findsOneWidget);
  });

  testWidgets('edit mode keeps the row authoritative — no quick field', (
    t,
  ) async {
    const row = Transaction(
      id: 'tx-9',
      kind: TransactionKind.expense,
      categoryId: 'cat-food',
      category: 'Ăn uống',
      note: 'Phở bò',
      accountId: 'acc-cash',
      account: 'Tiền mặt',
      amount: 65000,
      occurredOn: '2026-10-05',
    );
    await t.pumpWidget(
      _wrap(
        CapturePage(
          accounts: DemoStore.seedAccounts(),
          categories: DemoStore.seedCategories(),
          onSubmit: (_) async {},
          editing: row,
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.byKey(const ValueKey('quick-field')), findsNothing);
  });
}
