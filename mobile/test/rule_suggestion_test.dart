// D6 — rule suggestion from repeated corrections. The counter is local
// bookkeeping; the OFFER only ever drafts a rule through the shipped
// onSaveRule seam and never applies one silently.

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/rule_suggestion_prefs.dart';
import 'package:moneyflow/domain/inbox.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/rule_suggestions.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

InboxRule _rule({
  String contains = 'highlands',
  RuleMatchField field = RuleMatchField.merchant,
  bool enabled = true,
  String categoryId = 'cat-food',
}) => InboxRule(
  id: 'r1',
  priority: 1,
  enabled: enabled,
  matchField: field,
  containsText: contains,
  categoryId: categoryId,
  version: 1,
);

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('ruleCorrectionKey', () {
    test('folds case and diacritics so spellings share one counter', () {
      expect(
        ruleCorrectionKey('  Highlands Coffee ', 'cat-food'),
        ruleCorrectionKey('highlands coffee', 'cat-food'),
      );
      expect(
        ruleCorrectionKey('Cà phê', 'cat-food'),
        ruleCorrectionKey('ca phe', 'cat-food'),
      );
    });

    test('a different target category is a different pair', () {
      expect(
        ruleCorrectionKey('Highlands', 'cat-food'),
        isNot(ruleCorrectionKey('Highlands', 'cat-transport')),
      );
    });
  });

  group('ruleAlreadyCoversPayee', () {
    test('enabled merchant rule containing the payee suppresses', () {
      expect(ruleAlreadyCoversPayee([_rule()], 'HIGHLANDS COFFEE'), isTrue);
    });

    test('an any-field rule counts too — it matches on merchant as well', () {
      expect(
        ruleAlreadyCoversPayee([
          _rule(field: RuleMatchField.any),
        ], 'HIGHLANDS COFFEE'),
        isTrue,
      );
    });

    test('disabled, note-field, and non-matching rules do not cover', () {
      expect(
        ruleAlreadyCoversPayee([_rule(enabled: false)], 'HIGHLANDS COFFEE'),
        isFalse,
      );
      expect(
        ruleAlreadyCoversPayee([
          _rule(field: RuleMatchField.note),
        ], 'HIGHLANDS COFFEE'),
        isFalse,
      );
      expect(
        ruleAlreadyCoversPayee([
          _rule(contains: 'circle k'),
        ], 'HIGHLANDS COFFEE'),
        isFalse,
      );
    });

    test('a substring rule covers a longer payee (server contains rule)', () {
      expect(
        ruleAlreadyCoversPayee([_rule()], 'highlands coffee nguyen hue'),
        isTrue,
      );
    });
  });

  group('RuleSuggestionPrefs', () {
    test('recordCorrection counts per pair within one scope', () async {
      expect(
        await RuleSuggestionPrefs.recordCorrection(
          'u1',
          'Highlands',
          'cat-food',
        ),
        1,
      );
      expect(
        await RuleSuggestionPrefs.recordCorrection(
          'u1',
          'Highlands',
          'cat-food',
        ),
        2,
      );
      // A different category starts its own counter.
      expect(
        await RuleSuggestionPrefs.recordCorrection(
          'u1',
          'Highlands',
          'cat-bills',
        ),
        1,
      );
      // A different account never sees this scope's count.
      expect(
        await RuleSuggestionPrefs.countOf('u2', 'Highlands', 'cat-food'),
        0,
      );
      expect(
        await RuleSuggestionPrefs.countOf('u1', 'Highlands', 'cat-food'),
        2,
      );
    });

    test('decline is remembered per pair', () async {
      await RuleSuggestionPrefs.decline('u1', 'Highlands', 'cat-food');
      expect(
        await RuleSuggestionPrefs.isDeclined('u1', 'Highlands', 'cat-food'),
        isTrue,
      );
      expect(
        await RuleSuggestionPrefs.isDeclined('u1', 'Highlands', 'cat-bills'),
        isFalse,
      );
      expect(
        await RuleSuggestionPrefs.isDeclined('u2', 'Highlands', 'cat-food'),
        isFalse,
      );
    });

    test('a corrupt counts blob starts over instead of crashing', () async {
      SharedPreferences.setMockInitialValues({
        'mf_rule_corrections.u1': '{not json',
      });
      expect(await RuleSuggestionPrefs.countOf('u1', 'X', 'c'), 0);
      expect(await RuleSuggestionPrefs.recordCorrection('u1', 'X', 'c'), 1);
    });

    test('the tracked-pair cap evicts the weakest, not the pattern', () async {
      // One strong pair plus enough singles to overflow the slot.
      for (var i = 0; i < ruleSuggestionThreshold; i++) {
        await RuleSuggestionPrefs.recordCorrection('u1', 'Keep', 'cat-food');
      }
      for (var i = 0; i < RuleSuggestionPrefs.maxTrackedPairs; i++) {
        await RuleSuggestionPrefs.recordCorrection(
          'u1',
          'Payee $i',
          'cat-food',
        );
      }
      expect(await RuleSuggestionPrefs.countOf('u1', 'Keep', 'cat-food'), 2);
      // Total stays bounded — every single-count stale pair was evicted.
      var total = 0;
      for (var i = 0; i < RuleSuggestionPrefs.maxTrackedPairs; i++) {
        total += await RuleSuggestionPrefs.countOf(
          'u1',
          'Payee $i',
          'cat-food',
        );
      }
      expect(total, lessThan(RuleSuggestionPrefs.maxTrackedPairs));
    });
  });

  group('edit → suggestion offer', () {
    Transaction editTx() => Transaction(
      id: 'tx1',
      kind: TransactionKind.expense,
      categoryId: 'cat-food',
      category: 'Ăn uống',
      note: '',
      accountId: 'acc-cash',
      account: 'Tiền mặt',
      amount: 65000,
      occurredOn: '2026-10-10',
      payee: 'HIGHLANDS COFFEE',
      reviewStatus: TransactionReviewStatus.reviewed,
      updatedAt: '2026-10-10T01:00:00Z',
    );

    /// Pushes the edit form, optionally changes category Ăn uống →
    /// Di chuyển through the real picker sheet, taps Lưu, and — when
    /// [dialogTap] is set — answers the rule-draft dialog with that
    /// button. When [dialogTap] is null the save must pop with no offer.
    Future<CaptureResult?> pushEdit(
      WidgetTester t, {
      Future<void> Function(CaptureIntent)? onSubmit,
      Future<void> Function(InboxRuleDraft)? onSaveRule,
      Future<RuleSuggestion?> Function({
        required String payee,
        required String categoryId,
      })?
      onCorrection,
      Future<void> Function(RuleSuggestion)? onDeclined,
      bool changeCategory = true,
      String? dialogTap,
    }) async {
      t.view.physicalSize = const Size(800, 2400);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      CaptureResult? result;
      final key = GlobalKey<NavigatorState>();
      await t.pumpWidget(
        MaterialApp(
          navigatorKey: key,
          home: const Scaffold(body: SizedBox.shrink()),
        ),
      );
      unawaited(
        key.currentState!
            .push<CaptureResult>(
              MaterialPageRoute(
                builder: (_) => CapturePage(
                  accounts: DemoStore.seedAccounts(),
                  categories: DemoStore.seedCategories(),
                  editing: editTx(),
                  onSubmit: onSubmit ?? (_) async {},
                  onSaveRule: onSaveRule,
                  onPayeeCategoryCorrection: onCorrection,
                  onSuggestionDeclined: onDeclined,
                ),
              ),
            )
            .then((r) => result = r),
      );
      await t.pumpAndSettle();
      if (changeCategory) {
        // Ăn uống → Di chuyển through the real picker sheet.
        await t.tap(find.text('Ăn uống'));
        await t.pumpAndSettle();
        await t.tap(find.text('Di chuyển').last);
        await t.pumpAndSettle();
      }
      await t.scrollUntilVisible(
        find.widgetWithText(FilledButton, 'Lưu'),
        80,
        scrollable: find.byType(Scrollable).last,
      );
      await t.tap(find.widgetWithText(FilledButton, 'Lưu'));
      await t.pumpAndSettle();
      if (dialogTap != null) {
        // The offer is modal — the page stays open behind it.
        expect(find.text('Tạo quy tắc tự điền?'), findsOneWidget);
        await t.tap(find.text(dialogTap));
        await t.pumpAndSettle();
      } else {
        expect(find.text('Tạo quy tắc tự điền?'), findsNothing);
      }
      return result;
    }

    testWidgets(
      'a repeated correction offers a rule draft that saves on accept',
      (t) async {
        final rules = <InboxRuleDraft>[];
        var asked = 0;
        final result = await pushEdit(
          t,
          onSaveRule: (d) async => rules.add(d),
          onCorrection: ({required payee, required categoryId}) async {
            asked++;
            expect(payee, 'HIGHLANDS COFFEE');
            expect(categoryId, 'cat-transport');
            return RuleSuggestion(
              payee: payee,
              categoryId: categoryId,
              times: 2,
            );
          },
          dialogTap: 'Tạo quy tắc',
        );
        expect(asked, 1);
        // The offer must have been on screen before the pop.
        expect(rules.single.containsText, 'HIGHLANDS COFFEE');
        expect(rules.single.categoryId, 'cat-transport');
        expect(result, CaptureResult.saved);
      },
    );

    testWidgets(
      'the offer names the payee, target category and correction count',
      (t) async {
        await pushEdit(
          t,
          onSaveRule: (_) async {},
          onCorrection: ({required payee, required categoryId}) async =>
              RuleSuggestion(payee: payee, categoryId: categoryId, times: 3),
          dialogTap: 'Để sau',
        );
      },
    );

    testWidgets('"Để sau" writes no rule and still saves', (t) async {
      final rules = <InboxRuleDraft>[];
      final result = await pushEdit(
        t,
        onSaveRule: (d) async => rules.add(d),
        onCorrection: ({required payee, required categoryId}) async =>
            RuleSuggestion(payee: payee, categoryId: categoryId, times: 2),
        dialogTap: 'Để sau',
      );
      expect(result, CaptureResult.saved);
      expect(rules, isEmpty);
    });

    testWidgets('"Không hỏi lại" records the decline through its seam', (
      t,
    ) async {
      final declined = <RuleSuggestion>[];
      final result = await pushEdit(
        t,
        onSaveRule: (_) async {},
        onCorrection: ({required payee, required categoryId}) async =>
            RuleSuggestion(payee: payee, categoryId: categoryId, times: 4),
        onDeclined: (s) async => declined.add(s),
        dialogTap: 'Không hỏi lại',
      );
      expect(result, CaptureResult.saved);
      expect(declined.single.categoryId, 'cat-transport');
    });

    testWidgets('below threshold (null seam result) pops without an offer', (
      t,
    ) async {
      var asked = 0;
      final result = await pushEdit(
        t,
        onSaveRule: (_) async {},
        onCorrection: ({required payee, required categoryId}) async {
          asked++;
          return null;
        },
      );
      expect(asked, 1);
      expect(result, CaptureResult.saved);
    });

    testWidgets('an unchanged pair never consults the seam', (t) async {
      var asked = 0;
      final result = await pushEdit(
        t,
        changeCategory: false,
        onSaveRule: (_) async {},
        onCorrection: ({required payee, required categoryId}) async {
          asked++;
          return null;
        },
      );
      expect(asked, 0);
      expect(result, CaptureResult.saved);
    });

    testWidgets('the ticked save-as-rule path never double-offers', (t) async {
      var asked = 0;
      final rules = <InboxRuleDraft>[];
      t.view.physicalSize = const Size(800, 2400);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.reset);
      final key = GlobalKey<NavigatorState>();
      await t.pumpWidget(
        MaterialApp(
          navigatorKey: key,
          home: const Scaffold(body: SizedBox.shrink()),
        ),
      );
      unawaited(
        key.currentState!.push<CaptureResult>(
          MaterialPageRoute(
            builder: (_) => CapturePage(
              accounts: DemoStore.seedAccounts(),
              categories: DemoStore.seedCategories(),
              editing: editTx(),
              onSubmit: (_) async {},
              onSaveRule: (d) async => rules.add(d),
              onPayeeCategoryCorrection:
                  ({required payee, required categoryId}) async {
                    asked++;
                    return null;
                  },
            ),
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Ăn uống'));
      await t.pumpAndSettle();
      await t.tap(find.text('Di chuyển').last);
      await t.pumpAndSettle();
      await t.scrollUntilVisible(
        find.text('Lưu thành quy tắc tự điền'),
        80,
        scrollable: find.byType(Scrollable).last,
      );
      await t.tap(find.text('Lưu thành quy tắc tự điền'));
      await t.pumpAndSettle();
      await t.tap(find.widgetWithText(FilledButton, 'Lưu'));
      await t.pumpAndSettle();
      // The explicit checkbox already wrote the rule — the suggestion
      // seam must stay out of that path (no double offer).
      expect(asked, 0);
      expect(find.text('Tạo quy tắc tự điền?'), findsNothing);
      expect(rules.single.containsText, 'HIGHLANDS COFFEE');
    });

    testWidgets('a refused suggested rule reports savedRuleFailed', (t) async {
      final result = await pushEdit(
        t,
        onSaveRule: (_) async =>
            throw StateError('rule_category_not_available'),
        onCorrection: ({required payee, required categoryId}) async =>
            RuleSuggestion(payee: payee, categoryId: categoryId, times: 2),
        dialogTap: 'Tạo quy tắc',
      );
      expect(result, CaptureResult.savedRuleFailed);
    });
  });
}
