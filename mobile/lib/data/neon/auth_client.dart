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

/// Result of POST /sign-in/social for the loopback-redirect Google flow:
/// the authorize URL the browser must open plus the session_challenge
/// cookies the /get-session exchange replays as a Cookie header. The
/// cookies never leave memory — they only prove the exchange request
/// belongs to this sign-in attempt.
class NeonOAuthAttempt {
  const NeonOAuthAttempt({
    required this.authorizeUrl,
    required this.challengeCookies,
  });

  final Uri authorizeUrl;
  final List<String> challengeCookies;
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

  /// Native-sheet Google sign-in: a plugin-issued idToken exchanged at
  /// /sign-in/social — valid only when the provider's Google Cloud
  /// project registered an Android OAuth client for this package+SHA-1
  /// (owner's own project; Neon's shared provider can never have one).
  /// When that registration is absent upstream answers redirect:true —
  /// [_signIn] throws so the caller falls back to [beginGoogleRedirect].
  Future<NeonSession> signInWithGoogleIdToken(String idToken) =>
      _signIn('/sign-in/social', {
        'provider': 'google',
        // idToken MUST be a nested object — posting a bare string makes
        // Better Auth answer {"redirect":true,"url":…} for a browser
        // flow this client must not follow (handled in _signIn).
        'idToken': {'token': idToken},
      });

  /// First leg of the loopback-redirect Google sign-in — the fallback
  /// for [signInWithGoogleIdToken] and the only path against Neon's
  /// shared Google provider. The shared provider's Google Cloud project
  /// cannot register this app as an Android client, so instead the app
  /// opens the returned authorize URL in a browser and waits for Neon
  /// to redirect back to a `http://localhost:<port>/…` callbackURL
  /// (upstream allows `localhost` via `allow_localhost`).
  ///
  /// The response plants `session_challenge` cookies; they are captured
  /// here and replayed verbatim by [finishGoogleRedirect] — upstream
  /// only issues the session token when the challenge cookie from this
  /// exact sign-in attempt accompanies the verifier.
  Future<NeonOAuthAttempt> beginGoogleRedirect(String callbackUrl) async {
    final res = await _call(
      '/sign-in/social',
      body: {'provider': 'google', 'callbackURL': callbackUrl},
    );
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
    final json = res.json as Map<String, dynamic>;
    final url = json['url'] as String?;
    if (url == null || url.isEmpty) {
      throw NeonAuthException(
        res.status,
        'social sign-in returned no authorize URL',
      );
    }
    final cookies = _challengeCookies(res);
    if (cookies.isEmpty) {
      throw NeonAuthException(
        res.status,
        'social sign-in set no session challenge cookie',
      );
    }
    return NeonOAuthAttempt(
      authorizeUrl: Uri.parse(url),
      challengeCookies: cookies,
    );
  }

  /// Second leg: Neon redirected the browser back to the loopback
  /// listener — the redirect URI's whole query (the
  /// `neon_auth_session_verifier` plus anything upstream adds) is
  /// replayed to /get-session with the challenge cookies as proof of
  /// attempt. Mirrors the Neon SDK's exchangeOAuthToken, minus the
  /// browser cookie jar this app does not have.
  Future<NeonSession> finishGoogleRedirect({
    required Uri redirectUri,
    required List<String> challengeCookies,
  }) async {
    final providerError = redirectUri.queryParameters['error'];
    if (providerError != null) {
      throw NeonAuthException(
        0,
        'Google redirect returned an error: $providerError',
      );
    }
    final exchangeUrl = Uri.parse(
      '${_config.authBaseUrl}/get-session',
    ).replace(query: redirectUri.query);
    final res = await _requester(
      NeonRequest(
        method: 'GET',
        url: exchangeUrl,
        headers: {
          'Origin': _config.origin,
          'Cookie': challengeCookies.join('; '),
        },
      ),
    );
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
    final token = _sessionTokenFromCookie(res);
    if (token == null) {
      throw NeonAuthException(
        res.status,
        'verifier exchange issued no session token',
      );
    }
    _jwt = null; // stale JWT belongs to any previous session
    _cacheJwt(res); // the exchange is itself a get-session response
    final json = res.json;
    if (json is Map<String, dynamic>) {
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
    }
    final restored = await restoreSession(token);
    if (restored == null) {
      throw NeonAuthException(
        res.status,
        'sign-in accepted but the session could not be verified',
      );
    }
    return restored;
  }

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

  /// POST /change-password — credential accounts only; a social-only
  /// account has no current password to prove, so callers gate the
  /// surface on `listProviders()` containing 'credential'.
  /// `revokeOtherSessions` drops every other device's session so a
  /// leaked password stops working elsewhere the moment it changes —
  /// the current session (this device) stays valid.
  Future<void> changePassword(
    String currentPassword,
    String newPassword,
  ) async {
    final res = await _call(
      '/change-password',
      body: {
        'currentPassword': currentPassword,
        'newPassword': newPassword,
        'revokeOtherSessions': true,
      },
    );
    if (!res.ok) {
      throw NeonAuthException(res.status, _errorMessage(res));
    }
  }

  Future<void> signOut() async {
    // Drop the local session FIRST — a dead network must never leave a
    // live session/JWT in memory for in-flight work to keep using. The
    // server revoke is best-effort on top of that.
    final hadSession = _session != null;
    _session = null;
    _jwt = null;
    if (hadSession) {
      try {
        await _call('/sign-out', body: const {});
      } catch (_) {
        // Server-side revoke failed — the session token stays valid
        // upstream until expiry, but this client no longer holds it.
      }
    }
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

  // Upstream plants BOTH spellings of the challenge cookie (the second
  // is a known misspelling kept for compat); replay whichever arrived.
  static final _challengeCookiePattern = RegExp(
    r'(__Secure-neon-auth\.session_chall[ea]nge=[^;,]+)',
  );

  static List<String> _challengeCookies(NeonResponse res) {
    final cookie = res.header('set-cookie');
    if (cookie == null) return const [];
    return [
      for (final m in _challengeCookiePattern.allMatches(cookie)) m.group(1)!,
    ];
  }

  static String _errorMessage(NeonResponse res) {
    final json = res.json;
    if (json is Map<String, dynamic>) {
      return (json['message'] ?? json['code'] ?? res.body).toString();
    }
    return res.body;
  }
}
