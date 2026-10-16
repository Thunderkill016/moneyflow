import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/voice/voice_engine.dart';
import 'package:moneyflow/domain/inbox.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:moneyflow/features/capture/category_picker.dart';
import 'package:moneyflow/features/voice/voice_capture_page.dart';

class _IdleEngine implements VoiceEngine {
  @override
  Future<VoiceEngineStatus> initialize() async => VoiceEngineStatus.available;
  @override
  Future<void> listen({
    void Function(String)? onPartial,
    void Function(String)? onFinal,
    void Function(String)? onError,
  }) async {}
  @override
  Future<void> stop() async {}
  @override
  Future<void> cancel() async {}
}

const _explainer = 'Chuyển nội bộ — không tính vào thu/chi';

Future<void> _open(
  WidgetTester t, {
  Future<void> Function(CaptureIntent)? onSubmit,
}) async {
  // Tall surface so the lazily built form shows every field.
  t.view.physicalSize = const Size(800, 2400);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    MaterialApp(
      home: Scaffold(
        body: CapturePage(
          accounts: DemoStore.seedAccounts(),
          categories: DemoStore.seedCategories(),
          onSubmit: onSubmit ?? (_) async {},
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
}

Future<void> _pickTransfer(WidgetTester t) async {
  await t.tap(find.text('Chuyển'));
  await t.pumpAndSettle();
}

void main() {
  _captureEditRuleTests();
  _captureExclusionTests();
  testWidgets('CAP-01 transfer shows the internal-movement explainer only', (
    t,
  ) async {
    await _open(t);
    expect(find.text(_explainer), findsNothing);
    await _pickTransfer(t);
    expect(find.text(_explainer), findsOneWidget);
    await t.tap(find.text('Thu'));
    await t.pumpAndSettle();
    expect(find.text(_explainer), findsNothing);
  });

  testWidgets('CAP-04/09 amount field previews the parsed figure in ₫', (
    t,
  ) async {
    await _open(t);
    expect(find.text('45.000 ₫'), findsNothing);
    final amount = find.widgetWithText(TextField, 'Số tiền');
    await t.enterText(amount, '45k');
    await t.pumpAndSettle();
    expect(find.text('45.000 ₫'), findsOneWidget);
    await t.enterText(amount, 'abc');
    await t.pumpAndSettle();
    expect(find.textContaining('₫'), findsOneWidget); // only the suffix
  });

  testWidgets('CAP-03 category search folds diacritics and case', (t) async {
    const cats = [
      Category(id: 'a', name: 'Ăn uống', kind: TransactionKind.expense),
      Category(id: 'b', name: 'Di chuyển', kind: TransactionKind.expense),
    ];
    await t.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => FilledButton(
            onPressed: () => showCategoryPicker(context, categories: cats),
            child: const Text('open'),
          ),
        ),
      ),
    );
    await t.tap(find.text('open'));
    await t.pumpAndSettle();
    await t.enterText(find.byType(TextField), 'AN');
    await t.pumpAndSettle();
    expect(find.text('Ăn uống'), findsOneWidget);
    expect(find.text('Di chuyển'), findsNothing);
  });

  testWidgets('CAP-10 kind segments use the app-wide direction glyphs', (
    t,
  ) async {
    await _open(t);
    // The selected segment swaps its glyph for a check, so read the config.
    final seg = t.widget<SegmentedButton<TransactionKind>>(
      find.byType(SegmentedButton<TransactionKind>),
    );
    final icons = {
      for (final x in seg.segments) x.value: (x.icon as Icon).icon,
    };
    expect(icons, {
      TransactionKind.expense: Icons.north_east,
      TransactionKind.income: Icons.south_west,
      TransactionKind.transfer: Icons.swap_horiz,
    });
  });

  testWidgets('CAP-11 transfer hides payee and sends none', (t) async {
    CaptureIntent? got;
    await _open(t, onSubmit: (i) async => got = i);
    final payee = find.widgetWithText(
      TextField,
      'Nơi chi / Nguồn thu (tùy chọn)',
    );
    expect(payee, findsOneWidget);
    await t.enterText(payee, 'Quán A');
    await _pickTransfer(t);
    expect(payee, findsNothing);
    await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '50k');
    final accs = DemoStore.seedAccounts();
    Future<void> choose(String label, String name) async {
      await t.tap(find.widgetWithText(DropdownButtonFormField<String>, label));
      await t.pumpAndSettle();
      await t.tap(find.text(name).last);
      await t.pumpAndSettle();
    }

    await choose('Từ tài khoản', accs[0].name);
    await choose('Đến tài khoản', accs[1].name);
    await t.tap(find.text('Lưu'));
    await t.pumpAndSettle();
    expect(got?.kind, TransactionKind.transfer);
    expect(got?.payee, '');
  });

  testWidgets('CAP-05 mic button has a spoken label', (t) async {
    final h = t.ensureSemantics();
    await t.pumpWidget(
      MaterialApp(
        home: VoiceCapturePage(
          accounts: [
            AccountSummary(
              id: 'a1',
              name: 'Ví',
              kind: AccountKind.cash,
              currencyCode: 'VND',
              initialBalance: 0,
              balance: 0,
              icon: 'wallet',
              color: '#0EA5E9',
            ),
          ],
          categories: DemoStore.seedCategories(),
          engine: _IdleEngine(),
          onSubmit: (_) async {},
          today: '2026-10-20',
        ),
      ),
    );
    await t.pumpAndSettle();
    expect(find.bySemanticsLabel('Bắt đầu ghi âm'), findsOneWidget);
    h.dispose();
  });
}

