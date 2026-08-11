import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ALL_ARCHIVE_COLLECTIONS,
  ARCHIVE_ROW_SPECS,
  ARCHIVE_SCHEMA_GENERATION,
  ARCHIVE_TABLE_INVENTORY,
  ARCHIVE_VERSION,
} from "./moneyflow-archive.ts";

/**
 * R6 drift evidence.
 *
 * The producer lives in SQL and the contract lives in TypeScript, so the two can
 * only be kept together by a test. Without this, adding a field to
 * `ARCHIVE_ROW_SPECS` would silently make every future export incomplete — the
 * validator would still pass on hand-built fixtures while real archives quietly
 * lost a column.
 *
 * Test-only parsing of migration text, bounded to one file. No runtime code
 * reads SQL.
 */

const MIGRATION_PATH = new URL(
  "../../../supabase/migrations/20260812000000_export_user_archive.sql",
  import.meta.url,
);

const migration = readFileSync(MIGRATION_PATH, "utf8");

/**
 * Slice the SQL for one collection: from its `'collection', coalesce((` opener
 * (or the profile's `jsonb_build_object`) to the start of the next collection.
 */
function collectionBlock(collection: string): string {
  if (collection === "profile") {
    const start = migration.indexOf("into v_profile");
    const opener = migration.lastIndexOf("select jsonb_build_object(", start);
    assert.ok(opener > 0, "the profile projection must exist");
    return migration.slice(opener, start);
  }
  const opener = migration.indexOf(`'${collection}', coalesce((`);
  assert.ok(opener > 0, `the ${collection} projection must exist in the migration`);
  const rest = migration.slice(opener + 1);
  const nextOffsets = ALL_ARCHIVE_COLLECTIONS.filter((other) => other !== collection)
    .map((other) => rest.indexOf(`'${other}', coalesce((`))
    .filter((offset) => offset > 0);
  const end = nextOffsets.length > 0 ? Math.min(...nextOffsets) : rest.length;
  return rest.slice(0, end);
}

test("the migration projects every collection in the contract", () => {
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    assert.doesNotThrow(
      () => collectionBlock(collection),
      `${collection} must be projected by the producer`,
    );
  }
});

test("the migration projects every field of every contract row spec", () => {
  const missing: string[] = [];
  for (const [collection, spec] of Object.entries(ARCHIVE_ROW_SPECS)) {
    const block = collectionBlock(collection);
    for (const field of Object.keys(spec.fields)) {
      // The producer emits each field as a `'name',` key of jsonb_build_object.
      if (!block.includes(`'${field}',`)) missing.push(`${collection}.${field}`);
    }
  }
  assert.deepEqual(
    missing,
    [],
    `the SQL producer omits contract fields, so real exports would lose them: ${missing.join(", ")}`,
  );
});

test("the producer emits no field the contract does not declare", () => {
  const unexpected: string[] = [];
  for (const [collection, spec] of Object.entries(ARCHIVE_ROW_SPECS)) {
    const block = collectionBlock(collection);
    // Keys of jsonb_build_object are the single-quoted names at line starts.
    for (const match of block.matchAll(/^\s{8,}'([a-z_]+)',/gmu)) {
      const field = match[1];
      if (!(field in spec.fields)) unexpected.push(`${collection}.${field}`);
    }
  }
  assert.deepEqual(
    unexpected,
    [],
    `the SQL producer emits fields absent from the contract, which the validator would reject: ${unexpected.join(", ")}`,
  );
});

test("owner-authority columns are never projected", () => {
  for (const [collection] of Object.entries(ARCHIVE_ROW_SPECS)) {
    const block = collectionBlock(collection);
    assert.ok(
      !block.includes("'user_id'"),
      `${collection} must not project user_id — ownership comes from auth.uid() at restore time`,
    );
    assert.ok(
      !block.includes("'actor_user_id'"),
      `${collection} must not project actor_user_id`,
    );
  }
  // The profile's own id is the source tenant identity and must never be carried.
  assert.ok(!collectionBlock("profile").includes("'id',"));
});

test("excluded audit metadata is never projected", () => {
  const block = collectionBlock("auditHistory");
  assert.ok(!block.includes("'request_id'"), "audit transport metadata must stay out");
  assert.ok(!block.includes("'idempotency_key'"), "audit dedup keys must stay out");
});

