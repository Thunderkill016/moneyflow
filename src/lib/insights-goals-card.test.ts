/**
 * TASK-115 — Featured goal progress card on Insights.
 * Contract: progress UI, link /goals, empty CTA tạo mục tiêu.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { readDashboardSource } from "./test-support/dashboard-source.ts";

const GOALS_LIB = join(process.cwd(), "src/lib/goals.ts");
const PAGE = join(process.cwd(), "src/app/dashboard/page.tsx");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("insights page loads goals workspace into dashboard", () => {
  const source = read(PAGE);
  assert.match(source, /getGoalsWorkspace/);
  assert.match(source, /goals=\{goalWorkspace\.goals\}/);
});

test("dashboard uses pickFeaturedGoal and progress bar", () => {
  const source = readDashboardSource();
  assert.match(source, /pickFeaturedGoal/);
  assert.match(source, /goal-dashboard-panel/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /Mục tiêu tiết kiệm/);
});

test("dashboard links to /goals and empty CTA creates goal", () => {
  const source = readDashboardSource();
  assert.ok(
    source.includes('href="/goals"') || source.includes("PLANNING_EMPTY_GOAL"),
    "expected /goals link",
  );
  assert.ok(
    source.includes("Tạo mục tiêu") || source.includes("PLANNING_EMPTY_GOAL"),
    "expected empty CTA",
  );
  assert.ok(
    source.includes("PLANNING_EMPTY_GOAL") ||
      source.includes("Dành tiền cho một điều bạn muốn đạt được."),
    "expected empty copy via shared planning empty",
  );
  assert.ok(source.includes("PlanningCardEmpty"), "R3: shared planning empty");
  assert.ok(source.includes("Xem tất cả mục tiêu"), "expected list link when featured");
});

test("goals lib exports featured selection helpers", () => {
  const source = read(GOALS_LIB);
  assert.match(source, /export function pickFeaturedGoal/);
  assert.match(source, /export function goalRemaining/);
  assert.match(source, /export function goalProgress/);
});
