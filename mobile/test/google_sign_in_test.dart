import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/google_sign_in.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';

const _config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

/// Scripted Neon transport — records requests, answers from the queue.
class _Transport {
  final requests = <NeonRequest>[];
  final queue = <NeonResponse>[];

  NeonRequester get requester => (req) async {
    requests.add(req);
    assert(queue.isNotEmpty, 'unexpected request: ${req.url}');
    return queue.removeAt(0);
  };
}

NeonResponse _beginOk() => NeonResponse(
  status: 200,
  headers: {
    'set-cookie': '__Secure-neon-auth.session_challenge=chal.1; HttpOnly',
  },
  body: jsonEncode({'redirect': true, 'url': 'https://auth.test/oauth-init'}),
);

NeonResponse _finishOk() => NeonResponse(
  status: 200,
  headers: {'set-cookie': '${NeonAuthClient.sessionCookieName}=sess.sig%3D'},
  body: jsonEncode({
    'session': {'id': 's1'},
    'user': {'id': 'u-g', 'email': 'g@x.c', 'name': 'G'},
  }),
);

/// Scripted leg — models either the native sheet or the loopback inside
/// HybridGoogleSignIn.
class _Leg implements GoogleSignInFlow {
  _Leg({this.result, this.error});
  final NeonSession? result;
  final Object? error;
  var calls = 0;
  var cancels = 0;
  @override
  Future<NeonSession?> signIn() async {
    calls++;
    if (error != null) throw error!;
    return result;
  }

  @override
  void cancel() => cancels++;
}

