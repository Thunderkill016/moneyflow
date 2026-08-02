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

test("SAFE-04/05: Dashboard, Budgets and Goals share the repaired responsive contract", () => {
  const css = readProjectFile("src/app/safe-ux-planning.css");
  const dashboardPage = readProjectFile("src/app/dashboard/page.tsx");
  const budgetsPage = readProjectFile("src/app/budgets/page.tsx");
  const goalsPage = readProjectFile("src/app/goals/page.tsx");

  assert.match(dashboardPage, /import "\.\.\/safe-ux-planning\.css"/);
  assert.match(budgetsPage, /import "\.\.\/safe-ux-planning\.css"/);
  assert.match(goalsPage, /import "\.\.\/safe-ux-planning\.css"/);
  assert.match(
    css,
    /\.insights-dashboard \.budget-panel \.section-heading p,[\s\S]*?\.goal-dashboard-panel \.section-heading p[\s\S]*?display:\s*block/,
  );
  assert.match(
    css,
    /\.budgets-workspace \.budget-overview,[\s\S]*?\.goals-workspace \.goal-hero[\s\S]*?grid-template-columns:\s*1fr/,
  );
  assert.match(
    css,
    /\.budgets-workspace \.budget-category-actions a,[\s\S]*?\.goals-workspace \.goal-actions button[\s\S]*?min-height:\s*44px/,
  );
  assert.match(
    css,
    /\.budget-card-grid,[\s\S]*?\.goal-card-grid[\s\S]*?grid-template-columns:\s*1fr/,
  );
});

test("SAFE-06: amount surfaces are neutral by default and token-driven", () => {
  const css = readProjectFile("src/app/safe-ux-planning.css");

  assert.match(
    css,
    /\.insights-dashboard \.insights-kpi > article:first-child[\s\S]*?background:\s*var\(--mf-surface\)/,
  );
  assert.match(
    css,
    /article:nth-child\(2\)[\s\S]*?var\(--mf-income\)/,
  );
  assert.match(
    css,
    /article:nth-child\(3\)[\s\S]*?var\(--mf-expense\)/,
  );
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});

test("SAFE-06B: weekly and today totals stay anchored below the card header", () => {
  const css = readProjectFile("src/app/dashboard/safe-ux-weekly-summary.css");
  const dashboardPage = readProjectFile("src/app/dashboard/page.tsx");

  assert.match(dashboardPage, /import "\.\/safe-ux-weekly-summary\.css"/);
  assert.match(
    css,
    /\.weekly-summary-panel \.section-heading[\s\S]*?margin-bottom:\s*14px/,
  );
  assert.match(
    css,
    /\.weekly-summary-panel \.weekly-summary-kpis\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/,
  );
  assert.match(
    css,
    /\.weekly-summary-panel \.weekly-summary-kpis > div[\s\S]*?display:\s*grid[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/,
  );
  assert.match(css, /@media \(max-width:\s*760px\)/);
});
