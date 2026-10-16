import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../shared/timed_snack_bar.dart';

/// Per-account "first-run activation done" flag — 'mf_onboarded_`uid`'.
/// Account-scoped like the dashboard snapshot key: it survives ordinary
/// sign-out (a different account carries a different key; the same account
/// must not re-see the flow on re-login) and sits inside the `mf_` prefix
/// sweep, so the local-data wipe clears it. Mirrors the web's
/// `moneyflow-onboarding-done` localStorage flag, scoped per account.
class OnboardingPrefs {
  OnboardingPrefs._();

  static String keyFor(String userId) => 'mf_onboarded_$userId';

  static bool isDone(SharedPreferences prefs, String userId) =>
      prefs.getBool(keyFor(userId)) ?? false;

  static Future<void> markDone(SharedPreferences prefs, String userId) =>
      prefs.setBool(keyFor(userId), true);
}

/// Step metadata — mirrors the web's ONBOARDING_STEPS
/// (src/lib/onboarding.ts): trust → cash wallet → first expense.
const _steps = [
  (title: 'Cam kết của MoneyFlow', shortLabel: 'Cam kết'),
  (title: 'Ví tiền mặt', shortLabel: 'Ví'),
  (title: 'Ghi chi đầu tiên', shortLabel: 'Ghi chi'),
];

/// Step-1 trust copy — the web's TRUST_PROMISES verbatim.
const _trustPromises = [
  'Không hỏi mật khẩu / OTP ngân hàng',
  'Xuất dữ liệu (CSV) bất cứ lúc nào',
  'Có thể xóa dữ liệu bất cứ lúc nào',
];

/// Post-auth first-run activation — the mobile port of the web's
/// /onboarding flow (src/components/onboarding-flow.tsx). Shown once per
/// account: the gate shows it after sign-up, or when the signed-in
/// account's ledger is still empty and [OnboardingPrefs] is unset. Demo
/// mode never reaches it — the gate only routes signed-in sessions here.
///
/// Steps mirror the web: (1) trust promises, (2) the shared account form
/// confirming the seeded cash wallet or creating the first one, (3) an
/// optional first-expense nudge ("Ghi chi đầu" opens capture; the quick-
/// parse hint quotes the capture field's own placeholder). Every step is
/// reachable backwards and steps 1–2 carry the web's "Để sau" skip.
class OnboardingPage extends StatefulWidget {
  const OnboardingPage({
    super.key,
    required this.hasCashWallet,
    required this.onWalletStep,
    required this.onQuickExpense,
    required this.onDone,
  });

  /// True when the account already carries a cash wallet (the server
  /// seeds 'Tiền mặt' on sign-up) — step 2 then mirrors the web's
  /// confirm variant instead of the create one.
  final bool hasCashWallet;

  /// Step-2 primary action — the host opens the shared account form
  /// (update the seeded wallet, or create it). Returns the saved
  /// wallet's name for the step-3 summary; null when cancelled.
  final Future<String?> Function() onWalletStep;

  /// Step-3 primary "Ghi chi đầu" — the host marks the flag and opens
  /// the capture route.
  final VoidCallback onQuickExpense;

  /// "Để sau" / "Vào tổng quan" — the host marks the flag and lands on
  /// the shell.
  final VoidCallback onDone;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  int _step = 1;
  String? _walletName;
  bool _walletBusy = false;

