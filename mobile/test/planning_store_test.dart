import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/models.dart';

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

/// Scripted fake transport: matches requests in order, records what it saw.
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

/// Signed-in store over the fake transport — every test queues
/// [sign-in, get-session(jwt), <the request under test>].
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

  NeonRequest get lastRpc => t.requests.last;

  Map<String, dynamic> get rpcBody => lastRpc.body as Map<String, dynamic>;
}

void main() {
  group('RealStore planning writes', () {
    test(
      'upsertBudget edit posts the conflict pair plus expected_updated_at',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, 'b-1'));

        await h.store.upsertBudget(
          categoryId: 'cat-food',
          monthStart: '2026-10-01',
          limitMinor: 2500000,
          expectedUpdatedAt: '2026-10-05T09:00:00Z',
        );

        final req = h.lastRpc;
        expect(req.url.path, '/neondb/rest/v1/rpc/upsert_monthly_budget');
        expect(h.rpcBody, {
          'p_category_id': 'cat-food',
          'p_month_start': '2026-10-01',
          'p_limit_minor': 2500000,
          'p_expected_updated_at': '2026-10-05T09:00:00Z',
        });
      },
    );

    test(
      'a weekly upsert adds p_period_kind; monthly keeps the legacy body',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, 'bw-1'));

        await h.store.upsertBudget(
          categoryId: 'cat-food',
          monthStart: '2026-10-12', // a Monday — the weekly anchor
          limitMinor: 600000,
          period: BudgetPeriod.weekly,
        );

        expect(h.rpcBody, {
          'p_category_id': 'cat-food',
          'p_month_start': '2026-10-12',
          'p_limit_minor': 600000,
          'p_expected_updated_at': null,
          'p_period_kind': 'weekly',
        });
      },
    );

    test(
      'deleteBudget throws budget_not_found when the RPC returns false',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, false));

        await expectLater(
          h.store.deleteBudget('b-ghost'),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('budget_not_found'),
            ),
          ),
        );
        expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/delete_monthly_budget');
        expect(h.rpcBody, {'p_budget_id': 'b-ghost'});
      },
    );

    test('upsertCommitment create sends null id + null version', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'cm-9'));

      await h.store.upsertCommitment(
        name: 'Tiền nhà',
        amountMinor: 3500000,
        dueDay: 5,
        accountId: 'acc-1',
        categoryId: 'cat-1',
      );

      expect(
        h.lastRpc.url.path,
        '/neondb/rest/v1/rpc/upsert_recurring_commitment',
      );
      expect(h.rpcBody, {
        'p_commitment_id': null,
        'p_name': 'Tiền nhà',
        'p_amount_minor': 3500000,
        'p_due_day': 5,
        'p_account_id': 'acc-1',
        'p_category_id': 'cat-1',
        'p_expected_updated_at': null,
      });
    });

    test('upsertCommitment edit sends the row id + its version', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'cm-2'));

      await h.store.upsertCommitment(
        commitmentId: 'cm-2',
        name: 'Internet',
        amountMinor: 300000,
        dueDay: 15,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        expectedUpdatedAt: '2026-10-04T10:00:00Z',
      );

      expect(h.rpcBody['p_commitment_id'], 'cm-2');
      expect(h.rpcBody['p_expected_updated_at'], '2026-10-04T10:00:00Z');
      expect(h.rpcBody['p_amount_minor'], 300000);
    });

    test('upsertCommitment monthly omits p_interval_months — the '
        'pre-migration RPC signature stays callable', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'cm-9'));

      await h.store.upsertCommitment(
        name: 'Tiền nhà',
        amountMinor: 3500000,
        dueDay: 5,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        intervalMonths: 1,
      );

      expect(h.rpcBody.containsKey('p_interval_months'), isFalse);
    });

    test('upsertCommitment non-monthly sends p_interval_months', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'cm-9'));

      await h.store.upsertCommitment(
        name: 'Bảo hiểm xe',
        amountMinor: 2400000,
        dueDay: 10,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        intervalMonths: 12,
      );

      expect(h.rpcBody['p_interval_months'], 12);
    });

    test('undoCommitmentPayment posts commitment id + month', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));

      await h.store.undoCommitmentPayment('cm-1', '2026-10-01');

      expect(
        h.lastRpc.url.path,
        '/neondb/rest/v1/rpc/undo_recurring_commitment_payment',
      );
      expect(h.rpcBody, {
        'p_commitment_id': 'cm-1',
        'p_month_start': '2026-10-01',
      });
    });

    test('undoCommitmentPayment throws when nothing was undone', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, false));

      expect(
        () => h.store.undoCommitmentPayment('cm-1', '2026-10-01'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('nothing_to_undo'),
          ),
        ),
      );
    });

    test('upsertIncomeTemplate edit posts the template id + version', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'inc-1'));

      await h.store.upsertIncomeTemplate(
        templateId: 'inc-1',
        name: 'Lương',
        amountMinor: 15000000,
        dueDay: 5,
        accountId: 'acc-1',
        categoryId: 'cat-2',
        expectedUpdatedAt: '2026-10-02T08:00:00Z',
      );

      expect(
        h.lastRpc.url.path,
        '/neondb/rest/v1/rpc/upsert_recurring_income_template',
      );
      expect(h.rpcBody, {
        'p_template_id': 'inc-1',
        'p_name': 'Lương',
        'p_amount_minor': 15000000,
        'p_due_day': 5,
        'p_account_id': 'acc-1',
        'p_category_id': 'cat-2',
        'p_expected_updated_at': '2026-10-02T08:00:00Z',
      });
    });

    test('upsertGoal edit posts goal id, deadline and version', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'g-1'));

      await h.store.upsertGoal(
        goalId: 'g-1',
        name: 'Quỹ khẩn cấp',
        targetMinor: 20000000,
        deadline: '2027-03-01',
        expectedUpdatedAt: '2026-10-01T07:00:00Z',
      );

      expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/upsert_savings_goal');
      expect(h.rpcBody, {
        'p_goal_id': 'g-1',
        'p_name': 'Quỹ khẩn cấp',
        'p_target_minor': 20000000,
        'p_deadline': '2027-03-01',
        'p_expected_updated_at': '2026-10-01T07:00:00Z',
      });
    });

    test('adjustGoal withdraw posts a negative amount', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 7500000));

      await h.store.adjustGoal('g-1', -1000000);

      expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/adjust_savings_goal');
      expect(h.rpcBody, {'p_goal_id': 'g-1', 'p_amount_minor': -1000000});
    });

    test('setGoalArchived false result throws goal_archive_blocked', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, false));

      expect(
        () => h.store.setGoalArchived('g-1', true),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('goal_archive_blocked'),
          ),
        ),
      );
    });

    test('setCommitmentArchived posts id + flag both directions', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));
      h.t.queue.add(FakeTransport.json(200, true));

      await h.store.setCommitmentArchived('cm-1', true);
      expect(h.rpcBody, {'p_commitment_id': 'cm-1', 'p_archived': true});
      await h.store.setCommitmentArchived('cm-1', false);
      expect(h.rpcBody, {'p_commitment_id': 'cm-1', 'p_archived': false});
    });

    test('payCommitment carries the caller-supplied idempotency key', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'tx-1'));

      await h.store.payCommitment(
        commitmentId: 'cm-1',
        monthStart: '2026-10-01',
        paidOn: '2026-10-14',
        idempotencyKey: '11111111-2222-4333-8444-555555555555',
      );

      expect(
        h.lastRpc.url.path,
        '/neondb/rest/v1/rpc/pay_recurring_commitment',
      );
      expect(h.rpcBody, {
        'p_commitment_id': 'cm-1',
        'p_month_start': '2026-10-01',
        'p_paid_on': '2026-10-14',
        'p_idempotency_key': '11111111-2222-4333-8444-555555555555',
      });
    });

    test('receiveIncome carries the caller-supplied idempotency key', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'tx-9'));

      await h.store.receiveIncome(
        templateId: 'inc-1',
        monthStart: '2026-10-01',
        receivedOn: '2026-10-05',
        idempotencyKey: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      );

      expect(
        h.lastRpc.url.path,
        '/neondb/rest/v1/rpc/record_recurring_income_template',
      );
      expect(h.rpcBody, {
        'p_template_id': 'inc-1',
        'p_month_start': '2026-10-01',
        'p_received_on': '2026-10-05',
        'p_idempotency_key': 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      });
    });
  });

  group('OperationIdempotencyKeys', () {
    test('keyFor replays the same key across attempts on one scope', () {
      // audit P1-4: a retry after a lost response must reuse the SAME
      // key so the server's (user, key) dedupe fires — a fresh key per
      // attempt was the double-write bug.
      final keys = OperationIdempotencyKeys();
      final scope = 'pay_commitment:cm-1:2026-10-01';
      final k1 = keys.keyFor(scope);
      expect(keys.keyFor(scope), k1);
      expect(keys.keyFor(scope), k1);
      expect(k1, matches(RegExp(r'^[0-9a-f-]{36}$')));
    });

    test('separate scopes never share a key', () {
      final keys = OperationIdempotencyKeys();
      final a = keys.keyFor('pay_commitment:cm-1:2026-10-01');
      final b = keys.keyFor('pay_commitment:cm-2:2026-10-01');
      final c = keys.keyFor('receive_income:inc-1:2026-10-01');
      expect({a, b, c}.length, 3);
    });

    test('release lets a deliberate new action mint a fresh key', () {
      // undo → pay again is a new intent, not a replay — the soft-deleted
      // row still carries the old key, so reusing it would collide.
      final keys = OperationIdempotencyKeys();
      const scope = 'pay_commitment:cm-1:2026-10-01';
      final first = keys.keyFor(scope);
      keys.release(scope);
      final second = keys.keyFor(scope);
      expect(second, isNot(first));
    });
  });

  group('RealStore planning reads', () {
    test('loadBudgets selects updated_at for the version token', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'b-1',
            'category_id': 'cat-food',
            'category_name': 'Ăn uống',
            'month_start': '2026-10-01',
            'limit_minor': 2000000,
            'spent_minor': 45000,
            'updated_at': '2026-10-05T09:00:00Z',
          },
        ]),
      );

      final budgets = await h.store.loadBudgets('2026-10-01');

      final req = h.lastRpc;
      expect(req.url.path, '/neondb/rest/v1/budget_progress');
      expect(req.url.queryParameters['select'], contains('updated_at'));
      expect(budgets.single.updatedAt, '2026-10-05T09:00:00Z');
    });

    test('loadBudgetsInRange sends the rollover window range filter', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'b-1',
            'category_id': 'cat-food',
            'category_name': 'Ăn uống',
            'month_start': '2026-10-01',
            'limit_minor': 2000000,
            'spent_minor': 45000,
            'updated_at': '2026-10-05T09:00:00Z',
          },
          {
            'id': 'b-0',
            'category_id': 'cat-food',
            'category_name': 'Ăn uống',
            'month_start': '2026-09-01',
            'limit_minor': 2000000,
            'spent_minor': 1700000,
            'updated_at': null,
          },
        ]),
      );

      final rows = await h.store.loadBudgetsInRange('2025-10-01', '2026-10-01');

      final req = h.lastRpc;
      expect(req.url.path, '/neondb/rest/v1/budget_progress');
      // The same bounded window the web workspace reads —
      // month_start.gte/lte, never an unfiltered history pull.
      expect(
        req.url.queryParameters['and'],
        '(month_start.gte.2025-10-01,month_start.lte.2026-10-01)',
      );
      expect(rows.length, 2);
      expect(rows.last.monthStart, '2026-09-01');
      expect(rows.last.spentMinor, 1700000);
    });

    test('loadBudgets reads period_kind and maps it to the row', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'bw-1',
            'category_id': 'cat-food',
            'category_name': 'Ăn uống',
            'month_start': '2026-10-12',
            'limit_minor': 600000,
            'spent_minor': 210000,
            'updated_at': null,
            'period_kind': 'weekly',
          },
        ]),
      );

      final budgets = await h.store.loadBudgets('2026-10-12');

      final req = h.lastRpc;
      expect(req.url.queryParameters['select'], contains('period_kind'));
      expect(budgets.single.period, BudgetPeriod.weekly);
      expect(budgets.single.monthStart, '2026-10-12');
    });

    test('a pre-period_kind server retries without the column and reads '
        'monthly — the column default is the truth, not a guess', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(400, {
          'code': '42703',
          'message': 'column budget_progress.period_kind does not exist',
        }),
      );
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'b-1',
            'category_id': 'cat-food',
            'category_name': 'Ăn uống',
            'month_start': '2026-10-01',
            'limit_minor': 2000000,
            'spent_minor': 45000,
            'updated_at': null,
          },
        ]),
      );

      final budgets = await h.store.loadBudgets('2026-10-01');

      // Two selects hit the wire — the period select failed, the
      // legacy select retried.
      final selects = h.t.requests
          .where((r) => r.url.path.endsWith('/budget_progress'))
          .toList();
      expect(selects, hasLength(2));
      expect(
        selects.first.url.queryParameters['select'],
        contains('period_kind'),
      );
      expect(
        selects.last.url.queryParameters['select'],
        isNot(contains('period_kind')),
      );
      expect(budgets.single.period, BudgetPeriod.monthly);
    });

    test(
      'loadCommitments maps the paid amount through the occurrence join',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(
          FakeTransport.json(200, [
            {
              'id': 'cm-1',
              'name': 'Tiền nhà',
              'amount_minor': 3500000,
              'due_day': 5,
              'account_id': 'a1',
              'account_name': 'Bank',
              'category_id': 'c1',
              'category_name': 'Hóa đơn',
              'is_archived': false,
              'updated_at': '2026-10-03T00:00:00Z',
            },
            {
              'id': 'cm-2',
              'name': 'Internet',
              'amount_minor': 300000,
              'due_day': 15,
              'account_id': 'a1',
              'account_name': 'Bank',
              'category_id': 'c1',
              'category_name': 'Hóa đơn',
              'is_archived': false,
              'updated_at': '2026-10-03T00:00:00Z',
            },
          ]),
        );
        h.t.queue.add(
          FakeTransport.json(200, [
            {
              'commitment_id': 'cm-1',
              'month_start': '2026-10-01',
              'transaction_id': 'tx-pay-1',
            },
          ]),
        );
        // The payment transaction's recorded amount — cm-1 declared
        // 3.500.000 but the ledger row says 3.800.000.
        h.t.queue.add(
          FakeTransport.json(200, [
            {'id': 'tx-pay-1', 'amount_minor': 3800000},
          ]),
        );

        final commitments = await h.store.loadCommitments('2026-10-01');

        // The amount join is a second read on transaction_feed, filtered
        // to the occurrence's transaction ids.
        final amountReq = h.lastRpc;
        expect(amountReq.url.path, '/neondb/rest/v1/transaction_feed');
        expect(amountReq.url.queryParameters['id'], 'in.(tx-pay-1)');
        final paid = commitments.firstWhere((c) => c.id == 'cm-1');
        expect(paid.paidThisMonth, isTrue);
        expect(paid.paidAmountMinor, 3800000);
        final unpaid = commitments.firstWhere((c) => c.id == 'cm-2');
        expect(unpaid.paidThisMonth, isFalse);
        expect(unpaid.paidAmountMinor, isNull);
      },
    );

    test(
      'loadCommitments degrades to amount-unknown when the join fails',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(
          FakeTransport.json(200, [
            {
              'id': 'cm-1',
              'name': 'Tiền nhà',
              'amount_minor': 3500000,
              'due_day': 5,
              'account_id': 'a1',
              'account_name': 'Bank',
              'category_id': 'c1',
              'category_name': 'Hóa đơn',
              'is_archived': false,
              'updated_at': null,
            },
          ]),
        );
        h.t.queue.add(
          FakeTransport.json(200, [
            {
              'commitment_id': 'cm-1',
              'month_start': '2026-10-01',
              'transaction_id': 'tx-pay-1',
            },
          ]),
        );
        h.t.queue.add(FakeTransport.json(500, {'message': 'boom'}));

        final commitments = await h.store.loadCommitments('2026-10-01');

        // A failed amount read must not fail the whole list — "paid,
        // amount unknown" beats no commitment list at all.
        expect(commitments.single.paidThisMonth, isTrue);
        expect(commitments.single.paidAmountMinor, isNull);
      },
    );

    test('loadCommitments maps interval + derives lastPaidMonth from the '
        'newest occurrence row', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'cm-1',
            'name': 'Bảo hiểm xe',
            'amount_minor': 2400000,
            'due_day': 10,
            'account_id': 'a1',
            'account_name': 'Bank',
            'category_id': 'c1',
            'category_name': 'Hóa đơn',
            'is_archived': false,
            'updated_at': '2026-10-03T00:00:00Z',
            'interval_months': 12,
          },
        ]),
      );
      h.t.queue.add(
        FakeTransport.json(200, [
          // Newest first — the first row is the cycle anchor.
          {'commitment_id': 'cm-1', 'month_start': '2026-02-01'},
          {'commitment_id': 'cm-1', 'month_start': '2025-02-01'},
        ]),
      );

      final commitments = await h.store.loadCommitments('2026-10-01');

      // The feed read asks for interval_months first; the occurrence
      // read is newest-first and unfiltered by month.
      final feedReq = h.t.requests[h.t.requests.length - 2];
      expect(
        feedReq.url.queryParameters['select'],
        contains('interval_months'),
      );
      final occReq = h.lastRpc;
      expect(occReq.url.path, '/neondb/rest/v1/commitment_occurrences');
      expect(occReq.url.queryParameters['order'], 'month_start.desc');
      expect(occReq.url.queryParameters.containsKey('month_start'), isFalse);
      final c = commitments.single;
      expect(c.intervalMonths, 12);
      expect(c.lastPaidMonth, '2026-02-01');
      // The occurrence is a PAST month — not paid this month.
      expect(c.paidThisMonth, isFalse);
    });

    test(
      'loadCommitments retries without interval_months when the column '
      'is missing — pre-migration rows read monthly, never invented',
      () async {
        final h = Harness();
        await h.signIn();
        // First select (with interval_months) fails like PostgREST does
        // on an unknown column; the retry without it succeeds.
        h.t.queue.add(
          FakeTransport.json(400, {
            'code': '42703',
            'message': 'column interval_months does not exist',
          }),
        );
        h.t.queue.add(
          FakeTransport.json(200, [
            {
              'id': 'cm-1',
              'name': 'Tiền nhà',
              'amount_minor': 3500000,
              'due_day': 5,
              'account_id': 'a1',
              'account_name': 'Bank',
              'category_id': 'c1',
              'category_name': 'Hóa đơn',
              'is_archived': false,
              'updated_at': null,
            },
          ]),
        );
        h.t.queue.add(FakeTransport.json(200, []));

        final commitments = await h.store.loadCommitments('2026-10-01');

        // Two feed reads — the fallback's select lacks the new column.
        final feedReqs = h.t.requests
            .where((r) => r.url.path.endsWith('recurring_commitment_feed'))
            .toList();
        expect(feedReqs.length, 2);
        expect(
          feedReqs[0].url.queryParameters['select'],
          contains('interval_months'),
        );
        expect(
          feedReqs[1].url.queryParameters['select'],
          isNot(contains('interval_months')),
        );
        expect(commitments.single.intervalMonths, 1);
        expect(commitments.single.lastPaidMonth, isNull);
      },
    );

    test('loadCommitments keeps archived rows and maps updated_at', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'cm-1',
            'name': 'Tiền nhà',
            'amount_minor': 3500000,
            'due_day': 5,
            'account_id': 'a1',
            'account_name': 'Bank',
            'category_id': 'c1',
            'category_name': 'Hóa đơn',
            'is_archived': false,
            'updated_at': '2026-10-03T00:00:00Z',
          },
          {
            'id': 'cm-2',
            'name': 'Netflix cũ',
            'amount_minor': 100000,
            'due_day': 1,
            'account_id': 'a1',
            'account_name': 'Bank',
            'category_id': 'c1',
            'category_name': 'Hóa đơn',
            'is_archived': true,
            'updated_at': '2026-09-01T00:00:00Z',
          },
        ]),
      );
      h.t.queue.add(FakeTransport.json(200, []));

      final commitments = await h.store.loadCommitments('2026-10-01');

      final req = h.t.requests[h.t.requests.length - 2];
      expect(req.url.path, '/neondb/rest/v1/recurring_commitment_feed');
      expect(req.url.queryParameters['select'], contains('updated_at'));
      // No is_archived filter — the page splits active/archived itself.
      expect(req.url.queryParameters.containsKey('is_archived'), isFalse);
      expect(commitments.length, 2);
      expect(commitments.last.isArchived, isTrue);
      expect(commitments.first.updatedAt, '2026-10-03T00:00:00Z');
    });

    test('loadIncomeTemplates maps archive + version columns', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'inc-1',
            'name': 'Lương',
            'amount_minor': 15000000,
            'due_day': 5,
            'account_id': 'a1',
            'account_name': 'Bank',
            'category_id': 'c2',
            'category_name': 'Lương',
            'is_archived': true,
            'updated_at': '2026-10-02T00:00:00Z',
          },
        ]),
      );
      h.t.queue.add(FakeTransport.json(200, []));

      final incomes = await h.store.loadIncomeTemplates('2026-10-01');

      final req = h.t.requests[h.t.requests.length - 2];
      expect(req.url.path, '/neondb/rest/v1/recurring_income_template_feed');
      expect(req.url.queryParameters['select'], contains('updated_at'));
      expect(req.url.queryParameters.containsKey('is_archived'), isFalse);
      expect(incomes.single.isArchived, isTrue);
      expect(incomes.single.updatedAt, '2026-10-02T00:00:00Z');
    });

    test('loadGoals keeps archived rows and maps updated_at', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'g-1',
            'name': 'Quỹ khẩn cấp',
            'target_minor': 20000000,
            'allocated_minor': 8500000,
            'deadline': '2027-03-01',
            'is_archived': false,
            'updated_at': '2026-10-01T00:00:00Z',
          },
          {
            'id': 'g-2',
            'name': 'Xe cũ',
            'target_minor': 5000000,
            'allocated_minor': 0,
            'deadline': null,
            'is_archived': true,
            'updated_at': '2026-09-15T00:00:00Z',
          },
        ]),
      );

      final goals = await h.store.loadGoals();

      final req = h.lastRpc;
      expect(req.url.path, '/neondb/rest/v1/savings_goals');
      expect(req.url.queryParameters['select'], contains('updated_at'));
      expect(req.url.queryParameters.containsKey('is_archived'), isFalse);
      expect(goals.length, 2);
      expect(goals.last.isArchived, isTrue);
      expect(goals.first.updatedAt, '2026-10-01T00:00:00Z');
    });
  });

  group('D13 report exclusions', () {
    Map<String, Object?> feedRow({bool excluded = false}) => {
      'id': 'tx-1',
      'kind': 'expense',
      'note': 'Cà phê',
      'occurred_on': '2026-10-14',
      'amount_minor': 25000,
      'account_id': 'a1',
      'account_name': 'Ví',
      'category_id': 'c1',
      'category_name': 'Ăn uống',
      'destination_account_id': null,
      'destination_account_name': null,
      'payee': null,
      'updated_at': '2026-10-14T00:00:00Z',
      'split_lines': null,
      'excluded_from_reports': excluded,
    };

    test('loadTransactions maps excluded_from_reports onto the row', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, [feedRow(excluded: true)]));
      // The review-status join — no flagged rows here.
      h.t.queue.add(FakeTransport.json(200, []));

      final txs = await h.store.loadTransactions();

      final req = h.t.requests.firstWhere(
        (r) => r.url.path.endsWith('/transaction_feed'),
      );
      expect(
        req.url.queryParameters['select'],
        contains('excluded_from_reports'),
      );
      expect(txs.single.excludedFromReports, isTrue);
    });

    test('a pre-20261016200000 server retries without the column — '
        'unflagged by definition is the column default, not a guess', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(400, {
          'code': '42703',
          'message':
              'column transaction_feed.excluded_from_reports does not exist',
        }),
      );
      final row = feedRow()..remove('excluded_from_reports');
      h.t.queue.add(FakeTransport.json(200, [row]));
      h.t.queue.add(FakeTransport.json(200, []));

      final txs = await h.store.loadTransactions();

      final selects = h.t.requests
          .where((r) => r.url.path.endsWith('/transaction_feed'))
          .toList();
      expect(selects, hasLength(2));
      expect(
        selects.first.url.queryParameters['select'],
        contains('excluded_from_reports'),
      );
      expect(
        selects.last.url.queryParameters['select'],
        isNot(contains('excluded_from_reports')),
      );
      expect(txs.single.excludedFromReports, isFalse);
    });

    test(
      'a flipped flag rides the update body; an untouched one is omitted',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, 'tx-1'));
        h.t.queue.add(FakeTransport.json(200, 'tx-2'));

        await h.store.updateTransaction(
          transactionId: 'tx-1',
          accountId: 'a1',
          categoryId: 'c1',
          kind: TransactionKind.expense,
          amount: 25000,
          occurredOn: '2026-10-14',
          expectedUpdatedAt: '2026-10-14T00:00:00Z',
          excludedFromReports: true,
        );
        await h.store.updateTransaction(
          transactionId: 'tx-2',
          accountId: 'a1',
          categoryId: 'c1',
          kind: TransactionKind.expense,
          amount: 40000,
          occurredOn: '2026-10-14',
        );

        final flagged = h.t.requests.firstWhere(
          (r) => r.body is Map && (r.body as Map)['p_transaction_id'] == 'tx-1',
        );
        expect((flagged.body as Map)['p_excluded_from_reports'], true);
        final plain = h.t.requests.firstWhere(
          (r) => r.body is Map && (r.body as Map)['p_transaction_id'] == 'tx-2',
        );
        // The key stays absent entirely — a pre-migration server still
        // answers the legacy 11-param body.
        expect(
          (plain.body as Map).containsKey('p_excluded_from_reports'),
          isFalse,
        );
      },
    );
  });
}
