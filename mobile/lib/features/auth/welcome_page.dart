import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// First-run flag — device-level like `mf_biometric_enabled`: it survives
/// sign-out (the user already saw the welcome on THIS device) and is
/// swept by the full local-data wipe (`mf_` prefix).
class WelcomePrefs {
  WelcomePrefs._();

  static const seenKey = 'mf_seen_welcome';

  static Future<bool> loadSeen() async =>
      (await SharedPreferences.getInstance()).getBool(seenKey) ?? false;

  static Future<void> markSeen() async =>
      (await SharedPreferences.getInstance()).setBool(seenKey, true);
}

/// Same brand seed as `app.dart`'s kBrandColor — kept local so the
/// feature file never has to import the app shell that hosts it.
const _brandColor = Color(0xFF0EA5E9);

/// First-run welcome — a dark brand surface ahead of the login gate.
/// "Bắt đầu" continues to sign-in; "Xem demo" enters the read-only demo
/// through the same seam the login screen uses. Both choices mark the
/// flag, so the screen is first-run-only.
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key, required this.onStart, required this.onDemo});

  final VoidCallback onStart;
  final VoidCallback onDemo;

  static const _bullets = [
    'Ghi nhanh thu chi — vài giây cho mỗi khoản',
    'Xem lại tiền vào, tiền ra theo tháng',
    'Đặt ngân sách và lên kế hoạch trước',
  ];

  @override
  Widget build(BuildContext context) {
    final theme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: _brandColor,
        brightness: Brightness.dark,
      ),
    );
    return Theme(
      data: theme,
      child: Scaffold(
        backgroundColor: theme.colorScheme.surface,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Spacer(),
                _Entrance(
                  order: 0,
                  child: Center(
                    child: CircleAvatar(
                      radius: 36,
                      backgroundColor: _brandColor.withValues(alpha: 0.16),
                      child: const Icon(
                        Icons.account_balance_wallet_outlined,
                        size: 36,
                        color: _brandColor,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                _Entrance(
                  order: 1,
                  child: Text(
                    'MoneyFlow',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                _Entrance(
                  order: 2,
                  child: Text(
                    'Sổ tiền của bạn',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                for (var i = 0; i < _bullets.length; i++)
                  _Entrance(
                    order: 3 + i,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.check_circle_outline,
                            size: 20,
                            color: _brandColor,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _bullets[i],
                              style: theme.textTheme.bodyLarge,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                const Spacer(),
                _Entrance(
                  order: 6,
                  child: FilledButton(
                    onPressed: onStart,
                    child: const Text('Bắt đầu'),
                  ),
                ),
                const SizedBox(height: 8),
                _Entrance(
                  order: 7,
                  child: OutlinedButton(
                    onPressed: onDemo,
                    child: const Text('Xem demo'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Staggered fade + rise-in for the welcome blocks — one implicit tween
/// per row, the delay folded into an [Interval] curve so no timer or
/// extra package is needed. Honours MediaQuery.disableAnimations.
class _Entrance extends StatelessWidget {
  const _Entrance({required this.order, required this.child});

  /// Stagger position — later rows start deeper into the 600ms window.
  final int order;
  final Widget child;

  static const _duration = Duration(milliseconds: 600);
  static const _step = 0.09;
  static const _latestStart = 0.6;

  @override
  Widget build(BuildContext context) {
    if (MediaQuery.maybeOf(context)?.disableAnimations ?? false) {
      return child;
    }
    final start = (order * _step).clamp(0.0, _latestStart);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: _duration,
      curve: Interval(start, 1, curve: Curves.easeOutCubic),
      builder: (context, value, child) => Opacity(
        opacity: value,
        child: Transform.translate(
          offset: Offset(0, 16 * (1 - value)),
          child: child,
        ),
      ),
      child: child,
    );
  }
}
