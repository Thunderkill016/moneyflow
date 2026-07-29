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

/*
 * The four month figures are now one statement rather than a four-card KPI row,
 * and the labels were rewritten in plain Vietnamese ("Bạn đang có" / "Tiền vào"
 * / "Tiền ra" / "Còn lại" instead of "Số dư tổng" / "Thu tháng" / "Chi tháng" /
 * "Ròng"). The contract below still checks the same thing this test always
 * checked — that all four figures are present and derived from the summary —
 * only the wording and the container changed.
 */
test("dashboard statement: số dư, tiền vào, tiền ra, còn lại", () => {
  const source = readDashboardSource();
  assert.match(source, /DashboardStatement/);
  assert.match(source, /Bạn đang có/);
  assert.match(source, /Tiền vào/);
  assert.match(source, /Tiền ra/);
  assert.match(source, /Còn lại/);
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

/*
 * The dashboard no longer repeats "Ghi chi tiêu" beside the balance: the app
 * shell already presents it in the desktop top bar and the phone tab bar, so a
 * second copy put two identical primary buttons in one viewport. The dashboard
 * still owns the dialog and still offers the action from its empty state, which
 * is what this contract exists to protect.
 */
test("dashboard Ghi chi CTA (empty state + dialog wiring)", () => {
  const source = readDashboardSource();
  assert.match(source, /GHI_CHI_TIEU_LABEL/);
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
    "Bạn đang có",
    "Tiền vào",
    "Tiền ra",
    "Còn lại",
    "Chi theo danh mục",
    "Giao dịch gần đây",
    "GHI_CHI_TIEU_LABEL",
    "insights-export-csv",
  ] as const;
  for (const token of required) {
    assert.ok(
      source.includes(token),
      `Dashboard missing widget/token: ${JSON.stringify(token)}`,
    );
  }
});
