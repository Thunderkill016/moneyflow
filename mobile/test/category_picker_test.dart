import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/category_picker.dart';

const _cats = [
  Category(id: 'a', name: 'Ăn uống', kind: TransactionKind.expense),
  Category(id: 'b', name: 'Di chuyển', kind: TransactionKind.expense),
  Category(id: 'c', name: 'Hóa đơn', kind: TransactionKind.expense),
];

Future<Category?> _open(WidgetTester t) async {
  Category? picked;
  await t.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => FilledButton(
          onPressed: () async =>
              picked = await showCategoryPicker(context, categories: _cats),
          child: const Text('open'),
        ),
      ),
    ),
  );
  await t.tap(find.text('open'));
  await t.pumpAndSettle();
  return picked;
}

void main() {
  testWidgets('opens without grabbing focus so the keyboard stays down', (
    t,
  ) async {
    await _open(t);
    // The keyboard would hide most of the list on a phone — the user opts
    // in by tapping the search field.
    final focused = FocusManager.instance.primaryFocus;
    expect(
      focused?.context?.findAncestorWidgetOfExactType<EditableText>(),
      isNull,
    );
    expect(focused?.context?.widget is EditableText, isFalse);
    expect(find.text('Ăn uống'), findsOneWidget);
    expect(find.text('Di chuyển'), findsOneWidget);
    expect(find.text('Hóa đơn'), findsOneWidget);
  });

  testWidgets('search filters and a tap returns the category', (t) async {
    Category? result;
    await t.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => FilledButton(
            onPressed: () async =>
                result = await showCategoryPicker(context, categories: _cats),
            child: const Text('open'),
          ),
        ),
      ),
    );
    await t.tap(find.text('open'));
    await t.pumpAndSettle();

    await t.enterText(find.byType(TextField), 'hóa');
    await t.pumpAndSettle();
    expect(find.text('Di chuyển'), findsNothing);
    await t.tap(find.text('Hóa đơn'));
    await t.pumpAndSettle();
    expect(result?.id, 'c');
  });
}
