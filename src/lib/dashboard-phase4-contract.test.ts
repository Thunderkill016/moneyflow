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
const statement = readFileSync(
  "src/components/dashboard/statement.tsx",
  "utf8",
);
const budgets = readFileSync(
  "src/components/planning/budgets-page.tsx",
  "utf8",
);
const goals = readFileSync(
  "src/components/planning/goals-page.tsx",
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

test("default dashboard composes shared feedback/action primitives and compact planning links", () => {
  assert.match(dashboard, /Alert, AlertDescription/);
  assert.match(dashboard, /<Alert tone="error" live="assertive"/);
  assert.match(overview, /@\/components\/ui\/empty-state/);
  assert.match(overview, /Button, LinkButton/);
  assert.match(overview, /PLANNING_LINKS/);
  assert.match(overview, /intent="secondary"/);
  assert.match(overview, /className="section-link shrink-0"/);
  assert.doesNotMatch(dashboard, /DashboardPlanningColumn/);
});

test("dashboard period comes from the workspace date", () => {
  assert.match(dashboard, /today=\{workspace\.today\}/);
  assert.match(overview, /<DashboardStatement[\s\S]*today=\{today\}/);
  assert.match(statement, /dashboardPeriodLabel\(today\)/);
  assert.doesNotMatch(statement, /new Date\s*\(/);
});

test("dedicated budget and goal routes preserve progress semantics", () => {
  assert.match(budgets, /role="progressbar"/);
  assert.match(budgets, /aria-valuenow=\{Math\.min\(progress, 100\)\}/);
  assert.match(budgets, /aria-label=\{`\$\{statusText\}\. Đã dùng \$\{progress\} phần trăm`\}/);
  assert.match(goals, /goalProgress\(goal\)/);
  assert.match(goals, /role="progressbar"/);
  assert.match(goals, /aria-valuenow=\{progress\}/);
  assert.match(goals, /aria-label=\{`\$\{goal\.name\}: đã hoàn thành \$\{progress\} phần trăm`\}/);
});

test("dashboard module owns responsive and forced-colors contracts without detached planning layout", () => {
  assert.match(dashboardCss, /^\.dashboard\s*\{/m);
  assert.match(dashboardCss, /@media \(max-width: 760px\)/);
  assert.match(dashboardCss, /@media \(forced-colors: active\)/);
  assert.equal(dashboardCss.includes(retiredKpiClass), false);
  assert.doesNotMatch(dashboardCss, /:has\s*\(/);
});

test("withdrawn safe-to-spend advice is absent from active Dashboard JSX", () => {
  assert.doesNotMatch(dashboard, /safe-card-hero|safe[- ]to[- ]spend/i);
  assert.doesNotMatch(overview, /safe-card-hero|safe[- ]to[- ]spend/i);
});
