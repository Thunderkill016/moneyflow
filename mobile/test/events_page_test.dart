import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/events.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/report.dart' show vnToday;
import 'package:moneyflow/features/events/events_page.dart';

const _cats = [
  Category(id: 'c1', name: 'Ăn uống', kind: TransactionKind.expense),
  Category(id: 'c2', name: 'Di chuyển', kind: TransactionKind.expense),
  // Income kinds can never join an event scope — the picker must not
  // offer them even though the list loads all categories.
  Category(id: 'c9', name: 'Lương', kind: TransactionKind.income),
];

/// Windows relative to the real VN "today" so the phase fixtures can
/// never drift out of date.
EventBudget _active() {
  final t = vnToday();
  return EventBudget(
    id: 'e1',
    name: 'Đà Lạt cùng nhóm',
    startDate: addDaysToYmd(t, -2),
    endDate: addDaysToYmd(t, 5),
    limitMinor: 6000000,
    spentMinor: 1500000,
    categoryIds: const ['c1'],
  );
}

EventBudget _upcoming() {
  final t = vnToday();
  return EventBudget(
    id: 'e2',
    name: 'Tết 2027',
    startDate: addDaysToYmd(t, 4),
    endDate: addDaysToYmd(t, 10),
    limitMinor: 20000000,
    spentMinor: 0,
  );
}

EventBudget _closed() {
  final t = vnToday();
  return EventBudget(
    id: 'e3',
    name: 'Đám cưới em',
    startDate: addDaysToYmd(t, -10),
    endDate: addDaysToYmd(t, -3),
    limitMinor: 5000000,
    spentMinor: 5600000,
  );
}

