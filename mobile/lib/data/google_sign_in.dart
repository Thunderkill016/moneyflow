import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:google_sign_in/google_sign_in.dart'
    show GoogleSignIn, GoogleSignInException, GoogleSignInExceptionCode;

import 'neon/auth_client.dart';

// googleSignInIsUserCancel is part of this file's API and takes the
// plugin's exception type — re-export it so callers/tests don't import
// the plugin package themselves.
export 'package:google_sign_in/google_sign_in.dart'
    show GoogleSignInException, GoogleSignInExceptionCode;

/// Opens a URL in the system browser. Injectable so tests can run the
/// whole loopback round-trip without a platform channel.
typedef BrowserLauncher = Future<bool> Function(Uri url);

/// A Google sign-in that produces a MoneyFlow [NeonSession].
///
/// Test seam: the login page and the delete-account re-auth never touch
/// the browser or the loopback socket directly — widget tests inject a
/// fake flow to drive success, abort and failure.
///
/// Contract: null return means the user aborted (closed the browser, or
/// cancelled the waiting dialog) — user intent, never an error. Throws
/// on real failures (no browser, transport, provider/server rejection).
abstract class GoogleSignInFlow {
  Future<NeonSession?> signIn();

  /// Aborts an in-flight [signIn] — it completes with null. Safe to
  /// call when nothing is in flight.
  void cancel();
}

/// RFC 8252 loopback redirect sign-in against Neon Auth's shared Google
/// provider.
///
/// Why not the native google_sign_in plugin: the shared provider's
/// Google Cloud project is owned by Neon — MoneyFlow's package name and
/// SHA-1 cannot be registered as an Android OAuth client there, so the
/// native sheet only ever answered "[16] Account reauth failed". The
/// redirect leg needs no per-app Google client at all.
///
/// Round-trip:
///   1. bind an ephemeral [HttpServer] on localhost;
///   2. POST /sign-in/social with `callbackURL` pointing at it —
///      Neon allows `localhost` callbacks (`allow_localhost`);
///   3. the response carries the authorize URL and plants the
///      `session_challenge` cookies (captured, held in memory);
///   4. the URL opens in the external browser — the user's consent and
///      any Google account state live there, not in the app;
///   5. Neon redirects the browser back to the loopback listener with
///      `?neon_auth_session_verifier=…`;
///   6. the verifier plus the challenge cookies exchange through
///      /get-session for the signed session token — same cookie model
///      as the web, minus a cookie jar.
///
/// The listener answers the browser "quay lại app" page; only a request
/// to the callback path carrying the verifier (or an OAuth `error`)
/// ends the wait — probes and stray traffic get a closed answer.
///
/// Used through [HybridGoogleSignIn] in production — direct use is for
/// tests and for builds with no Android OAuth client at all.
class LoopbackGoogleSignIn implements GoogleSignInFlow {
  LoopbackGoogleSignIn({
    required NeonAuthClient auth,
    required BrowserLauncher launcher,
    this.callbackPath = '/oauth-callback',
    // Google gives a sign-in attempt minutes, not seconds; a shorter
    // bound would turn a user reading the consent screen into an error.
    this.redirectTimeout = const Duration(minutes: 5),
  }) : _auth = auth,
       _launcher = launcher;

  final NeonAuthClient _auth;
  final BrowserLauncher _launcher;
  final String callbackPath;
  final Duration redirectTimeout;

  Completer<void>? _cancel;

  @override
  Future<NeonSession?> signIn() async {
    _cancel = Completer<void>();
    // `localhost` resolves to both 127.0.0.1 and ::1 — bind the IPv6
    // loopback with v6Only off so either answer reaches the listener;
    // devices without IPv6 fall back to plain IPv4 loopback.
    HttpServer server;
    try {
      server = await HttpServer.bind(InternetAddress.loopbackIPv6, 0);
    } on SocketException {
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    }
    try {
      final port = server.port;
      final attempt = await _auth.beginGoogleRedirect(
        'http://localhost:$port$callbackPath',
      );
      if (!await _launcher(attempt.authorizeUrl)) {
        throw NeonAuthException(
          0,
          'không mở được trình duyệt để đăng nhập Google',
        );
      }
      final request = await _awaitCallback(server);
      if (request == null) return null; // cancelled
      return await _auth.finishGoogleRedirect(
        redirectUri: request.uri,
        challengeCookies: attempt.challengeCookies,
      );
    } finally {
      unawaited(server.close(force: true));
    }
  }

  @override
  void cancel() {
    if (_cancel != null && !_cancel!.isCompleted) _cancel!.complete();
  }

