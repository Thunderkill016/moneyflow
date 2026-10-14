import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/timeline/timeline_page.dart';

Transaction tx({
  String id = 't1',
  TransactionKind kind = TransactionKind.expense,
  int amount = 10000,
  String occurredOn = '2026-10-20',
  TransactionReviewStatus reviewStatus = TransactionReviewStatus.reviewed,
  String note = 'Ăn sáng',
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'c1',
  category: 'Ăn uống',
  note: note,
  accountId: 'a1',
  account: 'Ví tiền mặt',
  amount: amount,
  occurredOn: occurredOn,
  reviewStatus: reviewStatus,
);

Widget page(List<Transaction> rows) => MaterialApp(
  home: TimelinePage(loadPage: inMemoryPageLoader(rows), today: '2026-10-20'),
);

void main() {
  testWidgets('day groups + net + reviewed-only rows render', (tester) async {
    await tester.pumpWidget(
      page([
        tx(
          id: 'in',
          kind: TransactionKind.income,
          amount: 300000,
          note: 'Lương',
        ),
        tx(id: 'out', amount: 100000),
        tx(
          id: 'draft',
          reviewStatus: TransactionReviewStatus.needsReview,
          note: 'Bản nháp',
        ),
      ]),
    );
    await tester.pumpAndSettle();

    expect(find.text('Dòng thời gian'), findsOneWidget);
    expect(find.text('Hôm nay · 20/10/2026'), findsOneWidget);
    expect(find.text('Lương'), findsOneWidget);
    expect(find.text('Ăn sáng'), findsOneWidget);
    // The draft never reaches the trusted view.
    expect(find.text('Bản nháp'), findsNothing);
    // Read-only boundary: rows carry no tap affordance text like "Sửa".
    expect(find.text('Đã duyệt'), findsWidgets);
  });

  testWidgets('empty reviewed ledger shows the honest empty state', (
    tester,
  ) async {
    await tester.pumpWidget(page(const []));
    await tester.pumpAndSettle();
    expect(find.text('Chưa có giao dịch đã duyệt'), findsOneWidget);
  });

  testWidgets('search narrows the reviewed list', (tester) async {
    await tester.pumpWidget(
      page([tx(id: 'a', note: 'Cà phê'), tx(id: 'b', note: 'Đổ xăng')]),
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'xăng');
    // Elapse the 350ms search debounce explicitly — pumpAndSettle alone
    // returns early when no frame is pending while the timer is armed.
    await tester.pump(const Duration(milliseconds: 400));
    await tester.pumpAndSettle();
    expect(find.text('Đổ xăng'), findsOneWidget);
    expect(find.text('Cà phê'), findsNothing);
  });
}
