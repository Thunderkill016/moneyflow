import 'dart:math' as math;

/// One cell of a treemap layout, in absolute coordinates inside the
/// rect the layout was asked to fill. [index] is the position of the
/// cell's weight in the input list, so callers can map a painted cell
/// back to its data row without depending on paint order.
class TreemapCell {
  const TreemapCell({
    required this.index,
    required this.x,
    required this.y,
    required this.w,
    required this.h,
  });

  final int index;
  final double x;
  final double y;
  final double w;
  final double h;
}

class _Rect {
  const _Rect(this.x, this.y, this.w, this.h);
  final double x, y, w, h;
}

class _Weighted {
  const _Weighted(this.index, this.area);
  final int index;
  final double area;
}

/// Squarified treemap layout (Bruls/Huizing/van Wijk): partitions
/// `width` × `height` into one cell per positive weight, each cell's
/// area proportional to its weight. Zero and negative weights drop
/// out — a bucket with no value has no cell to paint. Output order
/// follows descending weight; [TreemapCell.index] restores the
/// caller's own ordering.
List<TreemapCell> squarifiedTreemap(
  List<double> weights,
  double width,
  double height,
) {
  final total = weights.fold<double>(0, (s, w) => w > 0 ? s + w : s);
  if (total <= 0 || width <= 0 || height <= 0) return const [];

  final scale = width * height / total;
  var items = <_Weighted>[
    for (var i = 0; i < weights.length; i++)
      if (weights[i] > 0) _Weighted(i, weights[i] * scale),
  ]..sort((a, b) => b.area.compareTo(a.area));

  final cells = <TreemapCell>[];
  var rect = _Rect(0, 0, width, height);

  double worstAspect(List<_Weighted> row, double side) {
    final s = row.fold<double>(0, (sum, it) => sum + it.area);
    var worst = 0.0;
    for (final it in row) {
      final r1 = side * side * it.area / (s * s);
      final aspect = math.max(r1, 1 / r1);
      if (aspect > worst) worst = aspect;
    }
    return worst;
  }

  while (items.isNotEmpty) {
    final side = math.min(rect.w, rect.h);
    final row = <_Weighted>[items.removeAt(0)];
    while (items.isNotEmpty) {
      final withNext = [...row, items.first];
      if (worstAspect(withNext, side) <= worstAspect(row, side)) {
        row.add(items.removeAt(0));
      } else {
        break;
      }
    }

    final rowArea = row.fold<double>(0, (s, it) => s + it.area);
    if (rect.w <= rect.h) {
      // Lay the row across the top; shrink the rect from below.
      final stripH = rowArea / rect.w;
      var offset = 0.0;
      for (final it in row) {
        final w = it.area / stripH;
        cells.add(
          TreemapCell(
            index: it.index,
            x: rect.x + offset,
            y: rect.y,
            w: w,
            h: stripH,
          ),
        );
        offset += w;
      }
      rect = _Rect(rect.x, rect.y + stripH, rect.w, rect.h - stripH);
    } else {
      // Lay the row down the left edge; shrink from the right.
      final stripW = rowArea / rect.h;
      var offset = 0.0;
      for (final it in row) {
        final h = it.area / stripW;
        cells.add(
          TreemapCell(
            index: it.index,
            x: rect.x,
            y: rect.y + offset,
            w: stripW,
            h: h,
          ),
        );
        offset += h;
      }
      rect = _Rect(rect.x + stripW, rect.y, rect.w - stripW, rect.h);
    }
  }
  return cells;
}
