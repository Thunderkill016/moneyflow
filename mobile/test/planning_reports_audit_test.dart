import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/planning/planning_page.dart';
import 'package:moneyflow/features/reports/reports_page.dart';

String _monthStart() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
}

String _day() => _monthStart().replaceFirst('-01', '-10');

Transaction _tx(String id, TransactionKind kind, int amount) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'cat-x',
  category: 'Ăn uống',
  note: '',
  accountId: 'acc-x',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: _day(),
);

PlanningActions _actions() => PlanningActions(
  onBudgetSave: (a, b, c, d) async {},
  onBudgetDelete: (_) async {},
  onCommitmentSave: (a, b, c, d, e, f, g) async {},
  onCommitmentPay: (_) async {},
  onCommitmentUndo: (_) async {},
  onCommitmentArchived: (_, _) async {},
  onGoalSave: (a, b, c, d) async {},
  onGoalAdjust: (a, b) async {},
  onGoalArchived: (_, _) async {},
);

PlanningData _data({bool seeded = true}) => PlanningData(
  budgets: const [],
  commitments: seeded ? DemoStore.seedCommitments() : const [],
  goals: const [
    SavingsGoal(
      id: 'g-1',
      name: 'Quỹ khẩn cấp',
      targetMinor: 10000000,
      allocatedMinor: 5000000,
    ),
  ],
  accounts: DemoStore.seedAccounts(),
  categories: DemoStore.seedCategories(),
  monthStart: _monthStart(),
  budgetMonth: _monthStart(),
);

/// Semantics widgets by declared label — independent of how the platform
/// tree merges nodes.
Finder _labelled(RegExp label) => find.byWidgetPredicate(
  (w) => w is Semantics && label.hasMatch(w.properties.label ?? ''),
);

void _tall(WidgetTester tester) {
  tester.view.physicalSize = const Size(800, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Widget _reports({
  void Function(TransactionQuery, String)? onOpen,
  double scale = 1,
  Future<List<AccountSummary>> Function()? loadAccounts,
}) => MaterialApp(
  builder: (context, child) => MediaQuery(
    data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(scale)),
    child: child!,
  ),
  home: ReportsPage(
    loadTransactions: () => Future.value([
      _tx('a', TransactionKind.income, 1000000),
      _tx('b', TransactionKind.expense, 250000),
    ]),
    loadAccounts: loadAccounts,
    onOpenActivity: onOpen == null ? null : (q, t) async => onOpen(q, t),
  ),
);

void main() {
  group('reports totals', () {
    testWidgets('Chi card opens the period filtered to expenses (A1)', (
      tester,
    ) async {
      _tall(tester);
      TransactionQuery? q;
      await tester.pumpWidget(_reports(onOpen: (query, _) => q = query));
      await tester.pumpAndSettle();
      expect(_labelled(RegExp('^Xem các khoản chi trong kỳ\$')), findsOne);
      await tester.tap(find.widgetWithText(InkWell, 'Chi'));
      await tester.pumpAndSettle();
      expect(q!.kind, TransactionKind.expense);
      expect(q!.dateFrom, _monthStart());
      expect(q!.dateTo, isNotNull);
    });

    testWidgets('Thu opens income; Còn lại and Tiết kiệm are unfiltered', (
      tester,
    ) async {
      _tall(tester);
      final seen = <TransactionQuery>[];
      await tester.pumpWidget(_reports(onOpen: (query, _) => seen.add(query)));
      await tester.pumpAndSettle();
      for (final l in ['Thu', 'Còn lại', 'Tiết kiệm']) {
        await tester.tap(find.widgetWithText(InkWell, l));
        await tester.pumpAndSettle();
      }
      expect(seen[0].kind, TransactionKind.income);
      expect(seen[1].kind, isNull);
      expect(seen[2].kind, isNull);
    });

    testWidgets('savings card states its denominator (A6)', (tester) async {
      _tall(tester);
      await tester.pumpWidget(_reports());
      await tester.pumpAndSettle();
      expect(find.text('của thu trong kỳ'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
    });

    testWidgets('net worth names account count and window (A2, A3)', (
      tester,
    ) async {
      _tall(tester);
      final accounts = DemoStore.seedAccounts();
      await tester.pumpWidget(_reports(loadAccounts: () async => accounts));
      await tester.pumpAndSettle();
      expect(
        find.text('Gồm ${accounts.length} tài khoản · 6 tháng gần nhất'),
        findsOneWidget,
      );
      expect(_labelled(RegExp('^Thu chi theo tuần: ')), findsOneWidget);
    });

    testWidgets('2x text scale does not overflow totals (B1)', (tester) async {
      _tall(tester);
      await tester.pumpWidget(_reports(scale: 2));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });

  group('planning', () {
    Future<void> pump(WidgetTester tester, {double scale = 1}) async {
      _tall(tester);
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: TextScaler.linear(scale)),
            child: child!,
          ),
          home: PlanningPage(
            loadData: (_) => Future.value(_data()),
            actions: _actions(),
          ),
        ),
      );
      await tester.pumpAndSettle();
    }

    testWidgets('Trả confirm names the expense fact and account (A5)', (
      tester,
    ) async {
      await pump(tester);
      final c = DemoStore.seedCommitments().firstWhere((c) => !c.paidThisMonth);
      await tester.tap(find.text('Trả').first);
      await tester.pumpAndSettle();
      expect(find.textContaining('Ghi chi '), findsOneWidget);
      expect(find.textContaining('vào ${c.accountName}'), findsOneWidget);
    });

    testWidgets('goal tick bar is labelled with percent (B4)', (tester) async {
      await pump(tester);
      expect(_labelled(RegExp('^Đã đạt 50% mục tiêu\$')), findsOneWidget);
    });

    testWidgets('goal tile survives 2x text scale (B1)', (tester) async {
      await pump(tester, scale: 2);
      expect(tester.takeException(), isNull);
      expect(find.text('Quỹ khẩn cấp'), findsOneWidget);
    });

    testWidgets('commitment and goal expose a visible archive affordance', (
      tester,
    ) async {
      await pump(tester);
      // The web rows show their actions; hidden long-press is not parity.
      expect(find.byTooltip('Tùy chọn Quỹ khẩn cấp'), findsOneWidget);
      final c = DemoStore.seedCommitments().firstWhere((c) => !c.paidThisMonth);
      await tester.tap(find.byTooltip('Tùy chọn ${c.name}'));
      await tester.pumpAndSettle();
      expect(find.text('Sửa'), findsWidgets);
      expect(find.text('Lưu trữ'), findsOneWidget);
    });
  });
}
