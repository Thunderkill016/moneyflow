// PoC harness: replay all supabase/migrations on a vanilla Postgres 17 cluster
// (embedded-postgres) behind the auth shim, then report per-file results.
// Read-only w.r.t. providers — everything stays on localhost.
//
//   node scripts/neon-poc/replay-migrations.mjs [--db-dir /tmp/mf-pg-data]
//   NEON_POC_URL=postgresql://… node scripts/neon-poc/replay-migrations.mjs --remote
//
// Default is a disposable database directory (mkdtemp, removed on exit);
// --db-dir pins a persistent directory for debugging. --remote connects to the
// database URL in NEON_POC_URL (never hard-code credentials) and applies
// db/compat/neon-preflight.sql instead of the Supabase shim.
import {
  readdirSync,
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const REMOTE = process.argv.includes("--remote");
const DB_DIR = process.argv.includes("--db-dir")
  ? process.argv[process.argv.indexOf("--db-dir") + 1]
  : mkdtempSync(join(tmpdir(), "mf-neon-poc-pg-"));
const CLEANUP = !REMOTE && !process.argv.includes("--db-dir");
const PORT = 55439;

const pgEmb = REMOTE
  ? null
  : new EmbeddedPostgres({
      databaseDir: DB_DIR,
      user: "postgres",
      password: "postgres",
      port: PORT,
      persistent: true,
    });

async function main() {
  console.log(`head: ${HEAD}`);
  let client;
  if (REMOTE) {
    if (!process.env.NEON_POC_URL)
      throw new Error("NEON_POC_URL env var required with --remote");
    console.log("target: remote (NEON_POC_URL)");
    client = new pg.Client({ connectionString: process.env.NEON_POC_URL });
    await client.connect();
    // Neon already provides roles anonymous/authenticated and the auth schema
    // functions via pg_session_jwt — preflight only adds what's missing and
    // must never replace the native auth.* functions.
    await client.query(readFileSync("db/compat/neon-preflight.sql", "utf8"));
  } else {
    if (!existsSync(join(DB_DIR, "PG_VERSION"))) await pgEmb.initialise();
    await pgEmb.start();
    client = pgEmb.getPgClient();
    await client.connect();
    // Shim first — migrations reference auth.users/uid()/roles.
    await client.query(
      readFileSync("db/compat/supabase-auth-shim.sql", "utf8"),
    );
  }
  client.on("notice", (n) => {
    if (n.severity === "ERROR" || n.severity === "FATAL")
      console.error(n.message);
  });

  const files = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Real Neon cannot host `auth.users` (schema owned by cloud_admin); the
  // equivalent managed mirror is neon_auth."user" (uuid PK). The transform is
  // mechanical and logged — production migrations would carry it explicitly.
  function transformForNeon(sql) {
    let touched = 0;
    const next = sql
      .replace(/\bauth\.users\b/g, () => (touched++, 'neon_auth."user"'))
      .replace(
        /(\w+)\.raw_user_meta_data\s*->>\s*'(full_name|name)'/g,
        (m, alias) => (touched++, `${alias}.name`),
      )
      // On Neon the migration-runner role is neondb_owner, not postgres —
      // `alter default privileges for role` must target the actual runner to
      // keep the same deny-by-default hardening on future objects.
      .replace(
        /(alter default privileges for role )postgres\b/gi,
        (m) => (touched++, m.replace(/postgres$/, "neondb_owner")),
      );
    return { sql: next, touched };
  }

  const results = [];
  for (const file of files) {
    let sql = readFileSync(join("supabase/migrations", file), "utf8");
    if (REMOTE) {
      const t = transformForNeon(sql);
      sql = t.sql;
      if (t.touched) console.log(`  ~ ${file}: ${t.touched} Neon rewrite(s)`);
    }
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      results.push({ file, ok: true });
    } catch (err) {
      await client.query("rollback").catch(() => {});
      results.push({ file, ok: false, error: err.message.split("\n")[0] });
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length} migrations: ${results.length - failed.length} OK, ${failed.length} FAILED`,
  );
  for (const f of failed) console.log(`  ✗ ${f.file}\n      ${f.error}`);

  await client.end();
  if (pgEmb) await pgEmb.stop();
  if (CLEANUP) rmSync(DB_DIR, { recursive: true, force: true });
  process.exit(failed.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error("harness error:", e);
  if (pgEmb) await pgEmb.stop().catch(() => {});
  if (CLEANUP) rmSync(DB_DIR, { recursive: true, force: true });
  process.exit(2);
});
