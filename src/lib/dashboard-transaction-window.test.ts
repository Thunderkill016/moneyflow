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
});

test("dashboard uses bounded loader while transaction management keeps full ledger", () => {
  assert.match(dashboardPage, /getDashboardFinanceWorkspace/);
  assert.doesNotMatch(dashboardPage, /getFinanceWorkspace/);
  assert.match(transactionsPage, /getFinanceWorkspace/);
  assert.doesNotMatch(transactionsPage, /getDashboardFinanceWorkspace/);
});
