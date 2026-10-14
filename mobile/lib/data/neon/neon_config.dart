import 'package:flutter/foundation.dart';

// Neon backend endpoints, supplied at build time via --dart-define.
//
// The dev defaults point at the owner-created acceptance sandbox
// (moneyflow-acceptance-sandbox) so `flutter run` works out of the box.
// Production values come from Vercel env / Neon project settings — never
// hardcode secrets here; endpoints are identifiers, not credentials.
class NeonConfig {
  const NeonConfig({
    required this.authBaseUrl,
    required this.dataApiUrl,
    this.googleServerClientId = '',
  });

  final String authBaseUrl;
  final String dataApiUrl;

  /// Web OAuth client id for the native Google sheet — only usable when
  /// an Android OAuth client for this package+SHA-1 exists in the SAME
  /// Google Cloud project (i.e. an owner-created project wired into
  /// Neon Auth as a non-shared Google provider). Empty → the hybrid
  /// sign-in goes straight to the loopback redirect.
  final String googleServerClientId;

  factory NeonConfig.fromEnvironment() {
    // Read WITHOUT defaults first: the sandbox fallback below would mask
    // a missing --dart-define entirely, and String.fromEnvironment can't
    // tell "define passed" from "default filled in".
    const auth = String.fromEnvironment('MF_AUTH_BASE_URL');
    const api = String.fromEnvironment('MF_DATA_API_URL');
    const google = String.fromEnvironment('MF_GOOGLE_SERVER_CLIENT_ID');
    requireEndpointsInRelease(
      authBaseUrl: auth,
      dataApiUrl: api,
      releaseMode: kReleaseMode,
    );
    return NeonConfig(
      authBaseUrl: auth.isEmpty ? _devAuth : auth,
      dataApiUrl: api.isEmpty ? _devApi : api,
      googleServerClientId: google,
    );
  }

  /// A release binary must name its real endpoints at build time —
  /// shipping the sandbox defaults would silently point strangers'
  /// sign-ins at the acceptance project. Throws at construction instead
  /// of failing at the first request. Debug/profile keep the dev
  /// defaults so `flutter run` and tests work with no defines.
  ///
  /// Non-empty defines are then validated in every mode — a malformed
  /// or non-HTTPS endpoint is a build-config bug, not a runtime 404.
  ///
  /// Pure — takes the raw values and the release flag — so tests can
  /// drive every branch (the `fromEnvironment` reads are compile-time).
  @visibleForTesting
  static void requireEndpointsInRelease({
    required String authBaseUrl,
    required String dataApiUrl,
    required bool releaseMode,
  }) {
    if (releaseMode && (authBaseUrl.isEmpty || dataApiUrl.isEmpty)) {
      throw StateError(
        'Release build missing MF_AUTH_BASE_URL / MF_DATA_API_URL '
        '--dart-define values — refusing to fall back to the dev sandbox. '
        'See mobile/README.md for the required release defines.',
      );
    }
    _requireTrustedEndpoint('MF_AUTH_BASE_URL', authBaseUrl);
    _requireTrustedEndpoint('MF_DATA_API_URL', dataApiUrl);
  }

  /// Session tokens and credentials travel to these URLs — a mistyped or
  /// non-HTTPS define must fail at construction, never at the first auth
  /// request. The mobile client only talks to Neon (`*.neon.tech`);
  /// loopback stays allowed for local development backends.
  static void _requireTrustedEndpoint(String label, String raw) {
    if (raw.isEmpty) return; // debug-mode callers use the sandbox defaults
    final uri = Uri.tryParse(raw);
    if (uri == null ||
        !uri.isAbsolute ||
        uri.host.isEmpty ||
        uri.userInfo.isNotEmpty ||
        uri.hasFragment) {
      throw StateError('$label is not an absolute URI: "$raw"');
    }
    final loopback = uri.host == 'localhost' || uri.host == '127.0.0.1';
    if (uri.scheme != 'https' && !(loopback && uri.scheme == 'http')) {
      throw StateError(
        '$label must be an https endpoint — got "${uri.scheme}://"',
      );
    }
    if (!loopback && !uri.host.endsWith('.neon.tech')) {
      throw StateError(
        '$label host "${uri.host}" is not a neon.tech backend — '
        'refusing to send session tokens outside the configured provider.',
      );
    }
  }

  bool get isConfigured => authBaseUrl.isNotEmpty && dataApiUrl.isNotEmpty;

  // Better Auth's CSRF check requires Origin for sign-in/up; it must match a
  // trusted origin — the auth service origin itself is always trusted.
  String get origin => Uri.parse(authBaseUrl).origin;

  // moneyflow-acceptance-sandbox (Neon project nameless-wind-29591132).
  static const _devAuth =
      'https://ep-lively-sunset-b3xzqd47.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';
  static const _devApi =
      'https://ep-lively-sunset-b3xzqd47.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';
}
