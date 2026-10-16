// Inbox review queue — contract parity with the web (src/app/actions/
// inbox.ts, inbox-approval.ts, lib/inbox/parse-text.ts) plus the list's
// honest loading/empty/error states.

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/data/demo_store.dart';
import 'package:moneyflow/data/share/inbox_paste_parser.dart';
import 'package:moneyflow/domain/csv_import.dart';
import 'package:moneyflow/domain/inbox.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/features/inbox/inbox_page.dart';

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

/// One complete inbox_candidates row — the shape _candidateColumns selects.
Map<String, Object?> candidateRow([Map<String, Object?> patch = const {}]) => {
  'id': 'c1',
  'kind': 'expense',
  'amount_minor': 45000,
  'merchant': 'PHO NGON',
  'note': '',
  'occurred_on': '2026-10-14',
  'source': 'paste',
  'confidence': 'medium',
  'status': 'pending',
  'possible_duplicate': false,
  'possible_transfer': false,
  'category_id': 'k1',
  'category_name': 'Ăn uống',
  'account_id': 'a1',
  'account_name': 'VCB',
  'raw_snippet': 'TK 1234 GD -45,000 VND PHO NGON',
  'created_at': '2026-10-14T08:00:00Z',
  ...patch,
};

const acc = AccountSummary(
  id: 'a1',
  name: 'VCB',
  kind: AccountKind.bank,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 1000000,
);
const acc2 = AccountSummary(
  id: 'a2',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 500000,
);
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

