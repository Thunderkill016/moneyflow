/**
 * Reports treemap contract — the category share map must drill into the
 * same filtered feed as the breakdown rows, and the roll-up cell must
 * never look like a link. Mirrors the mobile `_CategoryTreemap`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../..");
const page = readFileSync(
  join(root, "src/components/reports-page.tsx"),
  "utf8",
);
const treemap = readFileSync(join(root, "src/lib/treemap.ts"), "utf8");

test("the treemap uses the shared squarified layout", () => {
  assert.match(page, /import \{ squarifiedTreemap \} from "@\/lib\/treemap\.ts"/);
  assert.match(treemap, /export function squarifiedTreemap/);
});

test("named cells drill through the same report drilldown as rows", () => {
  // One drilldown seam for both the treemap cell and the row card.
  const calls = page.match(/reportCategoryDrilldownHref\(/g) ?? [];
  assert.ok(calls.length >= 2, "treemap and row must share the drilldown");
  assert.match(page, /reportCategoryDrilldownHref\(range, row\.name\)/);
  assert.match(page, /reportCategoryDrilldownHref\(\s*report\.range,\s*item\.name/);
});

test("the Khác roll-up cell is never a link", () => {
  // A composite bucket has no single filter — rendering it as a link
  // would open the whole ledger while looking like one slice.
  const rollup = page.match(/key="khac"[\s\S]{0,400}aria-label/)?.[0] ?? "";
  assert.match(rollup, /treemapRollup/);
  assert.doesNotMatch(rollup, /href/);
});

test("the tail rolls up past the named-block cap", () => {
  assert.match(page, /MAX_NAMED = 7/);
  assert.match(page, /tailAmount > 0/);
});

test("cells under the target-size floor stay inert — WCAG 2.5.8", () => {
  // A sliver link (<44px) would fail touch target audit; its row below
  // carries the same drill anyway.
  assert.match(page, /cell\.h >= 48 && cell\.w >= 16/);
});
