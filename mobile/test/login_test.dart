import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/google_sign_in.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/features/auth/login_page.dart';

const _config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

/// Scripted idToken source — no plugin channel in widget tests.
/// [token] null models the user cancelling the native sheet.
class _FakeGoogleTokens implements GoogleIdTokenSource {
  _FakeGoogleTokens({this.token, this.error});

  final String? token;
  final Object? error;
  var calls = 0;

  @override
  Future<String?> idToken() async {
    calls++;
    if (error != null) throw error!;
    return token;
  }
}

void main() {
  group('LoginPage forgot password', () {
    testWidgets('sends the reset request and shows the neutral result', (
      t,
    ) async {
      final seen = <NeonRequest>[];
      final auth = NeonAuthClient(
        config: _config,
        requester: (req) async {
          seen.add(req);
          return const NeonResponse(status: 200, headers: {}, body: '{}');
        },
      );
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(auth: auth, onSignedIn: (_) {}),
        ),
      );

      await t.tap(find.text('Quên mật khẩu?'));
      await t.pumpAndSettle();
      expect(find.text('Đặt lại mật khẩu'), findsOneWidget);

      await t.enterText(find.byType(TextField).last, 'a@b.c');
      await t.tap(find.text('Gửi liên kết'));
      await t.pumpAndSettle();

      expect(seen.single.url.path, '/neondb/auth/request-password-reset');
      expect(
        find.text(
          'Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt lại mật khẩu',
        ),
        findsOneWidget,
      );
    });

    testWidgets('failure still shows the same neutral message', (t) async {
      final auth = NeonAuthClient(
        config: _config,
        requester: (_) async => throw Exception('offline'),
      );
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(auth: auth, onSignedIn: (_) {}),
        ),
      );

      await t.tap(find.text('Quên mật khẩu?'));
      await t.pumpAndSettle();
      await t.enterText(find.byType(TextField).last, 'a@b.c');
      await t.tap(find.text('Gửi liên kết'));
      await t.pumpAndSettle();

      expect(
        find.text(
          'Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt lại mật khẩu',
        ),
        findsOneWidget,
      );
    });
  });

  group('LoginPage Google sign-in', () {
    NeonAuthClient fakeAuth(List<NeonRequest> seen, {NeonResponse? onSocial}) =>
        NeonAuthClient(
          config: _config,
          requester: (req) async {
            seen.add(req);
            return onSocial ??
                const NeonResponse(status: 500, headers: {}, body: '{}');
          },
        );

    testWidgets('the button is hidden without a configured token source', (
      t,
    ) async {
      final seen = <NeonRequest>[];
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(seen),
            onSignedIn: (_) {},
            // No googleIdTokens — the honest capability gate.
          ),
        ),
      );

      expect(find.text('Đăng nhập bằng Google'), findsNothing);
      expect(find.text('Đăng nhập'), findsOneWidget);
    });

    testWidgets('the button shows when a token source is configured', (
      t,
    ) async {
      final seen = <NeonRequest>[];
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(seen),
            onSignedIn: (_) {},
            googleIdTokens: _FakeGoogleTokens(token: 'id-token'),
          ),
        ),
      );

      expect(find.text('Đăng nhập bằng Google'), findsOneWidget);
    });

    testWidgets('success exchanges the idToken and signs in', (t) async {
      final seen = <NeonRequest>[];
      NeonSession? session;
      final auth = NeonAuthClient(
        config: _config,
        requester: (req) async {
          seen.add(req);
          return NeonResponse(
            status: 200,
            headers: {
              'set-cookie': '${NeonAuthClient.sessionCookieName}=signed.tok',
            },
            body: jsonEncode({
              'redirect': false,
              'token': 'tok',
              'user': {'id': 'u-g', 'email': 'g@x.c', 'name': 'G'},
            }),
          );
        },
      );
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: auth,
            onSignedIn: (s) => session = s,
            googleIdTokens: _FakeGoogleTokens(token: 'google-id-token'),
          ),
        ),
      );

      await t.tap(find.widgetWithText(OutlinedButton, 'Đăng nhập bằng Google'));
      await t.pumpAndSettle();

      expect(seen.single.url.path, '/neondb/auth/sign-in/social');
      final body = seen.single.body as Map<String, dynamic>;
      expect(body['provider'], 'google');
      expect(body['idToken'], {'token': 'google-id-token'});
      expect(session, isNotNull);
      expect(session!.sessionToken, 'signed.tok');
      expect(session!.userId, 'u-g');
    });

    testWidgets('cancelling the sheet stays silent — no error, no call', (
      t,
    ) async {
      final seen = <NeonRequest>[];
      var signedIn = 0;
      final source = _FakeGoogleTokens(token: null);
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(seen),
            onSignedIn: (_) => signedIn++,
            googleIdTokens: source,
          ),
        ),
      );

      await t.tap(find.widgetWithText(OutlinedButton, 'Đăng nhập bằng Google'));
      await t.pumpAndSettle();

      expect(source.calls, 1);
      expect(seen, isEmpty); // never touched the auth backend
      expect(signedIn, 0);
      expect(
        find.text('Không thể đăng nhập Google — thử lại sau'),
        findsNothing,
      );
    });

    testWidgets('a source failure shows the honest snackbar', (t) async {
      final seen = <NeonRequest>[];
      var signedIn = 0;
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(seen),
            onSignedIn: (_) => signedIn++,
            googleIdTokens: _FakeGoogleTokens(error: Exception('no play')),
          ),
        ),
      );

      await t.tap(find.widgetWithText(OutlinedButton, 'Đăng nhập bằng Google'));
      await t.pumpAndSettle();

      expect(signedIn, 0);
      expect(
        find.text('Không thể đăng nhập Google — thử lại sau'),
        findsOneWidget,
      );
    });

    testWidgets('a server rejection also shows the honest snackbar', (t) async {
      var signedIn = 0;
      final auth = NeonAuthClient(
        config: _config,
        requester: (_) async => NeonResponse(
          status: 200,
          headers: {},
          // The bare-string mistake server-side shape: Better Auth asks
          // for a browser redirect — must surface as a failure.
          body: jsonEncode({'redirect': true, 'url': 'https://x'}),
        ),
      );
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: auth,
            onSignedIn: (_) => signedIn++,
            googleIdTokens: _FakeGoogleTokens(token: 'id-token'),
          ),
        ),
      );

      await t.tap(find.widgetWithText(OutlinedButton, 'Đăng nhập bằng Google'));
      await t.pumpAndSettle();

      expect(signedIn, 0);
      expect(
        find.text('Không thể đăng nhập Google — thử lại sau'),
        findsOneWidget,
      );
    });
  });
}
