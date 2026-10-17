import 'package:flutter/material.dart';

import 'mf_theme.dart';

/// The MoneyFlow brand mark — same geometry as the web's BrandMark
/// (src/components/brand/brand-lockup.tsx): two "flow" arcs carrying the
/// brand color around a center "gate" pill.
///
/// Colors follow the theme, matching the web's contract: the arcs take
/// the theme's brand color, the gate takes the surface's ink color — so
/// on a dark background the gate turns light and the mark keeps its
/// contrast instead of freezing on a fixed color.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size.square(size),
      painter: _BrandMarkPainter(
        flow: context.mf.brand,
        gate: Theme.of(context).colorScheme.onSurface,
      ),
    );
  }
}

class _BrandMarkPainter extends CustomPainter {
  _BrandMarkPainter({required this.flow, required this.gate});

  final Color flow;
  final Color gate;

  /// Web geometry is authored on a 160×160 viewBox.
  static const _viewBox = 160.0;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / _viewBox, size.height / _viewBox);

    final flowPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 16.18
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = flow;

    canvas.drawPath(
      Path()
        ..moveTo(22.80, 64.20)
        ..cubicTo(22.80, 40.40, 42.10, 28.00, 66.40, 28.00)
        ..lineTo(128.20, 28.00),
      flowPaint,
    );
    canvas.drawPath(
      Path()
        ..moveTo(137.20, 95.80)
        ..cubicTo(137.20, 119.60, 117.90, 132.00, 93.60, 132.00)
        ..lineTo(31.80, 132.00),
      flowPaint,
    );

    final gatePaint = Paint()
      ..style = PaintingStyle.fill
      ..color = gate;
    canvas.drawPath(
      (Path()..fillType = PathFillType.evenOdd)
        // Outer pill — 16px-corner stadium centered on (80, 80).
        ..addRRect(
          RRect.fromLTRBR(64, 54.11, 96, 105.89, const Radius.circular(16)),
        )
        // Inner cutout — 4.94px-corner slit.
        ..addRRect(
          RRect.fromLTRBR(
            75.06,
            67.06,
            84.94,
            92.95,
            const Radius.circular(4.94),
          ),
        ),
      gatePaint,
    );

    canvas.restore();
  }

  @override
  bool shouldRepaint(_BrandMarkPainter old) =>
      old.flow != flow || old.gate != gate;
}
