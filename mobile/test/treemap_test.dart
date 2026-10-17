import 'package:flutter_test/flutter_test.dart';
import 'package:moneyflow/domain/treemap.dart';

void main() {
  group('squarifiedTreemap', () {
    test('lays out cells covering the rect proportionally to weights', () {
      final cells = squarifiedTreemap(const [0.5, 0.3, 0.2], 200, 100);
      expect(cells, hasLength(3));

      // Full coverage — the union fills the rect (float slop aside).
      final area = cells.fold<double>(0, (s, c) => s + c.w * c.h);
      expect(area, closeTo(200 * 100, 0.01));

      // Area proportional to weight, and bigger weights get bigger cells.
      final areas = {for (final c in cells) c.index: c.w * c.h};
      expect(areas[0]! / (200 * 100), closeTo(0.5, 0.02));
      expect(areas[1]! / (200 * 100), closeTo(0.3, 0.02));
      expect(areas[2]! / (200 * 100), closeTo(0.2, 0.02));

      // No overlaps — every pair of cells is disjoint.
      for (var i = 0; i < cells.length; i++) {
        for (var j = i + 1; j < cells.length; j++) {
          final a = cells[i];
          final b = cells[j];
          final overlap =
              a.x < b.x + b.w - 0.01 &&
              b.x < a.x + a.w - 0.01 &&
              a.y < b.y + b.h - 0.01 &&
              b.y < a.y + a.h - 0.01;
          expect(overlap, isFalse, reason: 'cells $i and $j overlap');
        }
      }

      // Cells stay inside the rect.
      for (final c in cells) {
        expect(c.x, greaterThanOrEqualTo(0));
        expect(c.y, greaterThanOrEqualTo(0));
        expect(c.x + c.w, lessThanOrEqualTo(200.01));
        expect(c.y + c.h, lessThanOrEqualTo(100.01));
      }
    });

    test('keeps the input index so callers can map cells back to rows', () {
      final cells = squarifiedTreemap(const [1, 4, 2], 90, 90);
      expect(cells, hasLength(3));
      // The largest weight (index 1) must hold the largest area.
      final byIndex = {for (final c in cells) c.index: c.w * c.h};
      expect(byIndex[1]! > byIndex[0]!, isTrue);
      expect(byIndex[1]! > byIndex[2]!, isTrue);
    });

    test('a single weight fills the whole rect', () {
      final cells = squarifiedTreemap(const [1], 50, 40);
      expect(cells, hasLength(1));
      expect(cells.single.x, closeTo(0, 0.01));
      expect(cells.single.y, closeTo(0, 0.01));
      expect(cells.single.w, closeTo(50, 0.01));
      expect(cells.single.h, closeTo(40, 0.01));
    });

    test('empty weights lay out nothing', () {
      expect(squarifiedTreemap(const [], 100, 60), isEmpty);
    });

    test('zero weights drop out instead of producing empty cells', () {
      final cells = squarifiedTreemap(const [0, 3, 0], 100, 60);
      expect(cells.map((c) => c.index).toList(), [1]);
    });
  });
}
