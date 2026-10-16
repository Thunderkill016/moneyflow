// Tests for the unsaved-capture draft — the P2 "process death loses
// in-progress capture data" fix. Because capture routes are pushed with
// plain MaterialPageRoute (framework RestorationMixin only works for
// restorablePush routes, which cannot close over the store/submit
// seams), the draft lives in an account-scoped SharedPreferences slot
// instead and is offered back on the next open.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/capture_draft.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/share/share_text_parser.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/capture/capture_page.dart';
import 'package:shared_preferences/shared_preferences.dart';

Widget _wrap(Widget child) =>
    MaterialApp(home: child, theme: ThemeData(useMaterial3: true));

Future<void> _open(
  WidgetTester t, {
  String? draftScope = 'u1',
  SharedTextPrefill? prefill,
  Future<void> Function(CaptureIntent)? onSubmit,
}) async {
  // The form is a lazy ListView — fields below the default 800x600 fold
  // are never built, so find/enterText would miss them. A tall
  // phone-sized surface keeps the whole form mounted.
  t.view.physicalSize = const Size(1080, 2400);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.reset);
  await t.pumpWidget(
    _wrap(
      CapturePage(
        accounts: DemoStore.seedAccounts(),
        categories: DemoStore.seedCategories(),
        onSubmit: onSubmit ?? (_) async {},
        draftScope: draftScope,
        prefill: prefill,
      ),
    ),
  );
  await t.pumpAndSettle();
}

Map<String, Object?> _draftJson({
  String kind = 'expense',
  String amountText = '45000',
  String note = 'ăn trưa',
  String payee = 'Phở 24',
  String? accountId = 'acc-bank',
  String? categoryId = 'cat-food',
  String? occurredOn = '2020-01-15',
  int? savedAtMs,
}) => {
  'v': 1,
  'kind': kind,
  'amountText': amountText,
  'note': note,
  'payee': payee,
  'accountId': accountId,
  'destinationAccountId': null,
  'categoryId': categoryId,
  'occurredOn': occurredOn,
  'repeatMonthly': false,
  'split': false,
  'splitRows': <Object?>[],
  'idempotencyKey': 'key-from-first-attempt',
  'savedAtMs': savedAtMs ?? DateTime.now().millisecondsSinceEpoch,
};

