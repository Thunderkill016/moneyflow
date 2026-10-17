import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/debts.dart';

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
  group('RealStore debt reads', () {
    test('loadDebts selects the row shape and skips tombstones', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'd1',
            'counterparty': 'Anh Hai',
            'direction': 'payable',
            // bigint may arrive as a JSON string — the mapper normalizes.
            'principal_minor': '2000000',
            'remaining_minor': 1500000,
            'note': 'mượn trả lương',
            'due_date': '2026-12-01',
            'state': 'open',
            'version': 3,
            'updated_at': '2026-10-16T05:00:00Z',
          },
          {
            'id': 'd2',
            'counterparty': 'Em Lan',
            'direction': 'receivable',
            'principal_minor': 300000,
            'remaining_minor': 0,
            'note': null,
            'due_date': null,
            'state': 'settled',
            'version': '2',
            'updated_at': null,
          },
        ]),
      );

      final debts = await h.store.loadDebts();

      final req = h.lastRpc;
      expect(req.url.path, '/neondb/rest/v1/debts');
      expect(req.url.queryParameters['deleted_at'], 'is.null');
      expect(debts.length, 2);
      final owe = debts.first;
      expect(owe.counterparty, 'Anh Hai');
      expect(owe.direction, DebtDirection.payable);
      expect(owe.principalMinor, 2000000);
      expect(owe.remainingMinor, 1500000);
      expect(owe.repaidMinor, 500000);
      expect(owe.dueDate, '2026-12-01');
      expect(owe.state, DebtState.open);
      expect(owe.version, 3);
      final done = debts.last;
      expect(done.direction, DebtDirection.receivable);
      expect(done.state, DebtState.settled);
      expect(done.dueDate, isNull);
    });
  });

  group('RealStore debt writes', () {
    test('createDebt posts the draft fields, no ledger side effects', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'd-9'));

      final id = await h.store.createDebt(
        const DebtDraft(
          direction: DebtDirection.payable,
          counterparty: 'Anh Hai',
          principalMinor: 2000000,
          note: 'mượn trả lương',
          dueDate: '2026-12-01',
        ),
      );

      expect(id, 'd-9');
      expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/create_debt');
      expect(h.rpcBody, {
        'p_direction': 'payable',
        'p_counterparty': 'Anh Hai',
        'p_principal_minor': 2000000,
        'p_due_date': '2026-12-01',
        'p_note': 'mượn trả lương',
      });
    });

    test(
      'applyDebtRepayment carries debt/account/category/amount/date/key',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, 'tx-42'));

        final txId = await h.store.applyDebtRepayment(
          const DebtRepayment(
            debtId: 'd1',
            amountMinor: 500000,
            accountId: 'acc-1',
            categoryId: 'cat-expense-1',
            occurredOn: '2026-10-16',
            note: 'trả một phần',
            idempotencyKey: '11111111-2222-4333-8444-555555555555',
          ),
        );

        expect(txId, 'tx-42');
        expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/apply_debt_repayment');
        expect(h.rpcBody, {
          'p_debt_id': 'd1',
          'p_account_id': 'acc-1',
          'p_category_id': 'cat-expense-1',
          'p_amount_minor': 500000,
          'p_occurred_on': '2026-10-16',
          'p_note': 'trả một phần',
          'p_idempotency_key': '11111111-2222-4333-8444-555555555555',
        });
      },
    );

    test('setDebtState posts the wire value and throws on false', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));
      h.t.queue.add(FakeTransport.json(200, false));

      await h.store.setDebtState('d1', DebtState.archived);
      expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/set_debt_state');
      expect(h.rpcBody, {'p_debt_id': 'd1', 'p_state': 'archived'});

      // A stale-read refusal (false) surfaces as an exception — the UI
      // never claims a state change that did not happen.
      await expectLater(
        h.store.setDebtState('d1', DebtState.settled),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('state_change_rejected'),
          ),
        ),
      );
    });

    test(
      'deleteDebt posts the id and throws when nothing was deleted',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, false));

        await expectLater(
          h.store.deleteDebt('d-ghost'),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('debt_not_found'),
            ),
          ),
        );
        expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/soft_delete_debt');
        expect(h.rpcBody, {'p_debt_id': 'd-ghost'});
      },
    );
  });
}