  /// Waits for the browser's callback hit on [server]; returns the
  /// matching request, or null on cancel/timeout. Every request gets a
  /// closed response so the browser never hangs on a dead socket.
  Future<HttpRequest?> _awaitCallback(HttpServer server) async {
    final race = Completer<HttpRequest?>();
    late final StreamSubscription<HttpRequest> sub;
    sub = server.listen((request) {
      final uri = request.uri;
      final isCallback = uri.path == callbackPath;
      final hasVerifier = uri.queryParameters.containsKey(
        'neon_auth_session_verifier',
      );
      final hasError = uri.queryParameters.containsKey('error');
      final done = isCallback && (hasVerifier || hasError);
      _answer(
        request,
        done
            ? HttpStatus.ok
            : isCallback
            ? HttpStatus.badRequest
            : HttpStatus.notFound,
        done,
      );
      if (done && !race.isCompleted) race.complete(request);
    });
    _cancel?.future.then((_) {
      if (!race.isCompleted) race.complete(null);
    });
    final timer = Timer(redirectTimeout, () {
      if (!race.isCompleted) race.complete(null);
    });
    final request = await race.future;
    timer.cancel();
    await sub.cancel();
    return request;
  }

  /// The browser still displays whatever we answer — give the success
  /// case a return-to-app hint, everything else a bare close.
  void _answer(HttpRequest request, int status, bool done) {
    request.response.statusCode = status;
    if (done) {
      request.response.headers.contentType = ContentType.html;
      request.response.write(
        '<!doctype html><meta charset="utf-8"><title>MoneyFlow</title>'
        '<p>Đăng nhập xong — bạn có thể quay lại ứng dụng MoneyFlow.</p>',
      );
    }
    unawaited(request.response.close());
  }
}

/// Native Credential Manager sheet → idToken → /sign-in/social.
///
/// Only works when the Neon Auth Google provider's Google Cloud project
/// registered an Android OAuth client for this package + SHA-1 — i.e.
/// an owner-created project configured as a NON-shared provider. With
/// Neon's shared provider that registration can never exist, so this
/// path throws and [HybridGoogleSignIn] falls back to the loopback.
///
/// google_sign_in v7: `initialize` binds the server's web OAuth client
/// id, `authenticate` shows the account sheet, and the account's
/// `authentication.idToken` is what Better Auth verifies. No
/// google-services.json needed — the client id arrives via config.
class NativeGoogleSignIn implements GoogleSignInFlow {
  NativeGoogleSignIn({
    required NeonAuthClient auth,
    required this.serverClientId,
  }) : _auth = auth;

  final NeonAuthClient _auth;
  final String serverClientId;
  bool _initialized = false;

  @override
  Future<NeonSession?> signIn() async {
    if (!_initialized) {
      await GoogleSignIn.instance.initialize(serverClientId: serverClientId);
      _initialized = true;
    }
    try {
      final account = await GoogleSignIn.instance.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null) return null; // no token → nothing to exchange
      return await _auth.signInWithGoogleIdToken(idToken);
    } on GoogleSignInException catch (e) {
      debugPrint(
        'google_sign_in: exception code=${e.code} desc=${e.description} details=${e.details}',
      );
      if (googleSignInIsUserCancel(e)) return null;
      rethrow;
    }
  }

  /// The sheet dismisses itself on back/close — there is no in-flight
  /// future of ours to abort; present for the [GoogleSignInFlow] seam.
  @override
  void cancel() {}
}

/// True only for a genuine user cancel. "[16] Account reauth failed"
/// arrives under `canceled` but is a configuration failure — the Android
/// app isn't registered in the server client's Google Cloud project. A
/// silent return would misreport it as user intent; surface it so the
/// hybrid can fall back to the loopback redirect.
bool googleSignInIsUserCancel(GoogleSignInException e) =>
    e.code == GoogleSignInExceptionCode.canceled &&
    !(e.description ?? '').contains('[16]');

/// Preferred sign-in: native sheet when an Android OAuth client exists
/// ([native] non-null), browser loopback otherwise — and ALWAYS the
/// loopback after a native failure (misconfigured client, missing Play
/// Services, redirect:true rejection). A null return from the native
/// leg is user cancel → propagates without opening the browser.
class HybridGoogleSignIn implements GoogleSignInFlow {
  HybridGoogleSignIn({
    GoogleSignInFlow? native,
    required GoogleSignInFlow loopback,
  }) : _native = native,
       _loopback = loopback;

  final GoogleSignInFlow? _native;
  final GoogleSignInFlow _loopback;

  @override
  Future<NeonSession?> signIn() async {
    final native = _native;
    if (native != null) {
      try {
        return await native.signIn();
      } catch (e) {
        debugPrint('native Google sign-in failed, falling back to browser: $e');
      }
    }
    return _loopback.signIn();
  }

  @override
  void cancel() {
    _native?.cancel();
    _loopback.cancel();
  }
}
