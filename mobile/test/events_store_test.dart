import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/data/neon/real_store.dart';
import 'package:moneyflow/domain/events.dart';

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
  group('RealStore event reads', () {
    test('loadEventBudgets reads the progress view and maps the row', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          {
            'id': 'e1',
            'name': 'Tết 2027',
            'start_date': '2027-02-05',
            'end_date': '2027-02-12',
            // bigint may arrive as a JSON string — same normalization
            // the budget_progress mapper applies.
            'limit_minor': '20000000',
            'spent_minor': 8000000,
            'category_ids': ['c1', 'c2'],
            'updated_at': '2026-10-16T05:00:00Z',
          },
          {
            'id': 'e2',
            'name': 'Đám cưới em',
            'start_date': '2027-03-01',
            'end_date': '2027-03-01',
            'limit_minor': 5000000,
            'spent_minor': '0',
            // An unscoped event serializes as the empty array.
            'category_ids': <String>[],
            'updated_at': null,
          },
        ]),
      );

      final events = await h.store.loadEventBudgets();

      final req = h.lastRpc;
      expect(req.url.path, '/neondb/rest/v1/event_budget_progress');
      expect(
        req.url.queryParameters['select'],
        'id,name,start_date,end_date,limit_minor,spent_minor,category_ids,'
        'updated_at',
      );
      expect(events.length, 2);
      final tet = events.first;
      expect(tet.name, 'Tết 2027');
      expect(tet.startDate, '2027-02-05');
      expect(tet.endDate, '2027-02-12');
      expect(tet.limitMinor, 20000000);
      expect(tet.spentMinor, 8000000);
      expect(tet.categoryIds, ['c1', 'c2']);
      expect(tet.isScoped, isTrue);
      expect(tet.updatedAt, '2026-10-16T05:00:00Z');
      final wedding = events.last;
      expect(wedding.isScoped, isFalse);
      expect(wedding.spentMinor, 0);
    });
  });

  group('RealStore event writes', () {
    test('createEventBudget posts the draft fields and minted key', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'e-9'));

      final id = await h.store.createEventBudget(
        const EventDraft(
          name: 'Tết 2027',
          startDate: '2027-02-05',
          endDate: '2027-02-12',
          limitMinor: 20000000,
          categoryIds: ['c1', 'c2'],
          idempotencyKey: '11111111-2222-4333-8444-555555555555',
        ),
      );

      expect(id, 'e-9');
      expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/create_event_budget');
      expect(h.rpcBody, {
        'p_name': 'Tết 2027',
        'p_start_date': '2027-02-05',
        'p_end_date': '2027-02-12',
        'p_limit_minor': 20000000,
        'p_category_ids': ['c1', 'c2'],
        'p_idempotency_key': '11111111-2222-4333-8444-555555555555',
      });
    });

    test('unscoped create sends the empty scope array, never null', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, 'e-9'));

      await h.store.createEventBudget(
        const EventDraft(
          name: 'Đà Lạt 3 ngày',
          startDate: '2027-04-30',
          endDate: '2027-05-02',
          limitMinor: 6000000,
          idempotencyKey: 'k',
        ),
      );

      expect(h.rpcBody['p_category_ids'], isEmpty);
    });

    test('updateEventBudget pins the read it was built on', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));

      await h.store.updateEventBudget(
        eventId: 'e1',
        expectedUpdatedAt: '2026-10-16T05:00:00Z',
        draft: const EventDraft(
          name: 'Tết 2027 (sửa)',
          startDate: '2027-02-05',
          endDate: '2027-02-14',
          limitMinor: 25000000,
          categoryIds: ['c1'],
          idempotencyKey: 'unused-on-update',
        ),
      );

      expect(h.lastRpc.url.path, '/neondb/rest/v1/rpc/update_event_budget');
      expect(h.rpcBody, {
        'p_event_id': 'e1',
        'p_name': 'Tết 2027 (sửa)',
        'p_start_date': '2027-02-05',
        'p_end_date': '2027-02-14',
        'p_limit_minor': 25000000,
        'p_category_ids': ['c1'],
        'p_expected_updated_at': '2026-10-16T05:00:00Z',
      });
    });

    test(
      'updateEventBudget throws when the server refused the write',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, false));

        await expectLater(
          h.store.updateEventBudget(
            eventId: 'e-ghost',
            draft: const EventDraft(
              name: 'x',
              startDate: '2027-01-01',
              endDate: '2027-01-01',
              limitMinor: 1,
              idempotencyKey: 'k',
            ),
          ),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('event_not_found'),
            ),
          ),
        );
      },
    );

    test('deleteEventBudget soft-deletes and throws on a stale id', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, true));
      h.t.queue.add(FakeTransport.json(200, false));

      await h.store.deleteEventBudget('e1');
      expect(
        h.lastRpc.url.path,
        '/neondb/rest/v1/rpc/soft_delete_event_budget',
      );
      expect(h.rpcBody, {'p_event_id': 'e1'});

      await expectLater(
        h.store.deleteEventBudget('e-ghost'),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('event_not_found'),
          ),
        ),
      );
    });
  });
}
