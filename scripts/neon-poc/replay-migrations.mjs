// PoC harness: replay the migration set on either
//   local  — vanilla embedded Postgres 17 behind the Supabase auth shim, OR
//   remote — the allowlisted Neon scratch project behind neon-preflight.sql.
//
//   node scripts/neon-poc/replay-migrations.mjs [--db-dir /tmp/mf-pg-data]
//   NEON_POC_URL=postgresql://… node scripts/neon-poc/replay-migrations.mjs \
//     --remote --project-id polished-pine-75721729
//
// Local mode reads supabase/migrations/ verbatim (proves the Supabase SQL is
// portable). Remote mode reads the committed generated set in
// db/neon/migrations/ — deterministic, reviewable, and freshness-checked via
// MANIFEST.json — instead of rewriting regex at runtime. Remote mode also
// verifies the destination against the Neon Management API before connecting
// (see lib/verify-target.mjs); a self-declared NEON_POC_URL alone is never
// trusted.
//
// Default local run uses a disposable database directory (mkdtemp, removed on
// exit); --db-dir pins a persistent directory for debugging.
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
import { verifyTarget, abort } from "./lib/verify-target.mjs";
import { isFresh } from "./gen-neon-migrations.mjs";

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const REMOTE = process.argv.includes("--remote");
const DB_DIR = process.argv.includes("--db-dir")
  ? process.argv[process.argv.indexOf("--db-dir") + 1]
  : mkdtempSync(join(tmpdir(), "mf-neon-poc-pg-"));
const CLEANUP = !REMOTE && !process.argv.includes("--db-dir");
const PORT = 55439;
const MIGRATIONS_DIR = REMOTE ? "db/neon/migrations" : "supabase/migrations";

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
    // Freshness gate: the committed generated set must match current
    // supabase/migrations byte-for-byte — no stale remote replays.
    const f = isFresh();
    if (!f.fresh)
      abort(
        `db/neon/migrations is stale: ${f.reason}. ` +
          `Regenerate with: node scripts/neon-poc/gen-neon-migrations.mjs`,
      );
    client = new pg.Client({ connectionString: process.env.NEON_POC_URL });
    await client.connect();
    await verifyTarget(client, process.env.NEON_POC_URL);
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

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const results = [];
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
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
    `\n${results.length} migrations (${MIGRATIONS_DIR}): ${results.length - failed.length} OK, ${failed.length} FAILED`,
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