  /// The wallet form reports a save only when a write really landed —
  /// cancel (null) keeps the user on step 2, like the web flow.
  Future<void> _runWalletStep() async {
    setState(() => _walletBusy = true);
    try {
      final name = await widget.onWalletStep();
      if (!mounted) return;
      if (name == null) return;
      setState(() {
        _walletName = name;
        _step = 3;
      });
    } catch (_) {
      if (mounted) {
        showTimedSnackBar(
          ScaffoldMessenger.of(context),
          const SnackBar(content: Text('Không mở được biểu mẫu — thử lại')),
        );
      }
    } finally {
      if (mounted) setState(() => _walletBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.account_balance_wallet_outlined,
                    size: 20,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Text('MoneyFlow', style: theme.textTheme.titleMedium),
                ],
              ),
              const SizedBox(height: 16),
              _progress(theme),
              const SizedBox(height: 20),
              Expanded(
                child: SingleChildScrollView(
                  child: switch (_step) {
                    1 => _trustStep(theme),
                    2 => _walletStepView(theme),
                    _ => _expenseStep(theme),
                  },
                ),
              ),
              const SizedBox(height: 16),
              _actions(),
              if (_step != 3)
                TextButton(
                  onPressed: widget.onDone,
                  child: const Text('Để sau — vào Tổng quan'),
                ),
            ],
          ),
        ),
      ),
    );
  }

  /// "Bước n/3 · <title>" plus one pill per step — the same progress
  /// contract the web's dots + aria label carry.
  Widget _progress(ThemeData theme) {
    final meta = _steps[_step - 1];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          label: 'Bước $_step/${_steps.length} · ${meta.title}',
          child: Text(
            'Bước $_step/${_steps.length} · ${meta.title}',
            style: theme.textTheme.labelLarge,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (var i = 1; i <= _steps.length; i++)
              Container(
                width: i == _step ? 24 : 8,
                height: 8,
                margin: const EdgeInsets.only(right: 6),
                decoration: BoxDecoration(
                  color: i <= _step
                      ? theme.colorScheme.primary
                      : theme.colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
          ],
        ),
      ],
    );
  }

  Widget _trustStep(ThemeData theme) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Bạn kiểm soát dữ liệu',
        style: theme.textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 12),
      Text(
        'MoneyFlow là sổ thu chi cá nhân — không kết nối ngân hàng, '
        'không lấy mật khẩu NH.',
        style: theme.textTheme.bodyLarge,
      ),
      const SizedBox(height: 20),
      for (final promise in _trustPromises)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              Icon(
                Icons.check_circle_outline,
                size: 20,
                color: theme.colorScheme.primary,
              ),
              const SizedBox(width: 12),
              Expanded(child: Text(promise, style: theme.textTheme.bodyLarge)),
            ],
          ),
        ),
    ],
  );

  Widget _walletStepView(ThemeData theme) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Xác nhận ví tiền mặt',
        style: theme.textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 12),
      Text(
        widget.hasCashWallet
            ? 'Bạn đã có ví tiền mặt. Kiểm tra tên và số dư ban đầu '
                  '(có thể sửa sau).'
            : 'Tạo ví tiền mặt để ghi chi tiêu nhanh. Thêm ngân hàng / '
                  'ví điện tử sau trong Tài khoản.',
        style: theme.textTheme.bodyLarge,
      ),
      const SizedBox(height: 8),
      Text(
        'Tiền tệ mặc định: VND (đồng Việt Nam).',
        style: theme.textTheme.bodySmall,
      ),
    ],
  );

  Widget _expenseStep(ThemeData theme) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        'Ghi chi tiêu đầu tiên?',
        style: theme.textTheme.headlineSmall?.copyWith(
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 12),
      Text(
        'Không bắt buộc. Bạn có thể ghi một khoản chi nhanh, hoặc vào '
        'Tổng quan ngay.'
        '${_walletName != null ? ' Ví tiền mặt đã được xác nhận.' : ''}',
        style: theme.textTheme.bodyLarge,
      ),
      if (_walletName != null) ...[
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ví: $_walletName · VND',
                  style: theme.textTheme.titleSmall,
                ),
                const SizedBox(height: 4),
                Text(
                  'Nhập sao kê là tùy chọn sau — không phải bước bắt '
                  'buộc lúc mới vào.',
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ),
      ],
      const SizedBox(height: 16),
      // The capture form's own quick-parse hint — onboarding teaches the
      // same gesture the field advertises.
      Text(
        'Mẹo: trong màn Ghi, gõ nhanh kiểu "ăn trưa 45k" — MoneyFlow tự '
        'điền số tiền và danh mục.',
        style: theme.textTheme.bodySmall,
      ),
    ],
  );

  Widget _actions() => switch (_step) {
    1 => FilledButton(
      onPressed: () => setState(() => _step = 2),
      child: const Text('Tiếp'),
    ),
    2 => Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: _walletBusy ? null : () => setState(() => _step = 1),
            child: const Text('Quay lại'),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: FilledButton(
            onPressed: _walletBusy ? null : _runWalletStep,
            child: Text(
              _walletBusy
                  ? 'Đang mở…'
                  : widget.hasCashWallet
                  ? 'Xác nhận ví'
                  : 'Tạo ví tiền mặt',
            ),
          ),
        ),
      ],
    ),
    _ => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton(
          onPressed: widget.onQuickExpense,
          child: const Text('Ghi chi đầu'),
        ),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: widget.onDone,
          child: const Text('Vào tổng quan'),
        ),
        TextButton(
          onPressed: () => setState(() => _step = 2),
          child: const Text('Quay lại chỉnh ví'),
        ),
      ],
    ),
  };
}