/// Waits until [condition] holds or the deadline passes — the loopback
/// listener and the test's fake browser run concurrently.
Future<void> _until(bool Function() condition) async {
  for (var i = 0; i < 200; i++) {
    if (condition()) return;
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
  fail('condition never held');
}

/// Simulates the browser following the OAuth redirect back to the app's
/// loopback listener. Returns the status + body the server answered.
Future<(int, String)> _browserHit(String url) async {
  final client = HttpClient();
  try {
    final req = await client.getUrl(Uri.parse(url));
    final res = await req.close();
    return (res.statusCode, await utf8.decodeStream(res));
  } finally {
    client.close(force: true);
  }
}

void main() {
  group('LoopbackGoogleSignIn', () {
    test('full round-trip: posts callbackURL, browser hits loopback, '
        'verifier exchanges into a session', () async {
      final t = _Transport()..queue.addAll([_beginOk(), _finishOk()]);
      final auth = NeonAuthClient(config: _config, requester: t.requester);
      var launched = Uri();
      final flow = LoopbackGoogleSignIn(
        auth: auth,
        launcher: (u) async {
          launched = u;
          return true;
        },
      );

      final future = flow.signIn();
      // The browser leg starts once /sign-in/social answered — the
      // callbackURL carries the real bound port.
      await _until(() => t.requests.isNotEmpty);
      final begin = t.requests.single.body as Map<String, dynamic>;
      final callback = Uri.parse(begin['callbackURL'] as String);
      expect(callback.scheme, 'http');
      expect(callback.host, 'localhost');
      expect(callback.path, '/oauth-callback');
      expect(callback.hasPort, isTrue);

      expect(launched.toString(), 'https://auth.test/oauth-init');

      // The provider redirects the browser to the loopback callback
      // carrying the session verifier.
      final (status, page) = await _browserHit(
        '$callback?neon_auth_session_verifier=ver-42',
      );
      expect(status, 200);
      expect(page, contains('MoneyFlow')); // "quay lại app" page

      final session = await future;
      expect(session, isNotNull);
      expect(session!.userId, 'u-g');
      expect(session.sessionToken, 'sess.sig%3D');

      final finish = t.requests.last;
      expect(finish.url.path, '/neondb/auth/get-session');
      expect(
        finish.url.queryParameters['neon_auth_session_verifier'],
        'ver-42',
      );
      expect(
        finish.headers['Cookie'],
        contains('__Secure-neon-auth.session_challenge=chal.1'),
      );
    });

    test('the verifier never reaches debugPrint — the callback URI '
        'carries auth material that must not reach release logcat', () async {
      // audit P1-1: the loopback callback URI holds
      // ?neon_auth_session_verifier=… — debugPrint compiles into release
      // builds, so logging the full URI would ship the secret to logcat.
      final logs = <String?>[];
      final prev = debugPrint;
      debugPrint = (message, {wrapWidth}) => logs.add(message);
      try {
        final t = _Transport()..queue.addAll([_beginOk(), _finishOk()]);
        final auth = NeonAuthClient(config: _config, requester: t.requester);
        final flow = LoopbackGoogleSignIn(
          auth: auth,
          launcher: (_) async => true,
        );

        final future = flow.signIn();
        await _until(() => t.requests.isNotEmpty);
        final callback =
            (t.requests.single.body as Map)['callbackURL'] as String;
        await _browserHit('$callback?neon_auth_session_verifier=ver-secret-99');
        await future;
      } finally {
        debugPrint = prev;
      }
      // The "callback arrived" signal still logs — path only, no query.
      expect(logs, isNotEmpty);
      for (final line in logs) {
        expect(line, isNot(contains('ver-secret-99')));
        expect(line, isNot(contains('neon_auth_session_verifier')));
      }
    });

    test('a failing exchange logs no verifier — HttpException carries '
        'the request URI verbatim and its query IS the secret', () async {
      // dart:io transport errors stringify as "uri = http://…?…" — the
      // exchange URL's query holds the verifier, so the error log must
      // redact the query, not echo the exception.
      final logs = <String?>[];
      final prev = debugPrint;
      debugPrint = (message, {wrapWidth}) => logs.add(message);
      try {
        final t = _Transport()..queue.add(_beginOk());
        final auth = NeonAuthClient(
          config: _config,
          requester: (req) async {
            t.requests.add(req);
            if (req.url.path.endsWith('/get-session')) {
              // The failure a release device actually sees — the URI
              // rides along inside the exception's own toString.
              throw HttpException('Connection closed', uri: req.url);
            }
            assert(t.queue.isNotEmpty, 'unexpected request: ${req.url}');
            return t.queue.removeAt(0);
          },
        );
        final flow = LoopbackGoogleSignIn(
          auth: auth,
          launcher: (_) async => true,
        );

        final future = flow.signIn();
        await _until(() => t.requests.isNotEmpty);
        final callback =
            (t.requests.single.body as Map)['callbackURL'] as String;
        await _browserHit('$callback?neon_auth_session_verifier=ver-secret-99');
        await expectLater(future, throwsA(isA<HttpException>()));
      } finally {
        debugPrint = prev;
      }
      for (final line in logs) {
        expect(line, isNot(contains('ver-secret-99')));
        expect(line, isNot(contains('neon_auth_session_verifier')));
      }
      // The redacted line still names the failure for diagnosis.
      expect(
        logs.any(
          (l) => (l ?? '').contains('failed') && l!.contains('<redacted>'),
        ),
        isTrue,
      );
    });

    test('cancel() aborts a pending wait and closes the server', () async {
      final t = _Transport()..queue.add(_beginOk());
      final auth = NeonAuthClient(config: _config, requester: t.requester);
      var boundPort = 0;
      final flow = LoopbackGoogleSignIn(
        auth: auth,
        launcher: (_) async => true,
      );

      final future = flow.signIn();
      await _until(() => t.requests.isNotEmpty);
      boundPort = Uri.parse(
        (t.requests.single.body as Map)['callbackURL'] as String,
      ).port;
      expect(boundPort, greaterThan(0));

      flow.cancel();
      expect(await future, isNull);

      // The loopback port is released — a connect must now fail.
      await expectLater(
        HttpClient().getUrl(Uri.parse('http://localhost:$boundPort/x')),
        throwsA(anything),
      );
      expect(t.requests.length, 1); // the exchange never ran
    });

    test('a launch failure throws instead of hanging the listener', () async {
      final t = _Transport()..queue.add(_beginOk());
      final auth = NeonAuthClient(config: _config, requester: t.requester);
      final flow = LoopbackGoogleSignIn(
        auth: auth,
        launcher: (_) async => false,
      );

      await expectLater(
        flow.signIn(),
        throwsA(
          isA<NeonAuthException>().having(
            (e) => e.message,
            'message',
            contains('trình duyệt'),
          ),
        ),
      );
    });

    test('an OAuth error on the redirect surfaces as a failure, not '
        'a session', () async {
      final t = _Transport()
        ..queue.add(_beginOk())
        ..queue.add(_finishOk()); // must stay untouched
      final auth = NeonAuthClient(config: _config, requester: t.requester);
      final flow = LoopbackGoogleSignIn(
        auth: auth,
        launcher: (_) async => true,
      );

      final future = flow.signIn();
      await _until(() => t.requests.isNotEmpty);
      final begin = t.requests.single.body as Map<String, dynamic>;
      final callback = begin['callbackURL'] as String;

      await _browserHit('$callback?error=access_denied');

      await expectLater(future, throwsA(isA<NeonAuthException>()));
      expect(t.requests.length, 1); // exchange never ran
    });

    test('unrelated loopback requests never satisfy the wait', () async {
      final t = _Transport()
        ..queue.add(_beginOk())
        ..queue.add(_finishOk());
      final auth = NeonAuthClient(config: _config, requester: t.requester);
      final flow = LoopbackGoogleSignIn(
        auth: auth,
        launcher: (_) async => true,
      );

      final future = flow.signIn();
      await _until(() => t.requests.isNotEmpty);
      final begin = t.requests.single.body as Map<String, dynamic>;
      final callback = begin['callbackURL'] as String;

      // Noise first — a probe on another path and the callback path
      // without the verifier must not finish the flow.
      final base = callback.substring(0, callback.lastIndexOf('/'));
      final (s1, _) = await _browserHit('$base/favicon.ico');
      expect(s1, HttpStatus.notFound);
      final (s2, _) = await _browserHit(callback);
      expect(s2, HttpStatus.badRequest);

      // Then the real redirect completes the round-trip.
      final (s3, _) = await _browserHit(
        '$callback?neon_auth_session_verifier=v9',
      );
      expect(s3, 200);
      expect((await future)?.userId, 'u-g');
    });
  });

  group('HybridGoogleSignIn', () {
    const session = NeonSession(
      sessionToken: 't.s',
      userId: 'u1',
      email: 'a@b.c',
      name: 'A',
    );

    test('native success short-circuits — loopback never runs', () async {
      final native = _Leg(result: session);
      final loopback = _Leg();
      final flow = HybridGoogleSignIn(native: native, loopback: loopback);

      expect((await flow.signIn())?.userId, 'u1');
      expect(native.calls, 1);
      expect(loopback.calls, 0);
    });

    test(
      'a native user-cancel stays silent — the browser never opens',
      () async {
        final native = _Leg(); // null result = user closed the sheet
        final loopback = _Leg(result: session);
        final flow = HybridGoogleSignIn(native: native, loopback: loopback);

        expect(await flow.signIn(), isNull);
        expect(loopback.calls, 0); // cancel is intent, not failure
      },
    );

    test('a native failure falls back to the loopback leg', () async {
      final native = _Leg(error: Exception('no android client'));
      final loopback = _Leg(result: session);
      final flow = HybridGoogleSignIn(native: native, loopback: loopback);

      expect((await flow.signIn())?.userId, 'u1');
      expect(native.calls, 1);
      expect(loopback.calls, 1);
    });

    test('with no native leg the loopback runs directly', () async {
      final loopback = _Leg(result: session);
      final flow = HybridGoogleSignIn(loopback: loopback);

      expect((await flow.signIn())?.userId, 'u1');
      expect(loopback.calls, 1);
    });

    test('cancel() reaches whichever leg is in flight', () {
      final native = _Leg();
      final loopback = _Leg();
      HybridGoogleSignIn(native: native, loopback: loopback).cancel();
      expect(native.cancels, 1);
      expect(loopback.cancels, 1);
    });
  });

  group('googleSignInIsUserCancel', () {
    test('a plain cancel is user intent', () {
      const e = GoogleSignInException(code: GoogleSignInExceptionCode.canceled);
      expect(googleSignInIsUserCancel(e), isTrue);
    });

    test('"[16] Account reauth failed" is a config error, not a cancel', () {
      const e = GoogleSignInException(
        code: GoogleSignInExceptionCode.canceled,
        description: '[16] Account reauth failed.',
      );
      expect(googleSignInIsUserCancel(e), isFalse);
    });

    test('non-canceled codes are never treated as cancels', () {
      const e = GoogleSignInException(
        code: GoogleSignInExceptionCode.clientConfigurationError,
        description: 'no android client',
      );
      expect(googleSignInIsUserCancel(e), isFalse);
    });
  });
}
