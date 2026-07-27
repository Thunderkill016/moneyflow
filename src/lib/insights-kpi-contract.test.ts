/**
 * TASK-256 — MVP-CORE dashboard KPI completeness.
 * Contract on dashboard composition: số dư, thu/chi/ròng, top categories,
 * recent, Ghi chi CTA, export CTA. No missing widget.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { readDashboardSource } from "./test-support/dashboard-source.ts";

const root = process.cwd();
const PAGE = join(root, "src/app/dashboard/page.tsx");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

test("dashboard page mounts MoneyFlowDashboard with the bounded finance loader", () => {
  const source = read(PAGE);
  assert.match(source, /MoneyFlowDashboard/);
  assert.match(source, /getDashboardFinanceWorkspace/);
});

test("dashboard KPI row: số dư, thu tháng, chi tháng, ròng", () => {
  const source = readDashboardSource();
  assert.match(source, /insights-kpi/);
  assert.match(source, /Số dư tổng/);
  assert.match(source, /Thu tháng/);
  assert.match(source, /Chi tháng/);
  assert.match(source, /Ròng/);
  assert.match(source, /calculateDashboardSummary/);
  assert.match(source, /totals\.balance/);
  assert.match(source, /totals\.income/);
  assert.match(source, /totals\.expense/);
  assert.match(source, /totals\.net/);
});

test("dashboard top categories widget (expense bars, not pie)", () => {
  const source = readDashboardSource();
  assert.match(source, /topExpenseCategories/);
  assert.match(source, /Chi theo danh mục/);
  assert.match(source, /dashboard-category-list|insights-category-row/);
});

test("dashboard recent transactions widget", () => {
  const source = readDashboardSource();
  assert.match(source, /Giao dịch gần đây/);
  assert.match(source, /transactions\.slice\(0,\s*5\)/);
  assert.match(source, /href="\/transactions"/);
});

test("dashboard Ghi chi CTA (welcome + primary action)", () => {
  const source = readDashboardSource();
  assert.match(source, /GHI_CHI_TIEU_LABEL/);
  assert.match(source, /insights-ghi-chi/);
  assert.match(source, /openGhiChi|setDialogOpen\(true\)/);
  assert.match(source, /AddTransactionDialog/);
});

test("dashboard export CTA discoverable (Xuất CSV → settings export)", () => {
  const source = readDashboardSource();
  assert.match(source, /EXPORT_CSV_LABEL/);
  assert.match(source, /EXPORT_SETTINGS_HREF/);
  assert.match(source, /insights-export-csv/);
});

test("KPI completeness checklist — no missing widget string", () => {
  const source = readDashboardSource();
  const required = [
    "Số dư tổng",
    "Thu tháng",
    "Chi tháng",
    "Ròng",
    "Chi theo danh mục",
    "Giao dịch gần đây",
    "insights-ghi-chi",
    "insights-export-csv",
  ] as const;
  for (const token of required) {
    assert.ok(
      source.includes(token),
      `Dashboard missing widget/token: ${JSON.stringify(token)}`,
    );
  }
});
