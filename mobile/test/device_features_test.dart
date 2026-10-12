import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/offline_cache.dart';
import 'package:moneyflow/data/share/share_text_parser.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

void main() {
  group('CapturePage share prefill', () {
    testWidgets('prefill fills amount, note, kind and shows review banner', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            onSubmit: (_) async {},
            prefill: const SharedTextPrefill(
              amount: 1250000,
              note: 'Circle K',
              kind: TransactionKind.income,
            ),
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Điền sẵn từ nội dung chia sẻ'), findsOneWidget);
      expect(find.widgetWithText(TextField, '1250000'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Circle K'), findsOneWidget);

      // Income segment is the selected one — the prefill drove the kind.
      final segmented = t.widget<SegmentedButton<TransactionKind>>(
        find.byType(SegmentedButton<TransactionKind>),
      );
      expect(segmented.selected, {TransactionKind.income});
    });

    testWidgets('no prefill → no banner, empty fields', (t) async {
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            onSubmit: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Điền sẵn từ nội dung chia sẻ'), findsNothing);
    });
  });

  group('DashboardPage offline snapshot', () {
    testWidgets('loader failure + snapshot → stale banner with data', (
      t,
    ) async {
      final snap = DashboardSnapshot(
        savedAtMs: DateTime(2026, 1, 15, 9, 30).millisecondsSinceEpoch,
        accounts: DemoStore.seedAccounts(),
        transactions: DemoStore.seedTransactions(),
      );
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => throw Exception('offline'),
            loadTransactions: () async => throw Exception('offline'),
            readSnapshot: () => snap,
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Ngoại tuyến — dữ liệu đã lưu'), findsOneWidget);
      expect(find.text('Cập nhật lúc 09:30 15/01'), findsOneWidget);
      // Cached accounts still render under the stale label.
      expect(find.text('Tiền mặt'), findsWidgets);
    });

    testWidgets('loader failure without snapshot → error state', (t) async {
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => throw Exception('offline'),
            loadTransactions: () async => throw Exception('offline'),
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Không tải được dữ liệu'), findsOneWidget);
      expect(find.text('Thử lại'), findsOneWidget);
    });

    testWidgets('successful load writes a snapshot, no banner', (t) async {
      DashboardSnapshot? written;
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => DemoStore.seedAccounts(),
            loadTransactions: () async => DemoStore.seedTransactions(),
            writeSnapshot: (s) async => written = s,
            readSnapshot: () => null,
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(written, isNotNull);
      expect(written!.accounts.length, DemoStore.seedAccounts().length);
      expect(find.text('Ngoại tuyến — dữ liệu đã lưu'), findsNothing);
      expect(find.text('Tổng số dư'), findsOneWidget);
    });
  });
}
