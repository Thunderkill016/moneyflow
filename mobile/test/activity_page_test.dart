import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/data/demo_store.dart';
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
    loadPage: inMemoryPageLoader([_plain, _split]),
    onDelete: (_) async {},
    onEdit: (tx) async => edited.add(tx),
  ),
);

const _review = Transaction(
  id: 'tx-review',
  kind: TransactionKind.expense,
  categoryId: 'cat-transport',
  category: 'Di chuyển',
  note: 'Grab',
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: 32000,
  occurredOn: '2026-10-11',
  reviewStatus: TransactionReviewStatus.needsReview,
);

const _transfer = Transaction(
  id: 'tx-transfer',
  kind: TransactionKind.transfer,
  categoryId: '',
  category: 'Chuyển khoản',
  note: 'Rút tiền',
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: 500000,
  occurredOn: '2026-10-10',
  destinationAccountId: 'a2',
  destinationAccount: 'VCB',
);

class _Bulk {
  final reviews = <(List<String>, bool)>[];
  final categories = <(List<String>, String)>[];
}

Widget _bulkPage(
  _Bulk spy, {
  List<Transaction> txs = const [_plain, _review],
  bool bulk = true,
}) => MaterialApp(
  home: ActivityPage(
    loadPage: inMemoryPageLoader(txs),
    onDelete: (_) async {},
    onEdit: (_) async {},
    onBulkReview: bulk
        ? (ids, {required reviewed}) async => spy.reviews.add((ids, reviewed))
        : null,
    onBulkCategory: bulk
        ? (ids, cat) async => spy.categories.add((ids, cat))
        : null,
    loadCategories: bulk ? () async => DemoStore.seedCategories() : null,
  ),
);

