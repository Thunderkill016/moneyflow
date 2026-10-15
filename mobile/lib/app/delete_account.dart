import 'package:flutter/material.dart';

import '../data/google_sign_in.dart';
import '../data/neon/auth_client.dart';
import 'delete_data.dart' show deleteConfirmText, matchesDeleteConfirm;

/// Server-side account deletion — the mobile twin of the web's
/// /settings/delete-account page (src/components/delete-account-page.tsx).
///
/// Mirrored contract:
///   * the consequence list is shown BEFORE any confirm affordance;
///   * the typed confirmation is the same "gõ XÓA" guard
///     ([deleteConfirmText]) as the local wipe and the web page;
///   * a fresh authentication proves the session owner before the delete —
///     the web's edge function enforces a recent-auth window server-side;
///     the Neon RPC has no such check, so this flow re-authenticates
///     first (password for `credential` accounts, a fresh Google
///     loopback sign-in for social-only ones) instead of trusting the
///     ambient cookie;
///   * the server deletes FIRST — the caller wipes local stores only
///     after this returns true, and a failure leaves the signed-in
///     session and every local byte untouched;
///   * demo mode never reaches here (no server account exists) — the
///     menu item is absent in demo.
///
/// Returns true only when the account is actually gone server-side.
Future<bool> showDeleteAccountFlow(
  BuildContext context, {
  required NeonAuthClient auth,
  required Future<int> Function() deleteAccount,
  GoogleSignInFlow? googleFlow,
}) async {
  final confirmed = await showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => _DeleteAccountDialog(
      auth: auth,
      deleteAccount: deleteAccount,
      googleFlow: googleFlow,
    ),
  );
  return confirmed ?? false;
}

/// How the session owner proves identity again before the irreversible
/// call — chosen from the account's real provider list, never assumed.
enum _ReauthMethod { password, google }

class _DeleteAccountDialog extends StatefulWidget {
  const _DeleteAccountDialog({
    required this.auth,
    required this.deleteAccount,
    this.googleFlow,
  });

  final NeonAuthClient auth;
  final Future<int> Function() deleteAccount;
  final GoogleSignInFlow? googleFlow;

  @override
  State<_DeleteAccountDialog> createState() => _DeleteAccountDialogState();
}

class _DeleteAccountDialogState extends State<_DeleteAccountDialog> {
  final _confirm = TextEditingController();
  final _password = TextEditingController();

  bool _confirmStep = false;
  bool _busy = false;
  String? _error;

  /// Re-auth method resolution: null until /list-accounts answers — a
  /// failed read is a retryable error state, never a guessed method.
  bool _methodLoading = true;
  bool _methodFailed = false;
  _ReauthMethod? _method;

  bool get _confirmOk => matchesDeleteConfirm(_confirm.text);

  @override
  void initState() {
    super.initState();
    _loadMethod();
  }

  Future<void> _loadMethod() async {
    setState(() {
      _methodLoading = true;
      _methodFailed = false;
    });
    try {
      final providers = await widget.auth.listProviders();
      if (!mounted) return;
      setState(() {
        _methodLoading = false;
        // A password re-entry is the deterministic path whenever the
        // account has one; social-only accounts re-auth through Google —
        // but only when this build carries a configured sign-in flow.
        if (providers.contains('credential')) {
          _method = _ReauthMethod.password;
        } else if (providers.contains('google') && widget.googleFlow != null) {
          _method = _ReauthMethod.google;
        } else {
          _method = null;
        }
      });
    } catch (_) {
      if (mounted) {
        setState(() {
          _methodLoading = false;
          _methodFailed = true;
        });
      }
    }
  }

