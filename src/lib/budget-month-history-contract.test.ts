import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync("src/app/budgets/page.tsx", "utf8");
const server = readFileSync("src/server/budgets.ts", "utf8");
const component = readFileSync(
  "src/components/planning/budgets-page.tsx",
  "utf8",
);
const auditConfig = readFileSync("playwright.audit.config.ts", "utf8");
const auditSpec = readFileSync(
  "e2e/audit/budget-month-history.audit.spec.ts",
  "utf8",
);

function countMatches(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

test("budget route resolves the URL month through the server workspace", () => {
  assert.match(route, /searchParams:\s*Promise<\{ month\?: string \}>/);
  assert.match(route, /getBudgetsWorkspace\(params\.month \?\? null\)/);
  assert.match(route, /workspace=\{workspace\}/);
});

test("budget history reads stay tenant and month bounded", () => {
  assert.match(server, /\.eq\("user_id", viewer\.id\)/);
  assert.match(
    server,
    /\.in\("month_start", \[resolution\.monthStart, resolution\.previousMonthStart\]\)/,
  );
  assert.match(
    server,
    /rows\.filter\(\(item\) => item\.monthStart === resolution\.monthStart\)/,
  );
  assert.match(
    server,
    /item\.monthStart === resolution\.previousMonthStart/,
  );
});

test("budget mutations and drill-down use the effective selected month", () => {
  assert.match(component, /input\.monthStart !== workspace\.monthStart/);
  assert.match(component, /next\.monthStart !== workspace\.monthStart/);
  assert.match(component, /budget\.monthStart !== workspace\.monthStart/);
  assert.match(
    component,
    /budgetTransactionsHref\(\s*workspace\.monthStart,\s*budget\.categoryName/,
  );
  assert.match(component, /monthStart=\{workspace\.monthStart\}/);
});

test("budget month browser cases are selected by phone, desktop and WebKit projects", () => {
  assert.match(
    auditConfig,
    /const budgetMonthHistorySpec = \/budget-month-history\\\.audit\\\.spec\\\.ts\//,
  );
  assert.equal(
    countMatches(auditConfig, /testMatch: budgetMonthHistorySpec/g),
    3,
  );
  for (const scenario of [
    "month navigation changes the workspace",
    "category drill-down carries the exact selected month expense window",
    "invalid and future months are repaired",
    "an older month renders an honest empty state",
  ]) {
    assert.match(auditSpec, new RegExp(scenario));
  }
});