Transaction _tx({
  required String id,
  TransactionKind kind = TransactionKind.expense,
  String categoryId = 'c1',
  String category = 'Ăn uống',
  int amount = 100000,
  String? occurredOn,
  List<TransactionSplitLine> splitLines = const [],
  int splitCount = 0,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: categoryId,
  category: category,
  note: 'ghi chú $id',
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: occurredOn ?? vnToday(),
  splitCount: splitCount,
  splitLines: splitLines,
);

Widget _page({
  List<EventBudget> events = const [],
  Future<({List<Transaction> rows, bool truncated})> Function(EventBudget)?
  loadTransactions,
  Future<void> Function(EventDraft)? onCreate,
  Future<void> Function(EventBudget, EventDraft)? onUpdate,
  Future<void> Function(String)? onDelete,
}) => MaterialApp(
  home: EventsPage(
    loadEvents: () async => events,
    loadCategories: () async => _cats,
    loadTransactions: loadTransactions,
    onCreate: onCreate ?? (_) async {},
    onUpdate: onUpdate ?? (_, _) async {},
    onDelete: onDelete ?? (_) async {},
  ),
);

void main() {
  testWidgets('empty state explains the feature and hides a fake create', (
    t,
  ) async {
    await t.pumpWidget(const MaterialApp(home: EventsPage(loadEvents: _empty)));
    await t.pumpAndSettle();
    expect(find.text('Chưa có sự kiện nào'), findsOneWidget);
    expect(find.textContaining('Tết'), findsOneWidget);
    // No write seam → no affordance: a read-only surface never fakes
    // a create.
    expect(find.text('Thêm sự kiện'), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('events section into active/upcoming/closed with figures', (
    t,
  ) async {
    await t.pumpWidget(_page(events: [_active(), _upcoming(), _closed()]));
    await t.pumpAndSettle();

    expect(find.text('Đang diễn ra'), findsOneWidget);
    expect(find.text('Sắp tới'), findsOneWidget);
    // Section header AND the card's phase line both read "Đã kết thúc".
    expect(find.text('Đã kết thúc'), findsWidgets);

    expect(find.text('Đà Lạt cùng nhóm'), findsOneWidget);
    expect(find.text('Tết 2027'), findsOneWidget);
    expect(find.text('Đám cưới em'), findsOneWidget);

    // Active card: spent/limit + the days-remaining phase line.
    expect(
      find.textContaining('Đã chi 1.500.000 ₫ / 6.000.000 ₫'),
      findsOneWidget,
    );
    expect(find.textContaining('Còn 5 ngày'), findsOneWidget);
    // Scoped to Ăn uống only — the label resolves the category name.
    expect(find.textContaining('Ăn uống'), findsWidgets);
    // Upcoming card reads its countdown; the closed one shows the over
    // figure, not a live pace claim.
    expect(find.textContaining('Bắt đầu sau 4 ngày'), findsOneWidget);
    expect(find.textContaining('Vượt 600.000 ₫'), findsOneWidget);
  });

  testWidgets('create flow collects name, limit, window and scope', (t) async {
    EventDraft? saved;
    await t.pumpWidget(_page(onCreate: (d) async => saved = d));
    await t.pumpAndSettle();

    await t.tap(find.widgetWithText(FloatingActionButton, 'Thêm sự kiện'));
    await t.pumpAndSettle();
    expect(find.text('Tên sự kiện'), findsOneWidget);

    await t.enterText(
      find.widgetWithText(TextField, 'Tên sự kiện'),
      'Tết 2027',
    );
    await t.enterText(find.widgetWithText(TextField, 'Hạn mức tổng'), '20tr');
    // Scope the event to Ăn uống only; the income category is never
    // offered as a chip.
    expect(find.text('Lương'), findsNothing);
    await t.tap(find.text('Ăn uống'));
    await t.pumpAndSettle();
    await t.tap(find.text('Di chuyển'));
    await t.pumpAndSettle();
    // "Tất cả danh mục" clears the picked set back to unscoped.
    await t.tap(find.text('Tất cả danh mục'));
    await t.pumpAndSettle();
    await t.tap(find.text('Di chuyển'));
    await t.pumpAndSettle();

    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();

    expect(saved, isNotNull);
    expect(saved!.name, 'Tết 2027');
    expect(saved!.limitMinor, 20000000);
    // Default window is a single day — today (VN clock).
    expect(saved!.startDate, vnToday());
    expect(saved!.endDate, vnToday());
    expect(saved!.categoryIds, ['c2']);
    expect(saved!.idempotencyKey, matches(RegExp(r'^[0-9a-f-]{36}$')));
  });

  testWidgets('blank name and bad limit are refused before the RPC', (t) async {
    var calls = 0;
    await t.pumpWidget(_page(onCreate: (_) async => calls++));
    await t.pumpAndSettle();
    await t.tap(find.widgetWithText(FloatingActionButton, 'Thêm sự kiện'));
    await t.pumpAndSettle();

    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();
    expect(find.text('Nhập tên sự kiện'), findsOneWidget);
    expect(calls, 0);

    await t.enterText(find.widgetWithText(TextField, 'Tên sự kiện'), 'Đà Lạt');
    await t.tap(find.text('Tạo'));
    await t.pumpAndSettle();
    expect(find.text('Hạn mức không hợp lệ'), findsOneWidget);
    expect(calls, 0);
  });

  testWidgets('detail lists only the transactions the spent figure counted', (
    t,
  ) async {
    final event = _active(); // scoped to c1
    final t0 = vnToday();
    final rows = [
      _tx(id: 't1', amount: 200000), // c1 expense in range → counts
      _tx(
        id: 't2',
        amount: 150000,
        splitCount: 2,
        splitLines: const [
          TransactionSplitLine(
            categoryId: 'c1',
            category: 'Ăn uống',
            amount: 100000,
          ),
          TransactionSplitLine(
            categoryId: 'c7',
            category: 'Khác',
            amount: 50000,
          ),
        ],
      ),
      _tx(id: 't3', categoryId: 'c7', category: 'Khác', amount: 300000),
      _tx(id: 't4', kind: TransactionKind.transfer, amount: 999999),
      _tx(id: 't5', kind: TransactionKind.income, amount: 500000),
      _tx(id: 't6', occurredOn: addDaysToYmd(t0, -30), amount: 40000),
    ];
    await t.pumpWidget(
      _page(
        events: [event],
        loadTransactions: (e) async => (rows: rows, truncated: false),
      ),
    );
    await t.pumpAndSettle();

    await t.tap(find.text('Đà Lạt cùng nhóm'));
    await t.pumpAndSettle();

    expect(find.text('Giao dịch được tính'), findsOneWidget);
    expect(find.text('2 giao dịch · tổng 300.000 ₫'), findsOneWidget);
    expect(find.text('ghi chú t1'), findsOneWidget);
    expect(find.text('ghi chú t2'), findsOneWidget);
    // The split row shows only its in-scope share, marked "một phần"
    // so the figure never reads as the whole transaction.
    expect(find.text('200.000 ₫'), findsOneWidget);
    expect(find.text('100.000 ₫'), findsOneWidget);
    expect(find.textContaining('một phần'), findsOneWidget);
    // Out-of-scope, transfers, income and out-of-range rows stay out.
    expect(find.text('ghi chú t3'), findsNothing);
    expect(find.text('ghi chú t4'), findsNothing);
    expect(find.text('ghi chú t5'), findsNothing);
    expect(find.text('ghi chú t6'), findsNothing);
  });

  testWidgets('edit saves through onUpdate and pops the stale detail', (
    t,
  ) async {
    final event = _active();
    EventBudget? edited;
    EventDraft? draft;
    await t.pumpWidget(
      _page(
        events: [event],
        onUpdate: (e, d) async {
          edited = e;
          draft = d;
        },
      ),
    );
    await t.pumpAndSettle();
    await t.tap(find.text('Đà Lạt cùng nhóm'));
    await t.pumpAndSettle();

    await t.tap(find.byTooltip('Sửa sự kiện'));
    await t.pumpAndSettle();
    // The form is prefilled from the row — the stale-write guard rides
    // the row's updated_at upstream.
    expect(find.widgetWithText(TextField, 'Đà Lạt cùng nhóm'), findsOneWidget);
    await t.enterText(
      find.widgetWithText(TextField, 'Tên sự kiện'),
      'Đà Lạt mùa mưa',
    );
    await t.tap(find.text('Lưu'));
    await t.pumpAndSettle();

    expect(edited?.id, 'e1');
    expect(draft!.name, 'Đà Lạt mùa mưa');
    // A saved edit pops the detail back to the refreshed list.
    expect(find.text('Giao dịch được tính'), findsNothing);
    expect(find.text('Đang diễn ra'), findsOneWidget);
  });

  testWidgets('delete confirms then tombstones via onDelete', (t) async {
    String? deleted;
    await t.pumpWidget(
      _page(events: [_closed()], onDelete: (id) async => deleted = id),
    );
    await t.pumpAndSettle();
    await t.tap(find.text('Đám cưới em'));
    await t.pumpAndSettle();

    await t.tap(find.byTooltip('Xóa sự kiện'));
    await t.pumpAndSettle();
    // The confirm copy is honest: the ledger rows survive the event.
    expect(find.textContaining('vẫn giữ trong sổ'), findsOneWidget);
    await t.tap(find.text('Đồng ý'));
    await t.pumpAndSettle();
    expect(deleted, 'e3');
  });

  testWidgets('read-only surface hides every write affordance', (t) async {
    await t.pumpWidget(
      MaterialApp(
        home: EventsPage(
          loadEvents: () async => [_active()],
          loadCategories: () async => _cats,
          loadTransactions: (_) async =>
              (rows: const <Transaction>[], truncated: false),
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.byType(FloatingActionButton), findsNothing);
    await t.tap(find.text('Đà Lạt cùng nhóm'));
    await t.pumpAndSettle();
    expect(find.byTooltip('Sửa sự kiện'), findsNothing);
    expect(find.byTooltip('Xóa sự kiện'), findsNothing);
  });

  testWidgets('a failed load shows the retry surface, not a spinner', (
    t,
  ) async {
    var loads = 0;
    await t.pumpWidget(
      MaterialApp(
        home: EventsPage(
          loadEvents: () async {
            loads++;
            throw Exception('network');
          },
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.text('Không tải được sự kiện'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsNothing);

    await t.tap(find.text('Thử lại'));
    await t.pumpAndSettle();
    expect(loads, 2);
  });
}

Future<List<EventBudget>> _empty() async => const [];
