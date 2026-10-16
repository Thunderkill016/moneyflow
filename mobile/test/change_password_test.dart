import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/data/neon/auth_client.dart';
import 'package:moneyflow/features/settings/change_password_page.dart';
import 'package:moneyflow/features/settings/settings_page.dart';

/// Harness that hosts the page inside a real Navigator so `pop(true)`
/// is observable.
class _Host extends StatefulWidget {
  const _Host({required this.submit});

  final Future<void> Function(String current, String next) submit;

  @override
  State<_Host> createState() => _HostState();
}

class _HostState extends State<_Host> {
  bool popped = false;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: FilledButton(
      onPressed: () async {
        final result = await Navigator.of(context).push<bool>(
          MaterialPageRoute(
            builder: (_) => ChangePasswordPage(onSubmit: widget.submit),
          ),
        );
        if (result == true) setState(() => popped = true);
      },
      child: const Text('open'),
    ),
  );
}

Future<void> _open(WidgetTester t, _Host host) async {
  await t.pumpWidget(MaterialApp(home: host));
  await t.tap(find.text('open'));
  await t.pumpAndSettle();
}

Future<void> _fill(
  WidgetTester t, {
  String current = '',
  String next = '',
  String confirm = '',
}) async {
  await t.enterText(
    find.widgetWithText(TextField, 'Mật khẩu hiện tại'),
    current,
  );
  await t.enterText(find.widgetWithText(TextField, 'Mật khẩu mới'), next);
  await t.enterText(
    find.widgetWithText(TextField, 'Nhập lại mật khẩu mới'),
    confirm,
  );
}

void main() {
  testWidgets('empty fields surface a local error, no submit', (t) async {
    var calls = 0;
    await _open(t, _Host(submit: (_, _) async => calls++));
    await t.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
    await t.pump();
    expect(
      find.text('Nhập đầy đủ mật khẩu hiện tại và mật khẩu mới'),
      findsOneWidget,
    );
    expect(calls, 0);
  });

  testWidgets('short new password is rejected before the network', (t) async {
    var calls = 0;
    await _open(t, _Host(submit: (_, _) async => calls++));
    await _fill(t, current: 'old-password-1', next: 'short', confirm: 'short');
    await t.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
    await t.pump();
    expect(find.textContaining('ít nhất'), findsOneWidget);
    expect(calls, 0);
  });

  testWidgets('mismatched confirm is rejected before the network', (t) async {
    var calls = 0;
    await _open(t, _Host(submit: (_, _) async => calls++));
    await _fill(
      t,
      current: 'old-password-1',
      next: 'new-password-1',
      confirm: 'new-password-2',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
    await t.pump();
    expect(find.text('Mật khẩu mới nhập lại chưa khớp'), findsOneWidget);
    expect(calls, 0);
  });

  testWidgets('same old and new password is rejected locally', (t) async {
    var calls = 0;
    await _open(t, _Host(submit: (_, _) async => calls++));
    await _fill(
      t,
      current: 'same-password-1',
      next: 'same-password-1',
      confirm: 'same-password-1',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
    await t.pump();
    expect(
      find.text('Mật khẩu mới phải khác mật khẩu hiện tại'),
      findsOneWidget,
    );
    expect(calls, 0);
  });

  testWidgets('success submits the seam and pops true', (t) async {
    final seen = <(String, String)>[];
    final host = _Host(submit: (c, n) async => seen.add((c, n)));
    await _open(t, host);
    await _fill(
      t,
      current: 'old-password-1',
      next: 'new-password-1',
      confirm: 'new-password-1',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
    await t.pumpAndSettle();
    expect(seen, [('old-password-1', 'new-password-1')]);
    // Back at the host — the page popped true.
    expect(find.byType(ChangePasswordPage), findsNothing);
    expect(find.text('open'), findsOneWidget);
  });

  testWidgets('INVALID_PASSWORD maps to a wrong-current message', (t) async {
    await _open(
      t,
      _Host(
        submit: (_, _) async =>
            throw NeonAuthException(400, 'INVALID_PASSWORD'),
      ),
    );
    await _fill(
      t,
      current: 'wrong-password-1',
      next: 'new-password-1',
      confirm: 'new-password-1',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
    await t.pumpAndSettle();
    expect(find.text('Mật khẩu hiện tại chưa đúng'), findsOneWidget);
    // The page stays — the user can retry without reopening settings.
    expect(find.byType(ChangePasswordPage), findsOneWidget);
  });

  testWidgets('a generic seam failure surfaces honestly', (t) async {
    await _open(t, _Host(submit: (_, _) async => throw StateError('x')));
    await _fill(
      t,
      current: 'old-password-1',
      next: 'new-password-1',
      confirm: 'new-password-1',
    );
    await t.tap(find.widgetWithText(FilledButton, 'Đổi mật khẩu'));
    await t.pumpAndSettle();
    expect(find.text('Không đổi được mật khẩu — thử lại sau'), findsOneWidget);
  });

  testWidgets('settings surfaces the row only when the seam is wired', (
    t,
  ) async {
    await t.pumpWidget(
      const MaterialApp(home: SettingsPage(onChangePassword: _noop)),
    );
    expect(find.text('Đổi mật khẩu'), findsOneWidget);

    await t.pumpWidget(const MaterialApp(home: SettingsPage()));
    await t.pumpAndSettle();
    expect(find.text('Đổi mật khẩu'), findsNothing);
  });
}

void _noop() {}
