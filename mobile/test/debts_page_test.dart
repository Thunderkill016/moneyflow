import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/debts.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/debts/debts_page.dart';

const _owe = Debt(
  id: 'd1',
  counterparty: 'Anh Hai',
  direction: DebtDirection.payable,
  principalMinor: 2000000,
  remainingMinor: 1500000,
  note: 'mượn trả lương',
  dueDate: '2026-12-01',
);

const _lentOpen = Debt(
  id: 'd2',
  counterparty: 'Em Lan',
  direction: DebtDirection.receivable,
  principalMinor: 300000,
  remainingMinor: 300000,
);

const _settled = Debt(
  id: 'd3',
  counterparty: 'Chú Sáu',
  direction: DebtDirection.payable,
  principalMinor: 800000,
  remainingMinor: 0,
  state: DebtState.settled,
);

const _archived = Debt(
  id: 'd4',
  counterparty: 'Cô Bảy',
  direction: DebtDirection.receivable,
  principalMinor: 100000,
  remainingMinor: 50000,
  state: DebtState.archived,
);

const _account = AccountSummary(
  id: 'a1',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 500000,
);

const _expenseCat = Category(
  id: 'c1',
  name: 'Trả nợ',
  kind: TransactionKind.expense,
);
const _incomeCat = Category(
  id: 'c2',
  name: 'Thu nợ',
  kind: TransactionKind.income,
);

Widget _page({
  Future<List<Debt>> Function()? loadDebts,
  Future<void> Function(DebtDraft)? onCreate,
  Future<String> Function(DebtRepayment)? onRepay,
  Future<void> Function(String, DebtState)? onSetState,
  Future<void> Function(String)? onDelete,
}) => MaterialApp(
  home: DebtsPage(
    loadDebts: loadDebts ?? () async => const [],
    loadAccounts: () async => [_account],
    loadCategories: () async => [_expenseCat, _incomeCat],
    onCreate: onCreate ?? (_) async {},
    onRepay: onRepay ?? (_) async => 'tx-1',
    onSetState: onSetState ?? (_, _) async {},
    onDelete: onDelete ?? (_) async {},
  ),
);

