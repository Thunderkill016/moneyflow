import 'dart:convert';

import 'neon_config.dart';
import 'neon_transport.dart';

/// Managed Better Auth (Neon Auth) client for a non-browser app.
///
/// Mirrors the web contract in src/lib/neon/server.ts:
///   - session truth lives upstream at {authBaseUrl}/get-session, addressed
///     by the `__Secure-neon-auth.session_token` cookie;
///   - the Data-API-bound JWT comes back on the `set-auth-jwt` header of
///     that same call — ~15 min lifetime, refreshed lazily;
///   - sign-in/up require an `Origin` header matching the auth origin.
class NeonAuthException implements Exception {
  NeonAuthException(this.status, this.message);
  final int status;
  final String message;
  @override
  String toString() => 'NeonAuthException($status): $message';
}

class NeonSession {
  const NeonSession({
    required this.sessionToken,
    required this.userId,
    required this.email,
    required this.name,
  });

  final String sessionToken;
  final String userId;
  final String email;
  final String name;

  Map<String, String> toJson() => {
    'sessionToken': sessionToken,
    'userId': userId,
    'email': email,
    'name': name,
  };

  factory NeonSession.fromJson(Map<String, dynamic> json) => NeonSession(
    sessionToken: json['sessionToken'] as String,
    userId: json['userId'] as String,
    email: json['email'] as String,
    name: json['name'] as String? ?? '',
  );
}

class NeonAuthClient {
  NeonAuthClient({
    required NeonConfig config,
    NeonRequester requester = httpNeonRequester,
  }) : _config = config,
       _requester = requester;

  static const sessionCookieName = '__Secure-neon-auth.session_token';

  final NeonConfig _config;
  final NeonRequester _requester;

  NeonSession? _session;
  String? _jwt;
  int _jwtExpiryEpochMs = 0;

  NeonSession? get session => _session;

  Future<NeonResponse> _call(String path, {Object? body}) {
    return _requester(
      NeonRequest(
        method: body == null ? 'GET' : 'POST',
        url: Uri.parse('${_config.authBaseUrl}$path'),
        headers: {
          'Origin': _config.origin,
          if (_session != null)
            'Cookie': '$sessionCookieName=${_session!.sessionToken}',
        },
        body: body,
      ),
    );
  }

  Future<NeonSession> signIn(String email, String password) =>
      _signIn('/sign-in/email', {'email': email, 'password': password});

  Future<NeonSession> signUp(String name, String email, String password) =>
      _signIn('/sign-up/email', {
        'name': name,
        'email': email,
        'password': password,
      });

  /// Google sign-in through Better Auth's /sign-in/social. The native
  /// google_sign_in flow produces the id token; the server verifies it
  /// against the web client id and issues the same session cookie as
  /// /sign-in/email. Account seeding stays server-side
  /// (`on_auth_user_created`) — the client never seeds.
  Future<NeonSession> signInWithGoogleIdToken(String idToken) =>
      _signIn('/sign-in/social', {
        'provider': 'google',
        // idToken MUST be a nested object — posting a bare string makes
        // Better Auth answer {"redirect":true,"url":…} for a browser
        // flow this client must not follow (handled in _signIn).
        'idToken': {'token': idToken},
      });

  Future<NeonSession> _signIn(String path, Map<String, Object?> body) async {
    final res = await _call(path, body: body);
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
    final json = res.json as Map<String, dynamic>;
    if (json['redirect'] == true) {
      // /sign-in/social falls back to a browser redirect when the native
      // idToken exchange is rejected (e.g. a bare-string body). This
      // client cannot follow the URL — fail honestly instead.
      throw NeonAuthException(
        res.status,
        'sign-in requires a browser redirect — aborting',
      );
    }
    // The set-cookie value is the signed cookie (token.signature, encoded);
    // the bare JSON `token` lacks the signature and fails upstream checks.
    final token = _sessionTokenFromCookie(res) ?? json['token'] as String?;
    if (token == null) {
      throw NeonAuthException(res.status, 'missing session token');
    }
    _jwt = null; // stale JWT belongs to any previous session
    final user = json['user'] as Map<String, dynamic>?;
    if (user != null) {
      _session = NeonSession(
        sessionToken: token,
        userId: user['id'] as String,
        email: user['email'] as String? ?? '',
        name: user['name'] as String? ?? '',
      );
      return _session!;
    }
    // /sign-in/social may return only the token — hydrate the user through
    // the same /get-session path as a cold-start session restore.
    final restored = await restoreSession(token);
    if (restored == null) {
      throw NeonAuthException(
        res.status,
        'sign-in accepted but the session could not be verified',
      );
    }
    return restored;
  }

