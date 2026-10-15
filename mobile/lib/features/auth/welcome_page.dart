import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../domain/models.dart';
import '../../theme/brand_mark.dart';
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

/// First-run intro — a three-slide value tour before the commit ask
/// (fintech-onboarding research: show the value first, say who it is for
/// in seconds, keep one primary action). Every slide names a capability
/// the app actually ships today — nothing here promises sync or AI.
///
/// "Bắt đầu" continues to sign-in; "Xem demo" enters the read-only demo
/// through the same seam the login screen uses. Both choices mark the
/// flag, so the screen is first-run-only.
class WelcomePage extends StatefulWidget {
  const WelcomePage({super.key, required this.onStart, this.onDemo});

  final VoidCallback onStart;
  final VoidCallback? onDemo;

  @override
  State<WelcomePage> createState() => _WelcomePageState();
}

class _WelcomePageState extends State<WelcomePage> {
  final _pager = PageController();
  int _page = 0;

  static const _slides = 3;
  bool get _last => _page == _slides - 1;

  void _next() => _pager.nextPage(
    duration: const Duration(milliseconds: 280),
    curve: Curves.easeOutCubic,
  );

  @override
  void dispose() {
    _pager.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mf = context.mf;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  const BrandMark(size: 36),
                  const SizedBox(width: 10),
                  Text(
                    'MoneyFlow',
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const Spacer(),
                  // Skip reads as what it does: straight to sign-in.
                  if (!_last)
                    TextButton(
                      onPressed: widget.onStart,
                      style: TextButton.styleFrom(
                        minimumSize: const Size(64, 44),
                        foregroundColor: mf.textMuted,
                      ),
                      child: const Text('Bỏ qua'),
                    )
                  else
                    const SizedBox(width: 64, height: 44),
                ],
              ),
              Expanded(
                child: PageView(
                  controller: _pager,
                  onPageChanged: (p) => setState(() => _page = p),
                  children: const [
                    _IntroSlide(
                      illustration: _ShapeComposition(),
                      plain: 'Quản lý tiền gọn gàng, ',
                      accent: 'không ồn ào',
                      body:
                          'Sổ thu chi cho người Việt: ghi tay được, '
                          'duyệt tự động cũng được — số nào cũng nói rõ '
                          'nguồn và ngày dữ liệu.',
                    ),
                    _IntroSlide(
                      illustration: _WalletStripMini(),
                      plain: 'Mọi ví, ',
                      accent: 'một sổ',
                      body:
                          'Tiền mặt, ngân hàng, ví điện tử xếp chung — '
                          'mỗi số dư kèm "dữ liệu đến" ngày nào, chuyển '
                          'giữa các ví không tính là thu hay chi.',
                    ),
                    _IntroSlide(
                      illustration: _DraftCardMini(),
                      plain: 'Ghi nhanh, ',
                      accent: 'duyệt trước',
                      body:
                          'Gõ "ăn trưa 45k" hoặc nói bằng giọng nói — '
                          'bản nháp chờ bạn duyệt, không tự ghi vào sổ. '
                          'Xóa nhầm cũng khôi phục được từ thùng rác.',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Center(
                child: _Dots(count: _slides, index: _page),
              ),
              const SizedBox(height: 16),
              _Entrance(
                order: 0,
                child: FilledButton(
                  onPressed: _last ? widget.onStart : _next,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(56),
                    shape: const StadiumBorder(),
                  ),
                  child: Text(_last ? 'Bắt đầu' : 'Tiếp'),
                ),
              ),
              // A direct path stays on every slide — nobody must swipe
              // through the tour to reach sign-in or the demo.
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (!_last)
                    TextButton(
                      onPressed: widget.onStart,
                      style: TextButton.styleFrom(
                        minimumSize: const Size(88, 48),
                        foregroundColor: mf.textMuted,
                      ),
                      child: const Text('Bắt đầu'),
                    ),
                  if (widget.onDemo != null)
                    TextButton(
                      onPressed: widget.onDemo,
                      style: TextButton.styleFrom(
                        minimumSize: const Size(88, 48),
                        foregroundColor: mf.textMuted,
                      ),
                      child: const Text('Xem demo'),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// One intro slide: illustration on top, headline, one supporting line.
/// Scrolls internally so 200% text scale never overflows the viewport.
class _IntroSlide extends StatelessWidget {
  const _IntroSlide({
    required this.illustration,
    required this.plain,
    required this.accent,
    required this.body,
  });

  final Widget illustration;
  final String plain;
  final String accent;
  final String body;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mf = context.mf;
    return SingleChildScrollView(
      child: Column(
        children: [
          SizedBox(height: 300, child: Center(child: illustration)),
          const SizedBox(height: 20),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(text: plain),
                TextSpan(
                  text: accent,
                  style: TextStyle(color: mf.brand),
                ),
              ],
            ),
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineMedium?.copyWith(
              fontWeight: FontWeight.w800,
              height: 1.15,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            body,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: mf.textMuted,
              height: 1.45,
            ),
          ),
        ],
      ),
    );
  }
}

/// Page dots — the active one stretches into an ink pill (the reference's
/// pager cue). Tappable so nobody has to learn a swipe.
class _Dots extends StatelessWidget {
  const _Dots({required this.count, required this.index});

