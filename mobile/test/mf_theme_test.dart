import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/dashboard/dashboard_page.dart';
import 'package:moneyflow/theme/mf_theme.dart';

void main() {
  group('MfTheme — light minimal fintech direction', () {
    test('light and dark themes ship the semantic token extension', () {
      final light = MfTheme.light();
      final dark = MfTheme.dark();
      expect(light.extension<MfColors>(), same(MfColors.light));
      expect(dark.extension<MfColors>(), same(MfColors.dark));
      expect(light.brightness, Brightness.light);
      expect(dark.brightness, Brightness.dark);
    });

    test('dark palette keeps the ink-violet canvas + light violet accent', () {
      // Pinned so a stray edit cannot silently drift the direction.
      expect(MfTheme.dark().scaffoldBackgroundColor, const Color(0xFF161224));
      expect(MfTheme.dark().colorScheme.surface, const Color(0xFF1E1A30));
      expect(MfColors.dark.brand, const Color(0xFFB7A5FF));
      expect(MfColors.dark.income, const Color(0xFF34D399));
      expect(MfColors.dark.expense, const Color(0xFFFB7185));
      expect(MfColors.dark.transfer, const Color(0xFFA78BFA));
    });

    test('light palette is lilac canvas + violet actions (Soft Pop)', () {
      expect(MfTheme.light().scaffoldBackgroundColor, const Color(0xFFF8F5FF));
      expect(MfTheme.light().colorScheme.primary, const Color(0xFF6F4EF5));
      expect(MfColors.light.brand, const Color(0xFF6F4EF5));
      expect(MfColors.light.income, const Color(0xFF059669));
      expect(MfColors.light.expense, const Color(0xFFE11D48));
      expect(MfColors.light.transfer, const Color(0xFF7C3AED));
    });

    test('cards: whisper shadow in light, hairline border in both', () {
      final light = MfTheme.light().cardTheme;
      expect(light.elevation, 1);
      expect(
        (light.shape as RoundedRectangleBorder).side.color,
        MfColors.light.borderSubtle,
      );
      final dark = MfTheme.dark().cardTheme;
      expect(dark.elevation, 0);
      expect(
        (dark.shape as RoundedRectangleBorder).side.color,
        MfColors.dark.borderSubtle,
      );
    });

    test('buttons are pills', () {
      final shape =
          MfTheme.light().filledButtonTheme.style!.shape!.resolve({})
              as OutlinedBorder;
      expect(shape, isA<StadiumBorder>());
    });

    test('buttons keep a 48px minimum target — Android touch floor', () {
      final theme = MfTheme.light();
      final filled = theme.filledButtonTheme.style!.minimumSize!.resolve({
        WidgetState.focused,
      });
      expect(filled!.height, greaterThanOrEqualTo(48));
    });

    testWidgets('context.mf resolves the extension inside the tree', (t) async {
      MfColors? got;
      await t.pumpWidget(
        MaterialApp(
          theme: MfTheme.dark(),
          home: Builder(
            builder: (ctx) {
              got = ctx.mf;
              return const SizedBox();
            },
          ),
        ),
      );
      expect(got, same(MfColors.dark));
    });

    testWidgets('context.mf falls back by brightness on unthemed hosts', (
      t,
    ) async {
      // No MfTheme installed — a bare dark MaterialApp must still get
      // the dark tokens, not a null crash.
      MfColors? got;
      await t.pumpWidget(
        MaterialApp(
          theme: ThemeData.dark(),
          home: Builder(
            builder: (ctx) {
              got = ctx.mf;
              return const SizedBox();
            },
          ),
        ),
      );
      expect(got, same(MfColors.dark));
    });

    test('mfMoneyStyle enables tabular figures; hero tightens tracking', () {
      final base = mfMoneyStyle(const TextStyle(fontSize: 20));
      expect(base.fontFeatures!.any((f) => f.feature == 'tnum'), isTrue);
      final hero = mfMoneyStyle(const TextStyle(fontSize: 40), hero: true);
      expect(hero.letterSpacing, lessThan(0));
    });
  });

  group('Shared reference widgets', () {
    testWidgets('MfTickBar paints ticks and handles ratio bounds', (t) async {
      for (final r in [-1.0, 0.0, 0.4, 1.0, 3.0]) {
        await t.pumpWidget(
          MaterialApp(
            theme: MfTheme.light(),
            home: Scaffold(
              body: SizedBox(
                width: 200,
                child: MfTickBar(ratio: r, marker: 0.5),
              ),
            ),
          ),
        );
        expect(t.takeException(), isNull); // no exception while painting
      }
    });

    testWidgets('MfSquareIcon is a rounded square on the pastel fill', (
      t,
    ) async {
      await t.pumpWidget(
        MaterialApp(
          theme: MfTheme.light(),
          home: const Scaffold(
            body: MfSquareIcon(icon: Icons.savings_outlined),
          ),
        ),
      );
      final box = t.widget<Container>(find.byType(Container).first);
      final deco = box.decoration! as BoxDecoration;
      expect(deco.color, mfPastelFills.first);
      expect(deco.shape, BoxShape.rectangle);
    });

    test('chips are pills that turn solid ink when selected', () {
      final chip = MfTheme.light().chipTheme;
      expect(chip.shape, isA<StadiumBorder>());
      expect(chip.selectedColor, MfTheme.light().colorScheme.primary);
    });
  });

  group('Dashboard states what it knows (product law)', () {
    const vnd = AccountSummary(
      id: 'a1',
      name: 'Tiền mặt',
      kind: AccountKind.cash,
      currencyCode: 'VND',
      initialBalance: 0,
      balance: 500000,
    );
    const usd = AccountSummary(
      id: 'a2',
      name: 'Quỹ USD',
      kind: AccountKind.bank,
      currencyCode: 'USD',
      initialBalance: 0,
      balance: 3000000,
    );
    Transaction tx(String id, String day, {bool review = false}) => Transaction(
      id: id,
      kind: TransactionKind.expense,
      categoryId: 'c',
      category: 'Ăn uống',
      note: 'Bún bò',
      accountId: 'a1',
      account: 'Tiền mặt',
      amount: 45000,
      occurredOn: day,
      reviewStatus: review
          ? TransactionReviewStatus.needsReview
          : TransactionReviewStatus.reviewed,
    );

    Future<void> pump(
      WidgetTester t, {
      List<AccountSummary> accounts = const [vnd],
      List<Transaction> txs = const [],
      Future<int> Function()? pending,
      VoidCallback? onOpenInbox,
      void Function(Transaction)? onOpen,
    }) => t.pumpWidget(
      MaterialApp(
        theme: MfTheme.light(),
        home: DashboardPage(
          loadAccounts: () async => accounts,
          loadTransactions: () async => txs,
          loadPendingCount: pending,
          onOpenInbox: onOpenInbox,
          onOpenTransaction: onOpen,
        ),
      ),
    );

    testWidgets('states the newest loaded day, not a sync claim', (t) async {
      await pump(t, txs: [tx('1', '2026-10-12'), tx('2', '2026-10-14')]);
      await t.pumpAndSettle();
      expect(find.text('Giao dịch gần nhất 14/10/2026'), findsOneWidget);
    });

    testWidgets('says so when there are no transactions', (t) async {
      await pump(t);
      await t.pumpAndSettle();
      expect(find.text('Chưa ghi giao dịch nào'), findsOneWidget);
    });

    testWidgets('foreign wallets are not summed and not printed as ₫', (
      t,
    ) async {
      await pump(t, accounts: const [vnd, usd]);
      await t.pumpAndSettle();
      expect(find.textContaining('Chỉ tính ví VND'), findsOneWidget);
      expect(find.textContaining('Ví USD'), findsOneWidget);
      expect(find.text('3.000.000 ₫'), findsNothing);
    });

    testWidgets('Inbox drafts get a card that says they are not posted', (
      t,
    ) async {
      var opened = 0;
      await pump(t, pending: () async => 3, onOpenInbox: () => opened++);
      await t.pumpAndSettle();
      expect(find.text('3 khoản cần xem'), findsOneWidget);
      expect(find.textContaining('Chưa vào sổ'), findsOneWidget);
      await t.tap(find.text('3 khoản cần xem'));
      expect(opened, 1);
    });

    testWidgets('no review card when nothing is pending', (t) async {
      await pump(t, pending: () async => 0, onOpenInbox: () {});
      await t.pumpAndSettle();
      expect(find.textContaining('khoản cần xem'), findsNothing);
    });

    testWidgets('a needs-review row is marked and rows open for editing', (
      t,
    ) async {
      Transaction? opened;
      await pump(
        t,
        txs: [tx('9', '2026-10-14', review: true)],
        onOpen: (x) => opened = x,
      );
      await t.pumpAndSettle();
      expect(find.textContaining('Cần xem lại'), findsOneWidget);
      expect(find.textContaining('14/10/2026'), findsWidgets);
      await t.tap(find.text('Bún bò'));
      expect(opened?.id, '9');
    });
  });
}
