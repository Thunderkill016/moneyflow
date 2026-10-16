import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/activity/activity_page.dart';

Transaction _tx(
  int i, {
  TransactionKind kind = TransactionKind.expense,
  String note = '',
  int amount = 10000,
  String? payee,
}) => Transaction(
  id: 't$i',
  kind: kind,
  categoryId: 'cat-food',
  category: 'Ăn uống',
  note: note.isEmpty ? 'Khoản $i' : note,
  accountId: 'acc-cash',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: '2026-10-${(i % 28 + 1).toString().padLeft(2, '0')}',
  payee: payee,
);

class _Spy {
  final calls = <(TransactionQuery, int)>[];
}

Widget _page(
  TransactionPageLoader load, {
  Future<void> Function(String)? onDelete,
}) => MaterialApp(
  home: ActivityPage(
    loadPage: load,
    loadAccounts: () async => DemoStore.seedAccounts(),
    loadCategories: () async => DemoStore.seedCategories(),
    onDelete: onDelete ?? (_) async {},
  ),
);

TransactionPageLoader _spied(_Spy spy, List<Transaction> all) {
  final inner = inMemoryPageLoader(all);
  return (q, {offset = 0}) {
    spy.calls.add((q, offset));
    return inner(q, offset: offset);
  };
}

