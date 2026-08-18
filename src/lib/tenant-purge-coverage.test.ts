import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/*
 * Erasure coverage, checked against the schema instead of a hand-written list.
 *
 * `purge_user_tenant_data` documents itself as purging "every current MoneyFlow
 * tenant row", and `tenant_isolation_and_deletion.test.sql` enumerates the tables
 * it expects to be emptied — literally, one `select count(*) from public.x` per
 * table. Neither can notice a new tenant table appearing, which is exactly what
 * happened: `archive_restore_batches` and `archive_restore_rows` arrived in a
 * later migration and are in neither.
 *
 * Those two rows are still removed on account deletion, because both cascade from
 * `auth.users`. So this is not a data leak — it is a promise drifting away from
 * its code, and the kind of drift that only gets noticed when a reviewer asks for
 * proof of deletion.
 *
 * This test derives the tenant table list from the migrations themselves, so the
 * next table that forgets to enrol fails here rather than surviving until someone
 * audits it by hand. It reads SQL text and proves nothing about runtime behaviour;
 * the pgTAP suite owns that.
 */

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");
const PURGE_FUNCTION = "purge_user_tenant_data";

/*
 * Tables added purely to hold restore bookkeeping are still tenant data and still
 * cascade, but they are deliberately outside the purge function today. Listing
 * them here is what makes that a decision rather than an oversight: removing a
 * name from this list must either add it to the purge or fail the test.
 */
const CASCADE_ONLY_TABLES = new Set(["archive_restore_batches", "archive_restore_rows"]);

function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

function readAllMigrations(): string {
  return migrationFiles()
    .map((name) => readFileSync(join(MIGRATIONS_DIR, name), "utf8"))
    .join("\n");
}

/** Every table declaring a `user_id` that references `auth.users`. */
function tenantTables(sql: string): Set<string> {
  const tables = new Set<string>();
  const createPattern =
    /create table (?:if not exists )?(?:public\.)?([a-z_]+)\s*\(([\s\S]*?)\n\);/gu;
  for (const [, name, body] of sql.matchAll(createPattern)) {
    if (/user_id\s+uuid[\s\S]*?references\s+auth\.users/u.test(body)) {
      tables.add(name);
    }
  }
  return tables;
}

/**
 * Body of the last `purge_user_tenant_data` definition. The function is redefined
 * across migrations, and only the final definition is the one that runs, so an
 * earlier and more complete version must not be allowed to satisfy this test.
 */
function latestPurgeBody(): string {
  let body: string | null = null;
  for (const name of migrationFiles()) {
    const sql = readFileSync(join(MIGRATIONS_DIR, name), "utf8");
    const index = sql.lastIndexOf(`create or replace function public.${PURGE_FUNCTION}`);
    if (index === -1) continue;
    body = sql.slice(index);
  }
  assert.ok(body, `no definition of ${PURGE_FUNCTION} found in migrations`);
  return body;
}

function purgedTables(body: string): Set<string> {
  const tables = new Set<string>();
  for (const [, name] of body.matchAll(/delete\s+from\s+(?:public\.)?([a-z_]+)/gu)) {
    tables.add(name);
  }
  return tables;
}

test("every tenant table is either purged or a declared cascade-only exception", () => {
  const sql = readAllMigrations();
  const tenant = tenantTables(sql);
  const purged = purgedTables(latestPurgeBody());

  // Guard against a parser that silently matches nothing and passes vacuously.
  assert.ok(tenant.size >= 15, `expected many tenant tables, found ${tenant.size}`);
  assert.ok(purged.size >= 15, `expected many purged tables, found ${purged.size}`);

  const unaccounted = [...tenant]
    .filter((table) => !purged.has(table) && !CASCADE_ONLY_TABLES.has(table))
    .sort();

  assert.deepEqual(
    unaccounted,
    [],
    `these tenant tables are neither purged nor declared cascade-only: ${unaccounted.join(", ")}. Add them to ${PURGE_FUNCTION}, or record why a cascade alone is sufficient.`,
  );
});

test("the declared cascade-only tables really do cascade from auth.users", () => {
  const sql = readAllMigrations();

  for (const table of CASCADE_ONLY_TABLES) {
    const createPattern = new RegExp(
      `create table (?:if not exists )?(?:public\\.)?${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
      "u",
    );
    const match = sql.match(createPattern);
    assert.ok(match, `${table} is declared cascade-only but was not found in the migrations`);

    /*
     * The exception is only safe while the cascade exists. If someone drops
     * `on delete cascade` from one of these, erasure would quietly become
     * incomplete, so the exception has to prove itself rather than be trusted.
     */
    assert.match(
      match[1],
      /user_id\s+uuid\s+not null\s+references\s+auth\.users\(id\)\s+on delete cascade/u,
      `${table} is exempt from the purge only because it cascades from auth.users`,
    );
  }
});

test("a cascade-only exception must still be a real tenant table", () => {
  const tenant = tenantTables(readAllMigrations());
  for (const table of CASCADE_ONLY_TABLES) {
    assert.ok(
      tenant.has(table),
      `${table} is listed as a cascade-only exception but does not look like a tenant table; remove the stale entry`,
    );
  }
});
