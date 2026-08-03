import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const finance = readFileSync("src/server/finance.ts", "utf8");
const budgets = readFileSync("src/server/budgets.ts", "utf8");
const reports = readFileSync("src/server/reports.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260804160000_financial_mutation_audit.sql",
  "utf8",
);
const edgeFunction = readFileSync(
  "supabase/functions/delete-account/index.ts",
  "utf8",
);

function countMatches(source: string, pattern: RegExp) {
  return [...source.matchAll(pattern)].length;
}

test("large authenticated finance reads repeat the viewer tenant predicate", () => {
  assert.ok(
    countMatches(
      finance,
      /\.from\("transaction_feed"\)[\s\S]*?\.eq\("user_id", viewer\.id\)/g,
    ) >= 3,
    "all full, dashboard-window and recent transaction reads need an explicit tenant filter",
  );
  assert.match(
    finance,
    /\.from\("transaction_review_feed"\)[\s\S]*?\.eq\("user_id", viewer\.id\)/,
  );
  for (const table of ["accounts", "categories", "account_balances"]) {
    assert.match(
      finance,
      new RegExp(
        `\\.from\\("${table}"\\)[\\s\\S]*?\\.eq\\("user_id", viewer\\.id\\)`,
      ),
      `${table} finance read needs an explicit tenant filter`,
    );
  }
});

test("budget and report reads repeat the viewer tenant predicate", () => {
  assert.match(
    budgets,
    /\.from\("budget_progress"\)[\s\S]*?\.eq\("user_id", viewer\.id\)/,
  );
  assert.match(
    budgets,
    /\.from\("categories"\)[\s\S]*?\.eq\("user_id", viewer\.id\)/,
  );
  assert.match(
    reports,
    /\.from\("transaction_feed"\)[\s\S]*?\.eq\("user_id", viewer\.id\)/,
  );
});

test("audit schema is structural, append-only for browsers and trigger-owned", () => {
  assert.match(migration, /create table public\.financial_mutation_audit_events/);
  assert.match(migration, /enable row level security/);
  assert.match(
    migration,
    /grant select on public\.financial_mutation_audit_events to authenticated/,
  );
  assert.doesNotMatch(
    migration,
    /grant (?:insert|update|delete)[^;]*financial_mutation_audit_events[^;]*authenticated/i,
  );
  assert.doesNotMatch(
    migration,
    /\b(?:note|merchant|raw_snippet|payload|request_body|metadata)\b[^\n]*\b(?:text|json|jsonb)\b/i,
  );
  assert.match(migration, /financial_transactions_audit_mutation/);
  assert.match(migration, /transaction_entries_audit_mutation/);
  assert.match(migration, /account_reconciliations_audit_mutation/);
});

test("account deletion independently purges and verifies audit metadata", () => {
  assert.match(
    migration,
    /delete from public\.financial_mutation_audit_events where user_id = p_user_id/,
  );
  assert.match(
    edgeFunction,
    /table: "financial_mutation_audit_events", ownerColumn: "user_id"/,
  );
});

test("private financial reads remain uncached until measurement justifies it", () => {
  for (const source of [finance, budgets, reports]) {
    assert.doesNotMatch(source, /unstable_cache|use cache|cacheTag|cacheLife/);
  }
});
