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
}

const _row = {
  'id': 'c9',
  'name': 'Cà phê',
  'kind': 'expense',
  'icon': 'coffee',
  'color': 'amber',
  'is_default': false,
  'is_archived': false,
};

void main() {
  group('RealStore categories', () {
    test('loadCategories filters archived and maps the full row', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, [_row]));

      final cats = await h.store.loadCategories();

      final req = h.t.requests.last;
      expect(req.method, 'GET');
      expect(req.url.path, '/neondb/rest/v1/categories');
      expect(req.url.queryParameters['is_archived'], 'eq.false');
      expect(req.url.queryParameters['select'], contains('is_archived'));
      expect(req.url.queryParameters['select'], contains('icon'));
      final c = cats.single;
      expect(c.id, 'c9');
      expect(c.icon, 'coffee');
      expect(c.color, 'amber');
      expect(c.isDefault, isFalse);
      expect(c.isArchived, isFalse);
      expect(c.kind, TransactionKind.expense);
    });

    test('loadAllCategories keeps archived rows for the manager', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(
        FakeTransport.json(200, [
          _row,
          {..._row, 'id': 'c10', 'is_archived': true},
        ]),
      );

      final cats = await h.store.loadAllCategories();

      expect(cats.length, 2);
      expect(cats.last.isArchived, isTrue);
      final req = h.t.requests.last;
      expect(req.url.queryParameters.containsKey('is_archived'), isFalse);
    });

    test('saveCategory create POSTs the upsert RPC with p_* params', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, [_row]));

      final c = await h.store.saveCategory(
        name: 'Cà phê',
        kind: TransactionKind.expense,
        icon: 'coffee',
        color: 'amber',
      );

      expect(c.id, 'c9');
      final req = h.t.requests.last;
      expect(req.method, 'POST');
      // RPC-only write path: user_id stays server-side (auth.uid()), and
      // p_category_id absent means create.
      expect(req.url.path, '/neondb/rest/v1/rpc/upsert_financial_category');
      expect(req.body, {
        'p_name': 'Cà phê',
        'p_kind': 'expense',
        'p_icon': 'coffee',
        'p_color': 'amber',
      });
    });

    test(
      'saveCategory create leaves null icon/color to the RPC kind defaults',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(
          FakeTransport.json(200, [
            {..._row, 'kind': 'income', 'icon': 'wallet', 'color': 'green'},
          ]),
        );

        final c = await h.store.saveCategory(
          name: 'Freelance',
          kind: TransactionKind.income,
        );

        // The function coalesces nulls to wallet/green on income — the
        // same defaults the web's defaultCategoryMeta picks.
        expect(c.icon, 'wallet');
        expect(c.color, 'green');
        final body = h.t.requests.last.body as Map;
        expect(body['p_kind'], 'income');
        expect(body['p_icon'], isNull);
        expect(body['p_color'], isNull);
      },
    );

    test(
      'saveCategory update sends p_category_id and re-states the kind',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(
          FakeTransport.json(200, [
            {..._row, 'name': 'Cà phê sáng'},
          ]),
        );

        final c = await h.store.saveCategory(
          id: 'c9',
          name: 'Cà phê sáng',
          kind: TransactionKind.expense,
          icon: 'coffee',
          color: 'coral',
        );

        expect(c.name, 'Cà phê sáng');
        final req = h.t.requests.last;
        expect(req.method, 'POST');
        expect(req.url.path, '/neondb/rest/v1/rpc/upsert_financial_category');
        final body = req.body as Map;
        expect(body, {
          'p_name': 'Cà phê sáng',
          // The function requires p_kind and refuses a kind that differs
          // from the stored row (category_kind_locked) — re-stating the
          // current kind is how "kind immutable" stays honest.
          'p_kind': 'expense',
          'p_icon': 'coffee',
          'p_color': 'coral',
          'p_category_id': 'c9',
        });
      },
    );

    test('update with an empty RPC result throws category_not_found', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, []));

      expect(
        () => h.store.saveCategory(
          id: 'ghost',
          name: 'X',
          kind: TransactionKind.expense,
          icon: 'spark',
          color: 'violet',
        ),
        throwsA(
          isA<Exception>().having(
            (e) => e.toString(),
            'message',
            contains('category_not_found'),
          ),
        ),
      );
    });

    test(
      'setCategoryArchived POSTs the definer RPC and reads the row back',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(
          FakeTransport.json(200, [
            {..._row, 'is_archived': true},
          ]),
        );

        final c = await h.store.setCategoryArchived('c9', true);

        expect(c.isArchived, isTrue);
        final req = h.t.requests.last;
        // RPC-only write path — a direct PATCH on categories dies 42501.
        expect(req.method, 'POST');
        expect(req.url.path, '/neondb/rest/v1/rpc/set_category_archived');
        expect(req.body, {'p_category_id': 'c9', 'p_archived': true});
      },
    );

    test(
      'setCategoryArchived with an empty RPC result throws category_not_found',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, []));
        expect(
          () => h.store.setCategoryArchived('ghost', true),
          throwsA(
            isA<Exception>().having(
              (e) => e.toString(),
              'message',
              contains('category_not_found'),
            ),
          ),
        );
      },
    );

    test(
      'deleteCategory POSTs the definer RPC and reports the result',
      () async {
        final h = Harness();
        await h.signIn();
        h.t.queue.add(FakeTransport.json(200, true));
        h.t.queue.add(FakeTransport.json(200, false));

        expect(await h.store.deleteCategory('c9'), isTrue);
        final req = h.t.requests.last;
        // RPC-only write path — the function itself refuses seeded
        // defaults and referenced rows (raised errors, not a false).
        expect(req.method, 'POST');
        expect(req.url.path, '/neondb/rest/v1/rpc/delete_financial_category');
        expect(req.body, {'p_category_id': 'c9'});

        // A non-true payload means nothing was removed — not a silent
        // success.
        expect(await h.store.deleteCategory('c9'), isFalse);
      },
    );

    test('mergeCategory POSTs merge_categories with both ids', () async {
      final h = Harness();
      await h.signIn();
      h.t.queue.add(FakeTransport.json(200, {'entries': 2}));

      await h.store.mergeCategory(sourceId: 'c-src', targetId: 'c-tgt');
      final req = h.t.requests.last;
      expect(req.method, 'POST');
      expect(req.url.path, '/neondb/rest/v1/rpc/merge_categories');
      expect(req.body, {'p_source_id': 'c-src', 'p_target_id': 'c-tgt'});
    });

    test('a duplicate-name failure surfaces the server error body', () async {
      final h = Harness();
      await h.signIn();
      // PostgREST echoes the function's raised message verbatim.
      h.t.queue.add(
        FakeTransport.json(400, {
          'code': 'P0001',
          'message': 'category_name_taken',
        }),
      );

      expect(
        () => h.store.saveCategory(
          name: 'Ăn uống',
          kind: TransactionKind.expense,
          icon: 'spark',
          color: 'violet',
        ),
        throwsA(
          isA<NeonAuthException>().having(
            (e) => e.message,
            'message',
            contains('category_name_taken'),
          ),
        ),
      );
    });
  });
}
