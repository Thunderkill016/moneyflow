// Neon backend endpoints, supplied at build time via --dart-define.
//
// The dev defaults point at the owner-created acceptance sandbox
// (moneyflow-acceptance-sandbox) so `flutter run` works out of the box.
// Production values come from Vercel env / Neon project settings — never
// hardcode secrets here; endpoints are identifiers, not credentials.
class NeonConfig {
  const NeonConfig({required this.authBaseUrl, required this.dataApiUrl});

  final String authBaseUrl;
  final String dataApiUrl;

  factory NeonConfig.fromEnvironment() {
    const auth = String.fromEnvironment(
      'MF_AUTH_BASE_URL',
      defaultValue: _devAuth,
    );
    const api = String.fromEnvironment(
      'MF_DATA_API_URL',
      defaultValue: _devApi,
    );
    return NeonConfig(authBaseUrl: auth, dataApiUrl: api);
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
