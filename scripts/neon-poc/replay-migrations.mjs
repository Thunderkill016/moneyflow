// PoC harness: replay all supabase/migrations on a vanilla Postgres 17 cluster
// (embedded-postgres) behind the auth shim, then report per-file results.
// Read-only w.r.t. providers — everything stays on localhost.
//
//   node scripts/neon-poc/replay-migrations.mjs [--db-dir /tmp/mf-pg-data]
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

async function main() {
  if (!existsSync(join(DB_DIR, "PG_VERSION"))) await pg.initialise();
  await pg.start();
  const client = pg.getPgClient();
  await client.connect();
  client.on("notice", (n) => {
    if (n.severity === "ERROR" || n.severity === "FATAL")
      console.error(n.message);
  });

  // Shim first — migrations reference auth.users/uid()/roles.
  await client.query(readFileSync("db/compat/supabase-auth-shim.sql", "utf8"));

  const files = readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const results = [];
  for (const file of files) {
    const sql = readFileSync(join("supabase/migrations", file), "utf8");
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
  await pg.stop();
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("harness error:", e);
  process.exit(2);
});
