import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/money.dart';
import 'package:moneyflow/domain/report.dart' show vnNow;
import 'package:moneyflow/domain/safe_to_spend.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';

BudgetProgress _budget({
  int limit = 2000000,
  int spent = 0,
  String monthStart = '2026-10-01',
  BudgetPeriod period = BudgetPeriod.monthly,
}) => BudgetProgress(
  id: 'b-$spent-$limit-${period.key}',
  categoryId: 'cat-food',
  categoryName: 'Ăn uống',
  monthStart: monthStart,
  limitMinor: limit,
  spentMinor: spent,
  period: period,
);

RecurringCommitment _commitment({
  int amount = 300000,
  int dueDay = 20,
  bool paid = false,
  bool archived = false,
  int intervalMonths = 1,
  String? lastPaidMonth,
}) => RecurringCommitment(
  id: 'cm-$dueDay-$amount-$intervalMonths',
  name: 'Internet',
  amountMinor: amount,
  dueDay: dueDay,
  accountId: 'acc-bank',
  accountName: 'Ngân hàng VCB',
  categoryId: 'cat-bills',
  categoryName: 'Hóa đơn',
  isArchived: archived,
  paidThisMonth: paid,
  intervalMonths: intervalMonths,
  lastPaidMonth: lastPaidMonth,
);

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

Future<void> _pumpDash(
  WidgetTester t, {
  Future<List<BudgetProgress>> Function(String monthStart)? loadBudgets,
  Future<List<BudgetProgress>> Function(String fromMonth, String toMonth)?
  loadBudgetRange,
  Future<List<RecurringCommitment>> Function(String monthStart)?
  loadCommitments,
  List<Transaction>? summaryRows,
  VoidCallback? onOpenPlanning,
}) async {
  await t.pumpWidget(
    _wrap(
      DashboardPage(
        loadAccounts: () async => DemoStore.seedAccounts(),
        loadTransactions: () async => DemoStore.seedTransactions(),
        loadBudgets: loadBudgets,
        loadBudgetRange: loadBudgetRange,
        loadCommitments: loadCommitments,
        loadSummaryTransactions: summaryRows == null
            ? null
            : (_, _) async => (rows: summaryRows, truncated: false),
        onOpenPlanning: onOpenPlanning,
      ),
    ),
  );
  await t.pumpAndSettle();
}

/// Mirrors the domain math so the widget assertions stay independent of
/// the day the suite happens to run.
int _daysLeftThisMonth() {
  final n = vnNow();
  return DateTime(n.year, n.month + 1, 0).day - n.day + 1;
}

String _thisMonthStart() {
  final n = vnNow();
  return '${n.year}-${n.month.toString().padLeft(2, '0')}-01';
}