test("the envelope constants agree with the contract module", () => {
  assert.ok(
    migration.includes(`'archive_version', ${ARCHIVE_VERSION}`),
    "the producer must emit the contract archive version",
  );
  assert.ok(
    migration.includes(`'schema_generation', '${ARCHIVE_SCHEMA_GENERATION}'`),
    "the producer must emit the contract schema generation",
  );
});

test("every collection projection has an explicit deterministic ordering", () => {
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    if (collection === "profile") continue;
    const block = collectionBlock(collection);
    assert.ok(
      /order by\s+\w+\./u.test(block),
      `${collection} must declare an explicit order by — physical row order is not a contract`,
    );
  }
});

test("every collection coalesces to an empty array rather than null", () => {
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    if (collection === "profile") continue;
    const block = collectionBlock(collection);
    assert.ok(
      block.includes("'[]'::jsonb"),
      `${collection} must coalesce to an empty array so the contract never sees null`,
    );
  }
});

test("the producer is SECURITY INVOKER and rejects unauthenticated callers", () => {
  const body = migration.slice(migration.indexOf("function public.export_user_archive"));
  assert.ok(
    !body.includes("security definer"),
    "the producer must stay SECURITY INVOKER so RLS enforces tenant isolation",
  );
  assert.ok(body.includes("set search_path = ''"), "search_path must be pinned");
  assert.ok(body.includes("auth.uid()"), "identity must come from auth.uid()");
  assert.ok(
    body.includes("raise exception 'authentication_required'"),
    "an unauthenticated caller must be rejected explicitly",
  );
  assert.ok(
    body.includes("revoke all on function public.export_user_archive() from public, anon, authenticated"),
    "execute privileges must be revoked before being granted deliberately",
  );
  assert.ok(
    body.includes("grant execute on function public.export_user_archive()\n  to authenticated") ||
      body.includes("grant execute on function public.export_user_archive() to authenticated"),
    "only authenticated may execute the producer",
  );
});

test("the producer accepts no caller-supplied tenant argument", () => {
  // Tenant spoofing must be impossible by API shape, not merely unused.
  assert.ok(
    migration.includes("create or replace function public.export_user_archive()"),
    "the producer must take no arguments at all",
  );
});

test("the producer performs no write", () => {
  const body = migration.slice(migration.indexOf("function public.export_user_archive"));
  for (const dml of ["insert into", "update ", "delete from", "truncate"]) {
    assert.ok(!body.includes(dml), `the producer must contain no ${dml.trim()} statement`);
  }
});

test("counts are derived from the payload, not from separate queries", () => {
  // A second COUNT(*) could disagree with what was serialized.
  assert.ok(
    migration.includes("jsonb_array_length(collection.value)"),
    "tenant_row_counts must be measured from the emitted payload",
  );
  assert.ok(
    !/select\s+count\(\*\)/iu.test(
      migration.slice(migration.indexOf("into v_counts") - 800, migration.indexOf("into v_counts")),
    ),
    "tenant_row_counts must not come from COUNT(*) queries",
  );
});

test("the pgTAP suite covers the producer", () => {
  const suite = readFileSync(
    new URL("../../../supabase/tests/database/export_user_archive.test.sql", import.meta.url),
    "utf8",
  );
  const planned = Number.parseInt(/select plan\((\d+)\)/u.exec(suite)?.[1] ?? "0", 10);
  const asserted = (suite.match(/^select (is|isnt|ok)\(/gmu) ?? []).length;
  assert.equal(planned, asserted, "the pgTAP plan must match the number of assertions");
  assert.ok(planned >= 30, "the producer boundary deserves substantial database evidence");
  for (const required of [
    "authentication_required",
    "permission denied",
    "no user_id appears",
    "exporting mutates nothing",
  ]) {
    assert.ok(suite.includes(required), `pgTAP must cover: ${required}`);
  }
});

test("the inventory still covers exactly nineteen dispositions", () => {
  assert.equal(ARCHIVE_TABLE_INVENTORY.length, 19);
  assert.equal(ALL_ARCHIVE_COLLECTIONS.length, 19);
});
