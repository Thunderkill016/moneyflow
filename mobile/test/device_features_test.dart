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

    testWidgets(
      'lặp lại hàng tháng shows for expense and flows into the intent',
      (t) async {
        CaptureIntent? captured;
        await t.pumpWidget(
          _wrap(
            CapturePage(
              accounts: DemoStore.seedAccounts(),
              categories: DemoStore.seedCategories(),
              transactions: DemoStore.seedTransactions(),
              onSubmit: (i) async => captured = i,
            ),
          ),
        );
        await t.pumpAndSettle();

        // Fill the top of the form first: quick chip, account, mục hay
        // dùng category — the checkbox sits below the fold.
        await t.tap(find.widgetWithText(ActionChip, '100k'));
        await t.pumpAndSettle();
        await t.tap(find.text('Tài khoản'));
        await t.pumpAndSettle();
        await t.tap(find.text('Tiền mặt').last);
        await t.pumpAndSettle();
        await t.tap(find.widgetWithText(ChoiceChip, 'Ăn uống'));
        await t.pumpAndSettle();

        // The form is a lazy ListView — items below the fold aren't
        // built yet, so scroll until the checkbox is instantiated.
        final scrollable = find.byType(Scrollable).first;
        final repeatLabel = find.text('Lặp lại hàng tháng');
        await t.scrollUntilVisible(repeatLabel, 200, scrollable: scrollable);
        await t.tap(repeatLabel);
        await t.pumpAndSettle();

        await t.scrollUntilVisible(
          find.text('Lưu'),
          200,
          scrollable: scrollable,
        );
        await t.tap(find.text('Lưu'));
        await t.pumpAndSettle();

        expect(captured, isNotNull);
        expect(captured!.repeatMonthly, isTrue);
        expect(captured!.dueDay, DateTime.now().day);
        // Note and payee empty → the category name names the commitment.
        expect(captured!.commitmentName, 'Ăn uống');
      },
    );

    testWidgets('lặp lại hàng tháng hides for transfers', (t) async {
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

      await t.tap(find.text('Chuyển'));
      await t.pumpAndSettle();
      expect(find.text('Lặp lại hàng tháng'), findsNothing);
    });

    testWidgets('category sheet filters by name and selects on tap', (t) async {
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

      // The placeholder row opens the sheet.
      await t.tap(find.text('Chọn'));
      await t.pumpAndSettle();

      expect(find.text('Tìm danh mục'), findsOneWidget);
      await t.enterText(find.widgetWithText(TextField, 'Tìm danh mục'), 'di');
      await t.pumpAndSettle();

      // Filtered: Di chuyển stays, Ăn uống/Hóa đơn drop out of the sheet.
      expect(find.text('Di chuyển'), findsOneWidget);
      expect(find.text('Hóa đơn'), findsNothing);

      await t.tap(find.text('Di chuyển'));
      await t.pumpAndSettle();

      // The input row now shows the picked category.
      expect(find.widgetWithText(InputDecorator, 'Di chuyển'), findsOneWidget);
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

  group('CapturePage edit mode', () {
    const row = Transaction(
      id: 'tx-9',
      kind: TransactionKind.expense,
      categoryId: 'cat-food',
      category: 'Ăn uống',
      note: 'Phở bò',
      accountId: 'acc-cash',
      account: 'Tiền mặt',
      amount: 65000,
      occurredOn: '2026-10-05',
      payee: 'Quán A',
      updatedAt: '2026-10-05T03:00:00Z',
    );

    testWidgets('prefills the row and submits an update intent', (t) async {
      CaptureIntent? sent;
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            editing: row,
            onSubmit: (i) async => sent = i,
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Sửa khoản'), findsOneWidget);
      expect(find.widgetWithText(TextField, '65000'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Phở bò'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Quán A'), findsOneWidget);
      // Recurring toggle is a create-only affordance.
      expect(find.text('Lặp lại hàng tháng'), findsNothing);

      await t.enterText(find.widgetWithText(TextField, '65000'), '70000');
      await t.scrollUntilVisible(
        find.text('Lưu'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      // Built != on-screen: bring the button fully into the viewport.
      await t.ensureVisible(find.text('Lưu'));
      await t.pumpAndSettle();
      await t.tap(find.text('Lưu'));
      await t.pumpAndSettle();

      expect(sent, isNotNull);
      expect(sent!.transactionId, 'tx-9');
      expect(sent!.expectedUpdatedAt, '2026-10-05T03:00:00Z');
      expect(sent!.amount, 70000);
      expect(sent!.occurredOn, '2026-10-05');
      expect(sent!.repeatMonthly, isFalse);
    });

    testWidgets('transfer edit offers only the transfer kind', (t) async {
      const transfer = Transaction(
        id: 'tx-t',
        kind: TransactionKind.transfer,
        categoryId: '',
        category: 'Chuyển khoản',
        note: '',
        accountId: 'acc-cash',
        account: 'Tiền mặt',
        amount: 500000,
        occurredOn: '2026-10-06',
        destinationAccountId: 'acc-bank',
        destinationAccount: 'Ngân hàng VCB',
        updatedAt: '2026-10-06T03:00:00Z',
      );
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            editing: transfer,
            onSubmit: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();

      final seg = t.widget<SegmentedButton<TransactionKind>>(
        find.byType(SegmentedButton<TransactionKind>),
      );
      expect(seg.segments.length, 1);
      expect(seg.selected, {TransactionKind.transfer});
      expect(seg.onSelectionChanged, isNull);
    });

    testWidgets('stale_write shows the reopen guidance', (t) async {
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            editing: row,
            onSubmit: (_) async => throw Exception('... stale_write ...'),
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.scrollUntilVisible(
        find.text('Lưu'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      // Built != on-screen: bring the button fully into the viewport.
      await t.ensureVisible(find.text('Lưu'));
      await t.pumpAndSettle();
      await t.tap(find.text('Lưu'));
      await t.pumpAndSettle();
      expect(
        find.text('Khoản này vừa thay đổi — thoát rồi mở lại để sửa bản mới'),
        findsOneWidget,
      );
    });
  });

  group('DashboardPage empty ledger', () {
    testWidgets('fully empty ledger shows labeled sample data', (t) async {
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => const [],
            loadTransactions: () async => const [],
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Sổ của bạn đang trống'), findsOneWidget);
      expect(find.text('Dữ liệu mẫu'), findsOneWidget);
      // Seed preview row + the REAL total stays 0 — samples never inflate it.
      expect(find.text('Bún bò sáng'), findsOneWidget);
      expect(find.text('0 ₫'), findsOneWidget);
    });

    testWidgets('accounts without transactions keep the plain empty card', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => DemoStore.seedAccounts(),
            loadTransactions: () async => const [],
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Chưa có giao dịch nào'), findsOneWidget);
      expect(find.text('Dữ liệu mẫu'), findsNothing);
    });
  });
}
