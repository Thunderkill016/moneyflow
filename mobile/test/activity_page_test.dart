import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/activity/activity_page.dart';

const _plain = Transaction(
  id: 'tx-plain',
  kind: TransactionKind.expense,
  categoryId: 'cat-food',
  category: 'Ăn uống',
  note: 'Bún bò',
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: 45000,
  occurredOn: '2026-10-12',
);

const _split = Transaction(
  id: 'tx-split',
  kind: TransactionKind.expense,
  categoryId: 'cat-food',
  category: 'Chia · 2 danh mục',
  note: 'Siêu thị',
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: 70000,
  occurredOn: '2026-10-12',
  splitCount: 2,
);

Widget _page(List<Transaction> edited) => MaterialApp(
  home: ActivityPage(
    loadTransactions: () async => [_plain, _split],
    onDelete: (_) async {},
    onEdit: (tx) async => edited.add(tx),
  ),
);

void main() {
  testWidgets('tapping a plain row opens the editor', (t) async {
    final edited = <Transaction>[];
    await t.pumpWidget(_page(edited));
    await t.pumpAndSettle();
    await t.tap(find.text('Bún bò'));
    await t.pumpAndSettle();
    expect(edited.map((e) => e.id), ['tx-plain']);
  });

  testWidgets('tapping a split row explains instead of editing', (t) async {
    final edited = <Transaction>[];
    await t.pumpWidget(_page(edited));
    await t.pumpAndSettle();
    await t.tap(find.text('Siêu thị'));
    await t.pumpAndSettle();
    expect(edited, isEmpty);
    expect(
      find.text('Khoản chia danh mục chưa sửa được — xóa rồi ghi lại'),
      findsOneWidget,
    );
  });

  test('Transaction.isSplit needs more than one line', () {
    expect(_plain.isSplit, isFalse);
    expect(_split.isSplit, isTrue);
  });
}
