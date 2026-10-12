import 'package:flutter/material.dart';

import '../../data/neon/auth_client.dart';

/// Email/password auth against managed Better Auth (Neon).
/// Sign-in and sign-up share the screen — matching the web's /login flow.
class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.auth,
    required this.onSignedIn,
    this.onDemo,
  });

  final NeonAuthClient auth;
  final ValueChanged<NeonSession> onSignedIn;
  final VoidCallback? onDemo;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;
  bool _busy = false;
  String? _error;

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = _signUp
          ? await widget.auth.signUp(
              _name.text.trim(),
              _email.text.trim(),
              _password.text,
            )
          : await widget.auth.signIn(_email.text.trim(), _password.text);
      if (!mounted) return;
      widget.onSignedIn(session);
    } on NeonAuthException catch (e) {
      setState(() => _error = _friendly(e));
    } catch (e) {
      setState(() => _error = 'Không kết nối được máy chủ');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _friendly(NeonAuthException e) {
    if (e.status == 401 || e.message.contains('INVALID_EMAIL_OR_PASSWORD')) {
      return 'Email hoặc mật khẩu chưa đúng';
    }
    if (e.message.contains('USER_ALREADY_EXISTS')) {
      return 'Email này đã có tài khoản — hãy đăng nhập';
    }
    return 'Đăng nhập thất bại (${e.status})';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.all(24),
              children: [
                Text(
                  'MoneyFlow',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  'Sổ tiền của bạn',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 28),
                if (_signUp) ...[
                  TextField(
                    controller: _name,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'Tên',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                TextField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _password,
                  obscureText: true,
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _busy ? null : _submit(),
                  decoration: const InputDecoration(
                    labelText: 'Mật khẩu',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),
                if (_error != null) ...[
                  Text(
                    _error!,
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.red.shade700),
                  ),
                  const SizedBox(height: 8),
                ],
                FilledButton(
                  onPressed: _busy ? null : _submit,
                  child: Text(
                    _busy
                        ? '…'
                        : _signUp
                        ? 'Tạo tài khoản'
                        : 'Đăng nhập',
                  ),
                ),
                TextButton(
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                          _signUp = !_signUp;
                          _error = null;
                        }),
                  child: Text(
                    _signUp
                        ? 'Đã có tài khoản? Đăng nhập'
                        : 'Chưa có tài khoản? Đăng ký',
                  ),
                ),
                if (widget.onDemo != null) ...[
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: widget.onDemo,
                    child: const Text('Xem bản demo (không cần đăng nhập)'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
