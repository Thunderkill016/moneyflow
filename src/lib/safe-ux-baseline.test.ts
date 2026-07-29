import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const readProjectFile = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

/**
 * Temporary characterization tests for MF SAFE-UX Phase 0.
 *
 * These assertions deliberately lock confirmed defective behavior so the
 * implementation PRs cannot silently change the evidence baseline. Each test
 * must be replaced with the repaired contract in SAFE-T2–T6.
 */

test("SAFE-02 baseline: mobile CSS currently hides the Login action", () => {
  const css = readProjectFile("src/components/landing-page.module.css");
  const mobileRule = css.match(
    /@media\s*\(max-width:\s*560px\)[\s\S]*?\.loginLink\s*\{[\s\S]*?display:\s*none\s*;[\s\S]*?\}/,
  );

  assert.ok(
    mobileRule,
    "Phase 0 expects the confirmed mobile Login hiding rule to remain until SAFE-T2 replaces this characterization test",
  );
});

test("SAFE-03 baseline: Dashboard pending count currently reads browser storage", () => {
  const dashboard = readProjectFile("src/components/moneyflow-dashboard.tsx");

  assert.match(dashboard, /countPending\s*\(\s*readStoredCandidates\s*\(\s*\)\s*\)/);
  assert.match(dashboard, /setInboxCount\s*\(/);
  assert.match(dashboard, /loadInboxForClient|readStoredCandidates/);
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
