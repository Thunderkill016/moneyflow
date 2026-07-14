/**
 * TASK-118 — Static RLS surface checks on Supabase migrations.
 * No Docker / no live prod: parses SQL files under supabase/migrations/.
 * Full runtime suite: npm run test:db (see docs/security-rls-check.md).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");

const REQUIRED_TABLES = [
  "profiles",
  "accounts",
  "categories",
  "financial_transactions",
  "transaction_entries",
  "monthly_budgets",
  "recurring_commitments",
  "commitment_occurrences",
  "recurring_income_templates",
  "income_template_occurrences",
  "savings_goals",
  "savings_goal_allocations",
  "import_batches",
  "inbox_candidates",
] as const;

function loadMigrationsSql(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.ok(files.length > 0, "expected at least one migration file");
  return files
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

function normalize(sql: string): string {
  return sql.toLowerCase();
}

function publicTables(sqlLc: string): string[] {
  const found = new Set<string>();
  const re = /create\s+table\s+public\.([a-z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sqlLc)) !== null) {
    found.add(m[1]);
  }
  return [...found].sort();
}

function hasRlsEnabled(sqlLc: string, table: string): boolean {
  const re = new RegExp(
    `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
  );
  return re.test(sqlLc);
}

function hasPolicyOn(sqlLc: string, table: string): boolean {
  // Multi-line: create policy "…" on public.table
  const flat = sqlLc.replace(/\s+/g, " ");
  const re = new RegExp(
    `create\\s+policy\\s+[^;]+?\\s+on\\s+public\\.${table}\\b`,
  );
  return re.test(flat);
}

function securityDefinerWindows(sqlLc: string): string[] {
  const flat = sqlLc.replace(/\s+/g, " ");
  const parts = flat.split("security definer");
  // Skip text before first match
  return parts.slice(1).map((chunk) => chunk.slice(0, 160));
}

test("rls migrations: every public table enables RLS", () => {
  const sqlLc = normalize(loadMigrationsSql());
  const tables = publicTables(sqlLc);
  assert.ok(tables.length >= REQUIRED_TABLES.length, "expected core tables");

  for (const table of tables) {
    assert.ok(
      hasRlsEnabled(sqlLc, table),
      `public.${table} must ENABLE ROW LEVEL SECURITY`,
    );
  }
});

test("rls migrations: every public table has at least one policy", () => {
  const sqlLc = normalize(loadMigrationsSql());
  for (const table of publicTables(sqlLc)) {
    assert.ok(
      hasPolicyOn(sqlLc, table),
      `public.${table} must have CREATE POLICY … ON public.${table}`,
    );
  }
});

test("rls migrations: required user-owned tables present", () => {
  const sqlLc = normalize(loadMigrationsSql());
  const tables = new Set(publicTables(sqlLc));
  for (const table of REQUIRED_TABLES) {
    assert.ok(tables.has(table), `missing required table public.${table}`);
  }
});

test("rls migrations: SECURITY DEFINER sets search_path", () => {
  const sqlLc = normalize(loadMigrationsSql());
  const windows = securityDefinerWindows(sqlLc);
  assert.ok(windows.length > 0, "expected at least one SECURITY DEFINER RPC");
  for (const [i, window] of windows.entries()) {
    assert.ok(
      window.includes("set search_path"),
      `SECURITY DEFINER #${i + 1} must set search_path nearby`,
    );
  }
});

test("rls migrations: ledger is select-policy oriented (no direct DML policies)", () => {
  const sqlLc = normalize(loadMigrationsSql());
  const flat = sqlLc.replace(/\s+/g, " ");
  // financial_transactions: expect select policy name pattern; no insert policy
  assert.match(
    flat,
    /create policy "transactions_select_own" on public\.financial_transactions/,
  );
  assert.doesNotMatch(
    flat,
    /create policy "[^"]+" on public\.financial_transactions for insert/,
  );
  assert.doesNotMatch(
    flat,
    /create policy "[^"]+" on public\.transaction_entries for insert/,
  );
});
