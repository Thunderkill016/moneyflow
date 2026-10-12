import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/offline_cache.dart';
import 'package:moneyflow/data/share/share_text_parser.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    // CapturePage reads last-used account/category in initState — the
    // test prefs store starts empty unless a test seeds it.
    SharedPreferences.setMockInitialValues({});
  });

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

  group('CapturePage fast entry', () {
    testWidgets('quick-amount chip fills the amount field', (t) async {
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

      await t.tap(find.widgetWithText(ActionChip, '100k'));
      await t.pumpAndSettle();
      expect(find.widgetWithText(TextField, '100000'), findsOneWidget);
    });

    testWidgets(
      'mục hay dùng ranks used categories inline and selects on tap',
      (t) async {
        await t.pumpWidget(
          _wrap(
            CapturePage(
              accounts: DemoStore.seedAccounts(),
              categories: DemoStore.seedCategories(),
              transactions: DemoStore.seedTransactions(),
              onSubmit: (_) async {},
            ),
          ),
        );
        await t.pumpAndSettle();

        expect(find.text('Mục hay dùng'), findsOneWidget);
        // Expense categories used in the seed feed render as chips.
        final foodChip = find.widgetWithText(ChoiceChip, 'Ăn uống');
        expect(foodChip, findsOneWidget);
        expect(find.widgetWithText(ChoiceChip, 'Di chuyển'), findsOneWidget);
        // An unused expense category stays out of the quick row.
        expect(find.widgetWithText(ChoiceChip, 'Hóa đơn'), findsNothing);

        await t.tap(foodChip);
        await t.pumpAndSettle();
        expect(t.widget<ChoiceChip>(foodChip).selected, isTrue);
      },
    );

    testWidgets(
      'mục hay dùng hides for transfers and re-ranks on kind switch',
      (t) async {
        await t.pumpWidget(
          _wrap(
            CapturePage(
              accounts: DemoStore.seedAccounts(),
              categories: DemoStore.seedCategories(),
              transactions: DemoStore.seedTransactions(),
              onSubmit: (_) async {},
            ),
          ),
        );
        await t.pumpAndSettle();

        // Transfer kind has no categories — the row must disappear.
        await t.tap(find.text('Chuyển'));
        await t.pumpAndSettle();
        expect(find.text('Mục hay dùng'), findsNothing);

        // Switch to income — only the used income category (Lương) shows.
        await t.tap(find.text('Thu'));
        await t.pumpAndSettle();
        expect(find.widgetWithText(ChoiceChip, 'Lương'), findsOneWidget);
        expect(find.widgetWithText(ChoiceChip, 'Ăn uống'), findsNothing);
      },
    );

    testWidgets('remembered account prefills when the id still exists', (
      t,
    ) async {
      SharedPreferences.setMockInitialValues({
        'mf_last_capture_account': 'acc-bank',
      });
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

      // The account dropdown shows the remembered selection.
      expect(find.text('Ngân hàng VCB'), findsOneWidget);
    });

    testWidgets('a remembered category of the wrong kind is ignored', (
      t,
    ) async {
      // 'cat-salary' is an income category; the form opens on expense.
      SharedPreferences.setMockInitialValues({
        'mf_last_capture_category': 'cat-salary',
      });
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

      expect(find.text('Lương'), findsNothing);
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
