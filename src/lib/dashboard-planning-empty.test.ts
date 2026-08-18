/**
 * Dashboard + planning empty states: consistent one-CTA behavior without
 * requiring detailed planning cards on the default daily dashboard.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  assertOneCtaOrNone,
  INSIGHTS_LEDGER_EMPTY,
  PLANNING_EMPTY_BUDGET,
  PLANNING_EMPTY_COMMITMENT,
  PLANNING_EMPTY_GOAL,
  PLANNING_EMPTY_INCOME,
  PLANNING_EMPTY_WEEKLY_LEDGER,
  PLANNING_EMPTY_WEEKLY_WEEK,
  planningEmptyActionCount,
} from "./dashboard-planning-empty.ts";
import { readDashboardSource } from "./test-support/dashboard-source.ts";

const root = process.cwd();
const PLANNING_EMPTY_UI = join(root, "src/components/planning-card-empty.tsx");
const NAV_IA = join(root, "src/lib/nav-ia.ts");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("planning empty configs: one CTA or none (never multi)", () => {
  for (const config of [
    PLANNING_EMPTY_BUDGET,
    PLANNING_EMPTY_GOAL,
    PLANNING_EMPTY_COMMITMENT,
    PLANNING_EMPTY_INCOME,
    PLANNING_EMPTY_WEEKLY_WEEK,
  ]) {
    assert.equal(planningEmptyActionCount(config), 1);
    assertOneCtaOrNone(config);
  }
  assert.equal(planningEmptyActionCount(PLANNING_EMPTY_WEEKLY_LEDGER), 0);
  assertOneCtaOrNone(PLANNING_EMPTY_WEEKLY_LEDGER);
});

test("insights ledger empty copy is calm Vietnamese invitation", () => {
  assert.match(INSIGHTS_LEDGER_EMPTY.title, /giao dịch/i);
  assert.match(INSIGHTS_LEDGER_EMPTY.description, /Ghi khoản chi/i);
});

test("PlanningCardEmpty remains available to dedicated planning surfaces", () => {
  assert.ok(existsSync(PLANNING_EMPTY_UI), "planning-card-empty.tsx must exist");
  const source = read(PLANNING_EMPTY_UI);
  assert.match(source, /export function PlanningCardEmpty/);
  assert.match(source, /planning-card-empty/);
  assert.ok(
    !source.includes("secondaryLabel"),
    "compact empty must not support secondary CTA",
  );
});

test("default dashboard keeps one ledger empty CTA and progressive-discloses planning", () => {
  const dashboard = readDashboardSource();
  const nav = read(NAV_IA);

  assert.match(dashboard, /INSIGHTS_LEDGER_EMPTY|Chưa có giao dịch nào/);
  assert.ok(
    !dashboard.includes('secondaryLabel="Thêm tài khoản"'),
    "dashboard empty: one primary CTA only",
  );
  assert.doesNotMatch(dashboard, /PlanningCardEmpty/);
  assert.match(dashboard, /PLANNING_LINKS/);
  for (const href of ["/budgets", "/recurring", "/income", "/goals"]) {
    assert.ok(nav.includes(`href: "${href}"`), `planning route ${href} must remain discoverable`);
  }
});
