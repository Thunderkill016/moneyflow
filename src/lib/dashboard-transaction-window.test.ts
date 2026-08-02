import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  DASHBOARD_RECENT_TRANSACTION_LIMIT,
  dashboardTransactionStart,
} from "./dashboard-transaction-window.ts";

const root = process.cwd();
const financeServer = readFileSync(join(root, "src/server/finance.ts"), "utf8");
const dashboardServer = readFileSync(
  join(root, "src/server/dashboard.ts"),
  "utf8",
);
const dashboardPage = readFileSync(join(root, "src/app/dashboard/page.tsx"), "utf8");
const transactionsPage = readFileSync(
  join(root, "src/app/transactions/page.tsx"),
  "utf8",
);

test("dashboard starts at month boundary when it is earlier than weekly comparison", () => {
  assert.equal(dashboardTransactionStart("2026-07-26"), "2026-07-01");
});

test("dashboard includes previous weekly comparison across a month boundary", () => {
  assert.equal(dashboardTransactionStart("2026-08-02"), "2026-07-20");
});

test("dashboard keeps a small explicit recent-activity window", () => {
  assert.equal(DASHBOARD_RECENT_TRANSACTION_LIMIT, 5);
  assert.match(financeServer, /\.gte\("occurred_on", dashboardTransactionStart\(today\)\)/);
  assert.match(
    financeServer,
    /\.limit\(DASHBOARD_RECENT_TRANSACTION_LIMIT\)/,
  );
  assert.match(financeServer, /deduplicateTransactions/);
  assert.match(
    dashboardServer,
    /p_recent_limit:\s*DASHBOARD_RECENT_TRANSACTION_LIMIT/,
  );
  assert.match(
    dashboardServer,
    /p_transaction_start:\s*dashboardTransactionStart\(today\)/,
  );
});

test("dashboard uses one bundled loader while transaction management keeps its own ledger", () => {
  assert.match(dashboardPage, /getDashboardPageWorkspace/);
  assert.doesNotMatch(dashboardPage, /getFinanceWorkspace/);
  assert.doesNotMatch(dashboardPage, /Promise\.all/);
  assert.match(dashboardServer, /\.rpc\("get_dashboard_bundle"/);
  assert.equal(
    (dashboardServer.match(/\.rpc\(/g) ?? []).length,
    1,
    "authenticated dashboard has one Data API RPC on the healthy path",
  );
  assert.match(transactionsPage, /getFinanceWorkspace/);
  assert.doesNotMatch(transactionsPage, /getDashboardFinanceWorkspace/);
});

test("dashboard preserves real data when the bundled RPC is unavailable or invalid", () => {
  assert.match(
    dashboardServer,
    /async function getAuthenticatedDashboardFallback\(\)/,
  );
  assert.match(dashboardServer, /getPendingInboxCountFromServer\(\)/);
  assert.match(dashboardServer, /dashboard_bundle_unavailable/);
  assert.match(dashboardServer, /dashboard_bundle_invalid_response/);
  assert.equal(
    (dashboardServer.match(/return getAuthenticatedDashboardFallback\(\);/g) ?? [])
      .length,
    2,
    "both RPC failure and invalid payload use the focused authenticated loaders",
  );
});
