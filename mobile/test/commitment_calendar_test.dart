// D8 — commitment calendar (PocketGuard's bill-calendar port). The grid
// marks days with a due commitment inside the viewed month; tapping a
// day lists that day's commitments with the same "Trả" write path the
// feed tile uses. All domain assertions run on the string-dated
// helpers, so nothing here depends on the device clock.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/commitments.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/money.dart';
import 'package:moneyflow/features/planning/commitment_calendar.dart';

RecurringCommitment _commitment(
  String id, {
  int dueDay = 15,
  int intervalMonths = 1,
  String? lastPaidMonth,
  bool paidThisMonth = false,
  int amount = 250000,
}) => RecurringCommitment(
  id: id,
  name: 'Khoản $id',
  amountMinor: amount,
  dueDay: dueDay,
  accountId: 'acc-1',
  accountName: 'Ngân hàng VCB',
  categoryId: 'cat-bills',
  categoryName: 'Hóa đơn',
  intervalMonths: intervalMonths,
  lastPaidMonth: lastPaidMonth,
  paidThisMonth: paidThisMonth,
);

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

Future<void> _pumpCalendar(
  WidgetTester t, {
  String monthStart = '2026-10-01',
  String today = '2026-10-15',
  List<RecurringCommitment> commitments = const [],
  Future<void> Function(RecurringCommitment)? onPay,
}) async {
  t.view.physicalSize = const Size(1080, 1600);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    _wrap(
      Scaffold(
        body: CommitmentCalendar(
          monthStart: monthStart,
          commitments: commitments,
          today: today,
          onPay: onPay,
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('commitmentMonthGrid', () {
    test('October 2026 starts Thursday — 3 leading pads, 31 days', () {
      // 2026-10-01 is a Thursday: T2 T3 T4 → three nulls before day 1.
      final cells = commitmentMonthGrid('2026-10-01');
      expect(cells.length % 7, 0);
      expect(cells.take(3), [null, null, null]);
      expect(cells[3], 1);
      // 3 + 31 = 34 → padded to 35.
      expect(cells, hasLength(35));
      expect(cells.where((d) => d != null), hasLength(31));
    });

    test('a month starting Monday has no leading pad', () {
      // 2026-06-01 is a Monday.
      final cells = commitmentMonthGrid('2026-06-01');
      expect(cells.first, 1);
      expect(cells.where((d) => d != null), hasLength(30));
    });

    test('a malformed month renders nothing rather than guessing', () {
      expect(commitmentMonthGrid('2026-13-01'), isEmpty);
      expect(commitmentMonthGrid('2026-10-15'), isEmpty);
      expect(commitmentMonthGrid('junk'), isEmpty);
    });
  });

  group('commitmentsDueOnDay', () {
    test('a monthly commitment marks its due day', () {
      final cs = [_commitment('c1', dueDay: 15)];
      expect(
        commitmentsDueOnDay(cs, monthStart: '2026-10-01', day: 15).single.id,
        'c1',
      );
      expect(
        commitmentsDueOnDay(cs, monthStart: '2026-10-01', day: 16),
        isEmpty,
      );
    });

    test('the clamped last-day rule marks the resolved day, not 31', () {
      // September has 30 days — dueDay 31 resolves to the 30th.
      final cs = [_commitment('c1', dueDay: 31)];
      expect(
        commitmentsDueOnDay(cs, monthStart: '2026-09-01', day: 30).single.id,
        'c1',
      );
      expect(
        commitmentsDueOnDay(cs, monthStart: '2026-09-01', day: 31),
        isEmpty,
      );
    });

    test('a yearly commitment only marks its resolved due month', () {
      // Paid 2026-02, interval 12 → next due 2027-02; it must not mark
      // days in October even though dueDay fits.
      final cs = [
        _commitment(
          'c1',
          dueDay: 10,
          intervalMonths: 12,
          lastPaidMonth: '2026-02-01',
        ),
      ];
      expect(
        commitmentsDueOnDay(cs, monthStart: '2026-10-01', day: 10),
        isEmpty,
      );
      expect(
        commitmentsDueOnDay(cs, monthStart: '2027-02-01', day: 10).single.id,
        'c1',
      );
    });

    test('a paid commitment still marks its day (the grid shows đến hạn)', () {
      final cs = [_commitment('c1', dueDay: 5, paidThisMonth: true)];
      expect(
        commitmentsDueOnDay(cs, monthStart: '2026-10-01', day: 5),
        hasLength(1),
      );
    });
  });

  group('CommitmentCalendar widget', () {
    testWidgets('renders weekday headers and the month grid', (t) async {
      await _pumpCalendar(t, commitments: [_commitment('c1', dueDay: 15)]);
      expect(find.text('T2'), findsOneWidget);
      expect(find.text('CN'), findsOneWidget);
      expect(find.text('15'), findsWidgets);
      expect(find.text('Chạm một ngày để xem cam kết đến hạn'), findsOneWidget);
    });

    testWidgets('tapping a due day lists its commitments with a Trả seam', (
      t,
    ) async {
      var paid = <String>[];
      await _pumpCalendar(
        t,
        commitments: [_commitment('c1', dueDay: 15)],
        onPay: (c) async => paid.add(c.id),
      );
      await t.tap(find.text('15'));
      await t.pumpAndSettle();
      expect(find.text('Khoản c1'), findsOneWidget);
      expect(find.textContaining(formatMoney(250000)), findsOneWidget);
      await t.tap(find.text('Trả'));
      await t.pumpAndSettle();
      expect(paid, ['c1']);
    });

    testWidgets('a day with nothing due says so honestly', (t) async {
      await _pumpCalendar(t, commitments: [_commitment('c1', dueDay: 15)]);
      await t.tap(find.text('20'));
      await t.pumpAndSettle();
      expect(find.text('Ngày 20 không có cam kết đến hạn'), findsOneWidget);
    });

    testWidgets('tapping the selected day again deselects it', (t) async {
      await _pumpCalendar(t, commitments: [_commitment('c1', dueDay: 15)]);
      await t.tap(find.text('15'));
      await t.pumpAndSettle();
      await t.tap(find.text('15'));
      await t.pumpAndSettle();
      expect(find.text('Khoản c1'), findsNothing);
      expect(find.text('Chạm một ngày để xem cam kết đến hạn'), findsOneWidget);
    });

    testWidgets('a paid row shows its status but no Trả action', (t) async {
      await _pumpCalendar(
        t,
        commitments: [_commitment('c1', dueDay: 15, paidThisMonth: true)],
        onPay: (_) async {},
      );
      await t.tap(find.text('15'));
      await t.pumpAndSettle();
      expect(find.text('Khoản c1'), findsOneWidget);
      expect(find.text('Trả'), findsNothing);
      expect(find.textContaining('Đã trả'), findsOneWidget);
    });

    testWidgets('no onPay seam (demo) hides the Trả button', (t) async {
      await _pumpCalendar(t, commitments: [_commitment('c1', dueDay: 15)]);
      await t.tap(find.text('15'));
      await t.pumpAndSettle();
      expect(find.text('Khoản c1'), findsOneWidget);
      expect(find.text('Trả'), findsNothing);
    });
  });
}
