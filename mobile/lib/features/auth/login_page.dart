import 'package:flutter/material.dart';

import '../../app/url_opener.dart';
import '../../theme/mf_theme.dart';

import '../../data/google_sign_in.dart';
import '../../data/neon/auth_client.dart';
import 'auth_scaffold.dart';
import 'forgot_password_page.dart';
import 'google_mark.dart';
import 'register_page.dart';
import '../shared/timed_snack_bar.dart';

/// Email/password auth against managed Better Auth (Neon).
/// Sign-in keeps this screen; register and forgot-password are
/// dedicated pages — matching the web's /login → /register →
/// /forgot-password split instead of one toggling form.
///
/// [googleFlow] is the capability gate for Google sign-in: null hides
/// the button entirely (no dead-end affordance). The flow runs the
/// browser loopback round-trip and returns a [NeonSession], so Google
/// sign-in lands on the same path as email sign-in.
class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.auth,
    required this.onSignedIn,
    this.onSignedUp,
    this.onDemo,
    this.googleFlow,
    this.urlOpener = const DeviceUrlOpener(),
  });

  final NeonAuthClient auth;
  final ValueChanged<NeonSession> onSignedIn;

  /// Forwarded to [RegisterPage]: email sign-up lands there instead of
  /// [onSignedIn] when set — the first-run activation flow keys off the
  /// distinction, mirroring the web's register → /onboarding redirect.
  /// Google sign-in cannot tell new accounts from returning ones
  /// upstream, so it always rides [onSignedIn] on both pages.
  final ValueChanged<NeonSession>? onSignedUp;
  final VoidCallback? onDemo;
  final GoogleSignInFlow? googleFlow;

  /// Opens the privacy-policy link on the register page; injectable so
  /// tests never reach a real browser.
  final UrlOpener urlOpener;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  bool _googleWaiting = false;
  bool _showPassword = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    // An empty form is a missing input, not a rejected credential — say
    // so instead of sending it to the server and reporting a wrong password.
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Nhập email và mật khẩu');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await widget.auth.signIn(
        _email.text.trim(),
        _password.text,
      );
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

  /// Browser loopback sign-in — the OAuth round-trip happens in an
  /// in-app browser view while an inline indicator carries the waiting
  /// state (a dialog route could outlive this page and strand on top of
  /// the dashboard). Closing the tab (null return) or tapping Hủy stays
  /// silent; a real failure (no browser, transport, provider rejection)
  /// gets the honest snackbar — distinct from the inline _error so the
  /// email form's message is never overwritten.
  Future<void> _signInWithGoogle() async {
    final flow = widget.googleFlow;
    if (flow == null) return;
    setState(() {
      _busy = true;
      _error = null;
      _googleWaiting = true;
    });
    try {
      final session = await flow.signIn();
      if (!mounted || session == null) return; // aborted — silent
      widget.onSignedIn(session);
    } catch (_) {
      if (mounted) {
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          const SnackBar(
            content: Text('Không thể đăng nhập Google — thử lại sau'),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _googleWaiting = false;
        });
      }
    }
  }

  void _openRegister() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => RegisterPage(
          auth: widget.auth,
          onRegistered: widget.onSignedUp ?? widget.onSignedIn,
          onSignedIn: widget.onSignedIn,
          googleFlow: widget.googleFlow,
          urlOpener: widget.urlOpener,
        ),
      ),
    );
  }

  void _openForgotPassword() {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ForgotPasswordPage(
          auth: widget.auth,
          initialEmail: _email.text.trim(),
        ),
      ),
    );
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
    return AuthScaffold(
      title: 'MoneyFlow',
      description: 'Ứng dụng quản lý tài chính cá nhân của riêng bạn',
      children: [
        AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                autofillHints: const [AutofillHints.email],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _password,
                obscureText: !_showPassword,
                autofillHints: const [AutofillHints.password],
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _busy ? null : _submit(),
                decoration: InputDecoration(
                  labelText: 'Mật khẩu',
                  border: const OutlineInputBorder(),
                  suffixIcon: IconButton(
                    tooltip: _showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu',
                    icon: Icon(
                      _showPassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                    ),
                    onPressed: () =>
                        setState(() => _showPassword = !_showPassword),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        if (_error != null) ...[
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: TextStyle(color: context.mf.expenseText),
          ),
          const SizedBox(height: 8),
        ],
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: Text(_busy ? '…' : 'Đăng nhập'),
        ),
        if (widget.googleFlow != null) ...[
          const SizedBox(height: 12),
          GoogleSignInButton(onPressed: _busy ? null : _signInWithGoogle),
          if (_googleWaiting)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
                  const SizedBox(width: 8),
                  const Flexible(
                    child: Text(
                      'Đang đăng nhập Google — hoàn tất trong khung vừa hiện…',
                    ),
                  ),
                  TextButton(
                    onPressed: () => widget.googleFlow?.cancel(),
                    child: const Text('Hủy'),
                  ),
                ],
              ),
            ),
        ],
        TextButton(
          onPressed: _busy ? null : _openForgotPassword,
          child: const Text('Quên mật khẩu?'),
        ),
        TextButton(
          onPressed: _busy ? null : _openRegister,
          child: const Text('Chưa có tài khoản? Đăng ký'),
        ),
        if (widget.onDemo != null) ...[
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: widget.onDemo,
            child: const Text('Xem bản demo (không cần đăng nhập)'),
          ),
        ],
      ],
    );
  }
}
