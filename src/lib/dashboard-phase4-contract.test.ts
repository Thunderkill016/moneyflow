import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/dashboard/page.tsx", "utf8");
const dashboard = readFileSync(
  "src/components/moneyflow-dashboard.tsx",
  "utf8",
);
const overview = readFileSync(
  "src/components/dashboard/dashboard-overview-sections.tsx",
  "utf8",
);
const planning = readFileSync(
  "src/components/dashboard/dashboard-planning-sections.tsx",
  "utf8",
);
const statement = readFileSync(
  "src/components/dashboard/statement.tsx",
  "utf8",
);
const dashboardCss = readFileSync(
  "src/components/dashboard/dashboard.module.css",
  "utf8",
);
const retiredKpiClass = ["insights", "kpi"].join("-");

test("dashboard route no longer imports page-global presentation styles", () => {
  assert.doesNotMatch(page, /import\s+["'][^"']+\.css["'];?/);
  assert.doesNotMatch(page, /calm-ledger-overview|safe-ux-planning|safe-ux-weekly-summary/);
  assert.match(dashboard, /dashboard\.module\.css/);
  assert.match(dashboard, /<main className=\{styles\.dashboard\}>/);
  assert.doesNotMatch(dashboard, /className=["']dashboard(?:\s|["'])/);
});

test("dashboard presentation composes Phase 2 feedback and action primitives", () => {
  assert.match(dashboard, /Alert, AlertDescription/);
  assert.match(dashboard, /<Alert tone="error" live="assertive"/);
  assert.match(overview, /@\/components\/ui\/empty-state/);
  assert.match(overview, /Button, LinkButton/);
  assert.match(overview, /intent="secondary"/);
  assert.match(overview, /className="section-link shrink-0"/);
  assert.match(
    planning,
    /targetSize="important"[\s\S]*className="inline-flex items-center"[\s\S]*Xem tất cả mục tiêu/,
  );
});

test("dashboard period comes from the workspace date", () => {
  assert.match(dashboard, /today=\{workspace\.today\}/);
  assert.match(overview, /<DashboardStatement[\s\S]*today=\{today\}/);
  assert.match(statement, /dashboardPeriodLabel\(today\)/);
  assert.doesNotMatch(statement, /new Date\s*\(/);
});

test("budget and goal ranges expose consistent semantics", () => {
  assert.match(planning, /role="meter"/);
  assert.match(planning, /aria-valuetext=\{featuredBudgetValueText\}/);
  assert.match(planning, /featuredBudgetOverage/);
  assert.match(planning, /role="progressbar"/);
  assert.match(planning, /featuredGoalProgressValue = Math\.min\(featuredGoalProgress, 100\)/);
  assert.match(planning, /aria-valuenow=\{featuredGoalProgressValue\}/);
});

test("dashboard module owns one responsive and forced-colors contract", () => {
  assert.match(dashboardCss, /^\.dashboard\s*\{/m);
  assert.match(dashboardCss, /@media \(max-width: 760px\)/);
  assert.match(
    dashboardCss,
    /@media \(max-width: 760px\)[\s\S]*\.dashboard :global\(\.right-stack\)[\s\S]*grid-template-columns: minmax\(0, 1fr\)/,
  );
  assert.match(dashboardCss, /@media \(forced-colors: active\)/);
  assert.equal(dashboardCss.includes(retiredKpiClass), false);
  assert.doesNotMatch(dashboardCss, /:has\s*\(/);
});

test("withdrawn safe-to-spend advice is absent from active Dashboard JSX", () => {
  assert.doesNotMatch(dashboard, /safe-card-hero|safe[- ]to[- ]spend/i);
  assert.doesNotMatch(overview, /safe-card-hero|safe[- ]to[- ]spend/i);
  assert.doesNotMatch(planning, /safe-card-hero|safe[- ]to[- ]spend/i);
});