void main() {
  testWidgets('typing searches after the debounce and chip clears it', (
    t,
  ) async {
    final spy = _Spy();
    final all = [_tx(1, note: 'Cafe sáng'), _tx(2, note: 'Xăng')];
    await t.pumpWidget(_page(_spied(spy, all)));
    await t.pumpAndSettle();
    expect(find.text('Cafe sáng'), findsOneWidget);

    await t.tap(find.byTooltip('Tìm kiếm'));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'cafe');
    await t.pump(const Duration(milliseconds: 200));
    expect(spy.calls.length, 1, reason: 'debounced, not per keystroke');
    await t.pump(const Duration(milliseconds: 200));
    await t.pumpAndSettle();
    expect(spy.calls.last.$1.text, 'cafe');
    expect(find.text('Xăng'), findsNothing);
    expect(find.text('Cafe sáng'), findsOneWidget);

    await t.tap(find.text('Xóa bộ lọc'));
    await t.pumpAndSettle();
    expect(find.text('Xăng'), findsOneWidget);
    expect(find.text('Cafe sáng'), findsOneWidget);
  });

  testWidgets('empty results are honest about filters vs empty ledger', (
    t,
  ) async {
    await t.pumpWidget(_page(inMemoryPageLoader([_tx(1)])));
    await t.pumpAndSettle();
    await t.tap(find.byTooltip('Tìm kiếm'));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'zzz');
    await t.pump(const Duration(milliseconds: 400));
    await t.pumpAndSettle();
    expect(find.text('Không có giao dịch khớp bộ lọc'), findsOneWidget);
    expect(find.text('Chưa có giao dịch nào'), findsNothing);

    await t.pumpWidget(const SizedBox());
    await t.pumpWidget(_page(inMemoryPageLoader(const [])));
    await t.pumpAndSettle();
    expect(find.text('Chưa có giao dịch nào'), findsOneWidget);
  });

  testWidgets('filter sheet applies kind + amount and chips remove them', (
    t,
  ) async {
    final spy = _Spy();
    final all = [
      _tx(1, note: 'Nhỏ', amount: 20000),
      _tx(2, note: 'Lớn', amount: 900000),
      _tx(3, note: 'Lương', kind: TransactionKind.income, amount: 900000),
    ];
    await t.pumpWidget(_page(_spied(spy, all)));
    await t.pumpAndSettle();

    await t.tap(find.byTooltip('Bộ lọc'));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(ChoiceChip, 'Chi tiêu'));
    await t.pump();
    await t.enterText(find.widgetWithText(TextField, 'Từ số tiền'), '100k');
    await t.tap(find.text('Áp dụng'));
    await t.pumpAndSettle();

    expect(spy.calls.last.$1.kind, TransactionKind.expense);
    expect(spy.calls.last.$1.minAmount, 100000);
    expect(find.text('Lớn'), findsOneWidget);
    expect(find.text('Nhỏ'), findsNothing);
    expect(find.text('Lương'), findsNothing);

    // Remove the kind chip only; amount filter stays.
    await t.tap(find.byTooltip('Bỏ bộ lọc Chi tiêu'));
    await t.pumpAndSettle();
    expect(spy.calls.last.$1.kind, isNull);
    expect(spy.calls.last.$1.minAmount, 100000);
    expect(find.text('Lương'), findsOneWidget);
  });

  testWidgets('filter sheet applies an exact payee and clears it', (t) async {
    final spy = _Spy();
    final all = [
      _tx(1, note: 'Bún bò', payee: 'Quán A'),
      _tx(2, note: 'Phở'),
      _tx(3, note: 'Xăng', payee: 'Grab'),
      // 'GrabBike' is a different payee — the field is the exact-match
      // query, not the substring search the app bar runs.
      _tx(4, note: 'Xe ôm', payee: 'GrabBike'),
    ];
    await t.pumpWidget(_page(_spied(spy, all)));
    await t.pumpAndSettle();

    await t.tap(find.byTooltip('Bộ lọc'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Người nhận'), 'Grab');
    await t.tap(find.text('Áp dụng'));
    await t.pumpAndSettle();

    expect(spy.calls.last.$1.payee, 'Grab');
    expect(find.text('Người nhận: Grab'), findsOneWidget);
    expect(find.text('Xăng'), findsOneWidget);
    expect(find.text('Xe ôm'), findsNothing);
    expect(find.text('Bún bò'), findsNothing);

    // Reopen and blank the field — clearing applies like any input.
    await t.tap(find.byTooltip('Bộ lọc'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Người nhận'), '');
    await t.tap(find.text('Áp dụng'));
    await t.pumpAndSettle();
    expect(spy.calls.last.$1.payee, isNull);
    expect(find.text('Bún bò'), findsOneWidget);
    expect(find.text('Xe ôm'), findsOneWidget);
  });

  testWidgets('invalid amount keeps the sheet open with an error', (t) async {
    await t.pumpWidget(_page(inMemoryPageLoader([_tx(1)])));
    await t.pumpAndSettle();
    await t.tap(find.byTooltip('Bộ lọc'));
    await t.pumpAndSettle();
    await t.enterText(find.widgetWithText(TextField, 'Từ số tiền'), 'abc');
    await t.tap(find.text('Áp dụng'));
    await t.pumpAndSettle();
    expect(find.text('Số tiền không hợp lệ'), findsOneWidget);
  });

  testWidgets('scrolling loads the next page; reload resets to page one', (
    t,
  ) async {
    final spy = _Spy();
    final all = [for (var i = 0; i < 70; i++) _tx(i)];
    await t.pumpWidget(_page(_spied(spy, all)));
    await t.pumpAndSettle();
    expect(spy.calls.map((c) => c.$2), [0]);

    final list = find.byType(Scrollable).first;
    await t.drag(list, const Offset(0, -6000));
    await t.pumpAndSettle();
    expect(spy.calls.map((c) => c.$2), contains(transactionPageSize));

    final state = t.state<ActivityPageState>(find.byType(ActivityPage));
    final before = spy.calls.length;
    state.reload();
    await t.pumpAndSettle();
    expect(spy.calls.length, before + 1);
    expect(spy.calls.last.$2, 0);
  });

  testWidgets('a failed later page shows an inline retry, rows are kept', (
    t,
  ) async {
    final all = [for (var i = 0; i < 40; i++) _tx(i)];
    final inner = inMemoryPageLoader(all);
    var failNext = true;
    await t.pumpWidget(
      _page((q, {offset = 0}) async {
        if (offset > 0 && failNext) throw Exception('offline');
        return inner(q, offset: offset);
      }),
    );
    await t.pumpAndSettle();
    // Day headers make row heights uneven, so the lazy list's extent
    // estimate settles after the first drag — scroll to the end twice.
    await t.drag(find.byType(Scrollable).first, const Offset(0, -6000));
    await t.pumpAndSettle();
    await t.drag(find.byType(Scrollable).first, const Offset(0, -6000));
    await t.pumpAndSettle();
    expect(find.text('Không tải thêm được'), findsOneWidget);
    expect(find.text('Không tải được hoạt động'), findsNothing);

    failNext = false;
    await t.tap(find.text('Thử lại'));
    await t.pumpAndSettle();
    expect(find.text('Không tải thêm được'), findsNothing);
  });

  testWidgets('a failing search shows the full error state with retry', (
    t,
  ) async {
    var fail = false;
    final inner = inMemoryPageLoader([_tx(1)]);
    await t.pumpWidget(
      _page((q, {offset = 0}) async {
        if (fail) throw Exception('offline');
        return inner(q, offset: offset);
      }),
    );
    await t.pumpAndSettle();
    fail = true;
    await t.tap(find.byTooltip('Tìm kiếm'));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'x');
    await t.pump(const Duration(milliseconds: 400));
    await t.pumpAndSettle();
    expect(find.text('Không tải được hoạt động'), findsOneWidget);
    expect(find.text('Không có giao dịch khớp bộ lọc'), findsNothing);
  });
}
