import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/reports/reports_page.dart';

/// Rows dated inside the CURRENT month — the page's default period, so
/// the default load shows them no matter when the suite runs.
Transaction _tx(String id, TransactionKind kind, int amount, {int day = 10}) {
  final now = DateTime.now();
  final on =
      '${now.year}-${now.month.toString().padLeft(2, '0')}-'
      '${day.toString().padLeft(2, '0')}';
  return Transaction(
    id: id,
    kind: kind,
    categoryId: 'cat-$id',
    category: kind == TransactionKind.income ? 'Lương' : 'Ăn uống',
    note: 'Khoản $id',
    accountId: 'acc-1',
    account: 'Tiền mặt',
    amount: amount,
    occurredOn: on,
  );
}

Future<void> _pumpReports(WidgetTester t, List<Transaction> rows) {
  return t
      .pumpWidget(
        MaterialApp(
          home: ReportsPage(
            loadTransactions: () async => rows,
            loadRange: (from, to) async => (rows: rows, truncated: false),
          ),
        ),
      )
      .then((_) => t.pumpAndSettle());
}

void main() {
  group('ReportsPage weekly chart', () {
    testWidgets('renders the grouped bar chart over a seeded month', (t) async {
      await _pumpReports(t, [
        _tx('a', TransactionKind.income, 15000000, day: 10),
        _tx('b', TransactionKind.expense, 45000, day: 3),
        _tx('c', TransactionKind.expense, 32000, day: 12),
      ]);

      expect(find.text('Thu chi theo tuần'), findsOneWidget);
      expect(find.byType(BarChart), findsOneWidget);
      // Week labels on the x-axis — deterministic day-range form.
      expect(find.text('1–7'), findsOneWidget);
      expect(find.text('8–14'), findsOneWidget);
    });

    testWidgets('an empty period shows the honest state, no chart', (t) async {
      await _pumpReports(t, const []);

      expect(find.text('Không có giao dịch trong kỳ này'), findsOneWidget);
      expect(find.byType(BarChart), findsNothing);
      expect(find.text('Thu chi theo tuần'), findsNothing);
    });

    testWidgets('a transfer-only period hides the all-zero chart', (t) async {
      await _pumpReports(t, [_tx('tr', TransactionKind.transfer, 500000)]);

      // The report itself renders (transaction count > 0) but a flat
      // grid would pretend a trend — the section stays unmounted.
      expect(find.text('Thu'), findsWidgets);
      expect(find.text('Thu chi theo tuần'), findsNothing);
      expect(find.byType(BarChart), findsNothing);
    });
  });
}
