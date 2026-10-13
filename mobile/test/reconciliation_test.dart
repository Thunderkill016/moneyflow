// Account reconciliation — contract parity with the web's
// src/app/actions/reconciliation.ts + src/lib/reconciliation.ts: view
// mapping (both read paths), RPC parameter names, statement-diff math,
// completion/reopen gating, and honest error mapping.

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/models.dart';
import 'package:moneyflow/domain/money.dart';
import 'package:moneyflow/domain/reconciliation.dart';
import 'package:moneyflow/domain/register.dart';
import 'package:moneyflow/domain/transaction_query.dart';
import 'package:moneyflow/features/accounts/account_reconciliation_page.dart';
import 'package:moneyflow/features/accounts/account_register_page.dart';

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

const account = AccountSummary(
  id: 'a1',
  name: 'Tiền mặt',
  kind: AccountKind.cash,
  currencyCode: 'VND',
  initialBalance: 0,
  balance: 11098000,
);

Transaction tx(
  String id,
  TransactionKind kind,
  int amount,
  String day, {
  String? destinationAccountId,
  String? destinationAccount,
}) => Transaction(
  id: id,
  kind: kind,
  categoryId: 'cat-x',
  category: kind == TransactionKind.transfer ? 'Chuyển khoản' : 'Ăn uống',
  note: id,
  accountId: 'a1',
  account: 'Tiền mặt',
  amount: amount,
  occurredOn: day,
  destinationAccountId: destinationAccountId,
  destinationAccount: destinationAccount,
);

Map<String, Object?> feedRow(
  String entryId,
  String transactionId, {
  String state = 'pending',
  int entryCount = 1,
  String? reconciliationId,
}) => {
  'entry_id': entryId,
  'transaction_id': transactionId,
  'account_id': 'a1',
  'reconciliation_state': state,
  'cleared_at': state == 'pending' ? null : '2026-10-13T08:00:00Z',
  'reconciliation_id': reconciliationId,
  'entry_count': entryCount,
};

Map<String, Object?> summaryRow({
  String id = 'r1',
  String statementDate = '2026-10-13',
  int statementBalance = 11098000,
  String status = 'open',
  int? calculated,
  int cleared = 0,
  int difference = 11098000,
  int pending = 7,
  int clearedCount = 0,
  int reconciledCount = 0,
}) => {
  'id': id,
  'account_id': 'a1',
  'statement_date': statementDate,
  'statement_balance_minor': statementBalance,
  'status': status,
  'calculated_balance_minor': calculated,
  'cleared_balance_minor': cleared,
  'difference_minor': difference,
  'pending_account_leg_count': pending,
  'cleared_account_leg_count': clearedCount,
  'reconciled_account_leg_count': reconciledCount,
  'started_at': '2026-10-13T08:00:00Z',
  'completed_at': status == 'completed' ? '2026-10-13T09:00:00Z' : null,
  'last_reopened_at': null,
  'created_at': '2026-10-13T08:00:00Z',
  'updated_at': '2026-10-13T08:00:00Z',
};

/// The base-table shape (fallback path): no live columns — open rows
/// carry nulls the domain resolves locally.
Map<String, Object?> tableRow({
  String id = 'r1',
  String statementDate = '2026-10-13',
  int statementBalance = 11098000,
  String status = 'open',
  int? calculated,
  int? pending,
  int? clearedCount,
  int? reconciledCount,
}) => {
  'id': id,
  'account_id': 'a1',
  'statement_date': statementDate,
  'statement_balance_minor': statementBalance,
  'status': status,
  'calculated_balance_minor': calculated,
  'pending_account_leg_count': pending,
  'cleared_account_leg_count': clearedCount,
  'reconciled_account_leg_count': reconciledCount,
  'started_at': '2026-10-13T08:00:00Z',
  'completed_at': status == 'completed' ? '2026-10-13T09:00:00Z' : null,
  'last_reopened_at': null,
  'created_at': '2026-10-13T08:00:00Z',
  'updated_at': '2026-10-13T08:00:00Z',
};

