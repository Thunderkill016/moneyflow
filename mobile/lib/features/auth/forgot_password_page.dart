import 'package:flutter/material.dart';

import '../../theme/mf_theme.dart';
import '../../data/neon/auth_client.dart';
import 'auth_scaffold.dart';

/// Dedicated forgot-password screen — same shape as the web
/// /forgot-password page: title, one-line explanation, email field,
/// submit, then an inline success state. Non-enumerating by design:
/// success and failure both land on the same message, and errors are
/// swallowed so the request can't reveal whether an account exists.
class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({
    super.key,
    required this.auth,
    this.initialEmail = '',
  });

  final NeonAuthClient auth;
  final String initialEmail;

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  late final _email = TextEditingController(text: widget.initialEmail);
  bool _busy = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _email.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Nhập email đã đăng ký');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.auth.requestPasswordReset(email);
    } catch (_) {
      // Swallowed on purpose — the same message shows for existing and
      // non-existing accounts, and for transport failures. The user
      // learns nothing about which emails are registered.
    }
    if (mounted) {
      setState(() {
        _busy = false;
        _sent = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Đặt lại mật khẩu',
      description:
          'Nhập email đã đăng ký. Chúng tôi sẽ gửi liên kết để bạn tạo '
          'mật khẩu mới.',
      children: [
        if (_sent) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Icon(
                    Icons.mark_email_read_outlined,
                    size: 40,
                    color: context.mf.brandText,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Nếu email tồn tại, MoneyFlow đã gửi liên kết đặt '
                    'lại mật khẩu',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Kiểm tra hộp thư — kể cả mục Spam — rồi mở liên '
                    'kết để tạo mật khẩu mới.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: context.mf.textMuted,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Quay lại đăng nhập'),
          ),
          TextButton(
            onPressed: _busy ? null : _submit,
            child: const Text('Gửi lại liên kết'),
          ),
        ] else ...[
          AutofillGroup(
            child: TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _busy ? null : _submit(),
              decoration: const InputDecoration(
                labelText: 'Email',
                border: OutlineInputBorder(),
              ),
            ),
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
            child: Text(_busy ? '…' : 'Gửi liên kết'),
          ),
          TextButton(
            onPressed: _busy ? null : () => Navigator.of(context).pop(),
            child: const Text('Quay lại đăng nhập'),
          ),
        ],
      ],
    );
  }
}
