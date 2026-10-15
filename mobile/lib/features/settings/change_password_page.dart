import 'package:flutter/material.dart';

import '../../data/neon/auth_client.dart';

/// Đổi mật khẩu — credential accounts only (the settings row is hidden
/// unless `listProviders()` says 'credential'; a Google-only account has
/// no current password to prove). Submits through the host's seam so the
/// page stays storage-free; on success it pops `true` and the caller
/// owns the confirmation snackbar.
class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key, required this.onSubmit});

  /// POST /change-password through the real auth client. Throws
  /// [NeonAuthException] on rejection — a wrong current password, a too
  /// weak new one, or a dead session all surface here.
  final Future<void> Function(String current, String next) onSubmit;

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  /// Better Auth's default minimum — match it client-side so the round
  /// trip only fires for inputs the server would accept anyway.
  static const _minPasswordLength = 8;

  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  bool _showPasswords = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final current = _current.text;
    final next = _next.text;
    if (current.isEmpty || next.isEmpty) {
      setState(() => _error = 'Nhập đầy đủ mật khẩu hiện tại và mật khẩu mới');
      return;
    }
    if (next.length < _minPasswordLength) {
      setState(
        () => _error = 'Mật khẩu mới cần ít nhất $_minPasswordLength ký tự',
      );
      return;
    }
    if (next != _confirm.text) {
      setState(() => _error = 'Mật khẩu mới nhập lại chưa khớp');
      return;
    }
    if (next == current) {
      setState(() => _error = 'Mật khẩu mới phải khác mật khẩu hiện tại');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSubmit(current, next);
      if (mounted) Navigator.of(context).pop(true);
    } on NeonAuthException catch (e) {
      setState(() {
        _busy = false;
        _error = _friendly(e);
      });
    } catch (_) {
      setState(() {
        _busy = false;
        _error = 'Không đổi được mật khẩu — thử lại sau';
      });
    }
  }

  String _friendly(NeonAuthException e) {
    if (e.status == 401 || e.message.contains('INVALID_PASSWORD')) {
      return 'Mật khẩu hiện tại chưa đúng';
    }
    if (e.message.contains('PASSWORD_TOO_SHORT')) {
      return 'Mật khẩu mới cần ít nhất $_minPasswordLength ký tự';
    }
    return 'Không đổi được mật khẩu (${e.status})';
  }

  InputDecoration _decoration(String label, {String? helper}) =>
      InputDecoration(
        labelText: label,
        helperText: helper,
        border: const OutlineInputBorder(),
        suffixIcon: IconButton(
          tooltip: _showPasswords ? 'Ẩn mật khẩu' : 'Hiện mật khẩu',
          icon: Icon(_showPasswords ? Icons.visibility_off : Icons.visibility),
          onPressed: () => setState(() => _showPasswords = !_showPasswords),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Đổi mật khẩu')),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 380),
          child: ListView(
            shrinkWrap: true,
            padding: const EdgeInsets.all(24),
            children: [
              TextField(
                controller: _current,
                obscureText: !_showPasswords,
                textInputAction: TextInputAction.next,
                autofocus: true,
                decoration: _decoration('Mật khẩu hiện tại'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _next,
                obscureText: !_showPasswords,
                textInputAction: TextInputAction.next,
                decoration: _decoration(
                  'Mật khẩu mới',
                  helper: 'Ít nhất $_minPasswordLength ký tự',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _confirm,
                obscureText: !_showPasswords,
                textInputAction: TextInputAction.done,
                onSubmitted: (_) => _busy ? null : _submit(),
                decoration: _decoration('Nhập lại mật khẩu mới'),
              ),
              const SizedBox(height: 16),
              if (_error != null) ...[
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
                const SizedBox(height: 8),
              ],
              FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(_busy ? '…' : 'Đổi mật khẩu'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