  /// Restores a persisted session token (e.g. after app restart) and
  /// validates it upstream — the same fail-closed contract as the web's
  /// isNeonAuthenticated(): upstream error => treated as logged out.
  Future<NeonSession?> restoreSession(String sessionToken) async {
    _session = NeonSession(
      sessionToken: sessionToken,
      userId: '',
      email: '',
      name: '',
    );
    final res = await _call('/get-session');
    if (!res.ok) {
      _session = null;
      return null;
    }
    final json = res.json as Map<String, dynamic>;
    final user = json['user'] as Map<String, dynamic>?;
    final session = json['session'] as Map<String, dynamic>?;
    if (user == null || session == null) {
      _session = null;
      return null;
    }
    _cacheJwt(res);
    _session = NeonSession(
      sessionToken: sessionToken,
      userId: user['id'] as String,
      email: user['email'] as String? ?? '',
      name: user['name'] as String? ?? '',
    );
    return _session;
  }

  /// Provider ids linked to the current account through Better Auth's
  /// /list-accounts — 'credential' for password users, 'google' for
  /// social-only sign-ups. The account-deletion flow picks its re-auth
  /// step from this list instead of assuming a password exists.
  /// A failure throws — the caller must not guess at providers.
  Future<Set<String>> listProviders() async {
    final res = await _call('/list-accounts');
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
    final json = res.json;
    if (json is! List) return const {};
    return {
      for (final a in json)
        if (a is Map && a['providerId'] is String) a['providerId'] as String,
    };
  }

  /// Drops the in-memory session without a network call — after
  /// rpc/delete_my_account the server-side session row is already gone,
  /// so /sign-out would only add a doomed round-trip.
  void discardSession() {
    _session = null;
    _jwt = null;
  }

  /// Email reset request. The emailed link completes on the web's
  /// /update-password page — this only fires the request; the caller
  /// owns the non-enumerating UX (same contract as the web action).
  Future<void> requestPasswordReset(String email) async {
    var res = await _call('/request-password-reset', body: {'email': email});
    if (res.status == 404) {
      // Older Better Auth builds expose the same flow at /forget-password.
      res = await _call('/forget-password', body: {'email': email});
    }
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
  }

  Future<void> signOut() async {
    if (_session != null) {
      await _call('/sign-out', body: const {});
    }
    _session = null;
    _jwt = null;
  }

  /// Data-API-bound JWT for the current session. Refreshes through
  /// /get-session when absent or within [_jwtRefreshSkewMs] of expiry.
  Future<String?> sessionJwt() async {
    if (_session == null) return null;
    final now = DateTime.now().millisecondsSinceEpoch;
    if (_jwt != null && now < _jwtExpiryEpochMs - _jwtRefreshSkewMs) {
      return _jwt;
    }
    final res = await _call('/get-session');
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
    _cacheJwt(res);
    return _jwt;
  }

  // The managed-auth JWT lifetime is ~15 min; refresh a minute early so a
  // slow request never carries a token that dies in flight.
  static const _jwtRefreshSkewMs = 60 * 1000;

  void _cacheJwt(NeonResponse res) {
    final jwt = res.header('set-auth-jwt');
    if (jwt == null) return;
    _jwt = jwt;
    _jwtExpiryEpochMs = _jwtExp(jwt) ?? 0;
  }

  static int? _jwtExp(String jwt) {
    final parts = jwt.split('.');
    if (parts.length != 3) return null;
    try {
      final payload =
          jsonDecode(
                utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
              )
              as Map<String, dynamic>;
      final exp = payload['exp'];
      return exp is int ? exp * 1000 : null;
    } catch (_) {
      return null;
    }
  }

  static String? _sessionTokenFromCookie(NeonResponse res) {
    final cookie = res.header('set-cookie');
    if (cookie == null) return null;
    final match = RegExp(
      '${RegExp.escape(sessionCookieName)}=([^;]+)',
    ).firstMatch(cookie);
    return match?.group(1);
  }

  static String _errorMessage(NeonResponse res) {
    final json = res.json;
    if (json is Map<String, dynamic>) {
      return (json['message'] ?? json['code'] ?? res.body).toString();
    }
    return res.body;
  }
}
