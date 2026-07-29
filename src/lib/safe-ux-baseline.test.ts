import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

/**
 * MF SAFE-UX regression contracts.
 *
 * SAFE-02 and SAFE-03 now assert repaired behavior. The remaining Phase 0
 * characterizations are replaced when SAFE-T4–T6 deliver their shared UI fixes.
 */

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
  const server = readProjectFile("src/server/inbox.ts");

  assert.match(
    dashboard,
    /const inboxCount = viewer\.isDemo \? demoInboxCount : initialInboxCount/,
  );
  assert.match(
    dashboard,
    /useEffect\(\(\) => \{\s*if \(!viewer\.isDemo\) return;[\s\S]*?readStoredCandidates\(\)/,
  );
  assert.doesNotMatch(dashboard, /const \[inboxCount, setInboxCount\]/);
  assert.match(page, /getPendingInboxCountFromServer/);
  assert.match(page, /initialInboxCount=\{pendingInboxCount \?\? 0\}/);
  assert.match(server, /\.eq\("status", "pending"\)/);
  assert.match(server, /select\("id", \{ count: "exact", head: true \}\)/);
});

test("SAFE-04/05 baseline: Dashboard Budget and Goal cards share the generic amount structure", () => {
  const planning = readProjectFile(
    "src/components/dashboard/dashboard-planning-sections.tsx",
  );
  const css = readProjectFile("src/app/dashboard/calm-ledger-overview.css");

  assert.match(planning, /<h2>Ngân sách tháng<\/h2>/);
  assert.match(planning, /<h2>Mục tiêu tiết kiệm<\/h2>/);
  assert.ok(
    (planning.match(/className="budget-number"/g) ?? []).length >= 2,
    "Budget and Goal currently reuse the same amount row",
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*760px\)[\s\S]*?\.insights-dashboard\s+\.section-heading\s+p\s*\{[\s\S]*?display:\s*none\s*;/,
  );
});

test("SAFE-06 baseline: the first Dashboard KPI currently owns a route-local gradient", () => {
  const css = readProjectFile("src/app/dashboard/calm-ledger-overview.css");

  assert.match(
    css,
    /\.insights-dashboard\s+\.insights-kpi\s*>\s*article:first-child\s*\{[\s\S]*?linear-gradient\(/,
  );
});