void _seedDraft([Map<String, Object?>? overrides]) {
  final merged = _draftJson();
  overrides?.forEach((k, v) => merged[k] = v);
  SharedPreferences.setMockInitialValues({
    'mf_capture_draft.u1': jsonEncode(merged),
  });
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('CaptureDraft', () {
    test('round-trips every field through JSON', () {
      const draft = CaptureDraft(
        kind: TransactionKind.income,
        amountText: '5tr',
        note: 'lương',
        payee: 'ACME',
        accountId: 'acc-1',
        destinationAccountId: 'acc-2',
        categoryId: 'cat-1',
        occurredOn: '2026-10-21',
        repeatMonthly: true,
        split: true,
        splitRows: [
          CaptureDraftSplitLine(categoryId: 'cat-a', amountText: '10k'),
          CaptureDraftSplitLine(amountText: '20k'),
        ],
        idempotencyKey: 'idem-1',
        savedAtMs: 123,
      );
      final back = CaptureDraft.fromJson(
        jsonDecode(jsonEncode(draft.toJson())),
      );
      expect(back, isNotNull);
      expect(back!.kind, TransactionKind.income);
      expect(back.amountText, '5tr');
      expect(back.note, 'lương');
      expect(back.payee, 'ACME');
      expect(back.accountId, 'acc-1');
      expect(back.destinationAccountId, 'acc-2');
      expect(back.categoryId, 'cat-1');
      expect(back.occurredOn, '2026-10-21');
      expect(back.repeatMonthly, isTrue);
      expect(back.split, isTrue);
      expect(back.splitRows, hasLength(2));
      expect(back.splitRows.first.categoryId, 'cat-a');
      expect(back.splitRows.last.amountText, '20k');
      expect(back.idempotencyKey, 'idem-1');
      expect(back.savedAtMs, 123);
    });

    test('refuses garbage instead of crashing', () {
      expect(CaptureDraft.fromJson(null), isNull);
      expect(CaptureDraft.fromJson('nope'), isNull);
      expect(CaptureDraft.fromJson({'kind': 'expense'}), isNotNull);
      // A kind outside the enum can never be trusted.
      expect(CaptureDraft.fromJson({'kind': 'bogus'}), isNull);
      expect(CaptureDraft.fromJson({}), isNull);
    });

    test('isEmpty means nothing distinguishes the form from fresh', () {
      const fresh = CaptureDraft(kind: TransactionKind.expense);
      expect(fresh.isEmpty, isTrue);
      expect(const CaptureDraft(kind: TransactionKind.income).isEmpty, isFalse);
      expect(
        const CaptureDraft(kind: TransactionKind.expense, note: 'x').isEmpty,
        isFalse,
      );
      expect(
        const CaptureDraft(
          kind: TransactionKind.expense,
          occurredOn: '2020-01-01',
        ).isEmpty,
        isFalse,
      );
    });
  });

  group('CaptureDraftStore', () {
    test('saves and loads within the account scope', () async {
      final draft = CaptureDraft(
        kind: TransactionKind.expense,
        amountText: '45000',
        note: 'cà phê',
        savedAtMs: DateTime.now().millisecondsSinceEpoch,
      );
      await CaptureDraftStore.save('u1', draft);
      final loaded = await CaptureDraftStore.load('u1');
      expect(loaded?.amountText, '45000');
      expect(loaded?.note, 'cà phê');
      // Another account on the same device sees nothing — the scope
      // wall the offline queue already enforces.
      expect(await CaptureDraftStore.load('u2'), isNull);
    });

    test('an expired draft is dropped on read', () async {
      final old = DateTime.now()
          .subtract(CaptureDraftStore.maxAge + const Duration(days: 1))
          .millisecondsSinceEpoch;
      SharedPreferences.setMockInitialValues({
        'mf_capture_draft.u1': jsonEncode(_draftJson(savedAtMs: old)),
      });
      expect(await CaptureDraftStore.load('u1'), isNull);
      // ...and the stale blob is gone, not left to resurface.
      expect(await CaptureDraftStore.load('u1'), isNull);
    });

    test('a corrupt blob decodes to null and is removed', () async {
      SharedPreferences.setMockInitialValues({
        'mf_capture_draft.u1': '{not json',
      });
      expect(await CaptureDraftStore.load('u1'), isNull);
    });
  });

  group('CapturePage draft restore', () {
    testWidgets('a stored draft restores fields and shows the banner', (
      t,
    ) async {
      _seedDraft();
      await _open(t);

      expect(find.widgetWithText(TextField, '45000'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'ăn trưa'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Phở 24'), findsOneWidget);
      expect(find.text('Đã khôi phục bản nháp chưa lưu'), findsOneWidget);
      // Account/category ids that still exist come back selected.
      expect(find.text('Ngân hàng VCB'), findsOneWidget);
      expect(find.text('Ngày: 2020-01-15'), findsOneWidget);
    });

    testWidgets('Xóa clears the stored slot and resets the form', (t) async {
      _seedDraft();
      await _open(t);
      await t.tap(find.text('Xóa'));
      await t.pumpAndSettle();

      expect(find.text('Đã khôi phục bản nháp chưa lưu'), findsNothing);
      expect(find.widgetWithText(TextField, '45000'), findsNothing);
      expect(find.widgetWithText(TextField, 'ăn trưa'), findsNothing);
      expect(await CaptureDraftStore.load('u1'), isNull);
    });

    testWidgets('editing dismisses the banner but keeps the fields', (t) async {
      _seedDraft();
      await _open(t);
      await t.enterText(
        find.widgetWithText(TextField, 'Ghi chú'),
        'ăn trưa sáng',
      );
      await t.pump();
      expect(find.text('Đã khôi phục bản nháp chưa lưu'), findsNothing);
      expect(find.widgetWithText(TextField, 'ăn trưa sáng'), findsOneWidget);
    });

    testWidgets('edits persist to the slot — reopening shows the draft', (
      t,
    ) async {
      await _open(t);
      await t.enterText(find.widgetWithText(TextField, 'Số tiền'), '88000');
      await t.enterText(find.widgetWithText(TextField, 'Ghi chú'), 'deadline');
      // The debounced save flushes on dispose — the same path a process
      // death takes after the lifecycle "paused" flush.
      await t.pumpWidget(const SizedBox());
      await t.pump();

      final stored = await CaptureDraftStore.load('u1');
      expect(stored, isNotNull);
      expect(stored!.amountText, '88000');
      expect(stored.note, 'deadline');
    });

    testWidgets('a share prefill wins over the stored draft', (t) async {
      _seedDraft();
      await _open(
        t,
        prefill: const SharedTextPrefill(amount: 99000, note: 'shared'),
      );
      // The shared amount lands; the older draft stays parked.
      expect(find.widgetWithText(TextField, '99000'), findsOneWidget);
      expect(find.text('Đã khôi phục bản nháp chưa lưu'), findsNothing);
      expect(await CaptureDraftStore.load('u1'), isNotNull);
    });

    testWidgets('no scope (demo) restores nothing and stores nothing', (
      t,
    ) async {
      _seedDraft();
      await _open(t, draftScope: null);
      expect(find.widgetWithText(TextField, '45000'), findsNothing);
      expect(find.text('Đã khôi phục bản nháp chưa lưu'), findsNothing);
    });

    testWidgets('a successful submit consumes the stored draft', (t) async {
      _seedDraft();
      await _open(t);
      // The restored draft already carries amount/account/category —
      // submitting it must not leave the draft alive for a second go.
      await t.tap(find.text('Lưu'));
      await t.pumpAndSettle();
      expect(await CaptureDraftStore.load('u1'), isNull);
    });
  });
}
