import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("authenticated dashboard does not eagerly ship demo-only browser stores", () => {
  const source = read("src/components/moneyflow-dashboard.tsx");
  const demoOnlyModules = [
    "@/lib/planning/commitment-occurrence-store",
    "@/lib/planning/income-template-store",
    "@/lib/inbox/candidate-store",
  ];

  for (const modulePath of demoOnlyModules) {
    assert.doesNotMatch(
      source,
      new RegExp(`^import\\s+[^;]+from\\s+["']${modulePath}["']`, "m"),
      `${modulePath} must stay out of the authenticated dashboard's eager imports`,
    );
    assert.match(
      source,
      new RegExp(`import\\(["']${modulePath}["']\\)`),
      `${modulePath} should load only from the demo-only effect path`,
    );
  }

  assert.match(source, /if \(!viewer\.isDemo\) return;/);
  assert.match(source, /cancelled/);
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
