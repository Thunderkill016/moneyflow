// Inbox auto-fill rules — the RPC write contract (upsert_inbox_rule,
// delete_inbox_rule, replace_inbox_rule_priorities), the demo store's
// mirrored semantics, and the Quy tắc page's honest states.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/inbox.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/inbox/rules_page.dart';

const config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

String fakeJwt() {
  final payload = {
    'sub': 'u1',
    'exp': (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 900,
  };
  String b64(Object o) =>
      base64Url.encode(utf8.encode(jsonEncode(o))).replaceAll('=', '');
  return '${b64({'alg': 'EdDSA'})}.${b64(payload)}.sig';
}

class FakeTransport {
  final requests = <NeonRequest>[];
  final queue = <NeonResponse>[];

  NeonRequester get requester => (req) async {
    requests.add(req);
    assert(queue.isNotEmpty, 'unexpected request: ${req.url}');
    return queue.removeAt(0);
  };

  static NeonResponse json(
    int status,
    Object body, {
    Map<String, String> headers = const {},
  }) => NeonResponse(status: status, headers: headers, body: jsonEncode(body));
}

class Harness {
  final t = FakeTransport();
  late final auth = NeonAuthClient(config: config, requester: t.requester);
  late final api = NeonDataApi(
    config: config,
    auth: auth,
    requester: t.requester,
  );
  late final store = RealStore(api);

  Future<void> signIn() async {
    t.queue.add(
      FakeTransport.json(
        200,
        {
          'token': 't.s',
          'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
        },
        headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
      ),
    );
    await auth.signIn('e', 'p');
    t.queue.add(
      FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
    );
  }
}

/// One complete inbox_rules row — the shape _ruleColumns selects and
/// upsert_inbox_rule returns.
Map<String, Object?> ruleRow([Map<String, Object?> patch = const {}]) => {
  'id': 'r1',
  'stage': 'candidate',
  'priority': 1,
  'enabled': true,
  'match_field': 'merchant',
  'contains_text': 'HIGHLANDS',
  'category_id': 'k1',
  'merchant_name': 'Highlands Coffee',
  'version': 3,
  'created_at': '2026-10-01T00:00:00Z',
  'updated_at': '2026-10-05T00:00:00Z',
  ...patch,
};

const catExpense = Category(
  id: 'k1',
  name: 'Ăn uống',
  kind: TransactionKind.expense,
);
const catIncome = Category(
  id: 'k2',
  name: 'Lương',
  kind: TransactionKind.income,
);
const catArchived = Category(
  id: 'k3',
  name: 'Cũ',
  kind: TransactionKind.expense,
  isArchived: true,
);

InboxRule rule({String id = 'r1', int priority = 1, int version = 3}) =>
    InboxRule(
      id: id,
      priority: priority,
      enabled: true,
      matchField: RuleMatchField.merchant,
      containsText: 'HIGHLANDS',
      categoryId: 'k1',
      merchantName: 'Highlands Coffee',
      version: version,
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-05T00:00:00Z',
    );

/// Widget-test seam — every store callback is recorded, never faked.
class PageHarness {
  PageHarness({List<InboxRule>? rules, this.categories = const [catExpense]})
    : rules = rules ?? [rule()];

  final List<InboxRule> rules;
  final List<Category> categories;
  final saved = <InboxRuleDraft>[];
  final deleted = <(String, int)>[];
  final reorders = <List<String>>[];
  Object? saveError;
  int loads = 0;

  Widget page() => MaterialApp(
    home: InboxRulesPage(
      loadRules: () async {
        loads++;
        return rules;
      },
      loadCategories: () async => categories,
      onSave: (draft) async {
        if (saveError != null) throw saveError!;
        saved.add(draft);
        return rule(
          id: draft.id ?? 'new',
          version: (draft.expectedVersion ?? 0) + 1,
        );
      },
      onDelete: (id, version) async => deleted.add((id, version)),
      onReorder: (ids) async => reorders.add(ids),
    ),
  );
}

void main() {
  group('RealStore inbox rules', () {
    test('loadInboxRules selects the rule columns in apply order', () async {
      final h = Harness();
      await h.signIn();
      // bigint columns may arrive as strings — same normalization as the
      // web's safePositiveInteger.
      h.t.queue.add(
        FakeTransport.json(200, [
          ruleRow({'priority': '2', 'version': '7'}),
        ]),
      );

      final rules = await h.store.loadInboxRules();

      final req = h.t.requests.last;
      expect(req.method, 'GET');
      expect(req.url.path, '/neondb/rest/v1/inbox_rules');
      expect(
        req.url.queryParameters['select'],
        allOf(
          contains('match_field'),
          contains('contains_text'),
          contains('merchant_name'),
          contains('version'),
        ),
      );
      expect(
        req.url.queryParameters['order'],
        'priority.asc,created_at.asc,id.asc',
      );

      final r = rules.single;
      expect(r.id, 'r1');
      expect(r.priority, 2);
      expect(r.enabled, isTrue);
      expect(r.matchField, RuleMatchField.merchant);
      expect(r.containsText, 'HIGHLANDS');
      expect(r.categoryId, 'k1');
      expect(r.merchantName, 'Highlands Coffee');
      expect(r.version, 7);
    });

    test('saveInboxRule create POSTs upsert with no p_rule_id', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, [ruleRow()]));

      final r = await h.store.saveInboxRule(
        matchField: RuleMatchField.any,
        containsText: 'GRAB',
        categoryId: 'k1',
        merchantName: '  ',
        enabled: true,
      );

      expect(r.id, 'r1');
      final req = h.t.requests.last;
      expect(req.method, 'POST');
      expect(req.url.path, '/neondb/rest/v1/rpc/upsert_inbox_rule');
      // p_rule_id / p_expected_version are omitted on create — the
      // function assigns priority max+1 and version 1 itself.
      expect(req.body, {
        'p_match_field': 'any',
        'p_contains_text': 'GRAB',
        'p_category_id': 'k1',
        // Blank merchant normalizes to null like the web's
        // merchant?.trim() || null.
        'p_merchant_name': null,
        'p_enabled': true,
      });
    });

    test('saveInboxRule update sends p_rule_id + p_expected_version', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          ruleRow({'version': 4}),
        ]),
      );

      final r = await h.store.saveInboxRule(
        ruleId: 'r1',
        expectedVersion: 3,
        matchField: RuleMatchField.note,
        containsText: 'grab',
        categoryId: 'k2',
        merchantName: 'Grab',
        enabled: false,
      );

      expect(r.version, 4);
      expect(h.t.requests.last.body, {
        'p_match_field': 'note',
        'p_contains_text': 'grab',
        'p_category_id': 'k2',
        'p_merchant_name': 'Grab',
        'p_enabled': false,
        'p_rule_id': 'r1',
        'p_expected_version': 3,
      });
    });

    test('a stale_write rejection surfaces the token for the mapper', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(400, {'code': 'P0001', 'message': 'stale_write'}),
      );

      await expectLater(
        h.store.saveInboxRule(
          ruleId: 'r1',
          expectedVersion: 1,
          matchField: RuleMatchField.any,
          containsText: 'X',
          categoryId: 'k1',
        ),
        throwsA(
          isA<NeonAuthException>().having(
            (e) => e.toString(),
            'message',
            contains('stale_write'),
          ),
        ),
      );
      expect(
        inboxRuleErrorMessage(
          NeonAuthException(400, 'host -> {"message":"stale_write"}'),
        ),
        contains('nơi khác'),
      );
    });

    test('deleteInboxRule POSTs the guarded delete RPC', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));

      await h.store.deleteInboxRule('r1', 3);

      final req = h.t.requests.last;
      expect(req.method, 'POST');
      expect(req.url.path, '/neondb/rest/v1/rpc/delete_inbox_rule');
      expect(req.body, {'p_rule_id': 'r1', 'p_expected_version': 3});
    });

    test('deleteInboxRule false throws — no silent success', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, false));
      expect(
        () => h.store.deleteInboxRule('ghost', 1),
        throwsA(isA<Exception>()),
      );
    });

    test('reorderInboxRules sends the complete ordered id list', () async {
      final h = Harness();
      await h.signIn();
      // replace_inbox_rule_priorities returns void — PostgREST answers
      // with a bare JSON null.
      h.t.queue.add(const NeonResponse(status: 200, headers: {}, body: 'null'));

      await h.store.reorderInboxRules(['r2', 'r1', 'r3']);

      final req = h.t.requests.last;
      expect(req.method, 'POST');
      expect(req.url.path, '/neondb/rest/v1/rpc/replace_inbox_rule_priorities');
      expect(req.body, {
        'p_rule_ids': ['r2', 'r1', 'r3'],
      });
    });
  });

  group('DemoRuleStore', () {
    // The seeded demo rule points at 'cat-food' — the id DemoStore seeds —
    // so the harness must expose it or every update trips the trigger's
    // rule_category_not_available check exactly like the real server.
    const catFood = Category(
      id: 'cat-food',
      name: 'Ăn uống',
      kind: TransactionKind.expense,
    );
    final categories = const [catExpense, catIncome, catArchived, catFood];

    test(
      'seeds one demo rule and appends creates at max(priority)+1',
      () async {
        final store = DemoRuleStore(categories: () => categories);
        var rules = await store.loadAll();
        expect(rules.single.id, 'rule-seed-1');
        expect(rules.single.priority, 1);

        final created = await store.save((
          id: null,
          expectedVersion: null,
          matchField: RuleMatchField.any,
          containsText: ' GRAB ',
          categoryId: 'k1',
          merchantName: '',
          enabled: true,
        ));
        expect(created.priority, 2);
        expect(created.version, 1);
        // Trigger parity: contains trimmed, blank merchant nullified.
        expect(created.containsText, 'GRAB');
        expect(created.merchantName, isNull);

        rules = await store.loadAll();
        expect(rules.map((r) => r.id), ['rule-seed-1', created.id]);
      },
    );

    test('create with an archived/missing category is refused', () async {
      final store = DemoRuleStore(categories: () => categories);
      for (final id in ['k3', 'ghost']) {
        expect(
          () => store.save((
            id: null,
            expectedVersion: null,
            matchField: RuleMatchField.any,
            containsText: 'X',
            categoryId: id,
            merchantName: null,
            enabled: true,
          )),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('rule_category_not_available'),
            ),
          ),
        );
      }
    });

    test(
      'update bumps version only on content change and guards stale writes',
      () async {
        final store = DemoRuleStore(categories: () => categories);
        final seeded = (await store.loadAll()).single;

        // Identical content -> same version, mirroring version_inbox_rule.
        final same = await store.save((
          id: seeded.id,
          expectedVersion: seeded.version,
          matchField: seeded.matchField,
          containsText: seeded.containsText,
          categoryId: seeded.categoryId,
          merchantName: seeded.merchantName,
          enabled: seeded.enabled,
        ));
        expect(same.version, seeded.version);

        final toggled = await store.save((
          id: seeded.id,
          expectedVersion: seeded.version,
          matchField: seeded.matchField,
          containsText: seeded.containsText,
          categoryId: seeded.categoryId,
          merchantName: seeded.merchantName,
          enabled: false,
        ));
        expect(toggled.enabled, isFalse);
        expect(toggled.version, seeded.version + 1);

        // The bumped version is now the only valid guard.
        expect(
          () => store.save((
            id: seeded.id,
            expectedVersion: seeded.version,
            matchField: RuleMatchField.any,
            containsText: 'X',
            categoryId: 'k1',
            merchantName: null,
            enabled: true,
          )),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('stale_write'),
            ),
          ),
        );
      },
    );

    test(
      'a disabled rule may keep an archived category (trigger parity)',
      () async {
        var cats = const [catExpense, catArchived];
        final store = DemoRuleStore(categories: () => cats);
        final created = await store.save((
          id: null,
          expectedVersion: null,
          matchField: RuleMatchField.any,
          containsText: 'X',
          categoryId: 'k1',
          merchantName: null,
          enabled: true,
        ));
        // Archive the target category out from under the rule.
        cats = const [
          catArchived,
          Category(
            id: 'k1',
            name: 'Ăn uống',
            kind: TransactionKind.expense,
            isArchived: true,
          ),
        ];

        // Same category + disabling -> allowed (the server trigger only
        // demands an active category when enabled or the target changed).
        final disabled = await store.save((
          id: created.id,
          expectedVersion: created.version,
          matchField: created.matchField,
          containsText: created.containsText,
          categoryId: created.categoryId,
          merchantName: created.merchantName,
          enabled: false,
        ));
        expect(disabled.enabled, isFalse);

        // Re-enabling against the archived category is refused.
        expect(
          () => store.save((
            id: created.id,
            expectedVersion: disabled.version,
            matchField: created.matchField,
            containsText: created.containsText,
            categoryId: created.categoryId,
            merchantName: null,
            enabled: true,
          )),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('rule_category_not_available'),
            ),
          ),
        );
      },
    );

    test('delete honors expectedVersion', () async {
      final store = DemoRuleStore(categories: () => categories);
      final seeded = (await store.loadAll()).single;
      expect(
        () => store.delete(seeded.id, seeded.version + 9),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('stale_write'),
          ),
        ),
      );
      await store.delete(seeded.id, seeded.version);
      expect(await store.loadAll(), isEmpty);
    });

    test(
      'reorder requires the complete set and renumbers 1..n with bumps',
      () async {
        final store = DemoRuleStore(categories: () => categories);
        await store.save((
          id: null,
          expectedVersion: null,
          matchField: RuleMatchField.any,
          containsText: 'GRAB',
          categoryId: 'k1',
          merchantName: null,
          enabled: true,
        ));
        final rules = await store.loadAll();
        expect(rules.map((r) => r.priority), [1, 2]);

        // A partial list is refused, not silently renumbered.
        expect(
          () => store.reorder([rules.last.id]),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('incomplete_rule_order'),
            ),
          ),
        );
        // An unknown id is refused too.
        expect(
          () => store.reorder([rules.first.id, 'ghost']),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('rule_not_found'),
            ),
          ),
        );

        await store.reorder([rules.last.id, rules.first.id]);
        final after = await store.loadAll();
        expect(after.map((r) => r.id), [rules.last.id, rules.first.id]);
        expect(after.map((r) => r.priority), [1, 2]);
        // Only the moved row's version bumped — priority is content.
        expect(
          after.firstWhere((r) => r.id == rules.last.id).version,
          rules.last.version + 1,
        );
        expect(
          after.firstWhere((r) => r.id == rules.first.id).version,
          rules.first.version + 1,
        );
      },
    );
  });

  group('domain helpers', () {
    test('rule summaries mirror the web formatRuleSummary', () {
      expect(
        formatInboxRuleSummary(rule(), 'Ăn uống'),
        'Nơi chi ~ “HIGHLANDS” → Highlands Coffee → Ăn uống',
      );
      expect(
        formatInboxRuleSummary(
          InboxRule(
            id: 'r2',
            priority: 2,
            enabled: false,
            matchField: RuleMatchField.any,
            containsText: 'GRAB',
            categoryId: 'k1',
            version: 1,
          ),
          'Di chuyển',
        ),
        '“GRAB” → Di chuyển',
      );
    });

    test('validation mirrors the web form bounds', () {
      InboxRuleDraft draft({
        String contains = 'X',
        String categoryId = 'k1',
        String? merchant,
      }) => (
        id: null,
        expectedVersion: null,
        matchField: RuleMatchField.any,
        containsText: contains,
        categoryId: categoryId,
        merchantName: merchant,
        enabled: true,
      );
      expect(validateInboxRuleDraft(draft(contains: '   ')), isNotNull);
      expect(validateInboxRuleDraft(draft(contains: 'x' * 121)), isNotNull);
      expect(validateInboxRuleDraft(draft(categoryId: '')), isNotNull);
      expect(validateInboxRuleDraft(draft(merchant: 'm' * 201)), isNotNull);
      expect(validateInboxRuleDraft(draft()), isNull);
    });

    test('error mapper covers the server tokens', () {
      String m(String token) => inboxRuleErrorMessage(Exception(token));
      expect(m('stale_write'), contains('nơi khác'));
      expect(m('rule_category_not_available'), contains('Danh mục'));
      expect(m('incomplete_rule_order'), contains('tải lại'));
      expect(m('rule_not_found'), contains('không còn tồn tại'));
      expect(m('invalid_rule_contains'), contains('120'));
      expect(m('PGRST202'), contains('chưa được bật'));
      expect(m('surprise'), 'Không cập nhật được quy tắc. Hãy thử lại.');
    });
  });

  group('InboxRulesPage', () {
    testWidgets('renders priority order with resolved category names', (
      t,
    ) async {
      await t.pumpWidget(PageHarness().page());
      await t.pumpAndSettle();

      expect(find.text('Quy tắc tự điền'), findsOneWidget);
      expect(
        find.text('Nơi chi ~ “HIGHLANDS” → Highlands Coffee → Ăn uống'),
        findsOneWidget,
      );
      expect(find.textContaining('Phiên bản 3'), findsOneWidget);
      expect(find.textContaining('Đang bật'), findsOneWidget);
      expect(find.byType(Switch), findsOneWidget);
    });

    testWidgets('empty state explains what rules do', (t) async {
      await t.pumpWidget(PageHarness(rules: const []).page());
      await t.pumpAndSettle();
      expect(find.text('Chưa có quy tắc'), findsOneWidget);
      expect(
        find.textContaining('tự điền danh mục cho tin nhắn/ngân hàng đã lưu'),
        findsOneWidget,
      );
      expect(find.text('Thêm quy tắc'), findsWidgets);
    });

    testWidgets('empty state asks for a category when none is active', (
      t,
    ) async {
      await t.pumpWidget(
        PageHarness(rules: const [], categories: const [catArchived]).page(),
      );
      await t.pumpAndSettle();
      expect(find.textContaining('Tạo danh mục trước'), findsOneWidget);
      expect(find.text('Thêm quy tắc'), findsNothing);
    });

    testWidgets('failed load shows the honest error with retry', (t) async {
      var calls = 0;
      await t.pumpWidget(
        MaterialApp(
          home: InboxRulesPage(
            loadRules: () async {
              calls++;
              if (calls == 1) throw StateError('offline');
              return [rule()];
            },
            loadCategories: () async => const [catExpense],
            onSave: (d) async => rule(),
            onDelete: (_, _) async {},
            onReorder: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Không tải được quy tắc'), findsOneWidget);
      await t.tap(find.text('Thử lại'));
      await t.pumpAndSettle();
      expect(find.textContaining('HIGHLANDS'), findsOneWidget);
    });

    testWidgets('toggle sends the full upsert with expectedVersion', (t) async {
      final h = PageHarness();
      await t.pumpWidget(h.page());
      await t.pumpAndSettle();

      await t.tap(find.byType(Switch));
      await t.pumpAndSettle();

      final draft = h.saved.single;
      expect(draft.id, 'r1');
      expect(draft.expectedVersion, 3);
      expect(draft.enabled, isFalse);
      expect(draft.matchField, RuleMatchField.merchant);
      expect(draft.containsText, 'HIGHLANDS');
      expect(draft.categoryId, 'k1');
      expect(draft.merchantName, 'Highlands Coffee');
    });

    testWidgets('create sheet submits a normalized draft', (t) async {
      final h = PageHarness(rules: const []);
      await t.pumpWidget(h.page());
      await t.pumpAndSettle();

      // Two 'Thêm quy tắc' labels exist (empty-state tonal button + FAB)
      // and neither is a plain FilledButton — tap the label text inside
      // the body button, which precedes the FAB in tree order.
      await t.tap(find.text('Thêm quy tắc').first);
      await t.pumpAndSettle();
      expect(find.text('Mọi trường'), findsOneWidget);

      await t.enterText(find.widgetWithText(TextField, 'Nếu chứa'), '  GRAB ');
      await t.tap(find.text('Nơi chi'));
      await t.pumpAndSettle();
      // Category pick goes through the shared search sheet.
      await t.tap(find.text('Chọn'));
      await t.pumpAndSettle();
      await t.tap(find.text('Ăn uống'));
      await t.pumpAndSettle();
      await t.enterText(
        find.widgetWithText(TextField, 'Đổi tên nơi giao dịch (tùy chọn)'),
        'Grab',
      );
      // The sheet's save button shares the empty-state label — scope the
      // tap to the bottom sheet's own (plain) FilledButton, and scroll it
      // into view first: the sheet is taller than the 600px test window.
      final save = find.descendant(
        of: find.byType(BottomSheet),
        matching: find.widgetWithText(FilledButton, 'Thêm quy tắc'),
      );
      await t.ensureVisible(save);
      await t.pumpAndSettle();
      await t.tap(save);
      await t.pumpAndSettle();

      final draft = h.saved.single;
      expect(draft.id, isNull);
      expect(draft.matchField, RuleMatchField.merchant);
      expect(draft.containsText, '  GRAB ');
      expect(draft.categoryId, 'k1');
      expect(draft.merchantName, 'Grab');
      expect(draft.enabled, isTrue);
      expect(find.text('Đã thêm quy tắc.'), findsOneWidget);
    });

    testWidgets('edit sheet is prefilled and saves with the version', (
      t,
    ) async {
      final h = PageHarness();
      await t.pumpWidget(h.page());
      await t.pumpAndSettle();

      await t.tap(
        find.text('Nơi chi ~ “HIGHLANDS” → Highlands Coffee → Ăn uống'),
      );
      await t.pumpAndSettle();
      expect(find.text('Sửa quy tắc'), findsOneWidget);
      expect(
        t
            .widget<TextField>(find.widgetWithText(TextField, 'Nếu chứa'))
            .controller!
            .text,
        'HIGHLANDS',
      );

      await t.tap(find.text('Ghi chú'));
      await t.pumpAndSettle();
      await t.ensureVisible(find.text('Lưu thay đổi'));
      await t.pumpAndSettle();
      await t.tap(find.text('Lưu thay đổi'));
      await t.pumpAndSettle();

      final draft = h.saved.single;
      expect(draft.id, 'r1');
      expect(draft.expectedVersion, 3);
      expect(draft.matchField, RuleMatchField.note);
      expect(find.text('Đã cập nhật quy tắc.'), findsOneWidget);
    });

    testWidgets('a stale_write rejection closes the sheet and says why', (
      t,
    ) async {
      final h = PageHarness()..saveError = Exception('stale_write');
      await t.pumpWidget(h.page());
      await t.pumpAndSettle();

      await t.tap(
        find.text('Nơi chi ~ “HIGHLANDS” → Highlands Coffee → Ăn uống'),
      );
      await t.pumpAndSettle();
      await t.ensureVisible(find.text('Lưu thay đổi'));
      await t.pumpAndSettle();
      await t.tap(find.text('Lưu thay đổi'));
      await t.pumpAndSettle();

      expect(
        find.text(
          'Quy tắc đã được thay đổi ở nơi khác. Hãy tải lại rồi thử lại.',
        ),
        findsOneWidget,
      );
      expect(find.text('Sửa quy tắc'), findsNothing);
      // The page reloaded — the next attempt carries the fresh version.
      expect(h.loads, greaterThan(1));
    });

    testWidgets('delete goes through the confirm dialog', (t) async {
      final h = PageHarness();
      await t.pumpWidget(h.page());
      await t.pumpAndSettle();

      await t.tap(find.byType(PopupMenuButton<String>));
      await t.pumpAndSettle();
      await t.tap(find.text('Xóa'));
      await t.pumpAndSettle();
      expect(find.text('Xóa quy tắc?'), findsOneWidget);
      await t.tap(find.widgetWithText(FilledButton, 'Xóa quy tắc'));
      await t.pumpAndSettle();

      expect(h.deleted.single, ('r1', 3));
      expect(find.text('Đã xóa quy tắc.'), findsOneWidget);
    });
  });
}
