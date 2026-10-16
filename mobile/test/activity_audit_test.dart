import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/activity/activity_page.dart';
import 'package:moneyflow/features/activity/trash_page.dart';
import 'package:moneyflow/features/timeline/timeline_page.dart';

Transaction _tx(
  String id, {
  String day = '2026-10-14',
  int amount = 50000,
  TransactionReviewStatus review = TransactionReviewStatus.reviewed,
}) => Transaction(
  id: id,
  kind: TransactionKind.expense,
  categoryId: 'c1',
  category: 'Ăn uống',
  note: 'Ghi $id',
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: day,
  reviewStatus: review,
);

void main() {
  testWidgets('delete offers an Open-trash action', (tester) async {
    var opened = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: inMemoryPageLoader([_tx('a')]),
          onDelete: (_) async {},
          onOpenTrash: () => opened++,
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.longPress(find.text('Ghi a'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Xóa'));
    await tester.pumpAndSettle();
    expect(find.text('Đã chuyển vào thùng rác'), findsOneWidget);
    await tester.tap(find.text('Mở thùng rác'));
    expect(opened, 1);
  });

  testWidgets('the row shows a visible delete affordance (web parity)', (
    tester,
  ) async {
    String? deleted;
    await tester.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: inMemoryPageLoader([_tx('a')]),
          onDelete: (id) async => deleted = id,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // No long-press needed — the icon is visible on the row.
    await tester.tap(find.byTooltip('Xóa giao dịch'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Xóa'));
    await tester.pumpAndSettle();
    expect(deleted, 'a');
  });

  testWidgets('a null delete seam hides the affordance (demo honesty)', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(home: ActivityPage(loadPage: inMemoryPageLoader([_tx('a')]))),
    );
    await tester.pumpAndSettle();
    expect(find.byTooltip('Xóa giao dịch'), findsNothing);
    // Long-press opens nothing either — no fake delete surface.
    await tester.longPress(find.text('Ghi a'));
    await tester.pumpAndSettle();
    expect(find.text('Xóa giao dịch?'), findsNothing);
  });

  testWidgets('a refused delete keeps the row and names the reason', (
    tester,
  ) async {
    var loads = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: (q, {offset = 0}) async {
            loads++;
            return TransactionPage([_tx('a')], hasMore: false);
          },
          onDelete: (_) async =>
              throw Exception('P0001 recurring_payment_locked'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.longPress(find.text('Ghi a'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Xóa'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Định kỳ'), findsOneWidget);
    expect(find.text('Ghi a'), findsOneWidget);
    // A refused delete must not reload — the visible row is still truth.
    expect(loads, 1);
  });

  testWidgets('no trash action when onOpenTrash is null', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: inMemoryPageLoader([_tx('a')]),
          onDelete: (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.longPress(find.text('Ghi a'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Xóa'));
    await tester.pumpAndSettle();
    expect(find.text('Đã chuyển vào thùng rác'), findsOneWidget);
    expect(find.text('Mở thùng rác'), findsNothing);
  });

  testWidgets('feed groups by day with headers', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: inMemoryPageLoader([
            _tx('a', day: '2026-01-14'),
            _tx('b', day: '2026-01-14'),
            _tx('c', day: '2026-01-13'),
          ]),
          onDelete: (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    // One header per day plus each row's own trailing date.
    expect(find.text('14/01/2026'), findsNWidgets(3));
    expect(find.text('13/01/2026'), findsNWidgets(2));
  });

  testWidgets('review chip shows N+ while more pages exist; select-all is '
      'worded for visible rows', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: inMemoryPageLoader([
            _tx('a', review: TransactionReviewStatus.needsReview),
            _tx('b', day: '2026-10-13'),
          ], pageSize: 1),
          onDelete: (_) async {},
          onBulkReview: (ids, {required reviewed}) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Cần xem lại (1+)'), findsOneWidget);
    await tester.tap(find.byTooltip('Chọn nhiều'));
    await tester.pump();
    expect(find.text('Chọn mục đang hiện'), findsOneWidget);
    expect(find.text('Chọn tất cả'), findsNothing);
  });

  testWidgets('row exposes a combined semantics label', (tester) async {
    final handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: inMemoryPageLoader([
            _tx('a', review: TransactionReviewStatus.needsReview),
          ]),
          onDelete: (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(
      find.bySemanticsLabel(
        RegExp(r'^Chi .*Ăn uống, Tiền mặt, 14/10/2026, cần xem lại$'),
      ),
      findsOneWidget,
    );
    handle.dispose();
  });

  testWidgets('2x text scale does not overflow the trailing amount', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: const TextScaler.linear(2)),
          child: child!,
        ),
        home: ActivityPage(
          loadPage: inMemoryPageLoader([_tx('a', amount: 1234567890)]),
          onDelete: (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('trash row shows amount and dd/MM/yyyy; empty keeps text', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        home: TrashPage(
          loadDeleted: () async => [
            DeletedTransaction(
              transaction: _tx('a', day: '2026-09-10'),
              deletedAt: '2026-09-13T03:04:05Z',
            ),
          ],
          onRestore: (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.textContaining('10/09/2026'), findsOneWidget);
    expect(find.textContaining('50.000'), findsOneWidget);
    final size = tester.getSize(find.widgetWithText(TextButton, 'Khôi phục'));
    expect(size.width, greaterThanOrEqualTo(48));
    expect(size.height, greaterThanOrEqualTo(48));

    await tester.pumpWidget(
      MaterialApp(
        home: TrashPage(
          key: const ValueKey('empty'),
          loadDeleted: () async => [],
          onRestore: (_) async {},
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Thùng rác trống'), findsOneWidget);
  });

  testWidgets('timeline load-more failure shows Thử lại and retries', (
    tester,
  ) async {
    var calls = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: TimelinePage(
          today: '2026-10-14',
          loadPage: (q, {int offset = 0}) async {
            calls++;
            if (offset == 0) {
              return TransactionPage([
                for (var i = 0; i < 12; i++) _tx('r$i'),
              ], hasMore: true);
            }
            if (calls < 3) throw Exception('boom');
            return TransactionPage([
              _tx('late', day: '2026-10-01'),
            ], hasMore: false);
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.drag(find.byType(ListView), const Offset(0, -3000));
    await tester.pumpAndSettle();
    expect(find.text('Không tải thêm được'), findsOneWidget);
    await tester.tap(find.text('Thử lại'));
    await tester.pumpAndSettle();
    expect(find.text('Không tải thêm được'), findsNothing);
  });
}
