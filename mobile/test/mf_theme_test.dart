import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/theme/mf_theme.dart';

void main() {
  group('MfTheme', () {
    test('light and dark themes ship the semantic token extension', () {
      final light = MfTheme.light();
      final dark = MfTheme.dark();
      expect(light.extension<MfColors>(), same(MfColors.light));
      expect(dark.extension<MfColors>(), same(MfColors.dark));
      expect(light.brightness, Brightness.light);
      expect(dark.brightness, Brightness.dark);
    });

    test('semantic finance colors match the approved Fresh Blue tokens', () {
      // Values must stay in lockstep with src/app/document-theme.css —
      // changing one side without the other breaks cross-platform parity.
      expect(MfColors.light.brand, const Color(0xFF0369A1));
      expect(MfColors.light.income, const Color(0xFF16A34A));
      expect(MfColors.light.expense, const Color(0xFFDC2626));
      expect(MfColors.light.transfer, const Color(0xFF4F46E5));
      expect(MfColors.light.warning, const Color(0xFFEAB308));
      expect(MfColors.dark.brand, const Color(0xFF7DD3FC));
      expect(MfColors.dark.income, const Color(0xFF4ADE80));
      expect(MfColors.dark.expense, const Color(0xFFF87171));
      expect(MfColors.dark.transfer, const Color(0xFF818CF8));
    });

    test('cards are bordered, not shadowed — borders carry structure', () {
      final theme = MfTheme.light();
      final card = theme.cardTheme;
      expect(card.elevation, 0);
      final shape = card.shape as RoundedRectangleBorder;
      expect(shape.side.color, isNot(Colors.transparent));
      expect(shape.side.width, greaterThan(0));
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
          theme: MfTheme.light(),
          home: Builder(
            builder: (ctx) {
              got = ctx.mf;
              return const SizedBox();
            },
          ),
        ),
      );
      expect(got, same(MfColors.light));
    });

    test('mfMoneyStyle enables tabular figures for aligned đồng', () {
      final style = mfMoneyStyle(const TextStyle(fontSize: 20));
      final features = style.fontFeatures!;
      expect(features.any((f) => f.feature == 'tnum'), isTrue);
    });
  });
}
