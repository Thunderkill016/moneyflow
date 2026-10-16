import 'package:flutter/material.dart';

import '../../app/url_opener.dart';
import '../../theme/mf_theme.dart';
import '../../data/google_sign_in.dart';
import '../../data/neon/auth_client.dart';
import 'auth_scaffold.dart';
import 'google_mark.dart';
import '../shared/timed_snack_bar.dart';

/// Dedicated register screen — mirrors the web /register page instead of
/// toggling fields inside login. One job: create an account.
///
/// Mirrors the web schema (src/app/(auth)/actions.ts registerSchema):
/// name ≥ 2, email, password 12–72, confirm must match, privacy accepted.
/// The client check is the only gate here — Better Auth never sees the
/// confirm field, so a mismatch blocked client-side can't create an
/// account nobody can sign into.
///
/// Google sign-in can't tell a new account from a returning one upstream,
/// so it always lands on [onSignedIn]; email sign-up lands on
/// [onRegistered] (the onboarding boundary).
class RegisterPage extends StatefulWidget {
  const RegisterPage({
    super.key,
    required this.auth,
    required this.onRegistered,
    required this.onSignedIn,
    this.googleFlow,
    this.urlOpener = const DeviceUrlOpener(),
  });

  final NeonAuthClient auth;
  final ValueChanged<NeonSession> onRegistered;
  final ValueChanged<NeonSession> onSignedIn;
  final GoogleSignInFlow? googleFlow;
  final UrlOpener urlOpener;

  /// Product password policy — matches the web's PASSWORD_MIN_LENGTH.
  static const minPasswordLength = 12;

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  bool _googleWaiting = false;
  bool _showPassword = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  /// Client-side mirror of the web registerSchema — every rejection the
  /// server would make is caught here first so the error names the field.
  String? _validate() {
    if (_name.text.trim().length < 2) return 'Tên cần ít nhất 2 ký tự';
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      return 'Email chưa đúng định dạng';
    }
    if (_password.text.length < RegisterPage.minPasswordLength) {
      return 'Mật khẩu cần ít nhất ${RegisterPage.minPasswordLength} ký tự';
    }
    if (_password.text != _confirm.text) {
      return 'Mật khẩu nhập lại chưa khớp';
    }
    return null;
  }

  Future<void> _submit() async {
    final invalid = _validate();
    if (invalid != null) {
      setState(() => _error = invalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await widget.auth.signUp(
        _name.text.trim(),
        _email.text.trim(),
        _password.text,
      );
      if (!mounted) return;
      // Pop before the callback switches the gate — otherwise this pushed
      // route stays on the stack and keeps the onboarding gate offstage.
      Navigator.of(context).pop();
      widget.onRegistered(session);
    } on NeonAuthException catch (e) {
      setState(() => _error = _friendly(e));
    } catch (_) {
      setState(() => _error = 'Không kết nối được máy chủ');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// Same inline-waiting contract as login: the loopback round-trip runs
  /// in an in-app browser view while the indicator under the button
  /// carries the state — no dialog route that could outlive this page.
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
      if (!mounted || session == null) return;
      // Pop before the callback swaps the gate (see _submit).
      Navigator.of(context).pop();
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

  String _friendly(NeonAuthException e) {
    if (e.message.contains('USER_ALREADY_EXISTS')) {
      return 'Email này đã có tài khoản — hãy đăng nhập';
    }
    return 'Tạo tài khoản thất bại (${e.status})';
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Tạo tài khoản MoneyFlow',
      description: 'Ghi thu, chi và chuyển tiền đúng bản chất ngay từ đầu.',
      children: [
        if (widget.googleFlow != null) ...[
          GoogleSignInButton(
            onPressed: _busy ? null : _signInWithGoogle,
            label: 'Đăng ký bằng Google',
          ),
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
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Row(
              children: [
                const Expanded(child: Divider()),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(
                    'hoặc tiếp tục bằng email',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: context.mf.textMuted,
                    ),
                  ),
                ),
                const Expanded(child: Divider()),
              ],
            ),
          ),
        ] else
          const SizedBox(height: 4),
        AutofillGroup(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextField(
                controller: _name,
                autofillHints: const [AutofillHints.name],
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Họ và tên',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
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
                autofillHints: const [AutofillHints.newPassword],
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: 'Mật khẩu',
                  helperText: 'Ít nhất ${RegisterPage.minPasswordLength} ký tự',
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
              const SizedBox(height: 12),
              TextField(
                controller: _confirm,
                obscureText: !_showPassword,
                autofillHints: const [AutofillHints.newPassword],
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _busy ? null : _submit(),
                decoration: const InputDecoration(
                  labelText: 'Nhập lại mật khẩu',
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // The web register requires an explicit privacy checkbox; mobile
        // keeps the same consent through this line plus the policy link.
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              'Bằng việc tạo tài khoản, bạn đồng ý với ',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: context.mf.textMuted),
            ),
            InkWell(
              onTap: () => widget.urlOpener.open(Uri.parse(kPrivacyPolicyUrl)),
              child: Text(
                'chính sách quyền riêng tư',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: context.mf.brandText,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            Text(
              ' của MoneyFlow',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(color: context.mf.textMuted),
            ),
          ],
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: TextStyle(color: context.mf.expenseText),
          ),
        ],
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _busy ? null : _submit,
          child: Text(_busy ? '…' : 'Tạo tài khoản'),
        ),
        TextButton(
          onPressed: _busy ? null : () => Navigator.of(context).pop(),
          child: const Text('Đã có tài khoản? Đăng nhập'),
        ),
      ],
    );
  }
}
