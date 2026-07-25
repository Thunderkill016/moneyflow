import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260725000100_readiness_security_hardening.sql",
  ),
  "utf8",
).toLowerCase();

test("trigger-only security definer functions are not exposed through Data API", () => {
  assert.match(
    migration,
    /revoke all on function public\.handle_new_user\(\) from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /revoke all on function public\.rls_auto_enable\(\) from public, anon, authenticated/,
  );
});

test("transaction edit keeps recurring locks and rejects archived categories", () => {
  assert.match(migration, /income_template_occurrences/);
  assert.match(migration, /commitment_occurrences/);
  assert.match(migration, /select kind, is_archived/);
  assert.match(migration, /raise exception 'category_archived'/);
});
