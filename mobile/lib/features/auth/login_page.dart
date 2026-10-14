import 'package:flutter/material.dart';

import '../../theme/mf_theme.dart';

import '../../data/google_sign_in.dart';
import '../../data/neon/auth_client.dart';

/// Email/password auth against managed Better Auth (Neon).
/// Sign-in and sign-up share the screen — matching the web's /login flow.
///
/// [googleIdTokens] is the capability gate for native Google sign-in:
/// null hides the button entirely (no dead-end affordance). A token
/// from the source is exchanged server-side via
/// [NeonAuthClient.signInWithGoogleIdToken], so a Google sign-in lands
/// on the same NeonSession as email sign-in.
class LoginPage extends StatefulWidget {
  const LoginPage({
    super.key,
    required this.auth,
    required this.onSignedIn,
    this.onSignedUp,
    this.onDemo,
    this.googleIdTokens,
  });

  final NeonAuthClient auth;
  final ValueChanged<NeonSession> onSignedIn;

  /// Sign-up lands here instead of [onSignedIn] when set — the first-run
  /// activation flow keys off the distinction, mirroring the web's
  /// register → /onboarding redirect. Google sign-in cannot tell new
  /// accounts from returning ones upstream, so it always rides
  /// [onSignedIn].
  final ValueChanged<NeonSession>? onSignedUp;
  final VoidCallback? onDemo;
  final GoogleIdTokenSource? googleIdTokens;

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
      if (_signUp && widget.onSignedUp != null) {
        widget.onSignedUp!(session);
      } else {
        widget.onSignedIn(session);
      }
    } on NeonAuthException catch (e) {
      setState(() => _error = _friendly(e));
    } catch (e) {
      setState(() => _error = 'Không kết nối được máy chủ');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Native Google sheet → idToken → /sign-in/social. Cancelling the
  /// sheet is user intent and stays silent; a real failure (transport,
  /// provider config, server rejection) gets an honest snackbar —
  /// distinct from the inline _error so the email form's message is
  /// never overwritten by a Google failure.
  Future<void> _signInWithGoogle() async {
    final source = widget.googleIdTokens;
    if (source == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final idToken = await source.idToken();
      if (idToken == null) return; // user cancelled the sheet — silent
      final session = await widget.auth.signInWithGoogleIdToken(idToken);
      if (!mounted) return;
      widget.onSignedIn(session);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể đăng nhập Google — thử lại sau'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Reset request only sends the email — the link completes on the
  /// web's /update-password page. The result message is identical
  /// whether the account exists or the request failed (non-enumerating,
  /// same contract as the web's requestPasswordReset action).
  Future<void> _forgotPassword() async {
    final email = await showDialog<String>(
      context: context,
      builder: (ctx) => _ResetEmailDialog(initial: _email.text.trim()),
    );
    if (email == null || !mounted) return;
    try {
      await widget.auth.requestPasswordReset(email);
    } catch (_) {
      /* identical response on failure — do not enumerate accounts */
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt lại mật khẩu',
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
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: ListView(
              shrinkWrap: true,
              padding: const EdgeInsets.all(24),
              children: [
                Center(
                  child: Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: context.mf.brand,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet_outlined,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'MoneyFlow',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Sổ tiền của bạn',
                  textAlign: TextAlign.center,
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: context.mf.textMuted),
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
                    style: TextStyle(color: context.mf.expenseText),
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
                if (widget.googleIdTokens != null) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _signInWithGoogle,
                    // The Google "G" without an asset dependency.
                    icon: const Text(
                      'G',
                      style: TextStyle(
                        color: Color(0xFF4285F4), // Google blue
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    label: const Text('Đăng nhập bằng Google'),
                    // Google's brand button stays white with dark text
                    // in both light and dark themes.
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.black87,
                    ),
                  ),
                ],
                if (!_signUp)
                  TextButton(
                    onPressed: _busy ? null : _forgotPassword,
                    child: const Text('Quên mật khẩu?'),
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

/// Email entry for the reset request — prefilled from the sign-in form.
class _ResetEmailDialog extends StatefulWidget {
  const _ResetEmailDialog({required this.initial});

  final String initial;

  @override
  State<_ResetEmailDialog> createState() => _ResetEmailDialogState();
}

class _ResetEmailDialogState extends State<_ResetEmailDialog> {
  late final TextEditingController _email = TextEditingController(
    text: widget.initial,
  );

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Đặt lại mật khẩu'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text(
            'Nhập email — liên kết đặt lại sẽ được gửi và mở trên trang web MoneyFlow.',
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofocus: true,
            decoration: const InputDecoration(
              labelText: 'Email',
              border: OutlineInputBorder(),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Hủy'),
        ),
        FilledButton(
          onPressed: () {
            final email = _email.text.trim();
            if (email.isNotEmpty) Navigator.pop(context, email);
          },
          child: const Text('Gửi liên kết'),
        ),
      ],
    );
  }
}
