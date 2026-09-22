/**
 * THU-41 / #426 — planning stays discoverable without hydrating the full
 * planning surface into the default dashboard client boundary.
 *
 * Scope note: the boundary guards planning *surfaces* (columns, cards). The
 * dashboard may hydrate income-template rows as declared inputs to the
 * obligations-remainder suffix — a numeric disclosure, not a planning card.
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

test("dashboard keeps planning surfaces out of the default client boundary", () => {
  const page = read(PAGE);
  const client = read(DASHBOARD_CLIENT);

  assert.match(page, /getDashboardPageWorkspace/);
  assert.doesNotMatch(page, /goals=\{goals\}/);
  assert.doesNotMatch(client, /DashboardPlanningColumn/);
  assert.doesNotMatch(client, /SavingsGoal/);
  assert.doesNotMatch(client, /PlanningCard/);
  /*
   * Income-template rows enter the boundary only as inputs to
   * `buildCommittedRemainder` (the "chưa gồm X thu dự kiến" suffix). The
   * income planning surface itself — cards, columns, /income-templates UI —
   * stays on its own route.
   */
  assert.doesNotMatch(client, /IncomeTemplatesPage|income-templates-page/);
  assert.match(client, /buildCommittedRemainder\(\{[\s\S]*incomeTemplates/);
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
