/**
 * Squarified treemap layout (Bruls/Huizing/van Wijk) — ports the mobile
 * domain module `mobile/lib/domain/treemap.dart` so the reports page can
 * draw the same category share map on the web. Partitions `width` ×
 * `height` into one cell per positive weight, area ∝ weight. `index`
 * carries the input position so callers map cells back to rows without
 * depending on paint order.
 */
export interface TreemapCell {
  index: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Weighted {
  index: number;
  area: number;
}

export function squarifiedTreemap(
  weights: readonly number[],
  width: number,
  height: number,
): TreemapCell[] {
  const total = weights.reduce((s, w) => (w > 0 ? s + w : s), 0);
  if (total <= 0 || width <= 0 || height <= 0) return [];

  const scale = (width * height) / total;
  const items: Weighted[] = weights
    .map((w, index) => ({ index, area: w * scale }))
    .filter((it) => it.area > 0)
    .sort((a, b) => b.area - a.area);

  const cells: TreemapCell[] = [];
  let rect = { x: 0, y: 0, w: width, h: height };

  const worstAspect = (row: Weighted[], side: number): number => {
    const s = row.reduce((sum, it) => sum + it.area, 0);
    let worst = 0;
    for (const it of row) {
      const r1 = (side * side * it.area) / (s * s);
      const aspect = Math.max(r1, 1 / r1);
      if (aspect > worst) worst = aspect;
    }
    return worst;
  };

  while (items.length > 0) {
    const side = Math.min(rect.w, rect.h);
    const row: Weighted[] = [items.shift()!];
    while (items.length > 0) {
      if (worstAspect([...row, items[0]], side) <= worstAspect(row, side)) {
        row.push(items.shift()!);
      } else {
        break;
      }
    }

    const rowArea = row.reduce((s, it) => s + it.area, 0);
    if (rect.w <= rect.h) {
      const stripH = rowArea / rect.w;
      let offset = 0;
      for (const it of row) {
        const w = it.area / stripH;
        cells.push({ index: it.index, x: rect.x + offset, y: rect.y, w, h: stripH });
        offset += w;
      }
      rect = { x: rect.x, y: rect.y + stripH, w: rect.w, h: rect.h - stripH };
    } else {
      const stripW = rowArea / rect.h;
      let offset = 0;
      for (const it of row) {
        const h = it.area / stripW;
        cells.push({ index: it.index, x: rect.x, y: rect.y + offset, w: stripW, h });
        offset += h;
      }
      rect = { x: rect.x + stripW, y: rect.y, w: rect.w - stripW, h: rect.h };
    }
  }
  return cells;
}
