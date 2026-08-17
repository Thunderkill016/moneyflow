import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/*
 * The root font contract lives in `performance-budgets.test.ts`, which already
 * owns `display`, `adjustFontFallback` and `preload`. Duplicating it here was
 * removed rather than kept in two places; only the Vietnamese-subset assertion
 * was novel and it moved to that existing test.
 */

test("dashboard loading boundary is lightweight and does not invent financial truth", () => {
  const source = read("src/app/dashboard/loading.tsx");

  assert.doesNotMatch(source, /^\s*["']use client["']/m);
  assert.match(source, /role="status"/);
  assert.match(source, /Đang tải sổ thu chi/);
  // An `aria-busy` attribute on an ancestor of the `role="status"` live region can
  // suppress the announcement, and this boundary unmounts instead of clearing busy.
  // Matched in attribute form on purpose: a bare `aria-busy` also occurs in the
  // prose explaining why it is absent, and this file reads source, not the DOM.
  assert.doesNotMatch(source, /aria-busy=/);
  // A loading boundary must not render a value, a currency mark or grouped
  // digits: any of those would be a fabricated balance during the server wait.
  assert.doesNotMatch(source, /MoneyValue|totalBalance|₫|\bVND\b|\d[.,]\d{3}/);
});

test("performance work preserves the bounded private dashboard RPC without shared cache", () => {
  const source = read("src/server/dashboard.ts");

  // Exactly one bounded RPC: asserting mere presence would still pass if a
  // second RPC or a raw PostgREST table read were added beside it.
  assert.match(source, /\.rpc\("get_dashboard_bundle"/);
  assert.equal(
    (source.match(/\.rpc\(/g) ?? []).length,
    1,
    "the dashboard read path must stay a single bounded RPC",
  );
  assert.doesNotMatch(
    source,
    /\.from\(/,
    "the dashboard read path must not bypass the RPC with a table query",
  );
  // Private financial data must never enter a shared or static cache. Next 16's
  // `use cache` directive is the parent mechanism, so denying only its child
  // helpers would leave the real hole open.
  assert.doesNotMatch(
    source,
    /unstable_cache|cacheLife|cacheTag|["']use cache["']|revalidate|fetchCache|force-cache/,
  );
});