void main() {
  testWidgets('empty state offers the add action only when the seam exists', (
    t,
  ) async {
    await t.pumpWidget(
      MaterialApp(home: DebtsPage(loadDebts: () async => const [])),
    );
    await t.pumpAndSettle();
    expect(find.text('Chưa có khoản nợ nào'), findsOneWidget);
    // No write seam → no affordance: a demo/read-only surface never
    // fakes a create.
    expect(find.text('Thêm khoản nợ'), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('add flow collects direction, counterparty, principal', (
    t,
  ) async {
    DebtDraft? saved;
    await t.pumpWidget(_page(onCreate: (d) async => saved = d));
    await t.pumpAndSettle();

    await t.tap(find.widgetWithText(FloatingActionButton, 'Thêm khoản nợ'));
    await t.pumpAndSettle();
    expect(find.text('Vay của ai'), findsOneWidget);

    // Flip to cho vay and fill the form.
    await t.tap(find.text('Cho vay'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Cho ai vay'), 'Em Lan');
    await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '1tr5');
    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();

    expect(saved, isNotNull);
    expect(saved!.direction, DebtDirection.receivable);
    expect(saved!.counterparty, 'Em Lan');
    expect(saved!.principalMinor, 1500000);
    expect(saved!.dueDate, isNull);
  });

  testWidgets('a blank counterparty keeps the dialog open with an error', (
    t,
  ) async {
    var calls = 0;
    await t.pumpWidget(_page(onCreate: (_) async => calls++));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(FloatingActionButton, 'Thêm khoản nợ'));
    await t.pumpAndSettle();
    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();
    expect(find.text('Nhập tên người vay/cho vay'), findsOneWidget);
    expect(calls, 0);
  });

  testWidgets('open debts group per counterparty with outstanding totals', (
    t,
  ) async {
    await t.pumpWidget(
      _page(loadDebts: () async => [_owe, _lentOpen, _settled]),
    );
    await t.pumpAndSettle();

    // Summary card shows both directions separately — never netted.
    expect(find.text('Đang nợ'), findsOneWidget);
    expect(find.text('Đang cho vay'), findsOneWidget);
    expect(find.text('1.500.000 ₫'), findsWidgets);
    expect(find.text('300.000 ₫'), findsWidgets);
    // Per-counterparty headers carry direction + remaining.
    expect(find.text('Anh Hai · Đi vay'), findsOneWidget);
    expect(find.text('Em Lan · Cho vay'), findsOneWidget);
    expect(find.textContaining('mượn trả lương'), findsOneWidget);
    expect(find.textContaining('01/12/2026'), findsOneWidget);
    // The settled row is sectioned out of the open groups — its tile
    // carries the counterparty since there is no group header above it.
    expect(find.text('Đã xong'), findsWidgets);
    expect(find.text('Chú Sáu · Đã xong'), findsOneWidget);
  });

  testWidgets('payable row offers Trả nợ; receivable offers Thu nợ', (t) async {
    await t.pumpWidget(_page(loadDebts: () async => [_owe, _lentOpen]));
    await t.pumpAndSettle();
    expect(find.text('Trả nợ'), findsOneWidget);
    expect(find.text('Thu nợ'), findsOneWidget);
  });

  testWidgets('repay dialog validates remaining and submits the repayment', (
    t,
  ) async {
    DebtRepayment? sent;
    await t.pumpWidget(
      _page(
        loadDebts: () async => [_owe],
        onRepay: (r) async {
          sent = r;
          return 'tx-9';
        },
      ),
    );
    await t.pumpAndSettle();

    await t.tap(find.text('Trả nợ'));
    await t.pumpAndSettle();
    expect(find.textContaining('còn lại 1.500.000 ₫'), findsOneWidget);

    // Overpaying is refused client-side before the RPC ever leaves.
    await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '2tr');
    await t.tap(find.text('Trả'));
    await t.pumpAndSettle();
    expect(find.textContaining('vượt phần còn lại'), findsOneWidget);
    expect(sent, isNull);

    // A valid partial repayment goes through with the debt id, account,
    // category, date and a minted idempotency key.
    await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '500k');
    await t.tap(find.text('Trả'));
    await t.pumpAndSettle();

    expect(sent, isNotNull);
    expect(sent!.debtId, 'd1');
    expect(sent!.amountMinor, 500000);
    expect(sent!.accountId, 'a1');
    expect(sent!.categoryId, 'c1'); // expense category for đi vay
    expect(sent!.occurredOn, matches(RegExp(r'^\d{4}-\d{2}-\d{2}$')));
    expect(sent!.idempotencyKey, matches(RegExp(r'^[0-9a-f-]{36}$')));
    expect(find.text('Đã ghi khoản trả nợ'), findsOneWidget);
  });

  testWidgets('receivable repayment picks an income category', (t) async {
    DebtRepayment? sent;
    await t.pumpWidget(
      _page(
        loadDebts: () async => [_lentOpen],
        onRepay: (r) async {
          sent = r;
          return 'tx-9';
        },
      ),
    );
    await t.pumpAndSettle();

    await t.tap(find.text('Thu nợ'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '300k');
    await t.tap(find.text('Thu'));
    await t.pumpAndSettle();

    // The dialog offered only income categories — 'Thu nợ' (income) is
    // the one that landed, never the expense category.
    expect(sent!.categoryId, 'c2');
    expect(find.text('Đã ghi khoản thu nợ'), findsOneWidget);
  });

  testWidgets('a failed repayment keeps the dialog open with mapped copy', (
    t,
  ) async {
    var calls = 0;
    await t.pumpWidget(
      _page(
        loadDebts: () async => [_owe],
        onRepay: (_) async {
          calls++;
          throw Exception('repayment_exceeds_remaining');
        },
      ),
    );
    await t.pumpAndSettle();
    await t.tap(find.text('Trả nợ'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '500k');
    await t.tap(find.text('Trả'));
    await t.pumpAndSettle();

    expect(calls, 1);
    expect(find.text('Số tiền vượt phần còn lại của khoản nợ'), findsOneWidget);
    expect(find.byType(AlertDialog), findsOneWidget); // stayed open
  });

  testWidgets('marking done, archiving and restoring go through set_state', (
    t,
  ) async {
    final calls = <(String, DebtState)>[];
    var debts = [_owe, _archived];
    await t.pumpWidget(
      _page(
        loadDebts: () async => debts,
        onSetState: (id, state) async => calls.add((id, state)),
      ),
    );
    await t.pumpAndSettle();

    // Settle the open debt.
    await t.tap(find.byTooltip('Tùy chọn Anh Hai'));
    await t.pumpAndSettle();
    await t.tap(find.text('Đánh dấu đã xong'));
    await t.pumpAndSettle();
    await t.tap(find.text('Đồng ý'));
    await t.pumpAndSettle();
    expect(calls, [('d1', DebtState.settled)]);

    // The archived row restores from the "Đã lưu trữ" section.
    await t.tap(find.byTooltip('Tùy chọn Cô Bảy'));
    await t.pumpAndSettle();
    await t.tap(find.text('Khôi phục'));
    await t.pumpAndSettle();
    expect(calls.last, ('d4', DebtState.open));
  });

  testWidgets(
    'delete is offered on archived rows and tombstones via onDelete',
    (t) async {
      String? deleted;
      await t.pumpWidget(
        _page(
          loadDebts: () async => [_archived],
          onDelete: (id) async => deleted = id,
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Đã lưu trữ'), findsOneWidget);

      await t.tap(find.byTooltip('Tùy chọn Cô Bảy'));
      await t.pumpAndSettle();
      await t.tap(find.text('Xóa'));
      await t.pumpAndSettle();
      // The confirm copy is honest: ledger transactions survive.
      expect(find.textContaining('vẫn giữ trong sổ'), findsOneWidget);
      await t.tap(find.text('Đồng ý'));
      await t.pumpAndSettle();
      expect(deleted, 'd4');
    },
  );

  testWidgets('read-only surface hides repay and overflow affordances', (
    t,
  ) async {
    await t.pumpWidget(
      MaterialApp(home: DebtsPage(loadDebts: () async => [_owe])),
    );
    await t.pumpAndSettle();
    expect(find.text('Anh Hai · Đi vay'), findsOneWidget);
    expect(find.text('Trả nợ'), findsNothing);
    expect(find.byTooltip('Tùy chọn Anh Hai'), findsNothing);
  });

  testWidgets('a failed load shows the retry surface, not a spinner', (
    t,
  ) async {
    var loads = 0;
    await t.pumpWidget(
      _page(
        loadDebts: () async {
          loads++;
          throw Exception('network');
        },
      ),
    );
    await t.pumpAndSettle();
    expect(find.text('Không tải được khoản nợ'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);

    await t.tap(find.text('Thử lại'));
    await t.pumpAndSettle();
    expect(loads, 2);
  });
}