  bool get _canSubmit {
    if (!_confirmOk || _busy || _methodLoading || _methodFailed) {
      return false;
    }
    return switch (_method) {
      _ReauthMethod.password => _password.text.isNotEmpty,
      _ReauthMethod.google => true,
      null => false,
    };
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      // Re-authenticate first — the web's edge function requires a
      // recent authentication for the same reason: the ambient session
      // alone is not proof the account owner is holding the device.
      // On failure the existing session is left in place untouched.
      switch (_method) {
        case _ReauthMethod.password:
          await widget.auth.signIn(
            widget.auth.session?.email ?? '',
            _password.text,
          );
        case _ReauthMethod.google:
          // The redirect sign-in replaces the session wholesale — the
          // user could pick a DIFFERENT Google account in the browser,
          // and deleting would then hit that account. Pin the expected
          // identity and abort on mismatch.
          final prior = widget.auth.session;
          final session = await widget.googleFlow!.signIn();
          if (session == null) {
            // User aborted the browser leg — user intent, back to the
            // confirm step with no error banner.
            setState(() => _busy = false);
            return;
          }
          if (prior != null && session.userId != prior.userId) {
            // Restore the original session — the stranger's session
            // token is dropped, never persisted anywhere.
            await widget.auth.restoreSession(prior.sessionToken);
            if (!mounted) return;
            setState(() {
              _busy = false;
              _error =
                  'Tài khoản Google vừa đăng nhập không khớp tài khoản '
                  'cần xóa — đã hủy, chưa có gì thay đổi.';
            });
            return;
          }
        case null:
          return;
      }
    } on NeonAuthException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error =
            _method == _ReauthMethod.password &&
                (e.status == 401 || e.status == 403)
            ? 'Mật khẩu không đúng — thử lại.'
            : 'Không xác thực lại được (${e.message}) — thử lại.';
      });
      return;
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = 'Không xác thực lại được — kiểm tra kết nối rồi thử lại.';
      });
      return;
    }
    try {
      await widget.deleteAccount();
    } catch (e) {
      // The re-auth already landed, so the session is still live — the
      // honest report keeps the user signed in with data untouched.
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error =
            'Không xóa được tài khoản trên máy chủ — dữ liệu chưa thay '
            'đổi, hãy thử lại. ($e)';
      });
      return;
    }
    if (mounted) Navigator.pop(context, true);
  }

  @override
  void dispose() {
    _confirm.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final email = widget.auth.session?.email ?? '';
    return AlertDialog(
      title: const Text('Xóa tài khoản'),
      content: SingleChildScrollView(
        child: _confirmStep ? _confirmContent(scheme) : _warningContent(email),
      ),
      actions: _confirmStep
          ? [
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() => _confirmStep = false),
                child: const Text('Quay lại'),
              ),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: scheme.error,
                  foregroundColor: scheme.onError,
                ),
                onPressed: _canSubmit ? _submit : null,
                child: Text(_busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'),
              ),
            ]
          : [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Hủy'),
              ),
              FilledButton(
                onPressed: () => setState(() => _confirmStep = true),
                child: const Text('Tiếp tục'),
              ),
            ],
    );
  }

  /// Step 1 — consequences, matching the web page's "Sẽ bị xóa vĩnh
  /// viễn" section. Runs before any confirm affordance exists.
  Widget _warningContent(String email) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Xóa tài khoản là thao tác vĩnh viễn — không thể hoàn tác sau '
          'khi máy chủ hoàn tất.',
        ),
        const SizedBox(height: 12),
        const Text('Sẽ bị xóa vĩnh viễn:'),
        const SizedBox(height: 4),
        Text('• Tài khoản đăng nhập $email'),
        const Text('• Ví, danh mục và toàn bộ giao dịch trên máy chủ'),
        const Text('• Ngân sách, cam kết định kỳ và mục tiêu'),
        const Text('• Inbox, quy tắc tự điền và dữ liệu trên thiết bị này'),
        const SizedBox(height: 12),
        Text(
          'Khác với "Xóa dữ liệu trên máy" — thao tác này xóa cả tài '
          'khoản và sổ trên máy chủ; các thiết bị khác cũng mất quyền '
          'truy cập. Nếu cần giữ dữ liệu, hãy sao lưu trước khi tiếp tục.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }

  /// Step 2 — typed confirmation plus the re-auth step the resolved
  /// method requires. Nothing here mutates until "Xóa vĩnh viễn".
  Widget _confirmContent(ColorScheme scheme) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Xác thực lại tài khoản trước khi xóa — phiên đăng nhập sẵn có '
          'không đủ cho thao tác vĩnh viễn.',
        ),
        const SizedBox(height: 12),
        if (_methodLoading)
          const Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              SizedBox(width: 8),
              Expanded(child: Text('Đang kiểm tra phương thức xác thực…')),
            ],
          )
        else if (_methodFailed)
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Không xác định được phương thức xác thực — kiểm tra '
                'kết nối rồi thử lại.',
                style: TextStyle(color: scheme.error),
              ),
              TextButton(onPressed: _loadMethod, child: const Text('Thử lại')),
            ],
          )
        else if (_method == _ReauthMethod.password)
          TextField(
            controller: _password,
            onChanged: (_) => setState(() {}),
            obscureText: true,
            enabled: !_busy,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu',
              border: OutlineInputBorder(),
            ),
          )
        else if (_method == _ReauthMethod.google)
          const Text(
            'Tài khoản này đăng nhập bằng Google — bạn sẽ xác thực lại '
            'qua Google khi xác nhận xóa.',
          )
        else
          Text(
            'Không có phương thức xác thực lại khả dụng trên thiết bị '
            'này — không thể xóa tài khoản.',
            style: TextStyle(color: scheme.error),
          ),
        const SizedBox(height: 12),
        TextField(
          controller: _confirm,
          onChanged: (_) => setState(() {}),
          enabled: !_busy,
          decoration: const InputDecoration(
            labelText: 'Gõ XÓA để xác nhận',
            border: OutlineInputBorder(),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: TextStyle(color: scheme.error)),
        ],
      ],
    );
  }
}
