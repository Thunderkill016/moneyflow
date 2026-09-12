/**
 * THU-41 / #426 — planning stays discoverable without hydrating the full
 * planning surface into the default dashboard client boundary.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const GOALS_LIB = join(process.cwd(), "src/lib/planning/goals.ts");
const PAGE = join(process.cwd(), "src/app/dashboard/page.tsx");
const DASHBOARD_CLIENT = join(process.cwd(), "src/components/moneyflow-dashboard.tsx");
const DASHBOARD_OVERVIEW = join(
  process.cwd(),
  "src/components/dashboard/dashboard-overview-sections.tsx",
);
const NAV_IA = join(process.cwd(), "src/lib/nav-ia.ts");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("dashboard keeps goals out of the default client boundary", () => {
  const page = read(PAGE);
  const client = read(DASHBOARD_CLIENT);

  assert.match(page, /getDashboardPageWorkspace/);
  assert.doesNotMatch(page, /goals=\{goals\}/);
  assert.doesNotMatch(page, /incomeTemplates=\{incomeTemplates\}/);
  assert.doesNotMatch(client, /DashboardPlanningColumn/);
  assert.doesNotMatch(client, /SavingsGoal/);
  assert.doesNotMatch(client, /RecurringIncomeTemplate/);
});

test("planning remains discoverable from the dashboard", () => {
  const overview = read(DASHBOARD_OVERVIEW);
  const nav = read(NAV_IA);

  assert.match(overview, /PLANNING_LINKS\.map/);
  assert.match(overview, /aria-label="Kế hoạch từ Tổng quan"/);
  assert.match(nav, /href:\s*"\/goals"/);
  assert.match(nav, /href:\s*"\/budgets"/);
  assert.match(nav, /href:\s*"\/commitments"/);
  assert.match(nav, /href:\s*"\/income-templates"/);
});

test("goals domain keeps featured selection helpers for the goals route and other consumers", () => {
  const source = read(GOALS_LIB);
  assert.match(source, /export function pickFeaturedGoal/);
  assert.match(source, /export function goalRemaining/);
  assert.match(source, /export function goalProgress/);
});
