import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/recurring_detection.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:moneyflow/features/planning/recurring_form_dialog.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

/// A monthly "Tiền điện" pattern anchored to day 1 — the first of a
/// month always exists and is never in the future, so the pattern stays
/// detectable no matter which day the suite runs.
List<Transaction> _recurringTxs() => [
  for (var i = 0; i < 3; i++)
    Transaction(
      id: 'r$i',
      kind: TransactionKind.expense,
      categoryId: 'cat-bills',
      category: 'Hóa đơn',
      note: 'Tiền điện tháng ${_monthName(2 - i)}',
      accountId: 'acc-bank',
      account: 'Ngân hàng VCB',
      amount: 480000,
      occurredOn: _monthsAgo(2 - i, 1),
    ),
];

int _monthName(int monthsAgo) {
  final n = DateTime.now();
  return DateTime(n.year, n.month - monthsAgo, 1).month;
}

String _monthsAgo(int months, int day) {
  final n = DateTime.now();
  final d = DateTime(n.year, n.month - months, day);
  String two(int v) => v.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)}';
}

RecurringCommitment _commitment({
  String name = 'Tiền điện',
  int amount = 480000,
}) => RecurringCommitment(
  id: 'cm-1',
  name: name,
  amountMinor: amount,
  dueDay: 1,
  accountId: 'acc-bank',
  accountName: 'Ngân hàng VCB',
  categoryId: 'cat-bills',
  categoryName: 'Hóa đơn',
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('DashboardPage recurring-suggestion card', () {
    Future<void> pumpDash(
      WidgetTester t, {
      List<RecurringCommitment> commitments = const [],
      List<Transaction> suggestionTxs = const [],
      Future<bool> Function(RecurringSuggestion)? onCreate,
      bool withLoader = true,
    }) => t.pumpWidget(
      _wrap(
        DashboardPage(
          loadAccounts: () async => DemoStore.seedAccounts(),
          loadTransactions: () async => DemoStore.seedTransactions(),
          loadBudgets: (_) async => const [],
          loadCommitments: (_) async => commitments,
          loadSuggestionTransactions: withLoader
              ? (from, to) async => suggestionTxs
              : null,
          onCreateCommitment: onCreate,
        ),
      ),
    );

    testWidgets('a detected pattern renders the card with its facts', (
      t,
    ) async {
      await pumpDash(
        t,
        suggestionTxs: _recurringTxs(),
        onCreate: (s) async => false,
      );
      await t.pumpAndSettle();

      expect(find.text('Có vẻ là khoản định kỳ'), findsOneWidget);
      expect(find.text('Tiền điện · 480.000 ₫ · ngày 1'), findsOneWidget);
      expect(find.text('Ẩn'), findsOneWidget);
      expect(find.text('Tạo cam kết'), findsOneWidget);
    });

    testWidgets('Ẩn persists the dismissal and the card never returns', (
      t,
    ) async {
      await pumpDash(t, suggestionTxs: _recurringTxs());
      await t.pumpAndSettle();
      await t.tap(find.text('Ẩn'));
      await t.pumpAndSettle();

      expect(find.text('Có vẻ là khoản định kỳ'), findsNothing);
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getStringList('mf_recurring_dismissed'), hasLength(1));

      // A fresh page instance must not resurface the dismissed key.
      await pumpDash(t, suggestionTxs: _recurringTxs());
      await t.pumpAndSettle();
      expect(find.text('Có vẻ là khoản định kỳ'), findsNothing);
    });

    testWidgets(
      'Tạo cam kết hands the suggestion to the host and hides the card',
      (t) async {
        RecurringSuggestion? created;
        await pumpDash(
          t,
          suggestionTxs: _recurringTxs(),
          onCreate: (s) async {
            created = s;
            return true;
          },
        );
        await t.pumpAndSettle();

        await t.tap(find.text('Tạo cam kết'));
        await t.pumpAndSettle();

        expect(created, isNotNull);
        expect(created!.name, 'Tiền điện');
        expect(find.text('Có vẻ là khoản định kỳ'), findsNothing);
      },
    );

    testWidgets('an existing commitment is never re-suggested', (t) async {
      await pumpDash(
        t,
        suggestionTxs: _recurringTxs(),
        commitments: [_commitment()],
      );
      await t.pumpAndSettle();
      expect(find.text('Có vẻ là khoản định kỳ'), findsNothing);
    });

    testWidgets('no suggestion loader means no card', (t) async {
      await pumpDash(t, withLoader: false);
      await t.pumpAndSettle();
      expect(find.text('Có vẻ là khoản định kỳ'), findsNothing);
    });
  });

  group('showRecurringFormDialog suggestion prefill', () {
    const suggestion = RecurringSuggestion(
      key: 'deadbeef',
      name: 'Tiền điện',
      normalizedName: 'tiền điện',
      categoryId: 'cat-bills',
      accountId: 'acc-bank',
      amount: 480000,
      dayOfMonth: 5,
      lastSeen: '2026-10-06',
      occurrenceCount: 3,
      months: ['2026-08', '2026-09', '2026-10'],
    );

    testWidgets('prefills name, amount, day, account and category', (t) async {
      (String, int, int, String, String)? saved;
      await t.pumpWidget(
        _wrap(
          Builder(
            builder: (ctx) => Scaffold(
              body: TextButton(
                onPressed: () => showRecurringFormDialog(
                  ctx,
                  accounts: DemoStore.seedAccounts(),
                  categories: DemoStore.seedCategories(),
                  income: false,
                  suggestion: suggestion,
                  onSave: (n, a, d, acc, cat) async {
                    saved = (n, a, d, acc, cat);
                  },
                ),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await t.tap(find.text('open'));
      await t.pumpAndSettle();

      expect(find.text('Cam kết mới'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Tiền điện'), findsOneWidget);
      expect(find.widgetWithText(TextField, '480000'), findsOneWidget);
      expect(find.widgetWithText(TextField, '5'), findsOneWidget);
      // The detected ids preselect the pickers.
      expect(find.text('Ngân hàng VCB'), findsOneWidget);
      expect(find.text('Hóa đơn'), findsOneWidget);

      await t.tap(find.text('Tạo'));
      await t.pumpAndSettle();
      expect(saved, ('Tiền điện', 480000, 5, 'acc-bank', 'cat-bills'));
    });
  });
}
