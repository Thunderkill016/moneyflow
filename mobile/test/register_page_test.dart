import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/data/neon/neon_config.dart';
import 'package:moneyflow/data/neon/neon_transport.dart';
import 'package:moneyflow/features/auth/login_page.dart';
import 'package:moneyflow/features/auth/register_page.dart';

const _config = NeonConfig(
  authBaseUrl: 'https://auth.test/neondb/auth',
  dataApiUrl: 'https://api.test/neondb/rest/v1',
);

void main() {
  group('RegisterPage via LoginPage', () {
    Future<NeonAuthClient> openRegister(
      WidgetTester t, {
      void Function(NeonSession)? onSignedUp,
      List<NeonRequest>? seen,
      NeonResponse? response,
    }) async {
      // Tall viewport so the whole scrollable form builds — lazy sliver
      // children below the fold don't exist for finders otherwise.
      t.view.physicalSize = const Size(1080, 2400);
      t.view.devicePixelRatio = 1;
      addTearDown(t.view.resetPhysicalSize);
      addTearDown(t.view.resetDevicePixelRatio);
      final auth = NeonAuthClient(
        config: _config,
        requester: (req) async {
          seen?.add(req);
          return response ??
              const NeonResponse(status: 200, headers: {}, body: '{}');
        },
      );
      await t.pumpWidget(
        MaterialApp(
          home: LoginPage(
            auth: auth,
            onSignedIn: (_) {},
            onSignedUp: onSignedUp,
          ),
        ),
      );
      await t.tap(find.text('Chưa có tài khoản? Đăng ký'));
      await t.pumpAndSettle();
      return auth;
    }

    // The register form scrolls on a small test viewport — lazy ListView
    // children off the fold aren't built until they're scrolled into view.
    Future<void> fill(WidgetTester t, String label, String value) async {
      final field = find.widgetWithText(TextField, label);
      await t.ensureVisible(field);
      await t.enterText(field, value);
    }

    Future<void> fillValid(WidgetTester t) async {
      await fill(t, 'Họ và tên', 'Nguyen');
      await fill(t, 'Email', 'a@b.c');
      await fill(t, 'Mật khẩu', 'password1234');
      await fill(t, 'Nhập lại mật khẩu', 'password1234');
    }

    Future<void> submit(WidgetTester t) async {
      final button = find.widgetWithText(FilledButton, 'Tạo tài khoản');
      await t.ensureVisible(button);
      await t.tap(button);
      await t.pumpAndSettle();
    }

    testWidgets('the dedicated page carries the web register fields', (
      t,
    ) async {
      await openRegister(t);

      expect(find.text('Tạo tài khoản MoneyFlow'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Họ và tên'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Email'), findsOneWidget);
      expect(find.widgetWithText(TextField, 'Mật khẩu'), findsOneWidget);
      final confirm = find.widgetWithText(TextField, 'Nhập lại mật khẩu');
      await t.ensureVisible(confirm);
      expect(confirm, findsOneWidget);
      final submit = find.widgetWithText(FilledButton, 'Tạo tài khoản');
      await t.ensureVisible(submit);
      expect(submit, findsOneWidget);
      expect(find.textContaining('chính sách quyền riêng tư'), findsOneWidget);
      final backLink = find.text('Đã có tài khoản? Đăng nhập');
      await t.ensureVisible(backLink);
      expect(backLink, findsOneWidget);
    });

    testWidgets('a short password is rejected before the network', (t) async {
      final seen = <NeonRequest>[];
      await openRegister(t, seen: seen);

      await fill(t, 'Họ và tên', 'Nguyen');
      await fill(t, 'Email', 'a@b.c');
      // 11 chars — under the product policy minimum of 12.
      await fill(t, 'Mật khẩu', 'password123');
      await fill(t, 'Nhập lại mật khẩu', 'password123');
      await submit(t);

      expect(seen, isEmpty);
      expect(find.textContaining('ít nhất 12 ký tự'), findsOneWidget);
    });

    testWidgets('a confirm mismatch is rejected before the network', (t) async {
      final seen = <NeonRequest>[];
      await openRegister(t, seen: seen);

      await fill(t, 'Họ và tên', 'Nguyen');
      await fill(t, 'Email', 'a@b.c');
      await fill(t, 'Mật khẩu', 'password1234');
      await fill(t, 'Nhập lại mật khẩu', 'password9999');
      await submit(t);

      expect(seen, isEmpty);
      expect(find.text('Mật khẩu nhập lại chưa khớp'), findsOneWidget);
    });

    testWidgets('a missing name is rejected before the network', (t) async {
      final seen = <NeonRequest>[];
      await openRegister(t, seen: seen);

      await fill(t, 'Email', 'a@b.c');
      await fill(t, 'Mật khẩu', 'password1234');
      await fill(t, 'Nhập lại mật khẩu', 'password1234');
      await submit(t);

      expect(seen, isEmpty);
      expect(find.text('Tên cần ít nhất 2 ký tự'), findsOneWidget);
    });

    testWidgets('a valid form calls sign-up and lands on onSignedUp', (
      t,
    ) async {
      NeonSession? got;
      final seen = <NeonRequest>[];
      await openRegister(
        t,
        seen: seen,
        onSignedUp: (s) => got = s,
        response: const NeonResponse(
          status: 200,
          headers: {'set-cookie': 'x'},
          body:
              '{"user":{"id":"u1","email":"a@b.c","name":"Nguyen"},'
              '"token":"tok-1"}',
        ),
      );

      await fillValid(t);
      await submit(t);

      expect(seen.single.url.path, '/neondb/auth/sign-up/email');
      expect(got?.userId, 'u1');
    });

    testWidgets('the back link returns to the login form', (t) async {
      await openRegister(t);

      final backLink = find.text('Đã có tài khoản? Đăng nhập');
      await t.ensureVisible(backLink);
      await t.tap(backLink);
      await t.pumpAndSettle();

      expect(find.byType(RegisterPage), findsNothing);
      expect(find.widgetWithText(FilledButton, 'Đăng nhập'), findsOneWidget);
    });
  });
}
