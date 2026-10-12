import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/data_api.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';

const config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

String fakeJwt({int? expEpochSec}) {
  final payload = {
    'sub': 'u1',
    'exp': expEpochSec ?? (DateTime.now().millisecondsSinceEpoch ~/ 1000) + 900,
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

void main() {
  group('NeonAuthClient', () {
    test(
      'signIn stores the SIGNED cookie token, not the bare JSON token',
      () async {
        // Cookie value is token.signature (encoded); JSON token is unsigned.
        const signed = 'tok.sig%3D';
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(
              200,
              {
                'token': 'tok',
                'user': {'id': 'u1', 'email': 'a@b.c', 'name': 'A'},
              },
              headers: {
                'set-cookie':
                    '${NeonAuthClient.sessionCookieName}=$signed; Path=/; HttpOnly',
              },
            ),
          );
        final auth = NeonAuthClient(config: config, requester: t.requester);
        final session = await auth.signIn('a@b.c', 'pw');
        expect(session.sessionToken, signed);
        expect(session.userId, 'u1');
        final req = t.requests.single;
        expect(req.url.path, '/neondb/auth/sign-in/email');
        expect(req.headers['Origin'], 'https://auth.test');
      },
    );

    test(
      'sessionJwt calls get-session with cookie, returns set-auth-jwt',
      () async {
        final jwt = fakeJwt();
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(
              200,
              {
                'token': 'tok.sig',
                'user': {'id': 'u1', 'email': 'a@b.c', 'name': 'A'},
              },
              headers: {
                'set-cookie': '${NeonAuthClient.sessionCookieName}=tok.sig',
              },
            ),
          )
          ..queue.add(
            FakeTransport.json(
              200,
              {
                'session': {'id': 's1'},
                'user': {'id': 'u1'},
              },
              headers: {'set-auth-jwt': jwt},
            ),
          );
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await auth.signIn('a@b.c', 'pw');
        expect(await auth.sessionJwt(), jwt);
        final getSession = t.requests.last;
        expect(getSession.url.path, '/neondb/auth/get-session');
        expect(
          getSession.headers['Cookie'],
          '${NeonAuthClient.sessionCookieName}=tok.sig',
        );
      },
    );

    test('sessionJwt caches a fresh JWT and refreshes near expiry', () async {
      final fresh = fakeJwt();
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(
            200,
            {
              'token': 't.s',
              'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
            },
            headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
          ),
        )
        ..queue.add(
          FakeTransport.json(200, {}, headers: {'set-auth-jwt': fresh}),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await auth.signIn('e', 'p');
      expect(await auth.sessionJwt(), fresh);
      expect(await auth.sessionJwt(), fresh); // cached — no extra request
      expect(t.requests.length, 2);
    });

    test('expired JWT triggers a new get-session', () async {
      final expired = fakeJwt(expEpochSec: 1); // 1970 — long dead
      final fresh = fakeJwt();
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(
            200,
            {
              'token': 't.s',
              'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
            },
            headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
          ),
        )
        ..queue.add(
          FakeTransport.json(200, {}, headers: {'set-auth-jwt': expired}),
        )
        ..queue.add(
          FakeTransport.json(200, {}, headers: {'set-auth-jwt': fresh}),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await auth.signIn('e', 'p');
      expect(await auth.sessionJwt(), expired);
      expect(await auth.sessionJwt(), fresh); // refetched
      expect(t.requests.length, 3);
    });

    test(
      'restoreSession returns null when the session died upstream',
      () async {
        final t = FakeTransport()..queue.add(FakeTransport.json(401, {}));
        final auth = NeonAuthClient(config: config, requester: t.requester);
        expect(await auth.restoreSession('dead-token'), isNull);
        expect(auth.session, isNull);
      },
    );

    test('signIn failure surfaces upstream error', () async {
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(401, {'code': 'INVALID_EMAIL_OR_PASSWORD'}),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      expect(() => auth.signIn('x', 'y'), throwsA(isA<NeonAuthException>()));
    });

    test(
      'requestPasswordReset posts the email to the reset endpoint',
      () async {
        final t = FakeTransport()..queue.add(FakeTransport.json(200, {}));
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await auth.requestPasswordReset('a@b.c');
        final req = t.requests.single;
        expect(req.url.path, '/neondb/auth/request-password-reset');
        expect((req.body as Map)['email'], 'a@b.c');
      },
    );

    test(
      'requestPasswordReset falls back to /forget-password on 404',
      () async {
        final t = FakeTransport()
          ..queue.add(FakeTransport.json(404, {}))
          ..queue.add(FakeTransport.json(200, {}));
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await auth.requestPasswordReset('a@b.c');
        expect(t.requests.length, 2);
        expect(t.requests.last.url.path, '/neondb/auth/forget-password');
      },
    );

    test('requestPasswordReset surfaces upstream failure', () async {
      final t = FakeTransport()
        ..queue.add(FakeTransport.json(500, {'message': 'down'}));
      final auth = NeonAuthClient(config: config, requester: t.requester);
      expect(
        () => auth.requestPasswordReset('a@b.c'),
        throwsA(isA<NeonAuthException>()),
      );
    });
  });

  group('NeonDataApi', () {
    test('select sends Bearer JWT and decodes rows', () async {
      final jwt = fakeJwt();
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(
            200,
            {
              'token': 't.s',
              'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
            },
            headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
          ),
        )
        ..queue.add(FakeTransport.json(200, {}, headers: {'set-auth-jwt': jwt}))
        ..queue.add(
          FakeTransport.json(200, [
            {'id': 'a1', 'name': 'Tiền mặt'},
          ]),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await auth.signIn('e', 'p');
      final api = NeonDataApi(
        config: config,
        auth: auth,
        requester: t.requester,
      );
      final rows = await api.select('accounts', query: {'select': 'id,name'});
      expect(rows.single['name'], 'Tiền mặt');
      final req = t.requests.last;
      expect(
        req.url.toString(),
        'https://api.test/neondb/rest/v1/accounts?select=id%2Cname',
      );
      expect(req.headers['Authorization'], 'Bearer $jwt');
    });

    test('select throws NeonAuthException on upstream error', () async {
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(
            200,
            {
              'token': 't.s',
              'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
            },
            headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
          ),
        )
        ..queue.add(
          FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
        )
        ..queue.add(FakeTransport.json(403, {'code': '42501'}));
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await auth.signIn('e', 'p');
      final api = NeonDataApi(
        config: config,
        auth: auth,
        requester: t.requester,
      );
      expect(() => api.select('accounts'), throwsA(isA<NeonAuthException>()));
    });
  });
}
