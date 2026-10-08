// PoC harness: shim + all migrations + pgTAP, then run every
// supabase/tests/database/*.test.sql suite on a vanilla Postgres cluster.
//
//   node scripts/neon-poc/run-pgtap.mjs [--db-dir /tmp/mf-neon-poc-pg]
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DB_DIR = process.argv.includes("--db-dir")
  ? process.argv[process.argv.indexOf("--db-dir") + 1]
  : "/tmp/mf-neon-poc-pg";
const PORT = 55439;

const pg = new EmbeddedPostgres({
  databaseDir: DB_DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
});

async function applyFile(client, path) {
  await client.query(readFileSync(path, "utf8"));
}

async function main() {
  if (!existsSync(join(DB_DIR, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();

  // Supabase-compatible surface + all migrations.
  await applyFile(client, "db/compat/supabase-auth-shim.sql");
  const files = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await client.query("begin");
    try {
      await client.query(
        readFileSync(join("supabase/migrations", file), "utf8"),
      );
      await client.query("commit");
    } catch (err) {
      await client.query("rollback").catch(() => {});
      throw new Error(`migration ${file}: ${err.message.split("\n")[0]}`);
    }
  }
  console.log(`migrations: ${files.length} applied`);

  // pgTAP into the `extensions` schema — same place Supabase installs it, which
  // is why "anon cannot execute public functions" passes there. Grant execute
  // on those functions only; app functions in public keep their real grants.
  await client.query("set search_path = extensions, public");
  const before = await client.query(
    "select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'extensions'",
  );
  await applyFile(client, "db/compat/pgtap.sql");
  const beforeOids = new Set(before.rows.map((r) => r.oid));
  const afterOids = await client.query(
    "select p.oid, p.oid::regprocedure::text as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'extensions'",
  );
  for (const row of afterOids.rows) {
    if (beforeOids.has(row.oid)) continue;
    await client.query(
      `grant execute on function extensions.${row.sig} to anon, authenticated, service_role`,
    );
  }
  await client.query("set search_path = public, extensions");
  console.log(
    `pgtap: loaded (${afterOids.rows.length - beforeOids.size} functions granted)`,
  );
  console.log("pgtap: loaded");

  const tests = readdirSync("supabase/tests/database")
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let pass = 0;
  const failures = [];
  for (const file of tests) {
    const sql = readFileSync(join("supabase/tests/database", file), "utf8");
    try {
      const res = await client.query(sql);
      // pgTAP assertions return "ok N"/"not ok N" text rows; a multi-statement
      // query yields an array of result objects — scan all of them.
      const sets = Array.isArray(res) ? res : [res];
      const tap = sets
        .flatMap((r) => r?.rows ?? [])
        .flatMap((row) =>
          Object.values(row).filter((v) => typeof v === "string"),
        );
      const notOk = tap.filter((line) => /^not ok\b/i.test(line.trim()));
      if (notOk.length) {
        failures.push({
          file,
          error: `${notOk.length} failing assertion(s): ${notOk[0].trim().slice(0, 120)}`,
        });
      } else {
        pass++;
      }
    } catch (err) {
      failures.push({ file, error: err.message.split("\n")[0] });
    }
  }

  console.log(`\ntest files: ${pass} executed OK, ${failures.length} FAILED`);
  for (const f of failures) console.log(`  ✗ ${f.file}\n      ${f.error}`);

  await client.end();
  await pg.stop();
  process.exit(failures.length ? 1 : 0);
}

main().catch((e) => {
  console.error("harness error:", e.message);
  process.exit(2);
});
