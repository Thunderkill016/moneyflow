import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/neon_config.dart';

/// Release binaries must name their backend at build time — the check is
/// a pure function over the raw define values so every branch runs here.
void main() {
  group('NeonConfig.requireEndpointsInRelease', () {
    const auth =
        'https://ep-x.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth';
    const api =
        'https://ep-x.apirest.c-4.ap-southeast-1.aws.neon.tech/neondb/rest/v1';

    test('non-release builds keep the dev defaults silently', () {
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

    test('release with missing defines throws — no silent defaults', () {
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

    test('http endpoints are rejected — tokens never travel cleartext', () {
      for (final releaseMode in [true, false]) {
        expect(
          () => NeonConfig.requireEndpointsInRelease(
            authBaseUrl: 'http://ep-x.neonauth.aws.neon.tech/neondb/auth',
            dataApiUrl: api,
            releaseMode: releaseMode,
          ),
          throwsStateError,
          reason: 'releaseMode=$releaseMode',
        );
      }
    });

    test('hosts outside neon.tech are rejected in every mode', () {
      for (final host in ['auth.example.com', 'neon.tech.evil.example.com']) {
        expect(
          () => NeonConfig.requireEndpointsInRelease(
            authBaseUrl: 'https://$host/neondb/auth',
            dataApiUrl: api,
            releaseMode: false,
          ),
          throwsStateError,
          reason: host,
        );
      }
    });

    test('malformed and credential-carrying URIs are rejected', () {
      for (final raw in [
        'not a url',
        '://missing-scheme',
        'https://user:pass@ep-x.neonauth.aws.neon.tech/neondb/auth',
      ]) {
        expect(
          () => NeonConfig.requireEndpointsInRelease(
            authBaseUrl: raw,
            dataApiUrl: api,
            releaseMode: true,
          ),
          throwsStateError,
          reason: raw,
        );
      }
    });

    test('loopback endpoints stay allowed for local dev backends', () {
      expect(
        () => NeonConfig.requireEndpointsInRelease(
          authBaseUrl: 'http://localhost:3000/auth',
          dataApiUrl: 'http://127.0.0.1:54321/rest/v1',
          releaseMode: false,
        ),
        returnsNormally,
      );
    });
  });

  group('NeonConfig.fromEnvironment', () {
    // flutter test runs with kReleaseMode=false and no defines — the
    // dev defaults (today: the production Neon project) apply and
    // nothing throws.
    test('defaults to the dev endpoints in tests', () {
      final config = NeonConfig.fromEnvironment();
      expect(config.isConfigured, isTrue);
      expect(config.authBaseUrl, contains('neonauth'));
      expect(config.dataApiUrl, contains('apirest'));
    });
  });
}
