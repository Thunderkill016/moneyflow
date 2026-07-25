import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260725020400_transaction_entries_user_cascade.sql",
  ),
  "utf8",
).toLowerCase();

test("transaction entries participate in auth-user cascade", () => {
  assert.match(migration, /alter table public\.transaction_entries/);
  assert.match(migration, /foreign key \(user_id\)/);
  assert.match(migration, /references auth\.users\(id\)/);
  assert.match(migration, /on delete cascade/);
});

test("migration does not weaken account or category entry constraints", () => {
  assert.doesNotMatch(migration, /drop constraint/);
  assert.doesNotMatch(migration, /account_id/);
  assert.doesNotMatch(migration, /category_id/);
});