ReconciliationSession session({
  String id = 'r1',
  String statementDate = '2026-10-13',
  int statementBalance = 11098000,
  ReconciliationStatus status = ReconciliationStatus.open,
  int? calculated,
  int? clearedBalance,
  int? difference,
  int? pending,
  int? clearedCount,
  int? reconciledCount,
  String? completedAt,
  String createdAt = '2026-10-13T08:00:00Z',
}) => ReconciliationSession(
  id: id,
  accountId: 'a1',
  statementDate: statementDate,
  statementBalance: statementBalance,
  status: status,
  calculatedBalance: calculated,
  clearedBalance: clearedBalance,
  difference: difference,
  pendingLegCount: pending,
  clearedLegCount: clearedCount,
  reconciledLegCount: reconciledCount,
  completedAt: completedAt,
  createdAt: createdAt,
);

ReconciliationEntryRow entryRow(
  String entryId,
  String transactionId, {
  EntryReconciliationState state = EntryReconciliationState.pending,
}) => ReconciliationEntryRow(
  entryId: entryId,
  transactionId: transactionId,
  accountId: 'a1',
  state: state,
  entryCount: 1,
);

void main() {
  group('RealStore.loadReconciliationState', () {
    test('maps entry feed + summaries view rows', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, [feedRow('e1', 't1')]));
      h.t.queue.add(FakeTransport.json(200, [summaryRow()]));

      final data = await h.store.loadReconciliationState('a1');

      expect(h.t.requests.length, 4); // sign-in + jwt + 2 selects
      final feedReq = h.t.requests[2];
      expect(feedReq.url.path, contains('account_reconciliation_entry_feed'));
      expect(feedReq.url.queryParameters['account_id'], 'eq.a1');
      final sumReq = h.t.requests[3];
      expect(sumReq.url.path, contains('account_reconciliation_summaries'));
      expect(
        sumReq.url.queryParameters['order'],
        'statement_date.desc,created_at.desc',
      );

      expect(data.featureAvailable, isTrue);
      expect(data.rows.single.entryId, 'e1');
      expect(data.rows.single.state, EntryReconciliationState.pending);
      final s = data.sessions.single;
      expect(s.status, ReconciliationStatus.open);
      expect(s.statementBalance, 11098000);
      expect(s.clearedBalance, 0);
      expect(s.difference, 11098000);
      expect(s.pendingLegCount, 7);
    });

    test('a summaries failure falls back to the base table — open rows '
        'stay null until resolved locally', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, [feedRow('e1', 't1')]));
      h.t.queue.add(
        FakeTransport.json(403, {
          'code': '42501',
          'message': 'permission denied for schema auth',
        }),
      );
      h.t.queue.add(
        FakeTransport.json(200, [
          tableRow(status: 'open'),
          tableRow(
            id: 'r0',
            statementDate: '2026-09-30',
            status: 'completed',
            calculated: 9000000,
            pending: 0,
            clearedCount: 0,
            reconciledCount: 5,
          ),
        ]),
      );

      final data = await h.store.loadReconciliationState('a1');

      expect(h.t.requests.last.url.path, contains('account_reconciliations'));
      expect(data.sessions, hasLength(2));
      // Newest first by statement_date.
      expect(data.sessions[0].id, 'r1');
      expect(data.sessions[0].status, ReconciliationStatus.open);
      expect(data.sessions[0].clearedBalance, isNull);
      expect(data.sessions[0].difference, isNull);
      // Completed rows derive cleared/difference from stored values.
      final done = data.sessions[1];
      expect(done.status, ReconciliationStatus.completed);
      expect(done.clearedBalance, 9000000);
      expect(done.difference, 11098000 - 9000000);
      expect(done.reconciledLegCount, 5);
    });

    test('missing contract marks the feature unavailable', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(404, {
          'code': 'PGRST205',
          'message': 'Could not find the table in the schema cache',
        }),
      );
      final data = await h.store.loadReconciliationState('a1');
      expect(data.featureAvailable, isFalse);
    });
  });

  group('reconciliation RPC parameters', () {
    test('start posts account/date/balance under the contract names', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'r1'));

      final id = await h.store.startAccountReconciliation(
        accountId: 'a1',
        statementDate: '2026-10-13',
        statementBalance: 11098000,
      );

      expect(id, 'r1');
      final req = h.t.requests.last;
      expect(req.url.path, '/neondb/rest/v1/rpc/start_account_reconciliation');
      expect(req.body, {
        'p_account_id': 'a1',
        'p_statement_date': '2026-10-13',
        'p_statement_balance_minor': 11098000,
      });
    });

    test('entry state posts the leg id plus the target enum', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'cleared'));

      await h.store.setAccountEntryReconciliationState(
        entryId: 'e1',
        state: EntryReconciliationState.cleared,
      );

      final req = h.t.requests.last;
      expect(
        req.url.path,
        '/neondb/rest/v1/rpc/set_account_entry_reconciliation_state',
      );
      expect(req.body, {'p_entry_id': 'e1', 'p_state': 'cleared'});
    });

    test('complete sends explicit nulls for unused adjustment params — the '
        'same keys the web action posts', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));

      await h.store.completeAccountReconciliation(reconciliationId: 'r1');

      final req = h.t.requests.last;
      expect(
        req.url.path,
        '/neondb/rest/v1/rpc/complete_account_reconciliation',
      );
      expect(req.body, {
        'p_reconciliation_id': 'r1',
        'p_adjustment_category_id': null,
        'p_adjustment_payee': null,
      });
    });

    test('complete forwards a chosen adjustment category + payee', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));

      await h.store.completeAccountReconciliation(
        reconciliationId: 'r1',
        adjustmentCategoryId: 'k1',
        adjustmentPayee: 'Ngân hàng',
      );

      final body = h.t.requests.last.body as Map;
      expect(body['p_adjustment_category_id'], 'k1');
      expect(body['p_adjustment_payee'], 'Ngân hàng');
    });

    test('reopen posts the session id', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));

      await h.store.reopenAccountReconciliation('r1');

      final req = h.t.requests.last;
      expect(req.url.path, '/neondb/rest/v1/rpc/reopen_account_reconciliation');
      expect(req.body, {'p_reconciliation_id': 'r1'});
    });
  });

  group('diff math + gating', () {
    test('calculateSessionSnapshot counts only legs dated on or before the '
        'statement, signed by impact', () {
      final register = buildAccountRegister(
        currentBalance: 11098000,
        accountId: 'a1',
        newestFirst: [
          tx('t1', TransactionKind.expense, 45000, '2026-10-12'),
          tx('t2', TransactionKind.income, 15000000, '2026-10-10'),
          tx('t3', TransactionKind.expense, 32000, '2026-10-08'),
          tx('t4', TransactionKind.expense, 99000, '2026-10-14'),
        ],
      );
      final data = ReconciliationStateData(
        featureAvailable: true,
        rows: [
          entryRow('e1', 't1', state: EntryReconciliationState.cleared),
          entryRow('e2', 't2', state: EntryReconciliationState.reconciled),
          entryRow('e3', 't3'),
          entryRow('e4', 't4', state: EntryReconciliationState.cleared),
        ],
        sessions: const [],
      );
      final ws = mergeReconciliationWorkspace(register, data);
      final snap = calculateSessionSnapshot(0, ws.entries, '2026-10-13');
      // t4 sits after the statement date — not eligible at all.
      // cleared balance = 0 + 15000000 (reconciled) − 45000 (cleared).
      expect(snap.clearedBalance, 14955000);
      expect(snap.pending, 1);
      expect(snap.cleared, 1);
      expect(snap.reconciled, 1);
    });

    test('resolveSessionSnapshots fills open nulls, keeps stored values', () {
      final register = buildAccountRegister(
        currentBalance: 11098000,
        accountId: 'a1',
        newestFirst: [tx('t1', TransactionKind.expense, 45000, '2026-10-12')],
      );
      final open = session(
        status: ReconciliationStatus.open,
        statementBalance: 11000000,
      );
      final done = session(
        id: 'r0',
        status: ReconciliationStatus.completed,
        statementDate: '2026-09-30',
        statementBalance: 100,
        calculated: 100,
        clearedBalance: 100,
        difference: 0,
        pending: 0,
        clearedCount: 0,
        reconciledCount: 3,
        completedAt: '2026-09-30T09:00:00Z',
      );
      final resolved = resolveSessionSnapshots(
        data: ReconciliationStateData(
          featureAvailable: true,
          rows: [entryRow('e1', 't1', state: EntryReconciliationState.cleared)],
          sessions: [open, done],
        ),
        registerEntries: register,
        initialBalance: 0,
      );
      final resolvedOpen = resolved.sessions.firstWhere(
        (s) => s.status == ReconciliationStatus.open,
      );
      expect(resolvedOpen.clearedBalance, -45000);
      expect(resolvedOpen.difference, 11000000 - (-45000));
      expect(resolvedOpen.clearedLegCount, 1);
      // The completed row kept its server-stored values untouched.
      final resolvedDone = resolved.sessions.firstWhere(
        (s) => s.status == ReconciliationStatus.completed,
      );
      expect(resolvedDone.clearedBalance, 100);
      expect(resolvedDone.reconciledLegCount, 3);
    });

    test(
      'canReopenSession: latest completed only, never while open exists',
      () {
        final older = session(
          id: 'r0',
          statementDate: '2026-09-30',
          status: ReconciliationStatus.completed,
        );
        final newer = session(
          id: 'r1',
          statementDate: '2026-10-13',
          status: ReconciliationStatus.completed,
        );
        expect(canReopenSession(newer, [older, newer]), isTrue);
        expect(canReopenSession(older, [older, newer]), isFalse);
        final open = session(id: 'r2', status: ReconciliationStatus.open);
        expect(canReopenSession(newer, [older, newer, open]), isFalse);
      },
    );

    test('adjustment kind follows the difference sign', () {
      expect(reconciliationAdjustmentKind(50000), TransactionKind.income);
      expect(reconciliationAdjustmentKind(-50000), TransactionKind.expense);
      expect(
        reconciliationAdjustmentNote('2026-10-13'),
        'Điều chỉnh đối soát — sao kê 13/10/2026',
      );
    });

    test('status label prefers an open period, then latest completed', () {
      ReconciliationStateData data(List<ReconciliationSession> s) =>
          ReconciliationStateData(
            featureAvailable: true,
            rows: const [],
            sessions: s,
          );
      expect(reconciliationStatusLabel(data(const [])), 'Chưa có kỳ đối soát');
      expect(
        reconciliationStatusLabel(
          data([
            session(
              status: ReconciliationStatus.completed,
              statementDate: '2026-09-30',
            ),
          ]),
        ),
        'Đã đối soát đến 30/09/2026',
      );
      expect(
        reconciliationStatusLabel(
          data([
            session(statementDate: '2026-10-13'),
            session(
              id: 'r0',
              status: ReconciliationStatus.completed,
              statementDate: '2026-09-30',
            ),
          ]),
        ),
        'Đang đối soát kỳ sao kê 13/10/2026',
      );
      expect(
        reconciliationStatusLabel(
          const ReconciliationStateData(
            featureAvailable: false,
            rows: [],
            sessions: [],
          ),
        ),
        isNull,
      );
    });
  });

  group('error mapping', () {
    test('each contract code maps to its Vietnamese message', () {
      final cases = {
        'invalid_statement_date': 'Ngày sao kê chưa hợp lệ.',
        'invalid_statement_balance': 'Số dư sao kê chưa hợp lệ.',
        'account_not_found':
            'Tài khoản không còn hoạt động hoặc không tồn tại.',
        'open_reconciliation_exists': 'Tài khoản đang có một kỳ đối soát mở.',
        'statement_date_not_after_previous_reconciliation':
            'Ngày sao kê phải sau kỳ đối soát đã hoàn tất gần nhất.',
        'entry_not_found':
            'Giao dịch đã thay đổi hoặc không còn trong sổ tài khoản.',
        'transaction_deleted': 'Giao dịch đã bị xóa nên không thể đối soát.',
        'entry_reconciled': 'Giao dịch đã đối soát nên không thể đổi tại đây.',
        'open_reconciliation_not_found': 'Kỳ đối soát không còn mở.',
        'reconciliation_difference_nonzero':
            'Chênh lệch phải bằng 0 trước khi hoàn tất.',
        'completed_reconciliation_not_found':
            'Không tìm thấy kỳ đối soát đã hoàn tất.',
        'only_latest_reconciliation_can_reopen':
            'Chỉ kỳ đã hoàn tất gần nhất mới có thể mở lại.',
        'category_kind_mismatch':
            'Danh mục điều chỉnh phải cùng loại thu hoặc chi với khoản chênh lệch.',
        'category_archived':
            'Danh mục điều chỉnh đã lưu trữ. Hãy chọn danh mục đang hoạt động.',
        'note_too_long': 'Ghi chú điều chỉnh quá dài.',
        'payee_too_long': 'Tên đối tác điều chỉnh quá dài.',
      };
      for (final e in cases.entries) {
        expect(
          reconciliationErrorMessage(Exception(e.key)),
          e.value,
          reason: e.key,
        );
      }
      expect(
        reconciliationErrorMessage(Exception('something_else')),
        'Không cập nhật được đối soát. Hãy thử lại.',
      );
    });

    test('a 42501 on the summaries endpoint is NOT a missing contract — '
        'the endpoint name lives in the request path', () {
      final e = NeonAuthException(
        403,
        'api.test/neondb/rest/v1/account_reconciliation_summaries -> '
        '{"code":"42501","message":"permission denied for schema auth"}',
      );
      expect(isMissingReconciliationContract(e), isFalse);
      // ...and it must not masquerade as "not enabled" either.
      expect(
        reconciliationErrorMessage(e),
        'Không cập nhật được đối soát. Hãy thử lại.',
      );
    });

    test('an rpc business error does not false-positive on the endpoint '
        'name in the request path', () {
      final e = NeonAuthException(
        400,
        'api.test/neondb/rest/v1/rpc/start_account_reconciliation -> '
        '{"code":"P0001","message":"invalid_statement_date"}',
      );
      expect(isMissingReconciliationContract(e), isFalse);
      expect(reconciliationErrorMessage(e), 'Ngày sao kê chưa hợp lệ.');
    });

    test('missing view/function bodies flag the contract absent', () {
      for (final msg in [
        '{"code":"PGRST205","message":"x"}',
        '{"code":"42P01","message":"relation account_reconciliation_entry_feed does not exist"}',
        'Could not find the table account_reconciliation_summaries',
        'Could not find the function start_account_reconciliation',
      ]) {
        expect(isMissingReconciliationContract(Exception(msg)), isTrue);
      }
    });
  });

  group('parseSignedMoneyInput', () {
    test('accepts grouped and shorthand values with a minus sign', () {
      expect(parseSignedMoneyInput('11098000'), 11098000);
      expect(parseSignedMoneyInput('11.098.000'), 11098000);
      expect(parseSignedMoneyInput('-50.000'), -50000);
      expect(parseSignedMoneyInput('2tr'), 2000000);
      expect(parseSignedMoneyInput(''), isNull);
      expect(parseSignedMoneyInput('-'), isNull);
      expect(parseSignedMoneyInput('abc'), isNull);
    });
  });

  /// Tall surface so the whole workspace (list + summary) is built on
  /// screen — taps never need scrolling.
  void bigSurface(WidgetTester t) {
    t.view.physicalSize = const Size(1200, 2600);
    t.view.devicePixelRatio = 1.0;
    addTearDown(t.view.reset);
  }

  group('AccountReconciliationPage', () {
    Widget page({
      ReconciliationStateData? state,
      List<Transaction> ledger = const [],
      List<Category> categories = const [],
      ReconciliationActions? actions,
      String today = '2026-10-13',
    }) => MaterialApp(
      home: AccountReconciliationPage(
        account: account,
        loadState: () async =>
            state ??
            const ReconciliationStateData(
              featureAvailable: true,
              rows: [],
              sessions: [],
            ),
        loadLedger: () async => (rows: ledger, truncated: false),
        loadCategories: () async => categories,
        actions:
            actions ??
            ReconciliationActions(
              start:
                  ({
                    required statementDate,
                    required statementBalance,
                  }) async {},
              setEntryState: ({required entryId, required state}) async {},
              complete:
                  ({
                    required reconciliationId,
                    adjustmentCategoryId,
                    adjustmentPayee,
                  }) async {},
              reopen: (id) async {},
            ),
        today: today,
      ),
    );

    testWidgets('start form parses the balance and posts the period', (
      t,
    ) async {
      String? gotDate;
      int? gotBalance;
      bigSurface(t);
      await t.pumpWidget(
        page(
          actions: ReconciliationActions(
            start: ({required statementDate, required statementBalance}) async {
              gotDate = statementDate;
              gotBalance = statementBalance;
            },
            setEntryState: ({required entryId, required state}) async {},
            complete:
                ({
                  required reconciliationId,
                  adjustmentCategoryId,
                  adjustmentPayee,
                }) async {},
            reopen: (id) async {},
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Nhập hai số liệu từ sao kê'), findsOneWidget);
      await t.enterText(
        find.widgetWithText(TextField, 'Số dư cuối kỳ'),
        '11.098.000',
      );
      await t.pump(); // rebuild — the button was disabled at last build
      await t.tap(find.text('Mở kỳ đối soát'));
      await t.pumpAndSettle();
      expect(gotDate, '2026-10-13');
      expect(gotBalance, 11098000);
    });

    testWidgets('an invalid balance keeps the start button disabled', (
      t,
    ) async {
      var calls = 0;
      bigSurface(t);
      await t.pumpWidget(
        page(
          actions: ReconciliationActions(
            start: ({required statementDate, required statementBalance}) async {
              calls++;
            },
            setEntryState: ({required entryId, required state}) async {},
            complete:
                ({
                  required reconciliationId,
                  adjustmentCategoryId,
                  adjustmentPayee,
                }) async {},
            reopen: (id) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.enterText(find.widgetWithText(TextField, 'Số dư cuối kỳ'), 'abc');
      await t.pump();
      // FilledButton.icon builds a private subclass — match by `is`.
      final button = t.widget<FilledButton>(
        find.ancestor(
          of: find.text('Mở kỳ đối soát'),
          matching: find.byWidgetPredicate((w) => w is FilledButton),
        ),
      );
      expect(button.onPressed, isNull);
      await t.tap(find.text('Mở kỳ đối soát'));
      await t.pumpAndSettle();
      expect(calls, 0);
    });

    testWidgets(
      'open session lists legs; a toggle posts the next state and the '
      'summary shows the honest difference',
      (t) async {
        String? gotEntry;
        EntryReconciliationState? gotState;
        var loads = 0;
        final openData = ReconciliationStateData(
          featureAvailable: true,
          rows: [
            entryRow('e1', 't1', state: EntryReconciliationState.cleared),
            entryRow('e2', 't2'),
            entryRow('e3', 't3'),
          ],
          sessions: [
            session(
              statementBalance: 11098000,
              clearedBalance: 14955000,
              difference: -3847000,
              pending: 2,
              clearedCount: 1,
              reconciledCount: 0,
            ),
          ],
        );
        bigSurface(t);
        await t.pumpWidget(
          MaterialApp(
            home: AccountReconciliationPage(
              account: account,
              loadState: () async {
                loads++;
                return openData;
              },
              loadLedger: () async => (
                rows: [
                  tx('t1', TransactionKind.expense, 45000, '2026-10-12'),
                  tx('t2', TransactionKind.income, 15000000, '2026-10-10'),
                  tx('t3', TransactionKind.expense, 32000, '2026-10-08'),
                ],
                truncated: false,
              ),
              loadCategories: () async => const [],
              actions: ReconciliationActions(
                start:
                    ({
                      required statementDate,
                      required statementBalance,
                    }) async {},
                setEntryState: ({required entryId, required state}) async {
                  gotEntry = entryId;
                  gotState = state;
                },
                complete:
                    ({
                      required reconciliationId,
                      adjustmentCategoryId,
                      adjustmentPayee,
                    }) async {},
                reopen: (id) async {},
              ),
              today: '2026-10-13',
            ),
          ),
        );
        await t.pumpAndSettle();

        expect(find.text('Kỳ sao kê 13/10/2026 đang mở'), findsOneWidget);
        expect(find.text('− 3.847.000 ₫'), findsOneWidget);
        expect(find.textContaining('1/3 giao dịch trong kỳ'), findsOneWidget);
        // Two pending rows offer the mark-cleared action; the cleared one
        // offers undo.
        expect(find.text('Đánh dấu đã khớp'), findsNWidgets(2));
        expect(find.text('Bỏ đánh dấu'), findsOneWidget);

        await t.ensureVisible(find.text('Đánh dấu đã khớp').first);
        await t.tap(find.text('Đánh dấu đã khớp').first);
        await t.pumpAndSettle();
        expect(gotEntry, 'e2');
        expect(gotState, EntryReconciliationState.cleared);
        expect(loads, 2); // canonical re-read after the write
      },
    );

    testWidgets('zero diff completes through the review dialog', (t) async {
      var completed = 0;
      final openData = ReconciliationStateData(
        featureAvailable: true,
        rows: [entryRow('e1', 't1', state: EntryReconciliationState.cleared)],
        sessions: [
          session(
            statementBalance: -45000,
            clearedBalance: -45000,
            difference: 0,
            pending: 0,
            clearedCount: 1,
            reconciledCount: 0,
          ),
        ],
      );
      bigSurface(t);
      await t.pumpWidget(
        page(
          state: openData,
          ledger: [tx('t1', TransactionKind.expense, 45000, '2026-10-12')],
          actions: ReconciliationActions(
            start:
                ({required statementDate, required statementBalance}) async {},
            setEntryState: ({required entryId, required state}) async {},
            complete:
                ({
                  required reconciliationId,
                  adjustmentCategoryId,
                  adjustmentPayee,
                }) async {
                  completed++;
                  expect(reconciliationId, 'r1');
                  expect(adjustmentCategoryId, isNull);
                },
            reopen: (id) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.ensureVisible(find.text('Hoàn tất đối soát'));
      await t.tap(find.text('Hoàn tất đối soát'));
      await t.pumpAndSettle();
      expect(find.text('Hoàn tất kỳ đối soát?'), findsOneWidget);
      await t.tap(find.text('Hoàn tất đối soát').last);
      await t.pumpAndSettle();
      expect(completed, 1);
    });

    testWidgets(
      'a nonzero diff demands an adjustment category of the forced kind',
      (t) async {
        String? gotCategory;
        String? gotPayee;
        final openData = ReconciliationStateData(
          featureAvailable: true,
          rows: [entryRow('e1', 't1', state: EntryReconciliationState.cleared)],
          sessions: [
            session(
              statementBalance: 50000,
              clearedBalance: -45000,
              difference: 95000, // statement above ledger → income adj.
              pending: 0,
              clearedCount: 1,
              reconciledCount: 0,
            ),
          ],
        );
        bigSurface(t);
        await t.pumpWidget(
          page(
            state: openData,
            ledger: [tx('t1', TransactionKind.expense, 45000, '2026-10-12')],
            categories: const [
              Category(
                id: 'k-exp',
                name: 'Chi điều chỉnh',
                kind: TransactionKind.expense,
              ),
              Category(
                id: 'k-inc',
                name: 'Thu điều chỉnh',
                kind: TransactionKind.income,
              ),
            ],
            actions: ReconciliationActions(
              start:
                  ({
                    required statementDate,
                    required statementBalance,
                  }) async {},
              setEntryState: ({required entryId, required state}) async {},
              complete:
                  ({
                    required reconciliationId,
                    adjustmentCategoryId,
                    adjustmentPayee,
                  }) async {
                    gotCategory = adjustmentCategoryId;
                    gotPayee = adjustmentPayee;
                  },
              reopen: (id) async {},
            ),
          ),
        );
        await t.pumpAndSettle();
        await t.ensureVisible(find.text('Hoàn tất đối soát'));
        await t.tap(find.text('Hoàn tất đối soát'));
        await t.pumpAndSettle();

        expect(find.text('Hoàn tất bằng khoản điều chỉnh?'), findsOneWidget);
        expect(
          find.textContaining('Sẽ tạo khoản điều chỉnh thu'),
          findsOneWidget,
        );
        // Confirm stays disabled until a category is picked.
        final disabled = t.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Hoàn tất với điều chỉnh'),
        );
        expect(disabled.onPressed, isNull);

        await t.tap(find.byType(DropdownButtonFormField<String>));
        await t.pumpAndSettle();
        // Only income-kind categories are offered for a positive diff.
        expect(find.text('Chi điều chỉnh'), findsNothing);
        await t.tap(find.text('Thu điều chỉnh').last);
        await t.pumpAndSettle();
        await t.enterText(
          find.widgetWithText(TextField, 'Đối tác (không bắt buộc)'),
          'Ngân hàng',
        );
        await t.pump();
        await t.tap(find.text('Hoàn tất với điều chỉnh'));
        await t.pumpAndSettle();
        expect(gotCategory, 'k-inc');
        expect(gotPayee, 'Ngân hàng');
      },
    );

    testWidgets('a failed write surfaces its mapped message', (t) async {
      final openData = ReconciliationStateData(
        featureAvailable: true,
        rows: [entryRow('e1', 't1')],
        sessions: [
          session(
            statementBalance: 0,
            clearedBalance: 0,
            difference: 0,
            pending: 1,
            clearedCount: 0,
            reconciledCount: 0,
          ),
        ],
      );
      bigSurface(t);
      await t.pumpWidget(
        page(
          state: openData,
          ledger: [tx('t1', TransactionKind.expense, 45000, '2026-10-12')],
          actions: ReconciliationActions(
            start:
                ({required statementDate, required statementBalance}) async {},
            setEntryState: ({required entryId, required state}) async {
              throw Exception('entry_reconciled');
            },
            complete:
                ({
                  required reconciliationId,
                  adjustmentCategoryId,
                  adjustmentPayee,
                }) async {},
            reopen: (id) async {},
          ),
        ),
      );
      await t.pumpAndSettle();
      await t.ensureVisible(find.text('Đánh dấu đã khớp'));
      await t.tap(find.text('Đánh dấu đã khớp'));
      await t.pumpAndSettle();
      expect(
        find.text('Giao dịch đã đối soát nên không thể đổi tại đây.'),
        findsOneWidget,
      );
    });

    testWidgets('history rows gate reopen to the latest completed', (t) async {
      var reopened = 0;
      final data = ReconciliationStateData(
        featureAvailable: true,
        rows: const [],
        sessions: [
          session(
            id: 'r1',
            statementDate: '2026-10-13',
            status: ReconciliationStatus.completed,
            calculated: 100,
            clearedBalance: 100,
            difference: 0,
            pending: 0,
            clearedCount: 0,
            reconciledCount: 3,
            completedAt: '2026-10-13T09:00:00Z',
          ),
          session(
            id: 'r0',
            statementDate: '2026-09-30',
            status: ReconciliationStatus.completed,
            calculated: 50,
            clearedBalance: 50,
            difference: 0,
            pending: 0,
            clearedCount: 0,
            reconciledCount: 2,
            completedAt: '2026-09-30T09:00:00Z',
          ),
        ],
      );
      bigSurface(t);
      await t.pumpWidget(
        page(
          state: data,
          actions: ReconciliationActions(
            start:
                ({required statementDate, required statementBalance}) async {},
            setEntryState: ({required entryId, required state}) async {},
            complete:
                ({
                  required reconciliationId,
                  adjustmentCategoryId,
                  adjustmentPayee,
                }) async {},
            reopen: (id) async {
              reopened++;
              expect(id, 'r1');
            },
          ),
        ),
      );
      await t.pumpAndSettle();
      final buttons = find.text('Mở lại kỳ gần nhất');
      expect(buttons, findsNWidgets(2));
      // TextButton.icon builds a private subclass — match by `is`.
      final first = t.widget<TextButton>(
        find.ancestor(
          of: buttons.first,
          matching: find.byWidgetPredicate((w) => w is TextButton),
        ),
      );
      final second = t.widget<TextButton>(
        find.ancestor(
          of: buttons.last,
          matching: find.byWidgetPredicate((w) => w is TextButton),
        ),
      );
      // Newest period (rendered first) is reopenable; the older one is not.
      expect(first.onPressed, isNotNull);
      expect(second.onPressed, isNull);

      await t.ensureVisible(buttons.first);
      await t.tap(buttons.first);
      await t.pumpAndSettle();
      await t.tap(find.text('Mở lại'));
      await t.pumpAndSettle();
      expect(reopened, 1);
    });
  });

  group('register reconciliation strip', () {
    testWidgets('shows the state line and routes taps to the workspace seam', (
      t,
    ) async {
      var opened = 0;
      bigSurface(t);
      await t.pumpWidget(
        MaterialApp(
          home: AccountRegisterPage(
            account: account,
            loadPage: (q, {offset = 0}) async =>
                const TransactionPage([], hasMore: false),
            loadReconciliation: () async => ReconciliationStateData(
              featureAvailable: true,
              rows: const [],
              sessions: [
                session(
                  status: ReconciliationStatus.completed,
                  statementDate: '2026-09-30',
                  completedAt: '2026-09-30T09:00:00Z',
                ),
              ],
            ),
            onOpenReconciliation: () async {
              opened++;
            },
          ),
        ),
      );
      await t.pumpAndSettle();

      expect(find.text('Đã đối soát đến 30/09/2026'), findsOneWidget);
      await t.tap(find.text('Đối soát'));
      await t.pumpAndSettle();
      expect(opened, 1);
    });

    testWidgets('hidden entirely when the seam is absent (demo)', (t) async {
      bigSurface(t);
      await t.pumpWidget(
        MaterialApp(
          home: AccountRegisterPage(
            account: account,
            loadPage: (q, {offset = 0}) async =>
                const TransactionPage([], hasMore: false),
          ),
        ),
      );
      await t.pumpAndSettle();
      expect(find.text('Đối soát'), findsNothing);
      expect(find.byIcon(Icons.fact_check_outlined), findsNothing);
    });
  });
}
