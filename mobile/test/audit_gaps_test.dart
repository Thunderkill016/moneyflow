// Widget coverage for the audit-gap fixes: the zero-account escape
// hatch on capture and the dashboard intro, the shared empty-state
// card roll-out, spoken-money Semantics, "Tìm gần đây" chips, and the
// 2x text-scale layout audit. Unit coverage for the same seams lives
// in spoken_vnd_test.dart / recent_searches_test.dart.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/accounts/accounts_page.dart';
import 'package:moneyflow/features/activity/activity_page.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:moneyflow/features/planning/planning_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _wrap(Widget child, {double textScale = 1}) => MaterialApp(
  theme: ThemeData(useMaterial3: true),
  home: MediaQuery(
    data: MediaQueryData(textScaler: TextScaler.linear(textScale)),
    child: child,
  ),
);

const _newWallet = AccountSummary(
  id: 'acc-new',
  name: 'Ví mới',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 0,
);

Transaction _tx(int i, {String note = ''}) => Transaction(
  id: 't$i',
  kind: TransactionKind.expense,
  categoryId: 'cat-food',
  category: 'Ăn uống',
  note: note.isEmpty ? 'Khoản $i' : note,
  accountId: 'acc-cash',
  account: 'Tiền mặt',
  amount: 10000,
  occurredOn: '2026-10-05',
);

