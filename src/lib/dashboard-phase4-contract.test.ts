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
const dashboardMonth = readFileSync(
  "src/lib/dashboard-month.ts",
  "utf8",
);
const transactionWindow = readFileSync(
  "src/lib/dashboard-transaction-window.ts",
  "utf8",
);
const dashboardCss = readFileSync(
  "src/components/dashboard/dashboard.module.css",
  "utf8",
);
const retiredKpiClass = ["insights", "kpi"].join("-");

test("dashboard route no longer imports page-global presentation styles", () => {
  assert.doesNotMatch(page, /import\s+["'][^"']+\.css["'];?/);
  assert.doesNotMatch(
    page,
    /calm-ledger-overview|safe-ux-planning|safe-ux-weekly-summary/,
  );
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
  assert.match(overview, /styles\.attentionStripEmpty/);
  assert.match(overview, /Chưa thể tải các mục cần xử lý/);
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
  assert.match(
    planning,
    /featuredGoalProgressValue = Math\.min\(featuredGoalProgress, 100\)/,
  );
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

test("statement shows per-account balances in each account's own currency", () => {
  assert.match(statement, /accountBalances/);
  assert.match(statement, /STATEMENT_ACCOUNT_LIMIT/);
  assert.match(statement, /amount=\{account\.balance\}/);
  assert.match(statement, /currencyCode=\{account\.currencyCode\}/);
  assert.match(statement, /href="\/accounts"/);
  // The strip displays server rows only; it never re-derives or mixes the total.
  assert.doesNotMatch(statement, /accountBalances\.reduce|\.reduce\(/);
});

test("statement month shape and prior compare lift the reports computation", () => {
  // The domain helper borrows `reportRange`/`buildFinancialReport` instead of
  // re-deriving buckets or sums, so the statement can never drift from /reports.
  assert.match(dashboardMonth, /reportRange\(today, "month"\)/);
  assert.match(dashboardMonth, /buildFinancialReport\(transactions, range\)/);
  assert.match(dashboardMonth, /report\.trend\.map/);
  assert.match(dashboardMonth, /report\.previous\.expense/);
  assert.doesNotMatch(dashboardMonth, /kind === "income"/);
  // The loader window reaches the monthly comparison's previous start so the
  // compare line has real rows behind it on every day of the month.
  assert.match(
    transactionWindow,
    /reportRange\(today, "month"\)\.previousStart/,
  );
  // Presentation: an accessible strip plus a factual compare line that stays
  // silent when no prior-month rows exist.
  assert.match(statement, /monthDetail/);
  assert.match(statement, /styles\.shape\b/);
  assert.match(statement, /styles\.compare\b/);
  assert.match(statement, /role="img"/);
  assert.match(statement, /monthDetail\.prior\.transactions > 0/);
  assert.match(overview, /monthDetail=\{monthDetail\}/);
  assert.match(dashboard, /monthStatementDetail\(transactions, workspace\.today\)/);
});

test("obligations remainder stays a derived line the statement can withhold", () => {
  // The figure is computed once in the planning domain module — presentation
  // receives only the finished sentence and renders nothing when it is null.
  assert.match(dashboard, /buildCommittedRemainder\(/);
  assert.match(dashboard, /committedRemainderLabel\(/);
  assert.match(dashboard, /remainderLine=\{remainderLine\}/);
  assert.match(overview, /remainderLine=\{remainderLine\}/);
  assert.match(statement, /remainderLine \? \(/);
  assert.match(statement, /href="\/commitments"/);
  // The statement never re-derives the number itself.
  assert.doesNotMatch(statement, /buildCommittedRemainder|committedRemainderLabel/);
});

test("withdrawn safe-to-spend advice is absent from active Dashboard JSX", () => {
  assert.doesNotMatch(dashboard, /safe-card-hero|safe[- ]to[- ]spend/i);
  assert.doesNotMatch(overview, /safe-card-hero|safe[- ]to[- ]spend/i);
  assert.doesNotMatch(planning, /safe-card-hero|safe[- ]to[- ]spend/i);
});
