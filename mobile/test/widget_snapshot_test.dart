// The home-screen widget feed: the dashboard hands its loaded figures
// to writeWidgetSnapshot (VND-only total, honest null safe-spend), and
// WidgetSnapshotStore persists the tiny JSON the Kotlin provider reads.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/widget_snapshot.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/safe_to_spend.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

const _vnd = AccountSummary(
  id: 'a-vnd',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 500000,
);
const _usd = AccountSummary(
  id: 'a-usd',
  name: 'USD savings',
  kind: AccountKind.bank,
  currencyCode: 'USD',
  initialBalance: 0,
  balance: 3000000,
);

String _monthStart() {
  final n = DateTime.now();
  return '${n.year}-${n.month.toString().padLeft(2, '0')}-01';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('WidgetSnapshotStore', () {
    test(
      'save writes the Kotlin-contract JSON under mf_widget_snapshot',
      () async {
        final prefs = await SharedPreferences.getInstance();
        await WidgetSnapshotStore(prefs).save(
          const WidgetSnapshot(
            totalVnd: 1234567,
            safeSpendVnd: 89000,
            savedAtMs: 999999999000,
          ),
        );
        final raw = prefs.getString('mf_widget_snapshot');
        expect(raw, isNotNull);
        expect(jsonDecode(raw!), {
          'total': 1234567,
          'safeSpend': 89000,
          'savedAtMs': 999999999000,
          // The D18 row count — null is "unknown", never a fake zero.
          'pendingReview': null,
        });
      },
    );

    test(
      'an absent safeSpend serializes as JSON null — not a fake 0',
      () async {
        final prefs = await SharedPreferences.getInstance();
        await WidgetSnapshotStore(
          prefs,
        ).save(const WidgetSnapshot(totalVnd: 5, savedAtMs: 1));
        expect(jsonDecode(prefs.getString('mf_widget_snapshot')!), {
          'total': 5,
          'safeSpend': null,
          'savedAtMs': 1,
          'pendingReview': null,
        });
      },
    );

    test('the pending-review count serializes for the widget row', () async {
      final prefs = await SharedPreferences.getInstance();
      await WidgetSnapshotStore(
        prefs,
      ).save(const WidgetSnapshot(totalVnd: 5, savedAtMs: 1, pendingReview: 3));
      expect(
        jsonDecode(prefs.getString('mf_widget_snapshot')!)['pendingReview'],
        3,
      );
    });
  });

  group('DashboardPage writeWidgetSnapshot', () {
    testWidgets('a load feeds the widget the VND total plus safe spend', (
      t,
    ) async {
      WidgetSnapshot? written;
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => [_vnd, _usd],
            loadTransactions: () async => const [],
            loadBudgets: (_) async => [
              BudgetProgress(
                id: 'b1',
                categoryId: 'c-food',
                categoryName: 'Ăn uống',
                monthStart: _monthStart(),
                limitMinor: 3000000,
                spentMinor: 300000,
              ),
            ],
            loadCommitments: (_) async => const [],
            writeWidgetSnapshot: (snap) async => written = snap,
          ),
        ),
      );
      await t.pumpAndSettle();

      final snap = written;
      expect(snap, isNotNull);
      // The USD account must not leak into the đồng total.
      expect(snap!.totalVnd, 500000);
      // Same figure the dashboard tile shows — the widget never
      // computes its own.
      final expected = safeDailySpend(
        budgets: [
          BudgetProgress(
            id: 'b1',
            categoryId: 'c-food',
            categoryName: 'Ăn uống',
            monthStart: _monthStart(),
            limitMinor: 3000000,
            spentMinor: 300000,
          ),
        ],
        commitments: const [],
        today: DateTime.now(),
      );
      expect(snap.safeSpendVnd, expected?.perDayMinor);
      expect(snap.savedAtMs, greaterThan(0));
    });

    testWidgets('no planning loaders → null safeSpend, total still flows', (
      t,
    ) async {
      WidgetSnapshot? written;
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => [_vnd],
            loadTransactions: () async => const [],
            writeWidgetSnapshot: (snap) async => written = snap,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(written, isNotNull);
      expect(written!.totalVnd, 500000);
      expect(written!.safeSpendVnd, isNull);
    });

    testWidgets('a failed loader means no widget write — stale stands', (
      t,
    ) async {
      var writes = 0;
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => throw Exception('offline'),
            loadTransactions: () async => const [],
            writeWidgetSnapshot: (snap) async => writes++,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(writes, 0);
      expect(find.text('Không tải được dữ liệu'), findsOneWidget);
    });

    testWidgets('the widget snapshot carries the inbox pending count', (
      t,
    ) async {
      WidgetSnapshot? written;
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => [_vnd],
            loadTransactions: () async => const [],
            loadPendingCount: () async => 4,
            writeWidgetSnapshot: (snap) async => written = snap,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(written, isNotNull);
      // The row tallies exactly the queue its deep link opens (D18).
      expect(written!.pendingReview, 4);
    });

    testWidgets(
      'a missing count seam writes null — the row hides, never a fake 0',
      (t) async {
        WidgetSnapshot? written;
        await t.pumpWidget(
          _wrap(
            DashboardPage(
              loadAccounts: () async => [_vnd],
              loadTransactions: () async => const [],
              writeWidgetSnapshot: (snap) async => written = snap,
            ),
          ),
        );
        await t.pumpAndSettle();
        expect(written, isNotNull);
        expect(written!.pendingReview, isNull);
      },
    );

    testWidgets('a failed count read writes null — unknown stays unknown', (
      t,
    ) async {
      WidgetSnapshot? written;
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => [_vnd],
            loadTransactions: () async => const [],
            loadPendingCount: () async => throw Exception('offline'),
            writeWidgetSnapshot: (snap) async => written = snap,
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(written, isNotNull);
      expect(written!.pendingReview, isNull);
    });
  });
}
