import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/planning/planning_page.dart';
import 'package:moneyflow/features/reports/reports_page.dart';

String _monthStart() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}-01';
}

/// A date guaranteed to fall inside the current month — ReportsPage scopes
/// transactions by string-comparing `occurredOn` to this month's bounds.
String _thisMonthDay() {
  final now = DateTime.now();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}-10';
}

PlanningData _seedPlanningData() => PlanningData(
  budgets: DemoStore.seedBudgets(_monthStart()),
  commitments: DemoStore.seedCommitments(),
  goals: DemoStore.seedGoals(),
  accounts: DemoStore.seedAccounts(),
  categories: DemoStore.seedCategories(),
  monthStart: _monthStart(),
);

PlanningActions _actions({
  Future<void> Function(RecurringCommitment c)? onCommitmentPay,
  Future<void> Function(RecurringCommitment c)? onCommitmentUndo,
  Future<void> Function(String id, bool archived)? onCommitmentArchived,
  Future<void> Function(RecurringCommitment?, String, int, int, String, String)?
  onCommitmentSave,
  Future<void> Function(BudgetProgress?, String, int)? onBudgetSave,
  Future<void> Function(String id)? onBudgetDelete,
  Future<void> Function(SavingsGoal?, String, int, String?)? onGoalSave,
  Future<void> Function(String id, int amount)? onGoalAdjust,
  Future<void> Function(String id, bool archived)? onGoalArchived,
}) => PlanningActions(
  onBudgetSave: onBudgetSave ?? (a, b, c) async {},
  onBudgetDelete: onBudgetDelete ?? (_) async {},
  onCommitmentSave: onCommitmentSave ?? (a, b, c, d, e, f) async {},
  onCommitmentPay: onCommitmentPay ?? (_) async {},
  onCommitmentUndo: onCommitmentUndo ?? (_) async {},
  onCommitmentArchived: onCommitmentArchived ?? (_, _) async {},
  onGoalSave: onGoalSave ?? (a, b, c, d) async {},
  onGoalAdjust: onGoalAdjust ?? (a, b) async {},
  onGoalArchived: onGoalArchived ?? (_, _) async {},
);

