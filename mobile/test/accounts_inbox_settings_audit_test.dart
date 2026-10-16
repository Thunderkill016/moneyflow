import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/reconciliation.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/accounts/account_register_page.dart';
import 'package:moneyflow/features/settings/change_password_page.dart';
import 'package:moneyflow/features/settings/settings_page.dart';

const _account = AccountSummary(
  id: 'a1',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 100000,
);

Transaction _tx(String id) => Transaction(
  id: id,
  kind: TransactionKind.expense,
  categoryId: 'c',
  category: 'Ăn uống',
  note: id,
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: 1000,
  occurredOn: '2026-10-12',
);

ReconciliationEntryRow _row(String tx, EntryReconciliationState s) =>
    ReconciliationEntryRow(
      entryId: 'e$tx',
      transactionId: tx,
      accountId: 'a1',
      state: s,
      entryCount: 1,
    );

void main() {
  testWidgets('register: dd/MM/yyyy date, state badge, reconciled is locked', (
    t,
  ) async {
    var edited = 0;
    await t.pumpWidget(
      MaterialApp(
        home: AccountRegisterPage(
          account: _account,
          loadPage: (q, {offset = 0}) async =>
              TransactionPage([_tx('p'), _tx('r')], hasMore: false),
          onEdit: (_) async => edited++,
          loadReconciliation: () async => ReconciliationStateData(
            featureAvailable: true,
            rows: [
              _row('p', EntryReconciliationState.pending),
              _row('r', EntryReconciliationState.reconciled),
            ],
            sessions: const [],
          ),
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.textContaining('12/10/2026'), findsNWidgets(2));
    expect(find.textContaining('2026-10-12'), findsNothing);
    expect(find.textContaining('Đã đối soát'), findsOneWidget);
    expect(find.textContaining('Chờ đối chiếu'), findsOneWidget);
    await t.tap(find.text('r'));
    await t.pumpAndSettle();
    expect(edited, 0);
    await t.tap(find.text('p'));
    await t.pumpAndSettle();
    expect(edited, 1);
  });

  testWidgets('settings: backup and local-delete state their scope', (t) async {
    await t.pumpWidget(
      MaterialApp(
        home: SettingsPage(
          loadArchive: () async => '{}',
          onDeleteLocalData: () async {},
          onDeleteAccount: () async {},
        ),
      ),
    );
    await t.scrollUntilVisible(
      find.text('Sao lưu (JSON)'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.text('Toàn bộ tài khoản và giao dịch · tải về hoặc chia sẻ'),
      findsOneWidget,
    );
    await t.scrollUntilVisible(
      find.textContaining('Chỉ xóa trên thiết bị này'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.text('Chỉ xóa trên thiết bị này — dữ liệu trên máy chủ giữ nguyên'),
      findsOneWidget,
    );
  });

  testWidgets('change password: helper, short password blocked, toggle', (
    t,
  ) async {
    var calls = 0;
    await t.pumpWidget(
      MaterialApp(home: ChangePasswordPage(onSubmit: (a, b) async => calls++)),
    );
    expect(find.text('Ít nhất 12 ký tự'), findsOneWidget);
    expect(find.byTooltip('Hiện mật khẩu'), findsNWidgets(3));
    await t.tap(find.byTooltip('Hiện mật khẩu').first);
    await t.pump();
    expect(find.byTooltip('Ẩn mật khẩu'), findsNWidgets(3));
    await t.enterText(
      find.widgetWithText(TextField, 'Mật khẩu hiện tại'),
      'old',
    );
    await t.enterText(find.widgetWithText(TextField, 'Mật khẩu mới'), 'short');
    await t.tap(find.byType(FilledButton));
    await t.pump();
    expect(find.text('Mật khẩu mới cần ít nhất 12 ký tự'), findsOneWidget);
    expect(calls, 0);
  });
}