void main() {
  InboxPage page({
    required Future<List<InboxCandidate>> Function() load,
    Future<void> Function(InboxApproval)? onApprove,
    Future<void> Function(String)? onReject,
    Future<CsvImportResult> Function(CsvImportBatch)? onImport,
    Future<InboxPlan?> Function(String)? onPlan,
    Future<void> Function(InboxRuleDraft)? onSaveRule,
  }) => InboxPage(
    loadCandidates: load,
    loadAccounts: () async => [acc, acc2],
    loadCategories: () async => [catExpense, catIncome],
    onPlan: onPlan ?? (_) async => null,
    onApprove: onApprove ?? (_) async {},
    onReject: onReject ?? (_) async {},
    onSaveRule: onSaveRule,
    onImportCsv:
        onImport ??
        (_) async => const CsvImportResult(batchId: 'b', candidateCount: 0),
  );

  InboxCandidate row() => InboxCandidate(
    id: 'c1',
    kind: TransactionKind.expense,
    amountMinor: 45000,
    merchant: 'PHO NGON',
    note: '',
    occurredOn: '2026-10-14',
    source: 'paste',
    confidence: 'medium',
    accountId: 'a1',
    accountName: 'VCB',
    categoryId: 'k1',
    categoryName: 'Ăn uống',
    rawSnippet: 'TK 1234 GD -45,000 VND PHO NGON',
  );

  group('RealStore inbox reads', () {
    test('loadPendingInboxCandidates filters pending, newest first', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, [candidateRow()]));

      final rows = await h.store.loadPendingInboxCandidates();

      final req = h.t.requests.last;
      expect(req.method, 'GET');
      expect(req.url.path, '/neondb/rest/v1/inbox_candidates');
      expect(req.url.queryParameters['status'], 'eq.pending');
      expect(
        req.url.queryParameters['order'],
        'occurred_on.desc,created_at.desc,id.desc',
      );
      expect(
        req.url.queryParameters['select'],
        allOf(contains('amount_minor'), contains('possible_duplicate')),
      );

      final c = rows.single;
      expect(c.id, 'c1');
      expect(c.kind, TransactionKind.expense);
      expect(c.amountMinor, 45000);
      expect(c.merchant, 'PHO NGON');
      expect(c.occurredOn, '2026-10-14');
      expect(c.source, 'paste');
      expect(c.confidence, 'medium');
      expect(c.accountName, 'VCB');
      expect(c.categoryName, 'Ăn uống');
      expect(c.rawSnippet, contains('PHO NGON'));
    });

    test('bigint amount_minor encoded as a string still maps', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          candidateRow({'amount_minor': '125000'}),
        ]),
      );
      final rows = await h.store.loadPendingInboxCandidates();
      expect(rows.single.amountMinor, 125000);
    });

    test('loadPendingInboxCount reads ids only', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {'id': 'c1'},
          {'id': 'c2'},
        ]),
      );
      expect(await h.store.loadPendingInboxCount(), 2);
      final req = h.t.requests.last;
      expect(req.url.queryParameters['select'], 'id');
      expect(req.url.queryParameters['status'], 'eq.pending');
    });
  });

  group('approve_inbox_candidate parity', () {
    test('expense POSTs the exact web parameter set', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'tx-9'));

      final id = await h.store.approveInboxCandidate(
        const InboxApproval(
          candidateId: 'c1',
          kind: TransactionKind.expense,
          accountId: 'a1',
          categoryId: 'k1',
          amountMinor: 45000,
          occurredOn: '2026-10-14',
          note: 'phở',
          payee: 'PHO NGON',
        ),
      );

      expect(id, 'tx-9');
      final req = h.t.requests.last;
      expect(req.method, 'POST');
      expect(req.url.path, '/neondb/rest/v1/rpc/approve_inbox_candidate');
      // Candidate id is the stable idempotency key — a retry can never
      // double-post (web: approvalIdempotencyKey).
      expect(req.body, {
        'p_candidate_id': 'c1',
        'p_kind': 'expense',
        'p_account_id': 'a1',
        'p_category_id': 'k1',
        'p_destination_account_id': null,
        'p_amount_minor': 45000,
        'p_occurred_on': '2026-10-14',
        'p_note': 'phở',
        'p_payee': 'PHO NGON',
        'p_idempotency_key': 'c1',
        'p_allow_heuristic_duplicate': false,
      });
    });

    test(
      'transfer sends destination account, null category and null payee',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, 'tx-10'));

        await h.store.approveInboxCandidate(
          const InboxApproval(
            candidateId: 'c9',
            kind: TransactionKind.transfer,
            accountId: 'a1',
            destinationAccountId: 'a2',
            amountMinor: 200000,
            occurredOn: '2026-10-13',
            allowHeuristicDuplicate: true,
          ),
        );

        final body = h.t.requests.last.body as Map;
        expect(body['p_kind'], 'transfer');
        expect(body['p_destination_account_id'], 'a2');
        expect(body['p_category_id'], isNull);
        expect(body['p_payee'], isNull);
        expect(body['p_allow_heuristic_duplicate'], isTrue);
      },
    );

    test('blank payee goes up as null like the web', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'tx-11'));
      await h.store.approveInboxCandidate(
        const InboxApproval(
          candidateId: 'c2',
          kind: TransactionKind.income,
          accountId: 'a1',
          categoryId: 'k2',
          amountMinor: 5000000,
          occurredOn: '2026-10-01',
          payee: '   ',
        ),
      );
      expect((h.t.requests.last.body as Map)['p_payee'], isNull);
    });
  });

  group('plan + reject', () {
    test('planInboxCandidate maps the dry-run verdict', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, {
          'status': 'duplicate',
          'reason': 'existing_transaction_match',
          'confidence': 0.82,
          'matched_transaction_id': 'tx-1',
        }),
      );
      final plan = await h.store.planInboxCandidate('c1');
      final req = h.t.requests.last;
      expect(req.url.path, '/neondb/rest/v1/rpc/plan_inbox_candidate');
      expect(req.body, {'p_candidate_id': 'c1'});
      expect(plan!.status, 'duplicate');
      expect(plan.matchedTransactionId, 'tx-1');
      expect(allowsInboxDuplicateOverride(plan), isTrue);
      expect(inboxPlanBlocksApproval(plan), isFalse);
      // A proven same-source duplicate must never double-post.
      final blocked = parseInboxPlan({
        'status': 'duplicate',
        'reason': 'source_external_id_match',
        'confidence': 1,
      });
      expect(inboxPlanBlocksApproval(blocked), isTrue);
    });

    test('rejectInboxCandidate POSTs the definer RPC, never deletes', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));
      await h.store.rejectInboxCandidate('c1');
      final req = h.t.requests.last;
      // RPC-only write path — a direct PATCH on inbox_candidates dies
      // 42501; the definer flips status to 'rejected' server-side.
      expect(req.method, 'POST');
      expect(req.url.path, '/neondb/rest/v1/rpc/reject_inbox_candidate');
      expect(req.body, {'p_candidate_id': 'c1'});
    });

    test(
      'reject returning false throws — no silent success on a stale queue',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, false));
        expect(
          () => h.store.rejectInboxCandidate('ghost'),
          throwsA(isA<Exception>()),
        );
      },
    );
  });

  group('paste parser', () {
    test('bank SMS tail: account digits are not the amount', () {
      final d = parseInboxPasteText(
        'TK 1234 GD -50,000 VND PHO NGON',
        today: '2026-10-14',
      ).single;
      expect(d.amountMinor, 50000);
      expect(d.kind, TransactionKind.expense);
      expect(d.merchant, 'PHO NGON');
      expect(d.occurredOn, '2026-10-14');
      expect(d.confidence, 'medium');
      expect(d.uncertainFields, ['date']);
    });

    test('casual shorthand and grouped thousands', () {
      final cafe = parseInboxPasteText('cafe 45k', today: '2026-10-14').single;
      expect(cafe.amountMinor, 45000);
      expect(cafe.merchant, 'Cafe');
      expect(cafe.kind, TransactionKind.expense);

      final plain = parseInboxPasteText(
        '45.000 VND',
        today: '2026-10-14',
      ).single;
      expect(plain.amountMinor, 45000);
      expect(plain.merchant, 'Không rõ');
    });

    test('SD:/GD: labels keep the transaction over the balance', () {
      final d = parseInboxPasteText(
        'TK 9999 GD: -50.000 SD: 1.000.000',
        today: '2026-10-14',
      ).single;
      expect(d.amountMinor, 50000);
    });

    test('income hint wins; transfer cue stays an expense needing review', () {
      final income = parseInboxPasteText(
        'nhan 500k tu Momo',
        today: '2026-10-14',
      ).single;
      expect(income.kind, TransactionKind.income);
      expect(income.merchant, 'MoMo');

      final xfer = parseInboxPasteText(
        'ck 300k to Momo',
        today: '2026-10-14',
      ).single;
      expect(xfer.kind, TransactionKind.expense);
      expect(xfer.uncertainFields, contains('kind'));
      expect(xfer.confidence, 'low');
    });

    test('explicit D/M/Y date wins over today; missing year is flagged', () {
      final dated = parseInboxPasteText(
        'cafe 45k 27/09/2026',
        today: '2026-10-14',
      ).single;
      expect(dated.occurredOn, '2026-09-27');
      expect(dated.confidence, 'high');

      final noYear = parseInboxPasteText(
        'cafe 45k 27/09',
        today: '2026-10-14',
      ).single;
      expect(noYear.occurredOn, '2026-09-27');
      expect(noYear.uncertainFields, contains('date'));
    });

    test('invalid date falls back to today and forces low confidence', () {
      final d = parseInboxPasteText(
        'cafe 45k 31/02/2026',
        today: '2026-10-14',
      ).single;
      expect(d.occurredOn, '2026-10-14');
      expect(d.confidence, 'low');
    });

    test('one draft per non-empty line', () {
      final drafts = parseInboxPasteText(
        'cafe 45k\nGrab 89k\n\nno money here',
        today: '2026-10-14',
      );
      expect(drafts.length, 2);
      expect(drafts[0].amountMinor, 45000);
      expect(drafts[1].amountMinor, 89000);
      expect(drafts[1].merchant, 'Grab');
    });

    test('no money → no drafts; nothing becomes a candidate by accident', () {
      expect(parseInboxPasteText('   ', today: '2026-10-14'), isEmpty);
      expect(
        parseInboxPasteText('chỉ chữ không có số', today: '2026-10-14'),
        isEmpty,
      );
      // A bare account tail alone is not money.
      expect(parseInboxPasteText('TK 1234', today: '2026-10-14'), isEmpty);
    });
  });

  group('labels + resolution helpers', () {
    test('Vietnamese kind/source/confidence labels match the web', () {
      expect(inboxKindLabel(TransactionKind.expense), 'Chi');
      expect(inboxKindLabel(TransactionKind.income), 'Thu');
      expect(inboxKindLabel(TransactionKind.transfer), 'Chuyển khoản');
      expect(inboxSourceLabel('paste'), 'paste');
      expect(inboxSourceLabel('notification'), 'thông báo');
      expect(inboxSourceLabel('agent'), 'AI agent');
      expect(inboxConfidenceLabel('high'), 'Khá chắc');
      expect(inboxConfidenceLabel('medium'), 'Tạm ổn');
      expect(inboxConfidenceLabel('low'), 'Cần xem');
    });

    test('suggested account/category resolve by id, then unique name', () {
      final c = InboxCandidate(
        id: 'c1',
        kind: TransactionKind.expense,
        amountMinor: 45000,
        merchant: 'PHO NGON',
        note: '',
        occurredOn: '2026-10-14',
        source: 'paste',
        confidence: 'low',
        accountName: 'VCB',
        categoryName: 'Ăn uống',
      );
      final accounts = [acc, acc2];
      final cats = [catExpense, catIncome];
      expect(resolveInboxAccountId(c, accounts), 'a1');
      expect(resolveInboxCategoryId(c, cats), 'k1');
      // A missing/ambiguous suggestion resolves to nothing, never a guess.
      final dup = InboxCandidate(
        id: 'c2',
        kind: TransactionKind.expense,
        amountMinor: 1,
        merchant: 'x',
        note: '',
        occurredOn: '2026-10-14',
        source: 'paste',
        confidence: 'low',
        accountName: 'nope',
      );
      expect(resolveInboxAccountId(dup, accounts), isNull);
      expect(resolveInboxCategoryId(dup, cats), isNull);
    });

    test('a single wrong-kind name match resolves to null, never that id', () {
      // The reviewed fallback bug: an expense hinting "Lương" used to
      // resolve to the income category of that name — an id the server
      // must reject (`category_kind_mismatch`). Null keeps the pick in
      // the reviewer's hands.
      final incomeOnly = Category(
        id: 'k-income',
        name: 'Lương',
        kind: TransactionKind.income,
      );
      final c = InboxCandidate(
        id: 'c3',
        kind: TransactionKind.expense,
        amountMinor: 50000,
        merchant: 'x',
        note: '',
        occurredOn: '2026-10-14',
        source: 'paste',
        confidence: 'low',
        categoryName: 'Lương',
      );
      expect(resolveInboxCategoryId(c, [incomeOnly]), isNull);
    });
  });

  group('InboxPage widget states', () {
    testWidgets('loading → list renders amount, kind, labels', (t) async {
      final gate = Completer<List<InboxCandidate>>();
      await t.pumpWidget(MaterialApp(home: page(load: () => gate.future)));
      await t.pump(); // still loading — the completer is open
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      gate.complete([row()]);
      await t.pumpAndSettle();
      expect(find.text('PHO NGON'), findsOneWidget);
      expect(find.text('45.000 ₫'), findsOneWidget);
      expect(find.textContaining('Chi'), findsWidgets);
      expect(find.textContaining('14/10/2026'), findsOneWidget);
      expect(find.textContaining('Tạm ổn'), findsOneWidget);
      expect(find.text('Xem & duyệt'), findsOneWidget);
      expect(find.text('Từ chối'), findsOneWidget);
    });

    testWidgets('empty state says nothing is pending', (t) async {
      await t.pumpWidget(MaterialApp(home: page(load: () async => const [])));
      await t.pumpAndSettle();
      expect(find.text('Không có mục nào chờ duyệt'), findsOneWidget);
      expect(find.text('Dán tin nhắn'), findsWidgets);
    });

    testWidgets('error shows retry; a successful retry renders the list', (
      t,
    ) async {
      var calls = 0;
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async {
              calls++;
              if (calls == 1) throw StateError('offline');
              return [row()];
            },
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Không tải được dữ liệu'), findsOneWidget);
      await t.tap(find.text('Thử lại'));
      await t.pumpAndSettle();
      expect(find.text('PHO NGON'), findsOneWidget);
    });

    testWidgets('reject confirms then removes the row', (t) async {
      var rejected = '';
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => [row()],
            onReject: (id) async => rejected = id,
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Từ chối'));
      await t.pumpAndSettle();
      // The dialog explains reject is a status, not a delete.
      await t.tap(find.widgetWithText(FilledButton, 'Từ chối').last);
      await t.pumpAndSettle();
      expect(rejected, 'c1');
      expect(find.text('Không có mục nào chờ duyệt'), findsOneWidget);
    });

    testWidgets('review approves through onApprove with edited values', (
      t,
    ) async {
      InboxApproval? sent;
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => [row()],
            onPlan: (_) async => const InboxPlan(
              status: 'would_create',
              reason: 'no_match',
              confidence: 0.9,
            ),
            onApprove: (a) async => sent = a,
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Xem & duyệt'));
      await t.pumpAndSettle();
      expect(find.text('Duyệt mục'), findsOneWidget);
      expect(find.text('Sẵn sàng ghi vào sổ.'), findsOneWidget);
      // Suggestions resolved: account + category prefilled.
      await t.tap(find.text('Duyệt vào sổ'));
      await t.pumpAndSettle();
      expect(sent, isNotNull);
      expect(sent!.candidateId, 'c1');
      expect(sent!.kind, TransactionKind.expense);
      expect(sent!.accountId, 'a1');
      expect(sent!.categoryId, 'k1');
      expect(sent!.amountMinor, 45000);
      expect(sent!.payee, 'PHO NGON');
      expect(sent!.allowHeuristicDuplicate, isFalse);
    });

    testWidgets('review blocks submit without a category', (t) async {
      var called = false;
      final noCat = InboxCandidate(
        id: 'c1',
        kind: TransactionKind.expense,
        amountMinor: 45000,
        merchant: 'PHO NGON',
        note: '',
        occurredOn: '2026-10-14',
        source: 'paste',
        confidence: 'low',
        accountId: 'a1',
      );
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => [noCat],
            onApprove: (_) async => called = true,
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.text('Xem & duyệt'));
      await t.pumpAndSettle();
      await t.tap(find.text('Duyệt vào sổ'));
      await t.pumpAndSettle();
      expect(called, isFalse);
      expect(find.text('Hãy chọn danh mục.'), findsOneWidget);
    });

    testWidgets('paste sheet parses, picks defaults and commits via RPC', (
      t,
    ) async {
      // Tall surface: the sheet is a lazy ListView, so the commit button
      // only builds once it can scroll into the viewport.
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 1.0;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      CsvImportBatch? sent;
      var loads = 0;
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async {
              loads++;
              return loads == 1 ? const [] : [row()];
            },
            onImport: (batch) async {
              sent = batch;
              return const CsvImportResult(batchId: 'b1', candidateCount: 1);
            },
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.tap(find.byTooltip('Dán tin nhắn'));
      await t.pumpAndSettle();
      await t.enterText(
        find.byType(TextField).first,
        'TK 1234 GD -50,000 VND PHO NGON\nkhong co so tien',
      );
      await t.tap(find.text('Phân tích'));
      await t.pumpAndSettle();
      expect(find.text('PHO NGON'), findsOneWidget);
      expect(find.text('50.000 ₫'), findsOneWidget);
      expect(find.textContaining('1 dòng không đọc được'), findsOneWidget);
      // Account + per-kind category defaults are pre-picked (the RPC
      // demands real ids a pasted line cannot carry).
      await t.tap(find.text('Lưu 1 mục chờ duyệt'));
      await t.pumpAndSettle();
      expect(sent, isNotNull);
      expect(sent!.rows.single.amountMinor, 50000);
      expect(sent!.rows.single.kind, TransactionKind.expense);
      expect(sent!.rows.single.accountId, 'a1');
      expect(sent!.rows.single.categoryId, 'k1');
      expect(sent!.fileName, startsWith('paste-'));
      expect(sent!.fileName, endsWith('.txt'));
      expect(sent!.skippedRows, 1);
      // Success message reports the server-verified count, then the queue
      // reloads and shows the pending row.
      expect(find.text('Đã tạo 1 mục chờ duyệt'), findsOneWidget);
      expect(find.text('Không có mục nào chờ duyệt'), findsNothing);
    });
  });

  group('rule-from-approve', () {
    /// Drives the list → review → "Duyệt vào sổ" path; returns after the
    /// review page has popped and the offer snackbar is on screen.
    Future<void> approveRow(WidgetTester t) async {
      await t.tap(find.text('Xem & duyệt'));
      await t.pumpAndSettle();
      await t.tap(find.text('Duyệt vào sổ'));
      await t.pumpAndSettle();
    }

    testWidgets('approve offers a merchant rule; the action saves it', (
      t,
    ) async {
      InboxRuleDraft? draft;
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => [row()],
            onApprove: (_) async {},
            onSaveRule: (d) async => draft = d,
          ),
        ),
      );
      await t.pumpAndSettle();
      await approveRow(t);

      // The offer names the reviewed merchant, not the raw candidate text.
      expect(
        find.text('Đã duyệt. Luôn áp dụng cho "PHO NGON"?'),
        findsOneWidget,
      );
      await t.tap(find.text('Tạo quy tắc'));
      await t.pumpAndSettle();

      expect(draft, isNotNull);
      expect(draft!.id, isNull); // a new rule, appended server-side
      expect(draft!.matchField, RuleMatchField.merchant);
      expect(draft!.containsText, 'PHO NGON');
      expect(draft!.categoryId, 'k1');
      expect(draft!.enabled, isTrue);
      expect(find.text('Đã lưu quy tắc cho "PHO NGON"'), findsOneWidget);
    });

    testWidgets('a failed rule save is an honest snackbar, not a retry loop', (
      t,
    ) async {
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => [row()],
            onApprove: (_) async {},
            onSaveRule: (_) async => throw Exception('PGRST202 missing'),
          ),
        ),
      );
      await t.pumpAndSettle();
      await approveRow(t);

      await t.tap(find.text('Tạo quy tắc'));
      await t.pumpAndSettle();
      expect(
        find.text('Tính năng quy tắc chưa được bật trên máy chủ.'),
        findsOneWidget,
      );
    });

    testWidgets('no reviewed payee → no rule offer', (t) async {
      final blank = InboxCandidate(
        id: 'c1',
        kind: TransactionKind.expense,
        amountMinor: 45000,
        // 'Không rõ' prefills an empty payee field — the reviewed payee is
        // what the offer keys on, and blank has nothing stable to match.
        merchant: 'Không rõ',
        note: '',
        occurredOn: '2026-10-14',
        source: 'paste',
        confidence: 'low',
        accountId: 'a1',
        accountName: 'VCB',
        categoryId: 'k1',
        categoryName: 'Ăn uống',
      );
      await t.pumpWidget(
        MaterialApp(
          home: page(
            load: () async => [blank],
            onApprove: (_) async {},
            onSaveRule: (_) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      await approveRow(t);
      expect(find.textContaining('Luôn áp dụng'), findsNothing);
    });

    testWidgets('no onSaveRule seam → the offer is simply absent', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: page(load: () async => [row()], onApprove: (_) async {}),
        ),
      );
      await t.pumpAndSettle();
      await approveRow(t);
      expect(find.textContaining('Luôn áp dụng'), findsNothing);
    });
  });

  group('DemoInboxStore', () {
    test(
      'seeds two pending rows; approve/reject drop them from the queue',
      () async {
        final store = DemoInboxStore();
        expect(await store.pendingCount(), 2);
        await store.approve(
          const InboxApproval(
            candidateId: 'demo-cand-1',
            kind: TransactionKind.expense,
            accountId: 'acc-bank',
            categoryId: 'cat-food',
            amountMinor: 68000,
            occurredOn: '2026-10-14',
          ),
        );
        expect((await store.loadPending()).map((c) => c.id), ['demo-cand-2']);
        await store.reject('demo-cand-2');
        expect(await store.loadPending(), isEmpty);
        expect(await store.pendingCount(), 0);
      },
    );
  });
}
