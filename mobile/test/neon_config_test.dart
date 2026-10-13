import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/neon_config.dart';

/// Release binaries must name their backend at build time — the check is
/// a pure function over the raw define values so every branch runs here.
void main() {
  group('NeonConfig.requireEndpointsInRelease', () {
    const auth = 'https://auth.example.com';
    const api = 'https://api.example.com';

    test('non-release builds keep the sandbox defaults silently', () {
      expect(
        () => NeonConfig.requireEndpointsInRelease(
          authBaseUrl: '',
          dataApiUrl: '',
          releaseMode: false,
        ),
        returnsNormally,
      );
    });

    test('release with both endpoints provided passes', () {
      expect(
        () => NeonConfig.requireEndpointsInRelease(
          authBaseUrl: auth,
          dataApiUrl: api,
          releaseMode: true,
        ),
        returnsNormally,
      );
    });

    test('release with missing defines throws — no silent sandbox', () {
      for (final pair in [
        ('', api), // auth missing
        (auth, ''), // data api missing
        ('', ''), // neither passed
      ]) {
        expect(
          () => NeonConfig.requireEndpointsInRelease(
            authBaseUrl: pair.$1,
            dataApiUrl: pair.$2,
            releaseMode: true,
          ),
          throwsStateError,
          reason: 'auth=${pair.$1} api=${pair.$2}',
        );
      }
    });
  });

  group('NeonConfig.fromEnvironment', () {
    // flutter test runs with kReleaseMode=false and no defines — the
    // sandbox defaults apply and nothing throws.
    test('defaults to the dev sandbox in tests', () {
      final config = NeonConfig.fromEnvironment();
      expect(config.isConfigured, isTrue);
      expect(config.authBaseUrl, contains('neonauth'));
      expect(config.dataApiUrl, contains('apirest'));
    });
  });
}
