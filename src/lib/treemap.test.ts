import assert from "node:assert/strict";
import test from "node:test";
import { squarifiedTreemap } from "./treemap.ts";

test("squarifiedTreemap covers the rect proportionally without overlap", () => {
  const cells = squarifiedTreemap([0.5, 0.3, 0.2], 200, 100);
  assert.equal(cells.length, 3);

  const area = cells.reduce((s, c) => s + c.w * c.h, 0);
  assert.ok(Math.abs(area - 200 * 100) < 0.01, `area ${area}`);

  const byIndex = new Map(cells.map((c) => [c.index, c.w * c.h]));
  assert.ok(Math.abs(byIndex.get(0)! / 20000 - 0.5) < 0.02);
  assert.ok(Math.abs(byIndex.get(1)! / 20000 - 0.3) < 0.02);
  assert.ok(Math.abs(byIndex.get(2)! / 20000 - 0.2) < 0.02);

  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const a = cells[i];
      const b = cells[j];
      const overlap =
        a.x < b.x + b.w - 0.01 &&
        b.x < a.x + a.w - 0.01 &&
        a.y < b.y + b.h - 0.01 &&
        b.y < a.y + a.h - 0.01;
      assert.ok(!overlap, `cells ${i} and ${j} overlap`);
    }
    const c = cells[i];
    assert.ok(c.x >= 0 && c.y >= 0);
    assert.ok(c.x + c.w <= 200.01 && c.y + c.h <= 100.01);
  }
});

test("input index survives the descending sort", () => {
  const cells = squarifiedTreemap([1, 4, 2], 90, 90);
  const byIndex = new Map(cells.map((c) => [c.index, c.w * c.h]));
  assert.ok(byIndex.get(1)! > byIndex.get(0)!);
  assert.ok(byIndex.get(1)! > byIndex.get(2)!);
});

test("a single weight fills the rect; empty and zero weights lay out nothing", () => {
  const [cell] = squarifiedTreemap([1], 50, 40);
  assert.deepEqual(
    { x: cell.x, y: cell.y, w: cell.w, h: cell.h },
    { x: 0, y: 0, w: 50, h: 40 },
  );
  assert.deepEqual(squarifiedTreemap([], 100, 60), []);
  assert.deepEqual(
    squarifiedTreemap([0, 3, 0], 100, 60).map((c) => c.index),
    [1],
  );
});
