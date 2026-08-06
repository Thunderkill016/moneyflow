import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

const CORE_ROUTE_COMPONENTS = [
  "src/components/moneyflow-dashboard.tsx",
  "src/components/transactions/transactions-workspace.tsx",
  "src/components/accounts-page.tsx",
  "src/components/categories-page.tsx",
  "src/components/planning/budgets-page.tsx",
  "src/components/planning/commitments-page.tsx",
  "src/components/planning/goals-page.tsx",
  "src/components/reports-page.tsx",
  "src/components/export-settings-page.tsx",
] as const;

const SHARED_EMPTY_STATE_OWNERS = [
  "src/components/dashboard/dashboard-overview-sections.tsx",
  "src/components/transactions/transactions-workspace.tsx",
  "src/components/accounts-page.tsx",
  "src/components/categories-page.tsx",
  "src/components/planning/budgets-page.tsx",
  "src/components/planning/commitments-page.tsx",
  "src/components/planning/goals-page.tsx",
] as const;

const CORE_ROUTES = [
  "/dashboard",
  "/transactions",
  "/accounts",
  "/categories",
  "/budgets",
  "/commitments",
  "/goals",
  "/reports",
  "/settings/export",
] as const;

test("locked MVP core route files and browser gate remain present", () => {
  for (const path of CORE_ROUTE_COMPONENTS) {
    assert.ok(existsSync(join(root, path)), `${path} must exist`);
  }
  for (const path of SHARED_EMPTY_STATE_OWNERS) {
    assert.ok(existsSync(join(root, path)), `${path} must exist`);
  }

  const specPath = "e2e/mvp-empty-state-primary-actions.spec.ts";
  assert.ok(existsSync(join(root, specPath)), `${specPath} must exist`);
  const spec = read(specPath);
  for (const route of CORE_ROUTES) {
    assert.ok(spec.includes(`"${route}"`), `${route} must stay in the browser release gate`);
  }
  assert.match(spec, /exactly one visible primary action/);
  assert.match(spec, /\/reports\/export\?period=/);
  assert.match(spec, /\/settings\/export/);
});

test("shared EmptyState can render only one primary control", () => {
  const source = read("src/components/empty-state.tsx");
  assert.match(source, /actionLabel && onAction/);
  assert.match(source, /actionLabel && actionHref && !onAction/);
  assert.equal(
    (source.match(/className="primary-button"/g) ?? []).length,
    2,
    "the two mutually exclusive button/link branches are the only primary render sites",
  );
  assert.equal(
    (source.match(/className="secondary-button"/g) ?? []).length,
    1,
    "EmptyState keeps at most one muted secondary action",
  );
});

test("core action-bearing empty states do not reintroduce duplicate direct action regions", () => {
  for (const path of SHARED_EMPTY_STATE_OWNERS) {
    const source = read(path);
    assert.ok(
      source.includes("EmptyState"),
      `${path} should use a shared EmptyState contract when it owns an action-bearing empty state`,
    );
    assert.ok(
      !source.includes('className="empty-state-actions"'),
      `${path} must not bypass the shared action-region contract`,
    );
  }

  const transactions = read(
    "src/components/transactions/transactions-workspace.tsx",
  );
  assert.match(transactions, /@\/components\/ui\/empty-state/);
  assert.equal(
    (transactions.match(/<EmptyState/g) ?? []).length,
    2,
    "Transactions keeps one no-results branch and one true-empty branch",
  );

  const dashboardRoute = read("src/components/moneyflow-dashboard.tsx");
  assert.match(
    dashboardRoute,
    /DashboardHeaderSections/,
    "Dashboard must keep delegating its action-bearing ledger empty state to the audited section owner",
  );
  assert.ok(
    !dashboardRoute.includes('className="empty-state-actions"'),
    "Dashboard route component must not add a second direct empty-state action region",
  );

  const exportSettings = read("src/components/export-settings-page.tsx");
  assert.ok(
    !exportSettings.includes('className="empty-state-actions"'),
    "Export settings must not add an unaudited direct empty-state action region",
  );

  const reports = read("src/components/reports-page.tsx");
  const start = reports.indexOf('className="report-empty"');
  const end = reports.indexOf('className="reports-export-foot"');
  assert.ok(start >= 0 && end > start, "Reports empty branch must remain discoverable");
  const reportEmptyBranch = reports.slice(start, end);
  assert.equal(
    (reportEmptyBranch.match(/className="primary-button"/g) ?? []).length,
    1,
    "Reports empty state exposes exactly one primary action",
  );
  assert.ok(
    (reportEmptyBranch.match(/className="secondary-button"/g) ?? []).length <= 1,
    "Reports empty state exposes at most one muted secondary action",
  );
});
