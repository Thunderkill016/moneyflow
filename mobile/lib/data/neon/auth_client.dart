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

  Future<NeonSession> _signIn(String path, Map<String, String> body) async {
    final res = await _call(path, body: body);
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
    final json = res.json as Map<String, dynamic>;
    final user = json['user'] as Map<String, dynamic>;
    // The set-cookie value is the signed cookie (token.signature, encoded);
    // the bare JSON `token` lacks the signature and fails upstream checks.
    final token = _sessionTokenFromCookie(res) ?? json['token'] as String?;
    if (token == null) {
      throw NeonAuthException(res.status, 'missing session token');
    }
    _jwt = null; // stale JWT belongs to any previous session
    _session = NeonSession(
      sessionToken: token,
      userId: user['id'] as String,
      email: user['email'] as String? ?? '',
      name: user['name'] as String? ?? '',
    );
    return _session!;
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
