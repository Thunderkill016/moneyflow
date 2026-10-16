// D10 — watchlist pin: domain aggregation + alert thresholds + the
// device-local pref store + the dashboard tile/pin sheet.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/watchlist_prefs.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/report.dart' show vnNow, ymd;
import 'package:moneyflow/domain/watchlist.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

Transaction _tx({
  required String id,
  TransactionKind kind = TransactionKind.expense,
  String category = 'Ăn uống',
  int amount = 0,
  String? payee,
  required String occurredOn,
  bool isRefund = false,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'cat-$category',
  category: category,
  note: '',
  accountId: 'acc-1',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: occurredOn,
  payee: payee,
  isRefund: isRefund,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final today = DateTime(2026, 10, 20);

  group('watchMonthSpend', () {
    final item = const WatchItem(kind: WatchKind.category, name: 'Ăn uống');

    test('sums only this month\'s matching expenses', () {
      final spent = watchMonthSpend(
        [
          _tx(id: 'a', amount: 50000, occurredOn: '2026-10-01'),
          _tx(id: 'b', amount: 30000, occurredOn: '2026-10-20'),
          _tx(id: 'c', amount: 99999, occurredOn: '2026-09-30'),
          _tx(
            id: 'd',
            category: 'Di chuyển',
            amount: 77777,
            occurredOn: '2026-10-10',
          ),
          _tx(
            id: 'e',
            kind: TransactionKind.income,
            category: 'Ăn uống',
            amount: 400000,
            occurredOn: '2026-10-10',
          ),
          _tx(
            id: 'f',
            kind: TransactionKind.transfer,
            category: 'Ăn uống',
            amount: 400000,
            occurredOn: '2026-10-10',
          ),
        ],
        item,
        today: today,
      );
      expect(spent, 80000);
    });

    test('D15 a refund at the pinned category nets its month spend', () {
      final spent = watchMonthSpend(
        [
          _tx(id: 'a', amount: 80000, occurredOn: '2026-10-10'),
          _tx(
            id: 'r',
            kind: TransactionKind.income,
            amount: 25000,
            occurredOn: '2026-10-11',
            isRefund: true,
          ),
          // Plain income on the same-named category is not spend and
          // never nets — only flagged refunds do.
          _tx(
            id: 'i',
            kind: TransactionKind.income,
            amount: 999999,
            occurredOn: '2026-10-11',
          ),
        ],
        item,
        today: today,
      );
      expect(spent, 55000);
    });

    test('payee pins match the payee field, blank never matches', () {
      final payee = const WatchItem(kind: WatchKind.payee, name: 'GRAB');
      final spent = watchMonthSpend(
        [
          _tx(id: 'a', amount: 32000, occurredOn: '2026-10-10', payee: 'GRAB'),
          _tx(id: 'b', amount: 15000, occurredOn: '2026-10-10', payee: 'grab '),
          _tx(id: 'c', amount: 90000, occurredOn: '2026-10-10'),
        ],
        payee,
        today: today,
      );
      expect(spent, 32000);
    });
  });

  group('watchAlert', () {
    test('no threshold is always ok — pin ≠ budget', () {
      expect(
        watchAlert(
          const WatchItem(kind: WatchKind.category, name: 'X'),
          9999999,
        ),
        WatchAlert.ok,
      );
    });

    test('80% reads near, 100% reads over — the budget language', () {
      const item = WatchItem(
        kind: WatchKind.category,
        name: 'X',
        thresholdMinor: 100000,
      );
      expect(watchAlert(item, 79000), WatchAlert.ok);
      expect(watchAlert(item, 80000), WatchAlert.near);
      expect(watchAlert(item, 100000), WatchAlert.over);
    });
  });

  group('WatchlistPrefs', () {
    test('round-trips pins; a corrupt pref reads as empty', () async {
      SharedPreferences.setMockInitialValues({});
      expect(await WatchlistPrefs.load(), isEmpty);
      await WatchlistPrefs.save(const [
        WatchItem(kind: WatchKind.category, name: 'Ăn uống'),
        WatchItem(kind: WatchKind.payee, name: 'GRAB', thresholdMinor: 500000),
      ]);
      final items = await WatchlistPrefs.load();
      expect(items.length, 2);
      expect(items[1].kind, WatchKind.payee);
      expect(items[1].thresholdMinor, 500000);

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('mf_watch_items', 'not-json');
      expect(await WatchlistPrefs.load(), isEmpty);
    });
  });

  group('dashboard watch card', () {
    final day = ymd(vnNow());

    var saves = 0;
    List<WatchItem>? lastSave;
    Widget dash({
      List<Transaction> rows = const [],
      List<WatchItem> items = const [],
    }) => MaterialApp(
      home: DashboardPage(
        loadAccounts: () async => const [],
        loadTransactions: () async => const [],
        loadSummaryTransactions: (_, _) async => (rows: rows, truncated: false),
        loadWatchItems: () async => items,
        saveWatchItems: (next) async {
          saves++;
          lastSave = next;
        },
      ),
    );

    testWidgets('pinned item shows its month total + threshold state', (
      t,
    ) async {
      await t.pumpWidget(
        dash(
          rows: [_tx(id: 'a', amount: 85000, occurredOn: day)],
          items: const [
            WatchItem(
              kind: WatchKind.category,
              name: 'Ăn uống',
              thresholdMinor: 100000,
            ),
          ],
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Đang theo dõi'), findsOneWidget);
      expect(find.text('Ăn uống'), findsOneWidget);
      expect(find.textContaining('Chi 85.000 ₫ tháng này'), findsOneWidget);
      expect(find.textContaining('Sắp tới ngưỡng'), findsOneWidget);
    });

    testWidgets('pin sheet offers only real ledger values', (t) async {
      await t.pumpWidget(
        dash(
          rows: [
            _tx(id: 'a', amount: 85000, occurredOn: day),
            _tx(
              id: 'b',
              category: 'Di chuyển',
              amount: 30000,
              occurredOn: day,
              payee: 'GRAB',
            ),
          ],
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Ghim'));
      await t.pumpAndSettle();
      // Category mode lists the real expense categories.
      await t.tap(find.byType(DropdownButtonFormField<String>));
      await t.pumpAndSettle();
      expect(find.text('Di chuyển').last, findsOneWidget);
      await t.tap(find.text('Di chuyển').last);
      await t.pumpAndSettle();
      await t.tap(find.text('Ghim').last);
      await t.pumpAndSettle();
      expect(lastSave!.single.name, 'Di chuyển');
      expect(lastSave!.single.kind, WatchKind.category);
    });

    testWidgets('unwatch removes the pin through the save seam', (t) async {
      // Group-scoped counters leak between tests — reset before tapping.
      saves = 0;
      lastSave = null;
      await t.pumpWidget(
        dash(
          rows: [_tx(id: 'a', amount: 50000, occurredOn: day)],
          items: const [WatchItem(kind: WatchKind.category, name: 'Ăn uống')],
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Bỏ theo dõi Ăn uống'));
      await t.pumpAndSettle();
      expect(saves, 1);
      expect(lastSave, isEmpty);
    });

    testWidgets('no summary read means no card — hide, don\'t guess', (
      t,
    ) async {
      await t.pumpWidget(
        MaterialApp(
          home: DashboardPage(
            loadAccounts: () async => const [],
            loadTransactions: () async => const [],
            // No summary seam — the watch tile has no honest totals.
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Đang theo dõi'), findsNothing);
      expect(find.text('Tóm tắt tháng này'), findsNothing);
    });
  });
}
