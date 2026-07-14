/**
 * TASK-115 — Featured goal progress card on Insights.
 * Contract: progress UI, link /goals, empty CTA tạo mục tiêu.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const DASHBOARD = join(process.cwd(), "src/components/moneyflow-dashboard.tsx");
const GOALS_LIB = join(process.cwd(), "src/lib/goals.ts");
const PAGE = join(process.cwd(), "src/app/insights/page.tsx");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("insights page loads goals workspace into dashboard", () => {
  const source = read(PAGE);
  assert.match(source, /getGoalsWorkspace/);
  assert.match(source, /goals=\{goalWorkspace\.goals\}/);
});

test("dashboard uses pickFeaturedGoal and progress bar", () => {
  const source = read(DASHBOARD);
  assert.match(source, /pickFeaturedGoal/);
  assert.match(source, /goal-dashboard-panel/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /Mục tiêu tiết kiệm/);
});

test("dashboard links to /goals and empty CTA creates goal", () => {
  const source = read(DASHBOARD);
  assert.ok(source.includes('href="/goals"'), "expected /goals link");
  assert.ok(source.includes("Tạo mục tiêu"), "expected empty CTA");
  assert.ok(
    source.includes("Dành tiền cho một điều bạn muốn đạt được."),
    "expected empty copy",
  );
  assert.ok(source.includes("Xem tất cả mục tiêu"), "expected list link when featured");
});

test("goals lib exports featured selection helpers", () => {
  const source = read(GOALS_LIB);
  assert.match(source, /export function pickFeaturedGoal/);
  assert.match(source, /export function goalRemaining/);
  assert.match(source, /export function goalProgress/);
});