void main() {
  group('safeDailySpend', () {
    final today = DateTime(2026, 10, 15); // 17 days left in Oct 2026

    test('returns null when there are no budgets at all', () {
      expect(
        safeDailySpend(budgets: const [], commitments: const [], today: today),
        isNull,
      );
    });

    test('returns null when budgets only cover other months', () {
      expect(
        safeDailySpend(
          budgets: [_budget(monthStart: '2026-09-01')],
          commitments: const [],
          today: today,
        ),
        isNull,
      );
    });

    test('weekly budgets never feed the monthly remainder — the card '
        'asks "còn lại THÁNG này"', () {
      // The cadence filter runs before the anchor match, so even a
      // weekly row carrying the month-start date (a Monday CAN be the
      // 1st — e.g. 2026-06-01) never folds its smaller weekly limit
      // into the month's headroom.
      expect(
        safeDailySpend(
          budgets: [
            _budget(
              monthStart: '2026-10-01',
              period: BudgetPeriod.weekly,
              limit: 500000,
            ),
          ],
          commitments: const [],
          today: today,
        ),
        isNull,
      );
      final s = safeDailySpend(
        budgets: [
          _budget(spent: 500000),
          _budget(
            monthStart: '2026-10-01',
            period: BudgetPeriod.weekly,
            limit: 500000,
          ),
        ],
        commitments: const [],
        today: today,
      )!;
      // Only the monthly row counts: 2.000.000 − 500.000.
      expect(s.remainingMinor, 1500000);
    });

    test('divides headroom over the remaining days, floor to đồng', () {
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: const [],
        today: today,
      )!;
      // 1.500.000 ~/ 17 — fractional đồng floored, not rounded.
      expect(s.remainingMinor, 1500000);
      expect(s.daysLeft, 17);
      expect(s.perDayMinor, 88235);
    });

    test('an overspent budget contributes zero, never negative headroom', () {
      final s = safeDailySpend(
        budgets: [
          _budget(limit: 500000, spent: 532000),
          _budget(limit: 300000, spent: 0),
        ],
        commitments: const [],
        today: DateTime(2026, 10, 31),
      )!;
      expect(s.remainingMinor, 300000);
      expect(s.perDayMinor, 300000);
    });

    test('every budget overspent clamps the day figure to 0', () {
      final s = safeDailySpend(
        budgets: [_budget(limit: 500000, spent: 800000)],
        commitments: const [],
        today: today,
      )!;
      expect(s.remainingMinor, 0);
      expect(s.perDayMinor, 0);
    });

    test('an unpaid commitment due later this month is reserved', () {
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: [_commitment(amount: 300000, dueDay: 20)],
        today: today,
      )!;
      expect(s.remainingMinor, 1200000);
      expect(s.perDayMinor, 70588); // 1.200.000 ~/ 17
      // The basis line names what was subtracted — the reserve is not
      // implied, it is disclosed.
      expect(s.reservedMinor, 300000);
      expect(s.shortfallMinor, 0);
    });

    test('a commitment due today is still reserved', () {
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: [_commitment(amount: 300000, dueDay: 15)],
        today: today,
      )!;
      expect(s.remainingMinor, 1200000);
    });

    test('paid, archived and past-due commitments are not reserved', () {
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: [
          _commitment(amount: 300000, dueDay: 20, paid: true),
          _commitment(amount: 400000, dueDay: 25, archived: true),
          _commitment(amount: 500000, dueDay: 5), // due before today
        ],
        today: today,
      )!;
      expect(s.remainingMinor, 1500000);
      expect(s.perDayMinor, 88235);
    });

    test('a yearly bill due in a later month reserves a proportional '
        'slice, not the full amount', () {
      // Paid 2026-06, interval 12 → due 2027-06: eight monthly
      // funding slots remain from October, so 2.400.000 ÷ 8 = 300.000
      // is what this month sets aside — never the whole bill.
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: [
          _commitment(
            amount: 2400000,
            intervalMonths: 12,
            lastPaidMonth: '2026-06-01',
          ),
        ],
        today: today,
      )!;
      expect(s.remainingMinor, 1500000 - 300000);
    });

    test('a non-monthly commitment whose cycle IS this month reserves '
        'in full like a monthly one', () {
      // Paid 2025-10, interval 12 → due this October — the slice logic
      // is done; the full bill is what is owed now.
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: [
          _commitment(
            amount: 2400000,
            dueDay: 20,
            intervalMonths: 12,
            lastPaidMonth: '2025-10-01',
          ),
        ],
        today: today,
      )!;
      // Headroom 1.500.000 − full 2.400.000 reserve → clamped 0.
      expect(s.remainingMinor, 0);
    });

    test('a missed non-monthly cycle stays fully reserved', () {
      // Was due 2026-01, unpaid — overdue bills cannot amortize; the
      // whole amount is owed now.
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: [
          _commitment(
            amount: 1200000,
            intervalMonths: 12,
            lastPaidMonth: '2025-01-01',
          ),
        ],
        today: today,
      )!;
      expect(s.remainingMinor, 300000);
    });

    test('reservations larger than headroom clamp the allowance to 0 '
        'but disclose the shortfall honestly', () {
      final s = safeDailySpend(
        budgets: [_budget(limit: 100000, spent: 0)],
        commitments: [_commitment(amount: 500000, dueDay: 20)],
        today: today,
      )!;
      expect(s.remainingMinor, 0);
      expect(s.perDayMinor, 0);
      // 500.000 owed − 100.000 headroom → the plan is short 400.000 ₫;
      // the card says "thiếu" with this amount instead of hiding it.
      expect(s.reservedMinor, 500000);
      expect(s.shortfallMinor, 400000);
    });

    test('month boundary on the Saigon calendar: a UTC-late-October '
        'instant is already November in Vietnam', () {
      // 2026-10-31 17:30 UTC = 2026-11-01 00:30 +07 — the remainder
      // window must follow the ledger's civil month, not the device's.
      final nov = safeDailySpend(
        budgets: [_budget(monthStart: '2026-11-01', spent: 900000)],
        commitments: const [],
        today: vnNow(DateTime.utc(2026, 10, 31, 17, 30)),
      )!;
      expect(nov.daysLeft, 30); // November has 30 days, day 1 counts.
      expect(nov.perDayMinor, 1100000 ~/ 30);
    });

    test('Saigon month boundary, other side: 16:59 UTC on Oct 31 is '
        'still Oct 31 in Vietnam', () {
      final oct = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: const [],
        today: vnNow(DateTime.utc(2026, 10, 31, 16, 59)),
      )!;
      expect(oct.daysLeft, 1);
      expect(oct.perDayMinor, 1500000);
    });

    test('the first of the month divides across the whole month', () {
      final s = safeDailySpend(
        budgets: [_budget(spent: 450000)], // headroom 1.550.000
        commitments: const [],
        today: DateTime(2026, 10, 1),
      )!;
      expect(s.daysLeft, 31);
      expect(s.perDayMinor, 50000);
    });

    test('the last day of the month can spend the whole remainder', () {
      final s = safeDailySpend(
        budgets: [_budget(spent: 500000)],
        commitments: [_commitment(dueDay: 31)],
        today: DateTime(2026, 10, 31),
      )!;
      expect(s.daysLeft, 1);
      expect(s.remainingMinor, 1200000);
      expect(s.perDayMinor, 1200000);
    });

    test('short-month boundary: Feb 28 has a single day left', () {
      final s = safeDailySpend(
        budgets: [_budget(monthStart: '2026-02-01', spent: 900000)],
        commitments: const [],
        today: DateTime(2026, 2, 28),
      )!;
      expect(s.daysLeft, 1);
      expect(s.perDayMinor, 1100000);
    });
  });

  group('DashboardPage remainder card', () {
    testWidgets('renders the month remainder, its per-day equivalent and '
        'the basis label', (t) async {
      final budgets = [_budget(monthStart: _thisMonthStart(), spent: 500000)];
      await _pumpDash(
        t,
        loadBudgets: (_) async => budgets,
        loadCommitments: (_) async => const [],
      );

      expect(find.text('Còn lại tháng này'), findsOneWidget);
      // Hero = the month's remainder, not the per-day figure.
      expect(find.text(formatMoney(1500000)), findsOneWidget);
      expect(
        find.text(
          '~${formatMoney(1500000 ~/ _daysLeftThisMonth())}/ngày · '
          'còn ${_daysLeftThisMonth()} ngày',
        ),
        findsOneWidget,
      );
      expect(find.text('Theo ngân sách tháng và chi đã ghi'), findsOneWidget);
    });

    testWidgets('pace graph verdict reads in words with the percent spent', (
      t,
    ) async {
      final today = vnNow();
      final monthStart =
          '${today.year}-${today.month.toString().padLeft(2, '0')}-01';
      await _pumpDash(
        t,
        loadBudgets: (_) async => [
          _budget(monthStart: _thisMonthStart(), spent: 300000),
        ],
        loadCommitments: (_) async => const [],
        summaryRows: [
          Transaction(
            id: 'tx-pace',
            kind: TransactionKind.expense,
            categoryId: 'cat-food',
            category: 'Ăn uống',
            note: '',
            accountId: 'a1',
            account: 'Tiền mặt',
            amount: 300000,
            occurredOn: monthStart,
          ),
        ],
      );

      // One of the three honest bands — which one depends on the day of
      // month; the percent-of-budget read is the deterministic half.
      expect(
        find.textContaining(
          RegExp(r'(Đúng nhịp tháng|Nhanh hơn nhịp|Chậm hơn nhịp)'),
        ),
        findsOneWidget,
      );
      expect(find.textContaining('đã chi 15% ngân sách'), findsOneWidget);
    });

    testWidgets('no summary read → the card keeps its figure, no chart', (
      t,
    ) async {
      await _pumpDash(
        t,
        loadBudgets: (_) async => [
          _budget(monthStart: _thisMonthStart(), spent: 500000),
        ],
        loadCommitments: (_) async => const [],
      );
      expect(find.text('Còn lại tháng này'), findsOneWidget);
      expect(
        find.textContaining(RegExp(r'nhịp')),
        findsNothing,
      );
    });

    testWidgets('a reserved commitment is named in the basis, not '
        'implied', (t) async {
      final budgets = [_budget(monthStart: _thisMonthStart(), spent: 500000)];
      await _pumpDash(
        t,
        loadBudgets: (_) async => budgets,
        loadCommitments: (_) async => [
          // Due day 31 is never before today's day — the reserve holds
          // on every day of the month.
          _commitment(amount: 300000, dueDay: 31),
        ],
      );

      expect(
        find.text(
          'Theo ngân sách tháng và chi đã ghi · đã trừ '
          'cam kết sắp trả ${formatMoney(300000)}',
        ),
        findsOneWidget,
      );
    });

    testWidgets('no budgets → honest setup nudge pointing at Kế hoạch, '
        'no invented number', (t) async {
      var opened = 0;
      await _pumpDash(
        t,
        loadBudgets: (_) async => const [],
        loadCommitments: (_) async => const [],
        onOpenPlanning: () => opened++,
      );

      expect(find.text('Còn lại tháng này'), findsOneWidget);
      expect(
        find.text(
          'Đặt ngân sách tháng để biết tháng này còn được chi bao nhiêu',
        ),
        findsOneWidget,
      );
      expect(find.text('Theo ngân sách tháng và chi đã ghi'), findsNothing);
      await t.tap(find.text('Mở Kế hoạch'));
      expect(opened, 1);
    });

    testWidgets('the nudge without a planning seam keeps the text only', (
      t,
    ) async {
      await _pumpDash(
        t,
        loadBudgets: (_) async => const [],
        loadCommitments: (_) async => const [],
      );
      expect(find.text('Mở Kế hoạch'), findsNothing);
    });

    testWidgets('fully overspent budgets read 0 ₫, never a negative', (
      t,
    ) async {
      await _pumpDash(
        t,
        loadBudgets: (_) async => [
          _budget(monthStart: _thisMonthStart(), limit: 500000, spent: 900000),
        ],
        loadCommitments: (_) async => const [],
      );

      expect(find.text('Còn lại tháng này'), findsOneWidget);
      expect(find.text('0 ₫'), findsOneWidget);
    });

    testWidgets('commitments overshooting headroom show the honest '
        '"thiếu" figure — not a bare 0', (t) async {
      await _pumpDash(
        t,
        loadBudgets: (_) async => [
          _budget(monthStart: _thisMonthStart(), limit: 100000, spent: 0),
        ],
        loadCommitments: (_) async => [
          // Due day 31 keeps the commitment owed regardless of the day
          // the suite runs.
          _commitment(amount: 500000, dueDay: 31),
        ],
      );

      expect(find.text(formatSignedMoney(-400000)), findsOneWidget);
      expect(
        find.text('Cam kết sắp trả vượt hạn mức ngân sách còn lại'),
        findsOneWidget,
      );
    });

    testWidgets('threshold alerts name over and near categories on the '
        'card', (t) async {
      await _pumpDash(
        t,
        loadBudgets: (_) async => [
          BudgetProgress(
            id: 'b1',
            categoryId: 'cat-transport',
            categoryName: 'Di chuyển',
            monthStart: _thisMonthStart(),
            limitMinor: 500000,
            spentMinor: 532000, // over
          ),
          BudgetProgress(
            id: 'b2',
            categoryId: 'cat-food',
            categoryName: 'Ăn uống',
            monthStart: _thisMonthStart(),
            limitMinor: 500000,
            spentMinor: 430000, // 86% → near
          ),
          _budget(monthStart: _thisMonthStart(), spent: 45000), // ok
        ],
        loadCommitments: (_) async => const [],
      );

      expect(find.text('Di chuyển vượt ${formatMoney(32000)}'), findsOneWidget);
      expect(
        find.text('Ăn uống sắp tới hạn mức — còn ${formatMoney(70000)}'),
        findsOneWidget,
      );
    });

    testWidgets('the range loader\'s carry keeps the card agreeing with '
        'Kế hoạch (prior overspend turns near into over)', (t) async {
      final month = _thisMonthStart();
      final prev = DateTime(
        int.parse(month.substring(0, 4)),
        int.parse(month.substring(5, 7)) - 1,
      );
      final prevStart =
          '${prev.year}-${prev.month.toString().padLeft(2, '0')}-01';
      await _pumpDash(
        t,
        loadBudgetRange: (_, _) async => [
          BudgetProgress(
            id: 'b1',
            categoryId: 'cat-food',
            categoryName: 'Ăn uống',
            monthStart: month,
            limitMinor: 500000,
            spentMinor: 400000, // 80% — "sắp tới" on raw figures
          ),
          BudgetProgress(
            id: 'bp1',
            categoryId: 'cat-food',
            categoryName: 'Ăn uống',
            monthStart: prevStart,
            limitMinor: 500000,
            spentMinor: 700000, // −200.000 carry → effective over
          ),
        ],
        loadCommitments: (_) async => const [],
      );

      // Without the carry this badge would read "sắp tới hạn mức" where
      // the planning tile already says "vượt" — the alert must agree.
      expect(find.text('Ăn uống vượt ${formatMoney(100000)}'), findsOneWidget);
    });

    testWidgets('without planning loaders the card stays hidden', (t) async {
      await _pumpDash(t);
      expect(find.text('Còn lại tháng này'), findsNothing);
    });

    testWidgets(
      'a failing planning read hides the card but keeps the dashboard',
      (t) async {
        await _pumpDash(
          t,
          loadBudgets: (_) async => throw Exception('offline'),
          loadCommitments: (_) async => const [],
        );

        expect(find.text('Còn lại tháng này'), findsNothing);
        // The ledger itself still rendered.
        expect(find.text('Tổng số dư'), findsOneWidget);
        expect(find.text('Tiền mặt'), findsWidgets);
      },
    );
  });
}
