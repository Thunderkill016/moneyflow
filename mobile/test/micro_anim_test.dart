import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/activity/activity_page.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';

Transaction _tx(String id) => Transaction(
  id: id,
  kind: TransactionKind.expense,
  categoryId: 'cat',
  category: 'Ăn uống',
  note: 'Khoản $id',
  accountId: 'acc-1',
  account: 'Tiền mặt',
  amount: 45000,
  occurredOn: '2026-10-10',
);

void main() {
  group('dashboard count-up', () {
    testWidgets('the total animates up to the real figure', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: DashboardPage(
            loadAccounts: () async => DemoStore.seedAccounts(),
            loadTransactions: () async => const [],
          ),
        ),
      );
      // First frame after the future resolves: the tween is at its
      // begin (0 ₫) — the hero card is the first đồng figure in the
      // ListView.
      await t.pump();
      expect(find.text('0 ₫'), findsOneWidget);
      await t.pumpAndSettle();
      expect(find.text('21.350.000 ₫'), findsOneWidget);
      expect(find.text('0 ₫'), findsNothing);
    });

    testWidgets('disableAnimations renders the final value immediately', (
      t,
    ) async {
      await t.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(disableAnimations: true),
          child: MaterialApp(
            home: DashboardPage(
              loadAccounts: () async => DemoStore.seedAccounts(),
              loadTransactions: () async => const [],
            ),
          ),
        ),
      );
      await t.pump();
      expect(find.text('21.350.000 ₫'), findsOneWidget);
      expect(find.text('0 ₫'), findsNothing);
    });
  });

  group('activity row fade-in', () {
    testWidgets('rows animate on first build and settle fully opaque', (
      t,
    ) async {
      await t.pumpWidget(
        MaterialApp(
          home: ActivityPage(
            loadPage: (q, {offset = 0}) async =>
                TransactionPage([_tx('a'), _tx('b')], hasMore: false),
            onDelete: (_) async {},
          ),
        ),
      );
      await t.pump();
      // Mid-stagger at least one row is still below full opacity —
      // the first-build fade actually ran.
      await t.pump(const Duration(milliseconds: 40));
      final mid = t
          .widgetList<Opacity>(find.byType(Opacity))
          .map((o) => o.opacity)
          .toList();
      expect(mid.isNotEmpty, isTrue);
      expect(mid.any((o) => o < 1.0), isTrue);

      await t.pumpAndSettle();
      final settled = t
          .widgetList<Opacity>(find.byType(Opacity))
          .map((o) => o.opacity);
      expect(settled.every((o) => o == 1.0), isTrue);
    });
  });
}
