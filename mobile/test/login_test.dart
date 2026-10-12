import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/features/auth/login_page.dart';

const _config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

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
}