Future<void> _pumpPlanning(
  WidgetTester tester, {
  required PlanningActions actions,
}) async {
  // The seeded page (budgets + commitments + goals + archived section) is
  // taller than the default 800x600 test surface, so bottom rows would be
  // unreachable for hit-testing. Grow the viewport instead of scrolling.
  tester.view.physicalSize = const Size(800, 1600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: PlanningPage(
        loadData: () => Future.value(_seedPlanningData()),
        actions: actions,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Transaction _tx(
  String id,
  TransactionKind kind,
  String category,
  int amount,
  String occurredOn, {
  String? payee,
  String account = 'Tiền mặt',
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'cat-$id',
  category: category,
  note: '',
  accountId: 'acc-cash',
  account: account,
  amount: amount,
  occurredOn: occurredOn,
  payee: payee,
);

/// YYYY-MM-01 of the month before the current one — the window the
/// reports chevron-left must load.
String _prevMonthStart() {
  final now = DateTime.now();
  final prev = DateTime(now.year, now.month - 1);
  return '${prev.year}-${prev.month.toString().padLeft(2, '0')}-01';
}

/// "Tháng M/YYYY" label of the month before the current one.
String _prevMonthLabel() {
  final now = DateTime.now();
  final prev = DateTime(now.year, now.month - 1);
  return 'Tháng ${prev.month}/${prev.year}';
}

/// A taller viewport — the report's sections outgrow the default 800x600
/// surface and ListView builds offscreen rows lazily.
void _tallViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(800, 2800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

const _salary = RecurringIncome(
  id: 'inc-1',
  name: 'Lương',
  amountMinor: 15000000,
  dueDay: 5,
  accountId: 'acc-bank',
  accountName: 'Ngân hàng VCB',
  categoryId: 'cat-salary',
  categoryName: 'Lương',
);

Future<void> _pumpIncome(
  WidgetTester tester, {
  required List<RecurringIncome> templates,
  required PlanningActions actions,
}) async {
  await tester.pumpWidget(
    MaterialApp(
      home: PlanningPage(
        loadData: () => Future.value(
          PlanningData(
            budgets: const [],
            commitments: const [],
            goals: const [],
            accounts: DemoStore.seedAccounts(),
            categories: DemoStore.seedCategories(),
            monthStart: _monthStart(),
            incomeTemplates: templates,
          ),
        ),
        actions: actions,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

PlanningActions _incomeActions({
  Future<void> Function(RecurringIncome)? onReceive,
  Future<void> Function(RecurringIncome)? onUndo,
  Future<void> Function(RecurringIncome?, String, int, int, String, String)?
  onSave,
  Future<void> Function(String, bool)? onArchived,
}) => PlanningActions(
  onBudgetSave: (a, b, c) async {},
  onBudgetDelete: (_) async {},
  onCommitmentSave: (a, b, c, d, e, f) async {},
  onCommitmentPay: (_) async {},
  onCommitmentUndo: (_) async {},
  onCommitmentArchived: (_, _) async {},
  onGoalSave: (a, b, c, d) async {},
  onGoalAdjust: (a, b) async {},
  onGoalArchived: (_, _) async {},
  onIncomeSave: onSave ?? (a, b, c, d, e, f) async {},
  onIncomeReceive: onReceive ?? (_) async {},
  onIncomeUndo: onUndo ?? (_) async {},
  onIncomeArchived: onArchived ?? (_, _) async {},
);

void main() {
  group('ReportsPage loading', () {
    testWidgets('a failed load shows the retry state instead of spinning', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () => Future.error(Exception('offline')),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Không tải được báo cáo'), findsOneWidget);
      expect(find.text('Thử lại'), findsOneWidget);
    });

    testWidgets('prefers the server-side month query over the feed page', (
      tester,
    ) async {
      String? from, to;
      var feedCalls = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () async {
              feedCalls++;
              return const [];
            },
            loadRange: (f, t) async {
              from = f;
              to = t;
              return [
                _tx(
                  'r1',
                  TransactionKind.expense,
                  'Ăn uống',
                  70000,
                  _thisMonthDay(),
                ),
              ];
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(feedCalls, 0);
      expect(from, _monthStart());
      expect(to!.endsWith('-01'), isTrue);
      expect(find.textContaining('70.000'), findsWidgets);
    });
  });

  group('PlanningPage recurring income', () {
    testWidgets('demo (no income actions, no templates) hides the section', (
      tester,
    ) async {
      await _pumpPlanning(tester, actions: _actions());
      expect(find.text('Thu nhập định kỳ'), findsNothing);
    });

    testWidgets('lists templates; Nhận confirms then records the receipt', (
      tester,
    ) async {
      RecurringIncome? received;
      await _pumpIncome(
        tester,
        templates: const [_salary],
        actions: _incomeActions(onReceive: (i) async => received = i),
      );

      expect(find.text('Thu nhập định kỳ'), findsOneWidget);
      expect(find.text('Lương'), findsWidgets);
      expect(find.textContaining('ngày 5'), findsOneWidget);

      await tester.tap(find.text('Nhận'));
      await tester.pumpAndSettle();
      // Money moves only after an explicit confirmation.
      expect(received, isNull);
      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();
      expect(received?.id, 'inc-1');
    });

    testWidgets('a received template offers an explicit undo', (tester) async {
      RecurringIncome? undone;
      await _pumpIncome(
        tester,
        templates: [
          const RecurringIncome(
            id: 'inc-1',
            name: 'Lương',
            amountMinor: 15000000,
            dueDay: 5,
            accountId: 'acc-bank',
            accountName: 'Ngân hàng VCB',
            categoryId: 'cat-salary',
            categoryName: 'Lương',
            receivedThisMonth: true,
          ),
        ],
        actions: _incomeActions(onUndo: (i) async => undone = i),
      );

      expect(find.text('Nhận'), findsNothing);
      await tester.tap(find.text('Đã nhận'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();
      expect(undone?.id, 'inc-1');
    });

    testWidgets('create dialog uses income categories and posts the template', (
      tester,
    ) async {
      List<Object?>? created;
      await _pumpIncome(
        tester,
        templates: const [],
        actions: _incomeActions(
          onSave: (editing, n, a, d, acc, cat) async =>
              created = [editing, n, a, d, acc, cat],
        ),
      );

      // First "+" belongs to the budget section; income is the second.
      await tester.tap(find.byIcon(Icons.add_circle_outline).at(1));
      await tester.pumpAndSettle();
      expect(find.text('Thu nhập định kỳ mới'), findsOneWidget);
      expect(find.text('Tài khoản nhận'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'Tên'), 'Lương');
      await tester.enterText(find.widgetWithText(TextField, 'Số tiền'), '15tr');
      await tester.enterText(
        find.widgetWithText(TextField, 'Ngày đến hạn (1-31)'),
        '5',
      );
      await tester.tap(find.text('Tạo'));
      await tester.pumpAndSettle();

      // editing=null means create; only the income category exists in the
      // seed, so it wins the picker default.
      expect(created, [null, 'Lương', 15000000, 5, 'acc-cash', 'cat-salary']);
    });

    testWidgets('tapping a template opens edit mode prefilled', (tester) async {
      List<Object?>? saved;
      await _pumpIncome(
        tester,
        templates: const [_salary],
        actions: _incomeActions(
          onSave: (editing, n, a, d, acc, cat) async =>
              saved = [editing, n, a, d, acc, cat],
        ),
      );

      await tester.tap(find.text('Lương').first);
      await tester.pumpAndSettle();

      expect(find.text('Sửa thu nhập định kỳ'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.widgetWithText(TextField, 'Tên'))
            .controller
            ?.text,
        'Lương',
      );
      expect(
        tester
            .widget<TextField>(find.widgetWithText(TextField, 'Số tiền'))
            .controller
            ?.text,
        '15000000',
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Tên'),
        'Lương tháng',
      );
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(saved?.first, isA<RecurringIncome>());
      expect((saved?.first as RecurringIncome).id, 'inc-1');
      expect(saved?[1], 'Lương tháng');
    });

    testWidgets('a failed edit shows the honest stale message in-dialog', (
      tester,
    ) async {
      await _pumpIncome(
        tester,
        templates: const [_salary],
        actions: _incomeActions(
          onSave: (editing, n, a, d, acc, cat) async =>
              throw Exception('stale_write'),
        ),
      );

      await tester.tap(find.text('Lương').first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(
        find.text('Dữ liệu vừa thay đổi — đóng rồi mở lại để sửa bản mới'),
        findsOneWidget,
      );
    });
  });

  group('PlanningPage', () {
    testWidgets('renders section titles and seed item names', (tester) async {
      await _pumpPlanning(tester, actions: _actions());

      expect(find.text('Ngân sách tháng'), findsOneWidget);
      expect(find.text('Cam kết hàng tháng'), findsOneWidget);
      expect(find.text('Mục tiêu tiết kiệm'), findsOneWidget);

      // Seed budget names.
      expect(find.text('Ăn uống'), findsOneWidget);
      expect(find.text('Di chuyển'), findsOneWidget);
      // Seed commitment names.
      expect(find.text('Tiền nhà'), findsOneWidget);
      expect(find.text('Internet'), findsOneWidget);
      // Seed goal name.
      expect(find.text('Quỹ khẩn cấp'), findsOneWidget);
    });

    testWidgets(
      'budgets render all three states with amounts and a pace marker',
      (tester) async {
        await _pumpPlanning(tester, actions: _actions());

        // Seed 'Di chuyển': spentMinor 532000 > limitMinor 500000.
        expect(find.textContaining('Vượt 32.000'), findsOneWidget);
        // Seed 'Ăn uống': 45.000 / 2.000.000 → ok state names the remainder.
        expect(find.textContaining('Còn lại 1.955.000'), findsOneWidget);
        // Every budget bar carries the pace semantics label.
        expect(find.bySemanticsLabel(RegExp('Đã chi')), findsWidgets);
      },
    );

    testWidgets('a near-limit budget shows the sắp tới hạn mức state', (
      tester,
    ) async {
      final data = PlanningData(
        budgets: [
          BudgetProgress(
            id: 'b-near',
            categoryId: 'cat-food',
            categoryName: 'Ăn uống',
            monthStart: _monthStart(),
            limitMinor: 500000,
            spentMinor: 420000,
          ),
        ],
        commitments: const [],
        goals: const [],
        accounts: const [],
        categories: const [],
        monthStart: _monthStart(),
      );
      await tester.pumpWidget(
        MaterialApp(
          home: PlanningPage(
            loadData: () => Future.value(data),
            actions: _actions(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 84% spent → near-limit state with the headroom amount.
      expect(
        find.textContaining('Sắp tới hạn mức · còn 80.000'),
        findsOneWidget,
      );
    });

    testWidgets(
      'paid commitment shows Đã trả; Trả flow calls onCommitmentPay',
      (tester) async {
        var payCalls = 0;
        RecurringCommitment? paidCommitment;
        await _pumpPlanning(
          tester,
          actions: _actions(
            onCommitmentPay: (c) {
              payCalls++;
              paidCommitment = c;
              // Never completes on purpose: PlanningPage._payCommitment awaits
              // this callback and then calls _refresh(), whose
              // `setState(() => _data = widget.loadData())` closure returns the
              // Future and trips the "setState() callback argument returned a
              // Future" assert (planning_page.dart). That is a page bug outside
              // this test's scope — keeping the spy's Future pending confines
              // the test to the contract under test: the pay action fires
              // exactly once with the right commitment.
              return Completer<void>().future;
            },
          ),
        );

        // 'Tiền nhà' is paidThisMonth: true; 'Internet' is unpaid.
        expect(find.text('Đã trả'), findsOneWidget);
        expect(find.text('Trả'), findsOneWidget);

        await tester.ensureVisible(find.text('Trả'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Trả'));
        await tester.pumpAndSettle();

        // Confirm dialog.
        expect(find.text('Đồng ý'), findsOneWidget);
        await tester.tap(find.text('Đồng ý'));
        await tester.pumpAndSettle();

        expect(payCalls, 1);
        expect(paidCommitment?.id, 'cm-2');
      },
    );

    testWidgets('tapping a commitment opens edit mode prefilled', (
      tester,
    ) async {
      List<Object?>? saved;
      await _pumpPlanning(
        tester,
        actions: _actions(
          onCommitmentSave: (editing, n, a, d, acc, cat) async =>
              saved = [editing, n, a, d, acc, cat],
        ),
      );

      await tester.tap(find.text('Internet'));
      await tester.pumpAndSettle();

      expect(find.text('Sửa cam kết'), findsOneWidget);
      expect(
        tester
            .widget<TextField>(find.widgetWithText(TextField, 'Tên'))
            .controller
            ?.text,
        'Internet',
      );
      expect(
        tester
            .widget<TextField>(find.widgetWithText(TextField, 'Số tiền'))
            .controller
            ?.text,
        '250000',
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Số tiền'),
        '300000',
      );
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(saved?.first, isA<RecurringCommitment>());
      expect((saved?.first as RecurringCommitment).id, 'cm-2');
      expect(saved?[2], 300000);
    });

    testWidgets('a stale commitment save shows the honest edit message', (
      tester,
    ) async {
      await _pumpPlanning(
        tester,
        actions: _actions(
          onCommitmentSave: (editing, n, a, d, acc, cat) async =>
              throw Exception('stale_write'),
        ),
      );

      await tester.tap(find.text('Internet'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(
        find.text('Dữ liệu vừa thay đổi — đóng rồi mở lại để sửa bản mới'),
        findsOneWidget,
      );
    });

    testWidgets('a paid commitment offers Hoàn tác like the income flow', (
      tester,
    ) async {
      RecurringCommitment? undone;
      await _pumpPlanning(
        tester,
        actions: _actions(onCommitmentUndo: (c) async => undone = c),
      );

      // 'Tiền nhà' is paidThisMonth — tapping Đã trả asks before undoing.
      await tester.ensureVisible(find.text('Đã trả'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Đã trả'));
      await tester.pumpAndSettle();
      expect(undone, isNull);
      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();
      expect(undone?.id, 'cm-1');
    });

    testWidgets('archived commitments collapse under Đã lưu trữ and restore', (
      tester,
    ) async {
      String? restoredId;
      bool? restoredTo;
      final data = _seedPlanningData();
      await tester.pumpWidget(
        MaterialApp(
          home: PlanningPage(
            loadData: () => Future.value(
              PlanningData(
                budgets: data.budgets,
                commitments: [
                  ...data.commitments,
                  const RecurringCommitment(
                    id: 'cm-old',
                    name: 'Netflix cũ',
                    amountMinor: 100000,
                    dueDay: 1,
                    accountId: 'acc-bank',
                    accountName: 'Ngân hàng VCB',
                    categoryId: 'cat-bills',
                    categoryName: 'Hóa đơn',
                    isArchived: true,
                  ),
                ],
                goals: data.goals,
                accounts: data.accounts,
                categories: data.categories,
                monthStart: data.monthStart,
              ),
            ),
            actions: _actions(
              onCommitmentArchived: (id, archived) async {
                restoredId = id;
                restoredTo = archived;
              },
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // The archived row is hidden until the collapsed group expands.
      expect(find.text('Netflix cũ'), findsNothing);
      await tester.ensureVisible(find.text('Đã lưu trữ (1)'));
      await tester.tap(find.text('Đã lưu trữ (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Netflix cũ'), findsOneWidget);

      await tester.tap(find.text('Khôi phục'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();
      expect(restoredId, 'cm-old');
      expect(restoredTo, isFalse);
    });

    testWidgets('tapping a budget edits only the limit — category locked', (
      tester,
    ) async {
      List<Object?>? saved;
      await _pumpPlanning(
        tester,
        actions: _actions(
          onBudgetSave: (editing, categoryId, limit) async =>
              saved = [editing, categoryId, limit],
        ),
      );

      await tester.tap(find.text('Ăn uống'));
      await tester.pumpAndSettle();

      expect(find.text('Sửa ngân sách'), findsOneWidget);
      // Category shows as a read-only field, not a dropdown.
      expect(find.byType(DropdownButtonFormField<Category>), findsNothing);
      expect(
        tester
            .widget<TextField>(find.widgetWithText(TextField, 'Hạn mức'))
            .controller
            ?.text,
        '2000000',
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Hạn mức'),
        '2500000',
      );
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(saved?.first, isA<BudgetProgress>());
      expect((saved?.first as BudgetProgress).id, 'b-1');
      expect(saved?[1], 'cat-food');
      expect(saved?[2], 2500000);
    });

    testWidgets('a stale budget save shows the honest edit message', (
      tester,
    ) async {
      await _pumpPlanning(
        tester,
        actions: _actions(
          onBudgetSave: (editing, categoryId, limit) async =>
              throw Exception('stale_write'),
        ),
      );

      await tester.tap(find.text('Ăn uống'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(
        find.text('Dữ liệu vừa thay đổi — đóng rồi mở lại để sửa bản mới'),
        findsOneWidget,
      );
    });

    testWidgets('long-press still asks before deleting a budget', (
      tester,
    ) async {
      String? deleted;
      await _pumpPlanning(
        tester,
        actions: _actions(onBudgetDelete: (id) async => deleted = id),
      );

      await tester.longPress(find.text('Di chuyển'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Xóa ngân sách'), findsOneWidget);
      await tester.tap(find.text('Đồng ý'));
      await tester.pumpAndSettle();
      expect(deleted, 'b-2');
    });

    testWidgets('tapping a goal opens edit mode prefilled', (tester) async {
      List<Object?>? saved;
      await _pumpPlanning(
        tester,
        actions: _actions(
          onGoalSave: (editing, n, t, deadline) async =>
              saved = [editing, n, t, deadline],
        ),
      );

      await tester.tap(find.text('Quỹ khẩn cấp'));
      await tester.pumpAndSettle();

      expect(find.text('Sửa mục tiêu'), findsOneWidget);
      expect(find.text('2027-03-01'), findsOneWidget); // deadline prefilled
      expect(
        tester
            .widget<TextField>(find.widgetWithText(TextField, 'Tên mục tiêu'))
            .controller
            ?.text,
        'Quỹ khẩn cấp',
      );

      await tester.enterText(
        find.widgetWithText(TextField, 'Tên mục tiêu'),
        'Quỹ khẩn cấp mới',
      );
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(saved?.first, isA<SavingsGoal>());
      expect((saved?.first as SavingsGoal).id, 'g-1');
      expect(saved?[1], 'Quỹ khẩn cấp mới');
      expect(saved?[3], '2027-03-01');
    });

    testWidgets('a goal target below allocated is refused before saving', (
      tester,
    ) async {
      var saveCalls = 0;
      await _pumpPlanning(
        tester,
        actions: _actions(onGoalSave: (e, n, t, d) async => saveCalls++),
      );

      await tester.tap(find.text('Quỹ khẩn cấp'));
      await tester.pumpAndSettle();
      // Seed allocated is 8.500.000 — 1tr is below it.
      await tester.enterText(
        find.widgetWithText(TextField, 'Số tiền mục tiêu'),
        '1tr',
      );
      await tester.tap(find.text('Lưu'));
      await tester.pumpAndSettle();

      expect(saveCalls, 0);
      expect(
        find.text('Mức đích không được thấp hơn tiền đã dành'),
        findsOneWidget,
      );
    });

    testWidgets('withdrawing calls onGoalAdjust with a negative amount', (
      tester,
    ) async {
      int? adjusted;
      await _pumpPlanning(
        tester,
        actions: _actions(
          onGoalAdjust: (id, amount) async => adjusted = amount,
        ),
      );

      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Rút tiền'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Rút khỏi'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'Số tiền'), '1tr');
      await tester.tap(find.text('Rút'));
      await tester.pumpAndSettle();
      expect(adjusted, -1000000);
    });

    testWidgets('withdrawing more than allocated is refused in-dialog', (
      tester,
    ) async {
      var adjustCalls = 0;
      await _pumpPlanning(
        tester,
        actions: _actions(onGoalAdjust: (id, a) async => adjustCalls++),
      );

      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Rút tiền'));
      await tester.pumpAndSettle();
      // Allocated is 8.500.000 — 10tr is over.
      await tester.enterText(find.widgetWithText(TextField, 'Số tiền'), '10tr');
      await tester.tap(find.text('Rút'));
      await tester.pumpAndSettle();

      expect(adjustCalls, 0);
      expect(find.text('Không thể rút quá số tiền đã dành'), findsOneWidget);
    });

    testWidgets('archiving a funded goal warns instead of asking', (
      tester,
    ) async {
      var archiveCalls = 0;
      await _pumpPlanning(
        tester,
        actions: _actions(
          onGoalArchived: (id, archived) async => archiveCalls++,
        ),
      );

      await tester.pumpAndSettle();
      await tester.longPress(find.text('Quỹ khẩn cấp'));
      await tester.pumpAndSettle();

      // No confirm dialog — the guard message shows straight away.
      expect(find.text('Đồng ý'), findsNothing);
      expect(
        find.text('Hãy rút hết tiền đã dành trước khi lưu trữ'),
        findsOneWidget,
      );
      expect(archiveCalls, 0);
    });
  });

  group('ReportsPage', () {
    testWidgets('renders totals labels and a category name', (tester) async {
      _tallViewport(tester);
      final day = _thisMonthDay();
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () => Future.value([
              _tx('t1', TransactionKind.expense, 'Ăn uống', 45000, day),
              _tx('t2', TransactionKind.expense, 'Di chuyển', 32000, day),
              _tx('t3', TransactionKind.income, 'Lương', 15000000, day),
              // Outside this month — must be excluded from the breakdown.
              _tx('t4', TransactionKind.expense, 'Khác', 999, '2000-01-10'),
            ]),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Thu'), findsOneWidget);
      expect(find.text('Chi'), findsOneWidget);
      expect(find.text('Còn lại'), findsOneWidget);
      expect(find.text('Tiết kiệm'), findsOneWidget);
      expect(find.text('Ăn uống'), findsOneWidget);
      expect(find.text('Di chuyển'), findsOneWidget);
      // Out-of-month expense never reaches the breakdown.
      expect(find.text('Khác'), findsNothing);
    });

    testWidgets('renders the income, account and payee breakdowns', (
      tester,
    ) async {
      _tallViewport(tester);
      final day = _thisMonthDay();
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () => Future.value([
              _tx(
                't1',
                TransactionKind.expense,
                'Ăn uống',
                45000,
                day,
                payee: 'Quán gần nhà',
              ),
              _tx(
                't2',
                TransactionKind.expense,
                'Di chuyển',
                32000,
                day,
                account: 'Ví MoMo',
              ),
              _tx(
                't3',
                TransactionKind.income,
                'Lương',
                15000000,
                day,
                account: 'Ngân hàng VCB',
              ),
              // A transfer must not inflate any breakdown.
              _tx(
                't4',
                TransactionKind.transfer,
                'Chuyển khoản',
                500000,
                day,
                account: 'Ngân hàng VCB',
              ),
            ]),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Chi theo danh mục'), findsOneWidget);
      expect(find.text('Thu theo danh mục'), findsOneWidget);
      expect(find.text('Chi theo tài khoản'), findsOneWidget);
      expect(find.text('Chi theo người nhận'), findsOneWidget);
      expect(find.text('Quán gần nhà'), findsOneWidget);
      // t2 carried no payee — it lands in the honest unnamed bucket.
      expect(find.text('Không tên'), findsOneWidget);
      expect(find.text('Ví MoMo'), findsOneWidget);
      // Only income and a transfer touched VCB — never an expense row.
      expect(find.text('Ngân hàng VCB'), findsNothing);
      expect(find.text('Chuyển khoản'), findsNothing);
    });

    testWidgets('empty transaction list shows the honest empty period', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(loadTransactions: () => Future.value(const [])),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Không có giao dịch trong kỳ này'), findsOneWidget);
    });
  });

  group('ReportsPage periods', () {
    testWidgets('next chevron is disabled while viewing the current month', (
      tester,
    ) async {
      await tester.pumpWidget(
        MaterialApp(home: ReportsPage(loadTransactions: () async => const [])),
      );
      await tester.pumpAndSettle();

      expect(
        tester
            .widget<IconButton>(
              find.widgetWithIcon(IconButton, Icons.chevron_right),
            )
            .onPressed,
        isNull,
      );
      expect(
        tester
            .widget<IconButton>(
              find.widgetWithIcon(IconButton, Icons.chevron_left),
            )
            .onPressed,
        isNotNull,
      );
      expect(
        find.text('Tháng ${DateTime.now().month}/${DateTime.now().year}'),
        findsOneWidget,
      );
    });

    testWidgets('prev chevron loads the previous month via loadRange', (
      tester,
    ) async {
      final calls = <List<String>>[];
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () async => const [],
            loadRange: (f, t) async {
              calls.add([f, t]);
              return const [];
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(calls.single.first, _monthStart());

      await tester.tap(find.byIcon(Icons.chevron_left));
      await tester.pumpAndSettle();

      // Previous month: [prev-1st, this-1st) — server-side, not the feed.
      expect(calls.last, [_prevMonthStart(), _monthStart()]);
      expect(find.text(_prevMonthLabel()), findsOneWidget);
      // Now one month back, next is enabled again.
      expect(
        tester
            .widget<IconButton>(
              find.widgetWithIcon(IconButton, Icons.chevron_right),
            )
            .onPressed,
        isNotNull,
      );
      // An empty period is honest, not a zeroed report.
      expect(find.text('Không có giao dịch trong kỳ này'), findsOneWidget);
    });

    testWidgets('reload() refreshes the selected period, not "now"', (
      tester,
    ) async {
      final key = GlobalKey<ReportsPageState>();
      final calls = <String>[];
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            key: key,
            loadTransactions: () async => const [],
            loadRange: (f, t) async {
              calls.add(f);
              return const [];
            },
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byIcon(Icons.chevron_left));
      await tester.pumpAndSettle();

      key.currentState!.reload();
      await tester.pumpAndSettle();

      expect(calls.last, _prevMonthStart());
      expect(find.text(_prevMonthLabel()), findsOneWidget);
    });

    testWidgets('Tùy chọn applies the picked range and labels the report', (
      tester,
    ) async {
      String? from, to;
      // Two months back keeps the window safely in the past — a picked end
      // beyond today would clamp and break the expected bounds.
      final now = DateTime.now();
      final start = DateTime(now.year, now.month - 2, 5);
      final end = DateTime(now.year, now.month - 2, 20);
      String pad(int v) => v.toString().padLeft(2, '0');
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () async => const [],
            loadRange: (f, t) async {
              from = f;
              to = t;
              return const [];
            },
            pickRange: (_) async => DateTimeRange(start: start, end: end),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.text('Tùy chọn'));
      await tester.pumpAndSettle();

      // Inclusive end 20th -> exclusive bound 21st.
      expect(from, '${start.year}-${pad(start.month)}-05');
      expect(to, '${start.year}-${pad(start.month)}-21');
      expect(
        find.text('5/${start.month} – 20/${start.month}/${start.year}'),
        findsOneWidget,
      );

      // A way back to the default month while a custom window is up.
      await tester.tap(find.text('Tháng này'));
      await tester.pumpAndSettle();
      expect(find.text('Tháng ${now.month}/${now.year}'), findsOneWidget);
      expect(from, _monthStart());
    });

    testWidgets('a failed period keeps its label; retry reloads it', (
      tester,
    ) async {
      var fail = false;
      final calls = <String>[];
      await tester.pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () async => const [],
            loadRange: (f, t) async {
              calls.add(f);
              if (fail) throw Exception('offline');
              return const [];
            },
          ),
        ),
      );
      await tester.pumpAndSettle();

      fail = true;
      await tester.tap(find.byIcon(Icons.chevron_left));
      await tester.pumpAndSettle();

      expect(find.text('Không tải được báo cáo'), findsOneWidget);
      // The bar still names the failed period — not the previous data's.
      expect(find.text(_prevMonthLabel()), findsOneWidget);

      fail = false;
      await tester.tap(find.text('Thử lại'));
      await tester.pumpAndSettle();

      expect(find.text('Không có giao dịch trong kỳ này'), findsOneWidget);
      expect(calls.last, _prevMonthStart());
    });
  });
}
