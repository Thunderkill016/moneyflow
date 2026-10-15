import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../theme/mf_theme.dart';

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

/// First-run welcome — cream canvas, a flat shape composition, one big
/// headline with a single orange emphasis (the "without the noise" tone)
/// and a black pill CTA. "Bắt đầu" continues to sign-in; "Xem demo"
/// enters the read-only demo through the same seam the login screen
/// uses. Both choices mark the flag, so the screen is first-run-only.
class WelcomePage extends StatelessWidget {
  const WelcomePage({super.key, required this.onStart, this.onDemo});

  final VoidCallback onStart;
  final VoidCallback? onDemo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mf = context.mf;
    final headline = theme.textTheme.headlineMedium?.copyWith(
      fontWeight: FontWeight.w800,
      height: 1.15,
      letterSpacing: -0.5,
    );
    return Scaffold(
      body: SafeArea(
        // Scrolls (and the Spacers still centre the content on tall
        // screens) so 200% text scale never overflows the first screen.
        child: LayoutBuilder(
          builder: (context, box) => SingleChildScrollView(
            child: ConstrainedBox(
              constraints: BoxConstraints(minHeight: box.maxHeight),
              child: IntrinsicHeight(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Entrance(
                        order: 0,
                        child: Row(
                          children: [
                            Container(
                              width: 36,
                              height: 36,
                              decoration: BoxDecoration(
                                color: mf.brand,
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(
                                Icons.account_balance_wallet_outlined,
                                size: 20,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'MoneyFlow',
                              style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      const _Entrance(order: 1, child: _ShapeComposition()),
                      const Spacer(),
                      _Entrance(
                        order: 2,
                        child: Text.rich(
                          TextSpan(
                            children: [
                              const TextSpan(text: 'Quản lý tiền gọn gàng, '),
                              TextSpan(
                                text: 'không ồn ào',
                                style: TextStyle(color: mf.brand),
                              ),
                            ],
                          ),
                          textAlign: TextAlign.center,
                          style: headline,
                        ),
                      ),
                      const SizedBox(height: 12),
                      _Entrance(
                        order: 3,
                        child: Text(
                          'Ghi nhanh thu chi, xem lại theo tháng và lên '
                          'kế hoạch trước — một luồng gọn cho cả ví và ngân sách.',
                          textAlign: TextAlign.center,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: mf.textMuted,
                          ),
                        ),
                      ),
                      const SizedBox(height: 28),
                      _Entrance(
                        order: 4,
                        child: FilledButton(
                          onPressed: onStart,
                          style: FilledButton.styleFrom(
                            minimumSize: const Size.fromHeight(56),
                            shape: const StadiumBorder(),
                          ),
                          child: const Text('Bắt đầu'),
                        ),
                      ),
                      if (onDemo != null) ...[
                        const SizedBox(height: 4),
                        _Entrance(
                          order: 5,
                          child: TextButton(
                            onPressed: onDemo,
                            style: TextButton.styleFrom(
                              minimumSize: const Size.fromHeight(48),
                              foregroundColor: mf.textMuted,
                            ),
                            child: const Text('Xem demo'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Flat piggy-bank illustration drawn in code (no asset to ship): an
/// accent-orange pig with a coin dropping into its slot, pastel blobs and
/// two sparkles — the reference's "Savor" onboarding picture.
class _ShapeComposition extends StatelessWidget {
  const _ShapeComposition();

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: SizedBox(
      height: 240,
      child: AspectRatio(
        aspectRatio: 260 / 230,
        child: CustomPaint(painter: _PiggyPainter(context.mf.brand)),
      ),
    ),
  );
}

class _PiggyPainter extends CustomPainter {
  _PiggyPainter(this.body);

  final Color body;

  static const _ink = Color(0xFF1C1C1C);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 260, size.height / 230);
    Paint fill(Color c) => Paint()..color = c;
    final dark = Color.lerp(body, Colors.black, 0.22)!;
    final light = Color.lerp(body, Colors.white, 0.35)!;

    // Soft pastel blobs + ground shadow.
    canvas.drawCircle(const Offset(52, 150), 40, fill(const Color(0xFFB7DD95)));
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(188, 128, 52, 64),
        const Radius.circular(18),
      ),
      fill(const Color(0xFFD5CCF3)),
    );
    canvas.drawOval(
      const Rect.fromLTWH(40, 196, 190, 20),
      fill(const Color(0x1A000000)),
    );

    // Legs, tail, body, ear, snout.
    for (final x in [78.0, 148.0]) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x, 160, 26, 40),
          const Radius.circular(10),
        ),
        fill(dark),
      );
    }
    final tail = Path()
      ..moveTo(40, 112)
      ..cubicTo(14, 104, 18, 80, 38, 84)
      ..cubicTo(50, 86, 44, 100, 34, 96);
    canvas.drawPath(
      tail,
      Paint()
        ..color = dark
        ..style = PaintingStyle.stroke
        ..strokeWidth = 6
        ..strokeCap = StrokeCap.round,
    );
    canvas.drawOval(const Rect.fromLTWH(34, 66, 176, 130), fill(body));
    final ear = Path()
      ..moveTo(150, 80)
      ..lineTo(176, 56)
      ..lineTo(184, 92)
      ..close();
    canvas.drawPath(ear, fill(dark));
    canvas.drawOval(const Rect.fromLTWH(184, 96, 44, 54), fill(light));
    canvas.drawOval(const Rect.fromLTWH(198, 114, 6, 12), fill(_ink));
    canvas.drawOval(const Rect.fromLTWH(212, 114, 6, 12), fill(_ink));
    canvas.drawCircle(const Offset(176, 104), 5.5, fill(_ink));

    // Coin slot + falling coin.
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        const Rect.fromLTWH(96, 70, 54, 9),
        const Radius.circular(5),
      ),
      fill(_ink),
    );
    canvas.drawCircle(const Offset(122, 34), 24, fill(const Color(0xFFEFE17C)));
    canvas.drawCircle(
      const Offset(122, 34),
      24,
      Paint()
        ..color = _ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );
    final tp = TextPainter(
      text: const TextSpan(
        text: '₫',
        style: TextStyle(
          color: _ink,
          fontSize: 26,
          fontWeight: FontWeight.w800,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    tp.paint(canvas, Offset(122 - tp.width / 2, 34 - tp.height / 2));

    // Sparkles.
    void spark(Offset c, double r) {
      final path = Path()
        ..moveTo(c.dx, c.dy - r)
        ..quadraticBezierTo(c.dx, c.dy, c.dx + r, c.dy)
        ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy + r)
        ..quadraticBezierTo(c.dx, c.dy, c.dx - r, c.dy)
        ..quadraticBezierTo(c.dx, c.dy, c.dx, c.dy - r);
      canvas.drawPath(path, fill(_ink));
    }

    spark(const Offset(214, 40), 16);
    spark(const Offset(48, 54), 10);
    canvas.restore();
  }

  @override
  bool shouldRepaint(_PiggyPainter old) => old.body != body;
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
