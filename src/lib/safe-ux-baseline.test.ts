import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

/** MF SAFE-UX repaired regression contracts. */

test("SAFE-02: public landing routes load a visible mobile Login override", () => {
  const override = readProjectFile("src/app/landing/safe-ux-login.css");
  const home = readProjectFile("src/app/page.tsx");
  const landing = readProjectFile("src/app/landing/page.tsx");

  assert.match(
    override,
    /nav\[aria-label="Điều hướng trang chủ"\]\s+a\[href="\/login"\][\s\S]*?display:\s*inline-flex/,
  );
  assert.match(override, /min-height:\s*44px/);
  assert.match(home, /import "\.\/landing\/safe-ux-login\.css"/);
  assert.match(landing, /import "\.\/safe-ux-login\.css"/);
});

test("SAFE-03: authenticated Inbox count is server-derived and demo storage is isolated", () => {
  const dashboard = readProjectFile("src/components/moneyflow-dashboard.tsx");
  const page = readProjectFile("src/app/dashboard/page.tsx");
  const dashboardServer = readProjectFile("src/server/dashboard.ts");
  const inboxServer = readProjectFile("src/server/inbox.ts");

  assert.match(
    dashboard,
    /const inboxCount = viewer\.isDemo \? demoInboxCount : initialInboxCount/,
  );
  assert.match(
    dashboard,
    /useEffect\(\(\) => \{\s*if \(!viewer\.isDemo\) return;[\s\S]*?readStoredCandidates\(\)/,
  );
  assert.doesNotMatch(dashboard, /const \[inboxCount, setInboxCount\]/);
  assert.match(page, /getDashboardPageWorkspace/);
  assert.match(page, /initialInboxCount=\{pendingInboxCount\}/);
  assert.match(dashboardServer, /pending_inbox_count/);
  assert.match(
    dashboardServer,
    /pendingInboxCount: safeInteger|const pendingInboxCount = safeInteger/,
  );
  assert.match(inboxServer, /\.eq\("status", "pending"\)/);
  assert.match(inboxServer, /select\("id", \{ count: "exact", head: true \}\)/);
});

test("SAFE-04/05: Dashboard owns responsive layout while Budgets and Goals retain their compatibility contract", () => {
  const planningCss = readProjectFile("src/app/safe-ux-planning.css");
  const dashboardCss = readProjectFile(
    "src/components/dashboard/dashboard.module.css",
  );
  const dashboardPage = readProjectFile("src/app/dashboard/page.tsx");
  const dashboard = readProjectFile("src/components/moneyflow-dashboard.tsx");
  const budgetsPage = readProjectFile("src/app/budgets/page.tsx");
  const goalsPage = readProjectFile("src/app/goals/page.tsx");

  assert.doesNotMatch(dashboardPage, /import\s+["'][^"']+\.css["']/);
  assert.match(dashboard, /dashboard\.module\.css/);
  assert.match(budgetsPage, /import "\.\.\/safe-ux-planning\.css"/);
  assert.match(goalsPage, /import "\.\.\/safe-ux-planning\.css"/);
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*1080px\)[\s\S]*?\.dashboard :global\(\.content-grid\.insights-main-grid\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    dashboardCss,
    /@media \(max-width:\s*760px\)[\s\S]*?\.dashboard :global\(\.right-stack\)[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    planningCss,
    /\.budgets-workspace \.budget-overview,[\s\S]*?\.goals-workspace \.goal-hero[\s\S]*?grid-template-columns:\s*1fr/,
  );
  assert.match(
    planningCss,
    /\.budgets-workspace \.budget-category-actions a,[\s\S]*?\.goals-workspace \.goal-actions button[\s\S]*?min-height:\s*44px/,
  );
  assert.doesNotMatch(planningCss, /\.insights-dashboard/);
});

test("SAFE-06: Dashboard amount surfaces are neutral and semantic color stays on figures", () => {
  const dashboardCss = readProjectFile(
    "src/components/dashboard/dashboard.module.css",
  );
  const statementCss = readProjectFile(
    "src/components/dashboard/statement.module.css",
  );

  assert.match(
    statementCss,
    /\.statement\s*\{[\s\S]*?background:\s*var\(--mf-surface\)/,
  );
  // Semantic colour still belongs on the figures, but it must be the -text grade:
  // the fill tokens measure 3.30:1 (income) and 4.13:1 (expense) as text on the
  // statement surface, under the 4.5:1 that WCAG 2.2 AA requires for body copy.
  assert.match(statementCss, /\.legendIncome[\s\S]*?var\(--mf-income-text\)/);
  assert.match(statementCss, /\.legendExpense[\s\S]*?var\(--mf-expense-text\)/);
  assert.match(
    dashboardCss,
    /\.dashboard :global\(\.panel\),[\s\S]*?background:\s*var\(--mf-surface\)/,
  );
  assert.doesNotMatch(`${dashboardCss}\n${statementCss}`, /#[0-9a-f]{3,8}\b/i);
});

test("SAFE-06B: weekly totals stay anchored below the locally owned card header", () => {
  const dashboardCss = readProjectFile(
    "src/components/dashboard/dashboard.module.css",
  );

  assert.match(
    dashboardCss,
    /\.dashboard :global\(\.weekly-summary-panel \.section-heading\)[\s\S]*?margin-bottom:\s*14px/,
  );
  assert.match(
    dashboardCss,
    /\.dashboard :global\(\.weekly-summary-kpis\)\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    dashboardCss,
    /\.dashboard :global\(\.weekly-summary-kpis > div\)[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/,
  );
  assert.match(dashboardCss, /@media \(max-width:\s*760px\)/);
});
