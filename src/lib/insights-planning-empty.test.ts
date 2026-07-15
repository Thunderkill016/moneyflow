/**
 * R3 — Insights empty + planning cards: consistent one-CTA empty states.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
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
} from "./insights-planning-empty.ts";

const root = process.cwd();
const DASHBOARD = join(root, "src/components/moneyflow-dashboard.tsx");
const PLANNING_EMPTY_UI = join(root, "src/components/planning-card-empty.tsx");

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

test("PlanningCardEmpty component exists for compact card empties", () => {
  assert.ok(existsSync(PLANNING_EMPTY_UI), "planning-card-empty.tsx must exist");
  const source = read(PLANNING_EMPTY_UI);
  assert.match(source, /export function PlanningCardEmpty/);
  assert.match(source, /planning-card-empty/);
  // No secondary action prop — one CTA max
  assert.ok(!source.includes("secondaryLabel"), "compact empty must not support secondary CTA");
});

test("dashboard uses shared ledger empty + PlanningCardEmpty (R3)", () => {
  const source = read(DASHBOARD);
  assert.match(source, /INSIGHTS_LEDGER_EMPTY|Chưa có giao dịch nào/);
  assert.match(source, /PlanningCardEmpty/);
  assert.match(source, /PLANNING_EMPTY_BUDGET|Thiết lập ngân sách/);
  assert.match(source, /PLANNING_EMPTY_GOAL|Tạo mục tiêu/);
  assert.match(source, /PLANNING_EMPTY_COMMITMENT|Thêm khoản định kỳ/);
  assert.match(source, /PLANNING_EMPTY_INCOME|Thêm lương định kỳ/);
  // Main EmptyState: single primary, no secondary account CTA
  assert.ok(
    !source.includes('secondaryLabel="Thêm tài khoản"'),
    "Insights empty: one primary CTA only",
  );
  // Empty ledger weekly must not re-offer Ghi chi (duplicate primary)
  assert.ok(
    source.includes("PLANNING_EMPTY_WEEKLY_LEDGER") ||
      !/isEmptyLedger[\s\S]{0,200}GHI_CHI_TIEU_LABEL/.test(source),
    "weekly empty on empty ledger should not re-CTA Ghi chi",
  );
});
