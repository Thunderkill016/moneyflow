import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';

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
}