void main() {
  testWidgets('a failed load shows an error with retry, not an empty ledger', (
    t,
  ) async {
    var calls = 0;
    await t.pumpWidget(
      MaterialApp(
        home: ActivityPage(
          loadPage: (q, {offset = 0}) async {
            calls++;
            if (calls == 1) throw Exception('offline');
            return const TransactionPage([_plain], hasMore: false);
          },
          onDelete: (_) async {},
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.text('Không tải được hoạt động'), findsOneWidget);
    expect(find.text('Chưa có giao dịch nào'), findsNothing);

    await t.tap(find.text('Thử lại'));
    await t.pumpAndSettle();
    expect(find.text('Bún bò'), findsOneWidget);
  });

  group('ActivityPage bulk', () {
    testWidgets('demo (no bulk callbacks) has no select mode', (t) async {
      await t.pumpWidget(_bulkPage(_Bulk(), bulk: false));
      await t.pumpAndSettle();
      expect(find.byTooltip('Chọn nhiều'), findsNothing);
      expect(find.textContaining('Cần xem lại ('), findsNothing);
    });

    testWidgets('chip counts and filters to rows needing review', (t) async {
      await t.pumpWidget(_bulkPage(_Bulk()));
      await t.pumpAndSettle();
      expect(find.text('Cần xem lại (1)'), findsOneWidget);
      expect(find.text('Bún bò'), findsOneWidget);

      await t.tap(find.text('Cần xem lại (1)'));
      await t.pumpAndSettle();
      expect(find.text('Bún bò'), findsNothing);
      expect(find.text('Grab'), findsOneWidget);
    });

    testWidgets('select two rows and mark reviewed', (t) async {
      final spy = _Bulk();
      await t.pumpWidget(_bulkPage(spy));
      await t.pumpAndSettle();

      await t.tap(find.byTooltip('Chọn nhiều'));
      await t.pumpAndSettle();
      expect(find.text('Đã chọn 0'), findsOneWidget);
      // Nothing to act on until something is selected.
      final reviewedButton = find.ancestor(
        of: find.text('Đã xem'),
        matching: find.byWidgetPredicate((w) => w is TextButton),
      );
      expect(t.widget<TextButton>(reviewedButton).onPressed, isNull);

      await t.tap(find.text('Bún bò'));
      await t.pump();
      await t.tap(find.text('Grab'));
      await t.pumpAndSettle();
      expect(find.text('Đã chọn 2'), findsOneWidget);

      await t.tap(find.text('Đã xem'));
      await t.pumpAndSettle();

      expect(spy.reviews.single.$1.toSet(), {'tx-plain', 'tx-review'});
      expect(spy.reviews.single.$2, isTrue);
      // Select mode ends after a successful action.
      expect(find.text('Hoạt động'), findsOneWidget);
    });

    testWidgets(
      'category change posts the picked category for same-kind rows',
      (t) async {
        final spy = _Bulk();
        await t.pumpWidget(_bulkPage(spy));
        await t.pumpAndSettle();
        await t.tap(find.byTooltip('Chọn nhiều'));
        await t.pumpAndSettle();
        await t.tap(find.text('Bún bò'));
        await t.pump();
        await t.tap(find.text('Grab'));
        await t.pump();
        await t.tap(find.text('Đổi danh mục'));
        await t.pumpAndSettle();

        // Only expense categories are offered for an expense selection.
        expect(find.text('Lương'), findsNothing);
        await t.tap(find.text('Hóa đơn'));
        await t.pumpAndSettle();

        expect(spy.categories.single.$1.toSet(), {'tx-plain', 'tx-review'});
        expect(spy.categories.single.$2, 'cat-bills');
      },
    );

    testWidgets('a transfer in the selection blocks the category change', (
      t,
    ) async {
      final spy = _Bulk();
      await t.pumpWidget(_bulkPage(spy, txs: const [_plain, _transfer]));
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Chọn nhiều'));
      await t.pumpAndSettle();
      await t.tap(find.text('Bún bò'));
      await t.pump();
      await t.tap(find.text('Rút tiền'));
      await t.pump();
      await t.tap(find.text('Đổi danh mục'));
      await t.pumpAndSettle();

      expect(find.text('Khoản chuyển không có danh mục'), findsOneWidget);
      expect(spy.categories, isEmpty);
    });

    testWidgets('a server rejection keeps select mode and explains', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: inMemoryPageLoader(const [_plain]),
            onDelete: (_) async {},
            onBulkReview: (ids, {required reviewed}) async =>
                throw Exception('transaction_selection_not_found'),
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Chọn nhiều'));
      await t.pumpAndSettle();
      await t.tap(find.text('Bún bò'));
      await t.pump();
      await t.tap(find.text('Đã xem'));
      await t.pumpAndSettle();

      expect(
        find.text('Có giao dịch vừa bị xóa — tải lại rồi thử lại'),
        findsOneWidget,
      );
      expect(find.text('Đã chọn 1'), findsOneWidget);
    });
  });

  group('swipe-to-review (D5)', () {
    testWidgets('only flagged rows carry the swipe affordance', (t) async {
      await t.pumpWidget(_bulkPage(_Bulk()));
      await t.pumpAndSettle();

      expect(
        find.ancestor(
          of: find.text('Grab'),
          matching: find.byType(Dismissible),
        ),
        findsOneWidget,
      );
      expect(
        find.ancestor(
          of: find.text('Bún bò'),
          matching: find.byType(Dismissible),
        ),
        findsNothing,
      );
    });

    testWidgets('swipe right marks reviewed through the bulk seam', (t) async {
      final spy = _Bulk();
      await t.pumpWidget(_bulkPage(spy));
      await t.pumpAndSettle();

      await t.drag(find.text('Grab'), const Offset(500, 0));
      await t.pumpAndSettle();

      expect(spy.reviews.single.$1, ['tx-review']);
      expect(spy.reviews.single.$2, isTrue);
      // The write landed → the flag line and the chip both clear.
      expect(find.textContaining('Cần xem lại'), findsNothing);
      expect(find.text('Đã đánh dấu đã xem'), findsOneWidget);
      expect(find.text('Hoàn tác'), findsOneWidget);
    });

    testWidgets('undo re-flags the row through the same seam', (t) async {
      final spy = _Bulk();
      await t.pumpWidget(_bulkPage(spy));
      await t.pumpAndSettle();

      await t.drag(find.text('Grab'), const Offset(500, 0));
      await t.pumpAndSettle();
      await t.tap(find.text('Hoàn tác'));
      await t.pumpAndSettle();

      expect(spy.reviews.length, 2);
      expect(spy.reviews.last.$1, ['tx-review']);
      expect(spy.reviews.last.$2, isFalse);
      expect(find.textContaining('Cần xem lại'), findsWidgets);
    });

    testWidgets('a failed swipe write snaps back and explains', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: inMemoryPageLoader(const [_plain, _review]),
            onBulkReview: (ids, {required reviewed}) async =>
                throw Exception('offline'),
          ),
        ),
      );
      await t.pumpAndSettle();

      await t.drag(find.text('Grab'), const Offset(500, 0));
      await t.pumpAndSettle();

      expect(find.text('Không thực hiện được — thử lại'), findsOneWidget);
      expect(find.textContaining('Cần xem lại'), findsWidgets);
    });

    testWidgets('under the needs-review filter a swiped row leaves the list', (
      t,
    ) async {
      await t.pumpWidget(_bulkPage(_Bulk()));
      await t.pumpAndSettle();
      await t.tap(find.text('Cần xem lại (1)'));
      await t.pumpAndSettle();
      expect(find.text('Grab'), findsOneWidget);

      await t.drag(find.text('Grab'), const Offset(500, 0));
      await t.pumpAndSettle();

      expect(find.text('Grab'), findsNothing);
      expect(find.text('Không còn khoản nào cần xem lại'), findsOneWidget);
    });

    testWidgets('initialOnlyNeedsReview opens the feed pre-filtered', (
      t,
    ) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: inMemoryPageLoader(const [_plain, _review]),
            onBulkReview: (ids, {required reviewed}) async {},
            initialOnlyNeedsReview: true,
            title: 'Cần xem lại',
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Cần xem lại'), findsWidgets); // title + chip/line
      expect(find.text('Grab'), findsOneWidget);
      expect(find.text('Bún bò'), findsNothing);
    });
  });

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

  group('report drill-in (initialQuery + title)', () {
    const paid = Transaction(
      id: 'tx-paid',
      kind: TransactionKind.expense,
      categoryId: 'cat-food',
      category: 'Ăn uống',
      note: 'Bún bò',
      accountId: 'a1',
      account: 'Tiền mặt',
      amount: 45000,
      occurredOn: '2026-10-12',
      payee: 'Quán gần nhà',
    );

    testWidgets('the feed opens pre-filtered and the title names the slice', (
      t,
    ) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: inMemoryPageLoader([paid, _transfer]),
            onDelete: (_) async {},
            initialQuery: const TransactionQuery(
              kind: TransactionKind.expense,
              payee: 'Quán gần nhà',
              dateFrom: '2026-10-01',
              dateTo: '2026-10-31',
            ),
            title: 'Quán gần nhà · Tháng 10/2026',
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Quán gần nhà · Tháng 10/2026'), findsOneWidget);
      // The payee + period filters render as removable chips.
      expect(find.text('Người nhận: Quán gần nhà'), findsOneWidget);
      expect(find.textContaining('10/2026'), findsWidgets);
      // Only the matching row loads — the transfer is filtered out.
      expect(find.text('Bún bò'), findsOneWidget);
      expect(find.text('Rút tiền'), findsNothing);
    });

    testWidgets('the unnamed payee bucket chips as "Không tên"', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: inMemoryPageLoader([paid, _plain]),
            onDelete: (_) async {},
            // '' is the report's payee-less bucket — only _plain (no
            // stored payee) should remain.
            initialQuery: const TransactionQuery(payee: ''),
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Người nhận: Không tên'), findsOneWidget);
      expect(find.text('Bún bò'), findsOneWidget); // _plain
      expect(find.text('Quán gần nhà'), findsNothing); // paid filtered out
    });
  });

  group('lazy feed', () {
    // 60 rows across 20 days — far more than any test viewport can show.
    // The eager children-list this replaced mounted every row on build;
    // the builder must only materialize the viewport's worth.
    final rows = [
      for (var i = 0; i < 60; i++)
        Transaction(
          id: 'tx-$i',
          kind: TransactionKind.expense,
          categoryId: 'cat-food',
          category: 'Ăn uống',
          note: 'row-${i.toString().padLeft(2, '0')}',
          accountId: 'a1',
          account: 'Tiền mặt',
          amount: 1000 + i,
          occurredOn: '2026-10-${((i ~/ 3) + 1).toString().padLeft(2, '0')}',
        ),
    ];

    testWidgets('offscreen rows are not built until scrolled to', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: inMemoryPageLoader(rows, pageSize: 60),
            onDelete: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();

      // Feed order is newest-day-first — 'row-59' (day 20) leads.
      expect(find.text('row-59'), findsOneWidget);
      // 60 rows in, the tail is nowhere near the viewport — an eager
      // list would have built (and thus found) every note already.
      expect(find.text('row-00'), findsNothing);
      expect(find.text('row-30'), findsNothing);

      await t.fling(find.byType(ListView), const Offset(0, -4000), 10000);
      await t.pumpAndSettle();
      expect(find.text('row-00'), findsOneWidget);
    });

    testWidgets('day headers survive the lazy conversion', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: inMemoryPageLoader(rows, pageSize: 60),
            onDelete: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();

      // Rows sorted desc by day → first header is the newest day, and
      // more day labels exist as lazily-built separators.
      expect(find.bySemanticsLabel(RegExp(r'\d{2}/\d{2}/2026')), findsWidgets);
      expect(find.byType(ListView), findsOneWidget);
    });
  });

  test('Transaction.isSplit needs more than one line', () {
    expect(_plain.isSplit, isFalse);
    expect(_split.isSplit, isTrue);
  });
}
