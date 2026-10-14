import 'dart:async';

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

/// Scripted redirect-flow seam — no browser or loopback socket in widget
/// tests. [completer] models the browser round-trip pending; [cancel]
/// records the user aborting from the waiting dialog.
class _FakeGoogleFlow implements GoogleSignInFlow {
  _FakeGoogleFlow({this.session, this.error});

  final NeonSession? session;
  final Object? error;
  var calls = 0;
  var cancels = 0;
  Completer<NeonSession?>? completer;

  @override
  Future<NeonSession?> signIn() {
    calls++;
    if (error != null) return Future.error(error!);
    if (session != null) return Future.value(session);
    return (completer ??= Completer<NeonSession?>()).future;
  }

  @override
  void cancel() {
    cancels++;
    completer?.complete(null);
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

  group('LoginPage Google sign-in (loopback redirect)', () {
    NeonAuthClient fakeAuth() => NeonAuthClient(
      config: _config,
      requester: (_) async =>
          const NeonResponse(status: 500, headers: {}, body: '{}'),
    );

    const session = NeonSession(
      sessionToken: 'signed.tok',
      userId: 'u-g',
      email: 'g@x.c',
      name: 'G',
    );

    testWidgets('the button is hidden without a configured flow', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(),
            onSignedIn: (_) {},
            // No googleFlow — the honest capability gate.
          ),
        ),
      );

      expect(find.text('Đăng nhập bằng Google'), findsNothing);
      expect(find.text('Đăng nhập'), findsOneWidget);
    });

    testWidgets('the button shows when a flow is configured', (t) async {
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(),
            onSignedIn: (_) {},
            googleFlow: _FakeGoogleFlow(session: session),
          ),
        ),
      );

      expect(find.text('Đăng nhập bằng Google'), findsOneWidget);
    });

    testWidgets('success rides the same onSignedIn path as email sign-in', (
      t,
    ) async {
      NeonSession? got;
      final flow = _FakeGoogleFlow(session: session);
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(),
            onSignedIn: (s) => got = s,
            googleFlow: flow,
          ),
        ),
      );

      await t.tap(find.widgetWithText(OutlinedButton, 'Đăng nhập bằng Google'));
      await t.pumpAndSettle();

      expect(flow.calls, 1);
      expect(got?.userId, 'u-g');
      expect(got?.sessionToken, 'signed.tok');
    });

    testWidgets(
      'the waiting dialog explains the browser leg and Hủy aborts it',
      (t) async {
        var signedIn = 0;
        final flow = _FakeGoogleFlow(); // pending completer
        await t.pumpWidget(
          MaterialApp(
            home: LoginPage(
              auth: fakeAuth(),
              onSignedIn: (_) => signedIn++,
              googleFlow: flow,
            ),
          ),
        );

        await t.tap(
          find.widgetWithText(OutlinedButton, 'Đăng nhập bằng Google'),
        );
        await t.pump();

        // The browser has the consent screen — the dialog must tell the
        // user where to finish and offer a real abort.
        expect(find.text('Đang chờ Google…'), findsOneWidget);

        await t.tap(find.widgetWithText(TextButton, 'Hủy'));
        await t.pumpAndSettle();

        expect(flow.cancels, 1);
        expect(signedIn, 0);
        expect(find.text('Đang chờ Google…'), findsNothing);
        expect(
          find.text('Không thể đăng nhập Google — thử lại sau'),
          findsNothing,
        );
      },
    );

    testWidgets('an aborted flow is silent — no error, no sign-in', (t) async {
      var signedIn = 0;
      final flow = _FakeGoogleFlow()..completer = Completer<NeonSession?>();
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(),
            onSignedIn: (_) => signedIn++,
            googleFlow: flow,
          ),
        ),
      );

      await t.tap(find.widgetWithText(OutlinedButton, 'Đăng nhập bằng Google'));
      await t.pump();
      // The user closed the browser tab without finishing — the flow
      // resolves null rather than an error.
      flow.completer!.complete(null);
      await t.pumpAndSettle();

      expect(signedIn, 0);
      expect(
        find.text('Không thể đăng nhập Google — thử lại sau'),
        findsNothing,
      );
    });

    testWidgets('a flow failure shows the honest snackbar', (t) async {
      var signedIn = 0;
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: fakeAuth(),
            onSignedIn: (_) => signedIn++,
            googleFlow: _FakeGoogleFlow(error: Exception('no browser')),
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
