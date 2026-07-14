import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * TASK-111 checklist: P0 data routes must ship loading + error boundaries.
 * Empty / inline dataError live in page components (manual audit + UI).
 */
const P0_ROUTES = [
  "insights",
  "transactions",
  "accounts",
  "budgets",
  "reports",
  "settings",
] as const;

const APP_DIR = join(process.cwd(), "src/app");

for (const route of P0_ROUTES) {
  test(`P0 ${route}: has loading.tsx and error.tsx`, () => {
    const dir = join(APP_DIR, route);
    assert.equal(existsSync(join(dir, "loading.tsx")), true, `${route}/loading.tsx`);
    assert.equal(existsSync(join(dir, "error.tsx")), true, `${route}/error.tsx`);
    assert.equal(existsSync(join(dir, "page.tsx")), true, `${route}/page.tsx`);
  });
}

test("root app/error.tsx exists as fallback boundary", () => {
  assert.equal(existsSync(join(APP_DIR, "error.tsx")), true);
});

test("P0 route dirs are present under src/app", () => {
  const entries = readdirSync(APP_DIR);
  for (const route of P0_ROUTES) {
    assert.ok(entries.includes(route), route);
  }
});
