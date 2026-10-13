import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/accounts/accounts_page.dart';

const _cash = AccountSummary(
  id: 'a1',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 500000,
  balance: 620000,
  icon: 'wallet',
  color: 'blue',
  updatedAt: '2026-10-01T00:00:00Z',
);

Widget _page({
  Future<void> Function(AccountSummary, String, AccountKind, int)? onUpdate,
}) => MaterialApp(
  home: AccountsPage(
    loadAccounts: () async => [_cash],
    onCreate: (_, _, _) async {},
    onArchive: (_, _) async {},
    onUpdate: onUpdate,
  ),
);

void main() {
  testWidgets('tap opens a prefilled edit dialog and submits the update', (
    t,
  ) async {
    AccountSummary? got;
    String? gotName;
    int? gotBalance;
    await t.pumpWidget(
      _page(
        onUpdate: (a, name, kind, bal) async {
          got = a;
          gotName = name;
          gotBalance = bal;
        },
      ),
    );
    await t.pumpAndSettle();

    await t.tap(find.text('Tiền mặt').first);
    await t.pumpAndSettle();
    expect(find.text('Sửa tài khoản'), findsOneWidget);
    expect(find.widgetWithText(TextField, '500000'), findsOneWidget);

    await t.enterText(find.widgetWithText(TextField, 'Tiền mặt'), 'Ví tiền');
    await t.enterText(find.widgetWithText(TextField, '500000'), '2tr');
    await t.tap(find.text('Lưu'));
    await t.pumpAndSettle();

    // The row (with its icon/color/updated_at token) travels with the call.
    expect(got!.id, 'a1');
    expect(got!.updatedAt, '2026-10-01T00:00:00Z');
    expect(gotName, 'Ví tiền');
    expect(gotBalance, 2000000);
    expect(find.text('Sửa tài khoản'), findsNothing);
  });

  testWidgets('stale_write keeps the dialog open with guidance', (t) async {
    await t.pumpWidget(
      _page(onUpdate: (_, _, _, _) async => throw Exception('stale_write')),
    );
    await t.pumpAndSettle();
    await t.tap(find.text('Tiền mặt').first);
    await t.pumpAndSettle();
    await t.tap(find.text('Lưu'));
    await t.pumpAndSettle();

    expect(find.text('Sửa tài khoản'), findsOneWidget);
    expect(
      find.text('Tài khoản vừa thay đổi — đóng rồi mở lại để sửa bản mới'),
      findsOneWidget,
    );
  });

  testWidgets('without onUpdate rows are read-only', (t) async {
    await t.pumpWidget(_page());
    await t.pumpAndSettle();
    await t.tap(find.text('Tiền mặt').first);
    await t.pumpAndSettle();
    expect(find.text('Sửa tài khoản'), findsNothing);
  });

  testWidgets('with onOpen a row tap opens the register, not the edit form', (
    t,
  ) async {
    AccountSummary? opened;
    await t.pumpWidget(
      MaterialApp(
        home: AccountsPage(
          loadAccounts: () async => [_cash],
          onCreate: (_, _, _) async {},
          onArchive: (_, _) async {},
          onUpdate: (_, _, _, _) async {},
          onOpen: (a) => opened = a,
        ),
      ),
    );
    await t.pumpAndSettle();

    await t.tap(find.text('Tiền mặt').first);
    await t.pumpAndSettle();
    expect(opened?.id, 'a1');
    expect(find.text('Sửa tài khoản'), findsNothing);

    // Edit stays one tap away via the trailing action (web: "Sửa" button).
    await t.tap(find.byTooltip('Sửa Tiền mặt'));
    await t.pumpAndSettle();
    expect(find.text('Sửa tài khoản'), findsOneWidget);
  });

  testWidgets('a read-only surface (demo) hides create and edit affordances', (
    t,
  ) async {
    AccountSummary? opened;
    await t.pumpWidget(
      MaterialApp(
        home: AccountsPage(
          loadAccounts: () async => [_cash],
          onOpen: (a) => opened = a,
        ),
      ),
    );
    await t.pumpAndSettle();

    expect(find.text('Thêm tài khoản'), findsNothing);
    expect(find.byTooltip('Sửa Tiền mặt'), findsNothing);
    await t.tap(find.text('Tiền mặt').first);
    await t.pumpAndSettle();
    expect(opened?.id, 'a1');
    await t.longPress(find.text('Tiền mặt').first);
    await t.pumpAndSettle();
    expect(find.textContaining('Lưu trữ'), findsNothing);
  });

  testWidgets('create path still works through the shared dialog', (t) async {
    String? created;
    await t.pumpWidget(
      MaterialApp(
        home: AccountsPage(
          loadAccounts: () async => const [],
          onCreate: (name, _, _) async => created = name,
          onArchive: (_, _) async {},
        ),
      ),
    );
    await t.pumpAndSettle();
    await t.tap(find.text('Thêm tài khoản'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Tên tài khoản'), 'Quỹ');
    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();
    expect(created, 'Quỹ');
  });

  testWidgets('a mistyped opening balance rejects instead of saving 0', (
    t,
  ) async {
    int? createdBalance;
    await t.pumpWidget(
      MaterialApp(
        home: AccountsPage(
          loadAccounts: () async => const [],
          onCreate: (_, _, bal) async => createdBalance = bal,
          onArchive: (_, _) async {},
        ),
      ),
    );
    await t.pumpAndSettle();
    await t.tap(find.text('Thêm tài khoản'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Tên tài khoản'), 'Quỹ');

    // A rejected entry used to collapse to 0 via `?? 0` — now the dialog
    // stays open with an honest error and nothing is saved.
    await t.enterText(find.widgetWithText(TextField, 'vd: 500k'), 'abc');
    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();
    expect(find.text('Số tiền không hợp lệ'), findsOneWidget);
    expect(createdBalance, isNull);
    expect(find.text('Tạo'), findsOneWidget); // dialog stayed open

    // Shorthand parity on the same field: '2tr5' is 2.500.000, not
    // 2.000.005 (the old tail-as-raw-đồng bug).
    await t.enterText(find.widgetWithText(TextField, 'vd: 500k'), '2tr5');
    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();
    expect(createdBalance, 2500000);
  });

  testWidgets('a failed load shows the retry surface, not a spinner', (
    t,
  ) async {
    var loads = 0;
    await t.pumpWidget(
      MaterialApp(
        home: AccountsPage(
          loadAccounts: () async {
            loads++;
            throw Exception('network');
          },
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.text('Không tải được tài khoản'), findsOneWidget);
    expect(find.text('Thử lại'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);

    await t.tap(find.text('Thử lại'));
    await t.pumpAndSettle();
    expect(loads, 2);
  });
}
