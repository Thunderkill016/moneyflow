import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart' show debugPrint;
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

    test('signInWithGoogleIdToken posts the idToken as a NESTED object '
        '(native-sheet path)', () async {
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(
            200,
            {
              'redirect': false,
              'token': 't.s',
              'user': {'id': 'u-g', 'email': 'g@x.c', 'name': 'G'},
            },
            headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=t.s'},
          ),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      final session = await auth.signInWithGoogleIdToken('google-id-token');

      final req = t.requests.single;
      expect(req.url.path, '/neondb/auth/sign-in/social');
      final body = req.body as Map<String, dynamic>;
      expect(body['provider'], 'google');
      // Regression: posting a bare STRING idToken makes Better Auth
      // answer {"redirect":true,"url":…} instead of a session.
      expect(body['idToken'], isA<Map>());
      expect(body['idToken'], {'token': 'google-id-token'});
      expect(session.sessionToken, 't.s');
      expect(session.userId, 'u-g');
    });

    test('a redirect:true social answer throws so the caller can fall '
        'back to the loopback flow', () async {
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
    });

    test('beginGoogleRedirect posts the loopback callbackURL and keeps '
        'the challenge cookies', () async {
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(
            200,
            {'redirect': true, 'url': 'https://auth.test/init?x=1'},
            headers: {
              'set-cookie':
                  '__Secure-neon-auth.session_challenge=chal.abc; '
                  'HttpOnly, __Secure-neon-auth.session_challange='
                  'chal.abc; HttpOnly',
            },
          ),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      final attempt = await auth.beginGoogleRedirect(
        'http://localhost:1234/oauth-callback',
      );

      final req = t.requests.single;
      expect(req.url.path, '/neondb/auth/sign-in/social');
      expect(req.headers['Origin'], 'https://auth.test');
      final body = req.body as Map<String, dynamic>;
      expect(body['provider'], 'google');
      expect(body['callbackURL'], 'http://localhost:1234/oauth-callback');
      // No idToken — the native exchange is gone; the browser leg is
      // the only supported Google path.
      expect(body.containsKey('idToken'), isFalse);

      expect(attempt.authorizeUrl.toString(), 'https://auth.test/init?x=1');
      // Both cookie spellings survive — upstream plants a misspelled
      // twin and either name satisfies the exchange's challenge check.
      expect(
        attempt.challengeCookies,
        containsAll([
          '__Secure-neon-auth.session_challenge=chal.abc',
          '__Secure-neon-auth.session_challange=chal.abc',
        ]),
      );
    });

    test('beginGoogleRedirect fails when the response has no url', () async {
      final t = FakeTransport()
        ..queue.add(FakeTransport.json(200, {'redirect': false}));
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await expectLater(
        auth.beginGoogleRedirect('http://localhost:1/cb'),
        throwsA(isA<NeonAuthException>()),
      );
    });

    test(
      'beginGoogleRedirect fails when no challenge cookie was set',
      () async {
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(200, {
              'redirect': true,
              'url': 'https://auth.test/init',
            }),
          );
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await expectLater(
          auth.beginGoogleRedirect('http://localhost:1/cb'),
          throwsA(
            isA<NeonAuthException>().having(
              (e) => e.message,
              'message',
              contains('challenge'),
            ),
          ),
        );
      },
    );

    test('finishGoogleRedirect replays the verifier plus challenge cookies '
        'to /get-session', () async {
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(
            200,
            {
              'session': {'id': 's1'},
              'user': {'id': 'u-g', 'email': 'g@x.c', 'name': 'G'},
            },
            headers: {
              'set-cookie': '${NeonAuthClient.sessionCookieName}=t.sig%3D',
              'set-auth-jwt': fakeJwt(),
            },
          ),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      final session = await auth.finishGoogleRedirect(
        redirectUri: Uri.parse(
          'http://localhost:1234/oauth-callback'
          '?neon_auth_session_verifier=ver9&other=keep',
        ),
        challengeCookies: const [
          '__Secure-neon-auth.session_challenge=chal.abc',
        ],
      );

      final req = t.requests.single;
      expect(req.method, 'GET');
      expect(req.url.path, '/neondb/auth/get-session');
      // The whole query is forwarded, not just the verifier.
      expect(req.url.queryParameters['neon_auth_session_verifier'], 'ver9');
      expect(req.url.queryParameters['other'], 'keep');
      expect(
        req.headers['Cookie'],
        contains('__Secure-neon-auth.session_challenge=chal.abc'),
      );
      // The signed cookie wins over any unsigned body token.
      expect(session.sessionToken, 't.sig%3D');
      expect(session.userId, 'u-g');
      expect(auth.session, same(session));
    });

    test('finishGoogleRedirect throws when the provider redirects back '
        'with an error', () async {
      final t = FakeTransport();
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await expectLater(
        auth.finishGoogleRedirect(
          redirectUri: Uri.parse('http://localhost:1/cb?error=access_denied'),
          challengeCookies: const ['c=v'],
        ),
        throwsA(isA<NeonAuthException>()),
      );
      // The verifier exchange must never fire on an error redirect.
      expect(t.requests, isEmpty);
    });

    test('finishGoogleRedirect never logs the verifier — release logcat '
        'must not carry auth material', () async {
      // The exchange URL's query carries the one-time
      // neon_auth_session_verifier. debugPrint compiles into release
      // builds, so logging it would ship the secret to logcat — the
      // audit's P1-1 leak. Only status lines may print.
      final logs = <String?>[];
      final prev = debugPrint;
      debugPrint = (message, {wrapWidth}) => logs.add(message);
      try {
        final t = FakeTransport()
          ..queue.add(
            FakeTransport.json(
              200,
              {
                'session': {'id': 's1'},
                'user': {'id': 'u-g', 'email': 'g@x.c', 'name': 'G'},
              },
              headers: {
                'set-cookie': '${NeonAuthClient.sessionCookieName}=t.sig%3D',
              },
            ),
          );
        final auth = NeonAuthClient(config: config, requester: t.requester);
        await auth.finishGoogleRedirect(
          redirectUri: Uri.parse(
            'http://localhost:1234/oauth-callback'
            '?neon_auth_session_verifier=ver-secret-99&other=keep',
          ),
          challengeCookies: const ['c=v'],
        );
      } finally {
        debugPrint = prev;
      }
      expect(logs, isNotEmpty); // the status line still prints
      for (final line in logs) {
        expect(line, isNot(contains('ver-secret-99')));
        expect(line, isNot(contains('neon_auth_session_verifier')));
      }
    });

    test('finishGoogleRedirect fails honestly when upstream issues no '
        'session token', () async {
      final t = FakeTransport()
        ..queue.add(
          FakeTransport.json(200, {
            'session': {'id': 's1'},
            'user': {'id': 'u', 'email': 'e'},
          }),
        );
      final auth = NeonAuthClient(config: config, requester: t.requester);
      await expectLater(
        auth.finishGoogleRedirect(
          redirectUri: Uri.parse(
            'http://localhost:1/cb?neon_auth_session_verifier=v',
          ),
          challengeCookies: const ['c=v'],
        ),
        throwsA(isA<NeonAuthException>()),
      );
      expect(auth.session, isNull);
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

    test(
      'authentication_required inside a definer refreshes the JWT once',
      () async {
        final t = FakeTransport();
        signInOk(t);
        // Distinct exp values so the replay's bearer is provably the
        // refreshed JWT, not a coincidentally identical cached token.
        final stale = fakeJwt(
          expEpochSec: DateTime.now().millisecondsSinceEpoch ~/ 1000 + 600,
        );
        final fresh = fakeJwt(
          expEpochSec: DateTime.now().millisecondsSinceEpoch ~/ 1000 + 1200,
        );
        t.queue.add(
          FakeTransport.json(200, {}, headers: {'set-auth-jwt': stale}),
        );
        // The definer raise is a 400-class RPC error, not a 401: the JWT
        // passed PostgREST's role check but carried no usable claims.
        t.queue.add(
          FakeTransport.json(400, {
            'code': 'P0001',
            'message': 'authentication_required',
          }),
        );
        t.queue.add(
          FakeTransport.json(200, {}, headers: {'set-auth-jwt': fresh}),
        );
        t.queue.add(FakeTransport.json(200, 'tx-id'));
        final auth = await signedIn(t);
        var expired = 0;
        final api = NeonDataApi(
          config: config,
          auth: auth,
          requester: t.requester,
          onSessionExpired: () async => expired++,
        );

        final result = await api.rpc('soft_delete_money_transaction', {
          'p_transaction_id': 't1',
        });

        expect(result, 'tx-id');
        // sign-in + get-session + rpc-fail + get-session-refresh + rpc-replay:
        // the stale JWT was dropped and the retried request carried the
        // fresh one.
        expect(t.requests.length, 5);
        expect(t.requests.last.headers['Authorization'], 'Bearer $fresh');
        expect(expired, 0);
      },
    );

    test('a repeat authentication_required surfaces as an error', () async {
      final t = FakeTransport();
      signInOk(t);
      t.queue.add(
        FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
      );
      for (var i = 0; i < 2; i++) {
        t.queue.add(
          FakeTransport.json(400, {
            'code': 'P0001',
            'message': 'authentication_required',
          }),
        );
        if (i == 0) {
          t.queue.add(
            FakeTransport.json(200, {}, headers: {'set-auth-jwt': fakeJwt()}),
          );
        }
      }
      final auth = await signedIn(t);
      final api = NeonDataApi(
        config: config,
        auth: auth,
        requester: t.requester,
      );

      await expectLater(
        api.rpc('soft_delete_money_transaction', {'p_transaction_id': 't1'}),
        throwsA(isA<NeonAuthException>()),
      );
      // One retry bound: 2 RPC attempts total, no loop.
      expect(t.requests.where((r) => r.url.path.contains('/rpc/')).length, 2);
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
