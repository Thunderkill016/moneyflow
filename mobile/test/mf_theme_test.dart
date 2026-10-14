import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
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

    test('dark palette keeps the ink canvas + orange accent', () {
      // Pinned so a stray edit cannot silently drift the direction.
      expect(MfTheme.dark().scaffoldBackgroundColor, const Color(0xFF0B0F19));
      expect(MfTheme.dark().colorScheme.surface, const Color(0xFF121826));
      expect(MfColors.dark.brand, const Color(0xFFFB923C));
      expect(MfColors.dark.income, const Color(0xFF34D399));
      expect(MfColors.dark.expense, const Color(0xFFFB7185));
      expect(MfColors.dark.transfer, const Color(0xFFA78BFA));
    });

    test('light palette is cream canvas + black actions + orange accent', () {
      expect(MfTheme.light().scaffoldBackgroundColor, const Color(0xFFF6F7F0));
      expect(MfTheme.light().colorScheme.primary, const Color(0xFF1C1C1C));
      expect(MfColors.light.brand, const Color(0xFFE24F1F));
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

  group('Dashboard quick actions', () {
    Future<void> pump(
      WidgetTester t, {
      Future<void> Function([TransactionKind? kind])? onCapture,
    }) => t.pumpWidget(
      MaterialApp(
        theme: MfTheme.light(),
        home: Scaffold(
          body: DashboardPage(
            loadAccounts: () async => DemoStore.seedAccounts(),
            loadTransactions: () async => const [],
            onCapture: onCapture,
          ),
        ),
      ),
    );

    testWidgets('each tile opens capture on its own kind', (t) async {
      final kinds = <TransactionKind?>[];
      await pump(t, onCapture: ([k]) async => kinds.add(k));
      await t.pumpAndSettle();
      for (final k in TransactionKind.values) {
        await t.tap(find.byKey(ValueKey('quick:${k.name}')));
      }
      expect(kinds, TransactionKind.values);
    });

    testWidgets('tiles are hidden when the host gives no capture route', (
      t,
    ) async {
      await pump(t);
      await t.pumpAndSettle();
      expect(find.byKey(const ValueKey('quick:expense')), findsNothing);
    });
  });
}
