import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/recurring_dismissals.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/recurring_detection.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:moneyflow/features/planning/recurring_form_dialog.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Recording seam for the sync-aware dismissal path — stands in for
/// RealStore's pattern_dismissals traffic.
class _RecordingSync implements PatternDismissalSync {
  _RecordingSync({this.server = const {}});

  Set<String> server;
  final pushed = <List<String>>[];

  @override
  Future<Set<String>> loadRecurringDismissedKeys() async => server;

  @override
  Future<void> dismissRecurringKeys(List<String> keys) async {
    pushed.add(keys);
    server = {...server, ...keys};
  }
}

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
      PatternDismissalSync? dismissalSync,
    }) => t.pumpWidget(
      _wrap(
        DashboardPage(
          loadAccounts: () async => DemoStore.seedAccounts(),
          loadTransactions: () async => DemoStore.seedTransactions(),
          loadBudgets: (_) async => const [],
          loadCommitments: (_) async => commitments,
          loadSuggestionTransactions: withLoader
              ? (from, to) async => (rows: suggestionTxs, truncated: false)
              : null,
          onCreateCommitment: onCreate,
          dismissalSync: dismissalSync,
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

    testWidgets('Ẩn writes the key through to the server seam', (t) async {
      final sync = _RecordingSync();
      await pumpDash(t, suggestionTxs: _recurringTxs(), dismissalSync: sync);
      await t.pumpAndSettle();
      await t.tap(find.text('Ẩn'));
      await t.pumpAndSettle();

      expect(find.text('Có vẻ là khoản định kỳ'), findsNothing);
      // The server got exactly the pattern's 8-hex key — the shape the
      // pattern_dismissals CHECK constraint enforces.
      expect(sync.pushed, hasLength(1));
      expect(sync.pushed.single.single, matches(RegExp('^[0-9a-f]{8}\$')));
    });

    testWidgets('a server-known dismissal hides the card cross-device', (
      t,
    ) async {
      // Another device dismissed this pattern: the row exists in
      // pattern_dismissals even though this device never saw it.
      final key = detectRecurring(
        _recurringTxs(),
        const {},
        today: DateTime.now(),
      ).single.key;
      final sync = _RecordingSync(server: {key});
      await pumpDash(t, suggestionTxs: _recurringTxs(), dismissalSync: sync);
      await t.pumpAndSettle();
      expect(find.text('Có vẻ là khoản định kỳ'), findsNothing);
      // The merge also cached it locally for the next offline open.
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getStringList('mf_recurring_dismissed'), contains(key));
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

    testWidgets('the balance total folds VND accounts only', (t) async {
      const vnd = AccountSummary(
        id: 'a-vnd',
        name: 'Tiền mặt',
        kind: AccountKind.cash,
        currencyCode: 'VND',
        initialBalance: 0,
        balance: 500000,
      );
      const usd = AccountSummary(
        id: 'a-usd',
        name: 'USD savings',
        kind: AccountKind.bank,
        currencyCode: 'USD',
        initialBalance: 0,
        balance: 3000000,
      );
      await t.pumpWidget(
        _wrap(
          DashboardPage(
            loadAccounts: () async => [vnd, usd],
            loadTransactions: () async => const [],
            loadBudgets: (_) async => const [],
            loadCommitments: (_) async => const [],
          ),
        ),
      );
      await t.pumpAndSettle();

      // The VND row shows in the account list too — what proves the
      // total is the absence of the folded-in USD figure.
      expect(find.text('500.000 ₫'), findsWidgets);
      expect(find.text('3.500.000 ₫'), findsNothing);
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
      (String, int, int, String, String, int)? saved;
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
                  onSave: (n, a, d, acc, cat, interval) async {
                    saved = (n, a, d, acc, cat, interval);
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
      // Detected patterns are monthly — the cadence defaults to 1.
      expect(saved, ('Tiền điện', 480000, 5, 'acc-bank', 'cat-bills', 1));
    });
  });
}