  final int count;
  final int index;

  @override
  Widget build(BuildContext context) {
    final mf = context.mf;
    final pager = context.findAncestorStateOfType<_WelcomePageState>()?._pager;
    return Semantics(
      label: 'Trang ${index + 1} trên $count',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < count; i++)
            GestureDetector(
              onTap: pager == null
                  ? null
                  : () => pager.animateToPage(
                      i,
                      duration: const Duration(milliseconds: 280),
                      curve: Curves.easeOutCubic,
                    ),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOut,
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == index ? 22 : 7,
                height: 7,
                decoration: BoxDecoration(
                  color: i == index ? mfPastelInk : mf.borderStrong,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Slide-2 illustration: the wallet strip shrunk to a preview — the same
/// pastel card language the dashboard uses, kind label instead of a
/// made-up balance.
class _WalletStripMini extends StatelessWidget {
  const _WalletStripMini();

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    Widget card(Color fill, IconData icon, String label) => Container(
      width: 96,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: fill,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.55),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: mfPastelInk),
          ),
          const SizedBox(height: 16),
          Text(
            label,
            style: text.labelLarge?.copyWith(
              color: mfPastelInk,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          // A figure line that is visibly a placeholder — no invented đồng.
          Container(
            width: 56,
            height: 8,
            decoration: BoxDecoration(
              color: mfPastelInk.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ],
      ),
    );
    return ExcludeSemantics(
      child: SizedBox(
        height: 190,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Transform.translate(
              offset: const Offset(34, 0),
              child: Transform.rotate(
                angle: -0.06,
                child: card(
                  const Color(0xFFC7B7FF),
                  Icons.payments_outlined,
                  'Tiền mặt',
                ),
              ),
            ),
            Transform.translate(
              offset: const Offset(0, -14),
              child: card(
                const Color(0xFFB7DD95),
                Icons.account_balance_outlined,
                'Ngân hàng',
              ),
            ),
            Transform.translate(
              offset: const Offset(-34, 0),
              child: Transform.rotate(
                angle: 0.06,
                child: card(
                  const Color(0xFFF0C4A8),
                  Icons.account_balance_wallet_outlined,
                  'Ví điện tử',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Slide-3 illustration: a proposed capture exactly as the review queue
/// shows it — kind, parsed amount and the honest "Chờ duyệt" state.
class _DraftCardMini extends StatelessWidget {
  const _DraftCardMini();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mf = context.mf;
    return ExcludeSemantics(
      child: Container(
        width: 300,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: mf.borderSubtle),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                MfKindIcon(TransactionKind.expense.name),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ăn trưa',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'Ăn uống · Tiền mặt',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: mf.textSoft,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '− 45.000 ₫',
                  style: mfMoneyStyle(
                    TextStyle(
                      color: mf.expenseText,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: mf.warningSubtle,
                borderRadius: BorderRadius.circular(99),
                border: Border.all(color: mf.warningBorder),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    Icons.schedule_outlined,
                    size: 14,
                    color: mf.warningText,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'Chờ duyệt — chưa vào sổ',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: mf.warningText,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
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

  static const _ink = Color(0xFF211A33);

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
    canvas.drawCircle(const Offset(122, 34), 24, fill(const Color(0xFFC7B7FF)));
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
