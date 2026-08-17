import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("root font keeps Vietnamese coverage and the measured preload path", () => {
  const source = read("src/app/layout.tsx");

  assert.match(source, /subsets:\s*\["latin", "vietnamese"\]/);
  assert.match(source, /display:\s*"swap"/);
  assert.match(source, /adjustFontFallback:\s*true/);
  assert.match(source, /preload:\s*true/);
});

test("dashboard loading boundary is lightweight and does not invent financial truth", () => {
  const source = read("src/app/dashboard/loading.tsx");

  assert.doesNotMatch(source, /^\s*["']use client["']/m);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /role="status"/);
  assert.match(source, /Đang tải sổ thu chi/);
  assert.doesNotMatch(source, /MoneyValue|totalBalance|transactions|₫/);
});

test("performance work preserves the bounded private dashboard RPC without shared cache", () => {
  const source = read("src/server/dashboard.ts");

  assert.match(source, /\.rpc\("get_dashboard_bundle"/);
  assert.doesNotMatch(source, /unstable_cache|cacheLife|cacheTag/);
});