String _monthStart() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('capture zero-account', () {
    testWidgets('shows the honest state; Tạo ví runs the seam and '
        'selects the new wallet', (t) async {
      var calls = 0;
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: const [],
            categories: DemoStore.seedCategories(),
            onSubmit: (_) async {},
            onCreateAccount: () async {
              calls++;
              return [_newWallet];
            },
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Chưa có ví — tạo ví trước khi ghi'), findsOneWidget);
      // The dead dropdown is gone — no picker, no fake empty choice.
      expect(find.byType(DropdownButtonFormField<String>), findsNothing);

      await t.tap(find.text('Tạo ví'));
      await t.pumpAndSettle();

      expect(calls, 1);
      expect(find.text('Chưa có ví — tạo ví trước khi ghi'), findsNothing);
      // The refreshed list repopulates the picker and the freshly
      // created wallet is pre-selected.
      expect(find.byType(DropdownButtonFormField<String>), findsOneWidget);
      expect(find.text('Ví mới'), findsOneWidget);
    });

    testWidgets('no seam → the message stays, the button does not', (t) async {
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: const [],
            categories: DemoStore.seedCategories(),
            onSubmit: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Chưa có ví — tạo ví trước khi ghi'), findsOneWidget);
      expect(find.text('Tạo ví'), findsNothing);
    });

    testWidgets('a failing refresh keeps the state with an honest error', (
      t,
    ) async {
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: const [],
            categories: DemoStore.seedCategories(),
            onSubmit: (_) async {},
            onCreateAccount: () async => throw Exception('offline'),
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Tạo ví'));
      await t.pumpAndSettle();
      // The form error renders at the bottom of the long field list —
      // scroll the lazily-built ListView until it exists.
      await t.scrollUntilVisible(
        find.text('Không tải được tài khoản — thử lại'),
        300,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Không tải được tài khoản — thử lại'), findsOneWidget);
      expect(find.text('Chưa có ví — tạo ví trước khi ghi'), findsOneWidget);
    });
  });

  group('dashboard empty ledger', () {
    Future<void> pumpEmpty(
      WidgetTester t, {
      Future<void> Function()? onCreateAccount,
    }) async {
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => const [],
            loadTransactions: () async => const [],
            onCreateAccount: onCreateAccount,
          ),
        ),
      );
      await t.pumpAndSettle();
    }

    testWidgets('no accounts → Tạo ví đầu tiên runs the seam and reloads', (
      t,
    ) async {
      var creates = 0;
      var accountReads = 0;
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async {
              accountReads++;
              return const [];
            },
            loadTransactions: () async => const [],
            onCreateAccount: () async => creates++,
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Sổ của bạn đang trống'), findsOneWidget);
      // The preview tiles are still explicitly labeled as sample data.
      expect(find.text('Dữ liệu mẫu'), findsOneWidget);
      expect(find.text('Tạo ví đầu tiên'), findsOneWidget);
      // The old copy sent users at Ghi — a dead end without a wallet.
      expect(find.textContaining('bấm "Ghi"'), findsNothing);

      await t.tap(find.text('Tạo ví đầu tiên'));
      await t.pumpAndSettle();
      expect(creates, 1);
      // Whatever the dialog did, the loaders re-ran to show real state.
      expect(accountReads, greaterThanOrEqualTo(2));
    });

    testWidgets('no seam → honest pointer at Tài khoản, no dead button', (
      t,
    ) async {
      await pumpEmpty(t);
      expect(find.text('Tạo ví đầu tiên'), findsNothing);
      expect(
        find.text('Tạo ví trong mục Tài khoản của menu để bắt đầu.'),
        findsOneWidget,
      );
    });

    testWidgets('accounts but no transactions → feed card, not the intro', (
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
      expect(find.text('Sổ của bạn đang trống'), findsNothing);
      expect(find.text('Chưa có giao dịch nào'), findsOneWidget);
    });
  });

  group('spoken-money semantics + text scale', () {
    testWidgets('hero total carries the spoken-đồng label', (t) async {
      final semantics = t.ensureSemantics();
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => DemoStore.seedAccounts(),
            loadTransactions: () async => DemoStore.seedTransactions(),
          ),
        ),
      );
      await t.pumpAndSettle();
      // 21.350.000 ₫ — the glyph string would read digit-by-digit;
      // the label reads the figure like a person. Regex because the
      // Semantics node merges the label with ancestor nodes.
      expect(
        find.bySemanticsLabel(
          RegExp('Tổng số dư hai mươi mốt triệu ba trăm năm mươi nghìn đồng'),
        ),
        findsWidgets,
      );
      semantics.dispose();
    });

    testWidgets('dashboard renders clean at 2x text scale', (t) async {
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => DemoStore.seedAccounts(),
            loadTransactions: () async => DemoStore.seedTransactions(),
          ),
          textScale: 2,
        ),
      );
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
      expect(find.text('Tổng số dư'), findsOneWidget);
    });

    testWidgets('capture renders clean at 2x text scale', (t) async {
      await t.pumpWidget(
        _wrap(
          CapturePage(
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            onSubmit: (_) async {},
          ),
          textScale: 2,
        ),
      );
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField).at(1), '999999999');
      await t.pumpAndSettle();
      expect(t.takeException(), isNull);
    });
  });

  group('activity empty states + recent searches', () {
    Widget activityPage(
      List<Transaction> all, {
      VoidCallback? onCapture,
      List<(TransactionQuery, int)>? calls,
    }) => _wrap(
      ActivityPage(
        loadPage: (q, {offset = 0}) {
          calls?.add((q, offset));
          return inMemoryPageLoader(all)(q, offset: offset);
        },
        loadAccounts: () async => DemoStore.seedAccounts(),
        loadCategories: () async => DemoStore.seedCategories(),
        onDelete: (_) async {},
        onCapture: onCapture,
      ),
    );

    testWidgets('empty feed explains itself and offers the capture seam', (
      t,
    ) async {
      var captures = 0;
      await t.pumpWidget(activityPage(const [], onCapture: () => captures++));
      await t.pumpAndSettle();
      expect(find.text('Chưa có giao dịch nào'), findsOneWidget);
      await t.tap(find.text('Ghi khoản đầu tiên'));
      await t.pumpAndSettle();
      expect(captures, 1);
    });

    testWidgets('no seam → the empty feed stays informational', (t) async {
      await t.pumpWidget(activityPage(const []));
      await t.pumpAndSettle();
      expect(find.text('Chưa có giao dịch nào'), findsOneWidget);
      expect(find.text('Ghi khoản đầu tiên'), findsNothing);
    });

    testWidgets('filtered-empty offers Xóa bộ lọc which restores rows', (
      t,
    ) async {
      await t.pumpWidget(activityPage([_tx(1)]));
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Tìm kiếm'));
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField), 'zzz');
      await t.pump(const Duration(milliseconds: 400));
      await t.pumpAndSettle();
      expect(find.text('Không có giao dịch khớp bộ lọc'), findsOneWidget);
      // The card's FilledButton — the filter-chip row carries a
      // TextButton with the same label.
      await t.tap(find.widgetWithText(FilledButton, 'Xóa bộ lọc'));
      await t.pumpAndSettle();
      expect(find.text('Khoản 1'), findsOneWidget);
      expect(find.text('Không có giao dịch khớp bộ lọc'), findsNothing);
    });

    testWidgets('Tìm gần đây chips fill the field and clear all', (t) async {
      SharedPreferences.setMockInitialValues({
        'mf_recent_searches': ['cafe', 'xăng'],
      });
      final calls = <(TransactionQuery, int)>[];
      await t.pumpWidget(activityPage([_tx(1)], calls: calls));
      await t.pumpAndSettle();

      // Hidden while the search bar is closed — no clutter on the feed.
      expect(find.text('Tìm gần đây'), findsNothing);
      await t.tap(find.byTooltip('Tìm kiếm'));
      await t.pumpAndSettle();
      expect(find.text('Tìm gần đây'), findsOneWidget);
      expect(find.text('cafe'), findsOneWidget);
      expect(find.text('xăng'), findsOneWidget);

      await t.tap(find.text('cafe'));
      await t.pumpAndSettle();
      expect(calls.last.$1.text, 'cafe');

      // Back to an empty field shows the chips again — then Xóa ends it.
      await t.tap(find.byTooltip('Đóng tìm kiếm'));
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Tìm kiếm'));
      await t.pumpAndSettle();
      await t.tap(find.text('Xóa'));
      await t.pumpAndSettle();
      expect(find.text('Tìm gần đây'), findsNothing);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getStringList('mf_recent_searches'), isNull);
    });

    testWidgets('a typed search lands in Tìm gần đây on the next open', (
      t,
    ) async {
      await t.pumpWidget(activityPage([_tx(1, note: 'Cafe sáng')]));
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Tìm kiếm'));
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField), 'cafe');
      await t.pump(const Duration(milliseconds: 400));
      await t.pumpAndSettle();

      await t.tap(find.byTooltip('Đóng tìm kiếm'));
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Tìm kiếm'));
      await t.pumpAndSettle();
      expect(find.text('Tìm gần đây'), findsOneWidget);
      expect(find.text('cafe'), findsOneWidget);
    });
  });

  group('accounts + planning empty states', () {
    testWidgets('empty accounts list offers Thêm tài khoản', (t) async {
      await t.pumpWidget(
        _wrap(
          AccountsPage(
            loadAccounts: () async => const [],
            onCreate: (_, _, _) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Chưa có tài khoản nào'), findsOneWidget);
      // Card action — the page's extended FAB shares the label.
      await t.tap(find.widgetWithText(FilledButton, 'Thêm tài khoản'));
      await t.pumpAndSettle();
      // The shared account dialog opened — same form as the FAB.
      expect(find.byType(AlertDialog), findsOneWidget);
      expect(find.text('Tạo'), findsOneWidget);
    });

    testWidgets('empty planning sections carry icon + explanation + action', (
      t,
    ) async {
      // The four sections outgrow 800x600 — ListView builds offscreen
      // rows lazily, so grow the surface instead of scrolling.
      t.view.physicalSize = const Size(800, 2800);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      await t.pumpWidget(
        _wrap(
          PlanningPage(
            loadData: (_) async => PlanningData(
              budgets: const [],
              commitments: const [],
              goals: const [],
              accounts: DemoStore.seedAccounts(),
              categories: DemoStore.seedCategories(),
              monthStart: _monthStart(),
              budgetMonth: _monthStart(),
            ),
            actions: PlanningActions(
              onBudgetSave: (_, _, _, _) async {},
              onBudgetDelete: (_) async {},
              onCommitmentSave: (_, _, _, _, _, _, _) async {},
              onCommitmentPay: (_) async {},
              onCommitmentUndo: (_) async {},
              onCommitmentArchived: (_, _) async {},
              onGoalSave: (_, _, _, _) async {},
              onGoalAdjust: (_, _) async {},
              onGoalArchived: (_, _) async {},
              onIncomeSave: (_, _, _, _, _, _) async {},
            ),
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Chưa có ngân sách nào'), findsOneWidget);
      expect(find.text('Chưa có khoản thu định kỳ nào'), findsOneWidget);
      expect(find.text('Chưa có cam kết nào'), findsOneWidget);
      expect(find.text('Chưa có mục tiêu nào'), findsOneWidget);

      await t.tap(find.text('Thêm cam kết'));
      await t.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await t.tap(find.text('Hủy'));
      await t.pumpAndSettle();

      await t.tap(find.text('Đặt hạn mức'));
      await t.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
    });
  });

  group('icon-only controls stay labeled', () {
    testWidgets('activity appbar tooltips are Vietnamese', (t) async {
      await t.pumpWidget(
        _wrap(
          ActivityPage(
            loadPage: inMemoryPageLoader([_tx(1)]),
            onDelete: (_) async {},
            onOpenTrash: () {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.byTooltip('Tìm kiếm'), findsOneWidget);
      expect(find.byTooltip('Bộ lọc'), findsOneWidget);
      expect(find.byTooltip('Thùng rác'), findsOneWidget);
      await t.tap(find.byTooltip('Tìm kiếm'));
      await t.pumpAndSettle();
      expect(find.byTooltip('Đóng tìm kiếm'), findsOneWidget);
    });
  });
}
