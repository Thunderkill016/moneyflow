/**
 * TASK-115 goal capability, updated by #426 progressive disclosure.
 *
 * Goal management remains a first-class planning route, but detailed goal state
 * no longer hydrates the default daily dashboard. The dashboard must keep a
 * discoverable planning link instead of embedding the featured-goal card.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const GOALS_LIB = join(process.cwd(), "src/lib/planning/goals.ts");
const DASHBOARD_PAGE = join(process.cwd(), "src/app/dashboard/page.tsx");
const DASHBOARD_HEADER = join(
  process.cwd(),
  "src/components/dashboard/dashboard-overview-sections.tsx",
);
const NAV_IA = join(process.cwd(), "src/lib/nav-ia.ts");
const GOALS_PAGE = join(process.cwd(), "src/app/goals/page.tsx");
const GOALS_WORKSPACE = join(
  process.cwd(),
  "src/components/planning/goals-page.tsx",
);

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("daily dashboard progressive-discloses goal detail instead of hydrating it", () => {
  const page = read(DASHBOARD_PAGE);
  const header = read(DASHBOARD_HEADER);
  const nav = read(NAV_IA);

  assert.match(page, /getDashboardPageWorkspace/);
  assert.doesNotMatch(page, /goals=\{goals\}/);
  assert.match(header, /PLANNING_LINKS/);
  assert.match(nav, /href:\s*"\/goals"/);
  assert.match(nav, /label:\s*"Mục tiêu"/);
});

test("dedicated goals route still loads the complete goals workspace", () => {
  const page = read(GOALS_PAGE);
  const workspace = read(GOALS_WORKSPACE);

  assert.match(page, /getGoalsWorkspace/);
  assert.match(page, /<GoalsPage/);
  assert.match(page, /initialGoals=\{workspace\.goals\}/);
  assert.match(workspace, /Mục tiêu tiết kiệm/);
  assert.match(workspace, /goalProgress/);
  assert.match(workspace, /role="progressbar"/);
  assert.match(workspace, /Thêm mục tiêu/);
});

test("goals workspace preserves empty and management affordances", () => {
  const source = read(GOALS_WORKSPACE);
  assert.match(source, /EmptyState/);
  assert.match(source, /Tạo mục tiêu|Thêm mục tiêu/);
  assert.match(source, /PlanningCard/);
  assert.match(source, /goalRemaining/);
});

test("goals lib exports progress helpers used by the dedicated workspace", () => {
  const source = read(GOALS_LIB);
  assert.match(source, /export function goalRemaining/);
  assert.match(source, /export function goalProgress/);
});