// Edit → "save as rule" (Monarch pattern): the offer lives inside the
// edit form and routes through the injected seam, so a failed rule write
// can never take the already-saved transaction down with it.
Transaction _editTx() => Transaction(
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

Future<CaptureResult?> _pushEdit(
  WidgetTester t, {
  Future<void> Function(CaptureIntent)? onSubmit,
  Future<void> Function(InboxRuleDraft)? onSaveRule,
  Transaction? editing,
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
              editing: editing ?? _editTx(),
              onSubmit: onSubmit ?? (_) async {},
              onSaveRule: onSaveRule,
            ),
          ),
        )
        .then((r) => result = r),
  );
  await t.pumpAndSettle();
  // The checkbox sits near the bottom of the edit form.
  await t.scrollUntilVisible(
    find.text('Lưu thành quy tắc tự điền'),
    80,
    scrollable: find.byType(Scrollable).last,
  );
  await t.tap(find.text('Lưu thành quy tắc tự điền'));
  await t.pumpAndSettle();
  await t.tap(find.widgetWithText(FilledButton, 'Lưu'));
  await t.pumpAndSettle();
  return result;
}

void _captureEditRuleTests() {
  testWidgets('edit form offers save-as-rule and sends the draft', (t) async {
    final rules = <InboxRuleDraft>[];
    final result = await _pushEdit(t, onSaveRule: (d) async => rules.add(d));
    expect(result, CaptureResult.saved);
    final draft = rules.single;
    expect(draft.matchField, RuleMatchField.merchant);
    expect(draft.containsText, 'HIGHLANDS COFFEE');
    expect(draft.categoryId, 'cat-food');
    expect(draft.enabled, isTrue);
  });

  testWidgets('a failed rule write reports savedRuleFailed honestly', (
    t,
  ) async {
    final result = await _pushEdit(
      t,
      onSaveRule: (_) async => throw StateError('rule_category_not_available'),
    );
    expect(result, CaptureResult.savedRuleFailed);
  });

  testWidgets('create mode never shows the save-as-rule offer', (t) async {
    await _open(t, onSubmit: (_) async {});
    expect(find.text('Lưu thành quy tắc tự điền'), findsNothing);
  });
}

/// D13 — the edit form's "Loại khỏi báo cáo" switch: visible only in
/// edit mode, sent on the intent only when the user actually flipped it.
void _captureExclusionTests() {
  Future<void> pushEditAndSubmit(
    WidgetTester t, {
    Transaction? editing,
    required List<CaptureIntent> intents,
    bool flipSwitch = false,
  }) async {
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
            editing: editing ?? _editTx(),
            onSubmit: (i) async => intents.add(i),
          ),
        ),
      ),
    );
    await t.pumpAndSettle();
    await t.scrollUntilVisible(
      find.text('Loại khỏi báo cáo'),
      80,
      scrollable: find.byType(Scrollable).last,
    );
    if (flipSwitch) {
      await t.tap(find.text('Loại khỏi báo cáo'));
      await t.pumpAndSettle();
    }
    await t.tap(find.widgetWithText(FilledButton, 'Lưu'));
    await t.pumpAndSettle();
  }

  testWidgets('edit mode shows the switch; a flip reaches the intent', (
    t,
  ) async {
    final intents = <CaptureIntent>[];
    await pushEditAndSubmit(t, intents: intents, flipSwitch: true);
    expect(intents.single.excludedFromReports, isTrue);
  });

  testWidgets('an untouched switch costs no write — intent stays null', (
    t,
  ) async {
    final intents = <CaptureIntent>[];
    await pushEditAndSubmit(t, intents: intents);
    expect(intents.single.excludedFromReports, isNull);
  });

  testWidgets('unflagging a flagged row sends false', (t) async {
    final intents = <CaptureIntent>[];
    await pushEditAndSubmit(
      t,
      editing: Transaction(
        id: 'tx-x',
        kind: TransactionKind.expense,
        categoryId: 'cat-food',
        category: 'Ăn uống',
        note: '',
        accountId: 'acc-cash',
        account: 'Tiền mặt',
        amount: 65000,
        occurredOn: '2026-10-10',
        excludedFromReports: true,
      ),
      intents: intents,
      flipSwitch: true,
    );
    expect(intents.single.excludedFromReports, isFalse);
  });

  testWidgets('create mode never offers the report-scope switch', (t) async {
    await _open(t, onSubmit: (_) async {});
    expect(find.text('Loại khỏi báo cáo'), findsNothing);
  });
}
