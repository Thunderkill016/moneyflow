import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260725035128_restore_split_feed_and_account_currency.sql",
  ),
  "utf8",
);

test("repair migration restores split expense RPC with tenant-safe validation", () => {
  assert.match(migration, /create or replace function public\.create_split_expense/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = ''/);
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/);
  assert.match(migration, /coalesce\(is_archived, false\) = false/);
  assert.match(migration, /grant execute on function public\.create_split_expense[\s\S]*to authenticated/);
});

test("repair migration leaves transaction feed security-invoker and split-aware", () => {
  assert.match(
    migration,
    /create or replace view public\.transaction_feed with \(security_invoker = true\)/,
  );
  assert.match(migration, /bool_or\(commitment_occ\.id is not null or income_occ\.id is not null\)/);
  assert.match(migration, /jsonb_agg\([\s\S]*'category_id'[\s\S]*'category_name'[\s\S]*'amount_minor'/);
  assert.match(migration, /end as split_lines/);
  assert.match(migration, /sum\(abs\(entry\.amount_minor\)\)/);
});

test("repair migration restores four-argument account currency RPC", () => {
  assert.match(migration, /drop function if exists public\.create_financial_account\(text, public\.account_kind, bigint\)/);
  assert.match(migration, /p_currency_code text default 'VND'/);
  assert.match(migration, /v_currency not in \('VND', 'USD', 'EUR', 'JPY', 'SGD', 'THB', 'GBP', 'AUD', 'KRW'\)/);
  assert.match(migration, /grant execute on function public\.create_financial_account\(text, public\.account_kind, bigint, text\) to authenticated/);
});
