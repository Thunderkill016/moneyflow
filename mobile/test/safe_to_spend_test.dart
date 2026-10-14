import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/money.dart';
import 'package:moneyflow/domain/safe_to_spend.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';

BudgetProgress _budget({
  int limit = 2000000,
  int spent = 0,
  String monthStart = '2026-10-01',
}) => BudgetProgress(
  id: 'b-$spent-$limit',
  categoryId: 'cat-food',
  categoryName: 'Ăn uống',
  monthStart: monthStart,
  limitMinor: limit,
  spentMinor: spent,
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
  Future<List<RecurringCommitment>> Function(String monthStart)?
  loadCommitments,
}) async {
  await t.pumpWidget(
    _wrap(
      DashboardPage(
        loadAccounts: () async => DemoStore.seedAccounts(),
        loadTransactions: () async => DemoStore.seedTransactions(),
        loadBudgets: loadBudgets,
        loadCommitments: loadCommitments,
      ),
    ),
  );
  await t.pumpAndSettle();
}

/// Mirrors the domain math so the widget assertions stay independent of
/// the day the suite happens to run.
int _daysLeftThisMonth() {
  final n = DateTime.now();
  return DateTime(n.year, n.month + 1, 0).day - n.day + 1;
}

String _thisMonthStart() {
  final n = DateTime.now();
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

    test('reservations larger than headroom clamp to 0, not negative', () {
      final s = safeDailySpend(
        budgets: [_budget(limit: 100000, spent: 0)],
        commitments: [_commitment(amount: 500000, dueDay: 20)],
        today: today,
      )!;
      expect(s.remainingMinor, 0);
      expect(s.perDayMinor, 0);
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

  group('DashboardPage safe-spend tile', () {
    testWidgets('renders the figure and the headroom explainer', (t) async {
      final budgets = [_budget(monthStart: _thisMonthStart(), spent: 500000)];
      await _pumpDash(
        t,
        loadBudgets: (_) async => budgets,
        loadCommitments: (_) async => const [],
      );

      expect(find.text('Chi được hôm nay'), findsOneWidget);
      expect(find.text('trong hạn mức ngân sách tháng này'), findsOneWidget);
      expect(
        find.text(formatMoney(1500000 ~/ _daysLeftThisMonth())),
        findsOneWidget,
      );
      expect(
        find.text(
          'Còn ${formatMoney(1500000)} đến hết tháng '
          '(${_daysLeftThisMonth()} ngày)',
        ),
        findsOneWidget,
      );
    });

    testWidgets('no budgets → honest setup nudge, no invented number', (
      t,
    ) async {
      await _pumpDash(
        t,
        loadBudgets: (_) async => const [],
        loadCommitments: (_) async => const [],
      );

      expect(find.text('Chi được hôm nay'), findsOneWidget);
      expect(
        find.text(
          'Đặt ngân sách tháng để biết hôm nay nên chi tối đa bao nhiêu',
        ),
        findsOneWidget,
      );
      expect(find.text('trong hạn mức ngân sách tháng này'), findsNothing);
    });

    testWidgets('fully overspent budgets read 0 ₫, not a negative', (t) async {
      await _pumpDash(
        t,
        loadBudgets: (_) async => [
          _budget(monthStart: _thisMonthStart(), limit: 500000, spent: 900000),
        ],
        loadCommitments: (_) async => const [],
      );

      expect(find.text('Chi được hôm nay'), findsOneWidget);
      expect(find.text('0 ₫'), findsOneWidget);
    });

    testWidgets('without planning loaders the tile stays hidden', (t) async {
      await _pumpDash(t);
      expect(find.text('Chi được hôm nay'), findsNothing);
    });

    testWidgets(
      'a failing planning read hides the tile but keeps the dashboard',
      (t) async {
        await _pumpDash(
          t,
          loadBudgets: (_) async => throw Exception('offline'),
          loadCommitments: (_) async => const [],
        );

        expect(find.text('Chi được hôm nay'), findsNothing);
        // The ledger itself still rendered.
        expect(find.text('Tổng số dư'), findsOneWidget);
        expect(find.text('Tiền mặt'), findsWidgets);
      },
    );
  });
}
