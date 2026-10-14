import 'dart:async';
import 'dart:convert';
import 'dart:io';

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
      'signInWithGoogleIdToken posts the idToken as a NESTED object',
      () async {
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(
              200,
              {
                'redirect': false,
                'token': 't.s',
                'user': {'id': 'u-g', 'email': 'g@x.c', 'name': 'G'},
              },
              headers: {
                'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s',
              },
            ),
          );
        final auth = NeonAuthClient(config: config, requester: t.requester);
        final session = await auth.signInWithGoogleIdToken('google-id-token');

        final req = t.requests.single;
        expect(req.url.path, '/neondb/auth/sign-in/social');
        expect(req.headers['Origin'], 'https://auth.test');
        final body = req.body as Map<String, dynamic>;
        expect(body['provider'], 'google');
        // Regression: posting a bare STRING idToken makes Better Auth
        // answer {"redirect":true,"url":…} instead of a session.
        expect(body['idToken'], isA<Map>());
        expect(body['idToken'], {'token': 'google-id-token'});
        // The signed cookie still wins over the bare JSON token.
        expect(session.sessionToken, 't.s');
        expect(session.userId, 'u-g');
      },
    );

    test(
      'a redirect:true response is a failure, never a URL to follow',
      () async {
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(200, {
              'redirect': true,
              'url': 'https://accounts.google.com/o/oauth2/…',
            }),
          );
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await expectLater(
          auth.signInWithGoogleIdToken('x'),
          throwsA(
            isA<NeonAuthException>().having(
              (e) => e.message,
              'message',
              contains('browser redirect'),
            ),
          ),
        );
        expect(auth.session, isNull);
      },
    );

    test(
      'a 200 without user hydrates the session through get-session',
      () async {
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(
              200,
              {'token': 't.s'},
              headers: {
                'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s',
              },
            ),
          )
          ..queue.add(
            FakeTransport.json(200, {
              'session': {'id': 's1'},
              'user': {'id': 'u-g', 'email': 'g@x.c', 'name': 'G'},
            }),
          );
        final auth = NeonAuthClient(config: config, requester: t.requester);
        final session = await auth.signInWithGoogleIdToken('google-id-token');
        expect(session.userId, 'u-g');
        expect(session.sessionToken, 't.s');
        expect(t.requests.last.url.path, '/neondb/auth/get-session');
      },
    );

    test(
      'a token-less social response fails instead of faking a session',
      () async {
        final t = FakeTransport()
          ..queue.add(FakeTransport.json(200, {'redirect': false}));
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await expectLater(
          auth.signInWithGoogleIdToken('x'),
          throwsA(isA<NeonAuthException>()),
        );
        expect(auth.session, isNull);
      },
    );

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

    test(
      'signOut drops the local session even when the revoke call dies',
      () async {
        // Offline logout must never leave a live session/JWT in memory —
        // the server revoke is best-effort after the local clear.
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(
              200,
              {
                'token': 't.s',
                'user': {'id': 'u1', 'email': 'a@b.c', 'name': 'A'},
              },
              headers: {
                'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s',
              },
            ),
          );
        final auth = NeonAuthClient(
          config: config,
          requester: (req) async {
            if (req.url.path.endsWith('/sign-out')) {
              throw const SocketException('offline');
            }
            return t.requester(req);
          },
        );
        await auth.signIn('a@b.c', 'pw');
        expect(auth.session, isNotNull);
        await auth.signOut();
        expect(auth.session, isNull);
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

    test(
      'changePassword posts both passwords and revokes other sessions',
      () async {
        final t = FakeTransport()..queue.add(FakeTransport.json(200, {}));
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await auth.changePassword('old-pass', 'new-pass');
        final req = t.requests.single;
        expect(req.url.path, '/neondb/auth/change-password');
        final body = req.body as Map;
        expect(body['currentPassword'], 'old-pass');
        expect(body['newPassword'], 'new-pass');
        expect(body['revokeOtherSessions'], true);
      },
    );

    test('changePassword surfaces upstream failure', () async {
      final t = FakeTransport()
        ..queue.add(FakeTransport.json(400, {'code': 'INVALID_PASSWORD'}));
      final auth = NeonAuthClient(config: config, requester: t.requester);
      expect(
        () => auth.changePassword('wrong', 'new-pass'),
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

    Future<NeonAuthClient> signedIn(FakeTransport t) async {
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await auth.signIn('e', 'p');
      return auth;
    }

    void signInOk(FakeTransport t) => t.queue.add(
      FakeTransport.json(
        200,
        {
          'token': 't.s',
          'user': {'id': 'u1', 'email': 'e', 'name': 'n'},
        },
        headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
      ),
    );

    test('a PostgREST 401 fires onSessionExpired once', () async {
      final t = FakeTransport();
      signInOk(t);
      t.queue.add(
        FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
      );
      t.queue.add(FakeTransport.json(401, {'message': 'jwt expired'}));
      final auth = await signedIn(t);
      var expired = 0;
      final api = NeonDataApi(
        config: config,
        auth: auth,
        requester: t.requester,
        onSessionExpired: () async => expired++,
      );
      await expectLater(
        api.select('accounts'),
        throwsA(isA<NeonAuthException>()),
      );
      expect(expired, 1);
    });

    test(
      'a get-session 401 fires onSessionExpired — the cookie is dead',
      () async {
        final t = FakeTransport();
        signInOk(t);
        t.queue.add(FakeTransport.json(401, {'code': 'UNAUTHORIZED'}));
        final auth = await signedIn(t);
        var expired = 0;
        final api = NeonDataApi(
          config: config,
          auth: auth,
          requester: t.requester,
          onSessionExpired: () async => expired++,
        );
        await expectLater(
          api.select('accounts'),
          throwsA(isA<NeonAuthException>()),
        );
        expect(expired, 1);
      },
    );

    test('non-401 failures never fire onSessionExpired', () async {
      for (final status in [403, 409, 500]) {
        final t = FakeTransport();
        signInOk(t);
        t.queue.add(
          FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
        );
        t.queue.add(FakeTransport.json(status, {'code': 'anything'}));
        final auth = await signedIn(t);
        var expired = 0;
        final api = NeonDataApi(
          config: config,
          auth: auth,
          requester: t.requester,
          onSessionExpired: () async => expired++,
        );
        await expectLater(
          api.select('accounts'),
          throwsA(isA<NeonAuthException>()),
        );
        expect(expired, 0, reason: 'status $status is not session death');
      }
    });

    test('a missing local session is not an upstream session expiry', () async {
      final t = FakeTransport();
      final auth = NeonAuthClient(config: config, requester: t.requester);
      var expired = 0;
      final api = NeonDataApi(
        config: config,
        auth: auth,
        requester: t.requester,
        onSessionExpired: () async => expired++,
      );
      await expectLater(
        api.select('accounts'),
        throwsA(isA<NeonAuthException>()),
      );
      expect(expired, 0);
    });
  });

  group('httpNeonRequester', () {
    NeonRequest req(int port) => NeonRequest(
      method: 'GET',
      url: Uri.parse('http://127.0.0.1:$port/ping'),
    );

    // A fast bound keeps the test quick; production uses the 30s default.
    const quick = Duration(milliseconds: 200);

    test('times out when the server accepts but never responds', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      // Swallow the request and stay silent — close() used to wait forever.
      server.listen((_) {});
      try {
        await expectLater(
          httpNeonRequester(req(server.port), inactivityTimeout: quick),
          throwsA(isA<TimeoutException>()),
        );
      } finally {
        await server.close(force: true);
      }
    });

    test('times out when the body stalls after the headers', () async {
      final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      server.listen((r) async {
        r.response.write('{"partial":');
        await r.response.flush(); // headers land, body never finishes
      });
      try {
        await expectLater(
          httpNeonRequester(req(server.port), inactivityTimeout: quick),
          throwsA(isA<TimeoutException>()),
        );
      } finally {
        await server.close(force: true);
      }
    });
  });
}
