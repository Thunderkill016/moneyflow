// PoC harness: shim + all migrations + pgTAP, then run every
// supabase/tests/database/*.test.sql suite on a vanilla Postgres cluster.
//
//   node scripts/neon-poc/run-pgtap.mjs [--db-dir /tmp/mf-neon-poc-pg]
//
// Default is a disposable database directory (mkdtemp, removed on exit) so a
// run can never inherit stale state. --db-dir pins a persistent directory for
// debugging. Every run prints the exact git HEAD so results are attributable.
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

const HEAD = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const DB_DIR = process.argv.includes("--db-dir")
  ? process.argv[process.argv.indexOf("--db-dir") + 1]
  : mkdtempSync(join(tmpdir(), "mf-neon-poc-pg-"));
const CLEANUP = !process.argv.includes("--db-dir");
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
  console.log(`head: ${HEAD}`);
  console.log(
    `db dir: ${DB_DIR}${CLEANUP ? " (disposable)" : " (persistent)"}`,
  );
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
      // pgTAP output rows: a plan line "1..N" (from plan() at the start or
      // finish() when using no_plan) plus one "ok N"/"not ok N" row per
      // assertion. Fail closed on every irregular shape: no plan, zero
      // assertions, assertion count != plan, or any "not ok".
      const sets = Array.isArray(res) ? res : [res];
      const tap = sets
        .flatMap((r) => r?.rows ?? [])
        .flatMap((row) =>
          Object.values(row).filter((v) => typeof v === "string"),
        );
      const planLine = tap.find((line) => /^1\.\.\d+/.test(line.trim()));
      const assertions = tap.filter((line) =>
        /^(not )?ok \d+/i.test(line.trim()),
      );
      const notOk = assertions.filter((line) => /^not ok\b/i.test(line.trim()));

      let verdict = null;
      if (!planLine) {
        verdict = `no TAP plan line — suite produced ${tap.length} text row(s)`;
      } else if (assertions.length === 0) {
        verdict = "plan declared but zero assertions executed";
      } else if (assertions.length !== Number(planLine.trim().slice(3))) {
        verdict = `plan ${planLine.trim()} but ${assertions.length} assertion(s) executed`;
      } else if (notOk.length) {
        verdict = `${notOk.length} failing assertion(s): ${notOk[0].trim().slice(0, 120)}`;
      }

      if (verdict) {
        failures.push({ file, error: verdict });
      } else {
        pass++;
      }
    } catch (err) {
      failures.push({ file, error: err.message.split("\n")[0] });
    }
  }


  // Integration acceptance on two *independent* connections, rather than
  // pgTAP's single transaction: covers same-key concurrency and lost ACK.
  const id = "e821cccc-0000-4000-8000-000000000001";
  const key = "e821cccc-0000-4000-8000-000000000002";
  let left;
  let right;
  try {
    await client.query(`insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, reauthentication_token, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at, phone_change, phone_change_token,
      is_sso_user, is_anonymous
    ) values (
      '00000000-0000-0000-0000-000000000000', $1, 'authenticated',
      'authenticated', 'concurrent-replay@example.invalid',
      crypt('discarded-password', gen_salt('bf')), now(),
      '', '', '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', false, false
    )`, [id]);
    const scope = await client.query(`select
      (select id from public.accounts where user_id = $1 limit 1) as account,
      (select id from public.categories where user_id = $1 and kind = 'expense' limit 1) as category`, [id]);
    const { account, category } = scope.rows[0];
    if (!account || !category) throw new Error("concurrency fixture missing ledger defaults");
    left = pg.getPgClient();
    right = pg.getPgClient();
    await Promise.all([left.connect(), right.connect()]);
    const claims = JSON.stringify({ sub: id, role: "authenticated" });
    for (const connection of [left, right]) {
      await connection.query("select set_config('request.jwt.claims', $1, false)", [claims]);
      await connection.query("set role authenticated");
    }
    const query = `select public.create_money_transaction(
      $1::uuid, $2::uuid, 'expense'::public.transaction_kind,
      43000::bigint, current_date, 'ambiguous acknowledgment', $3::uuid
    ) as id`;
    // Both calls intentionally start together. One must block on the lock,
    // then discover the already committed intent rather than insert again.
    const [first, second] = await Promise.all([
      left.query(query, [account, category, key]),
      right.query(query, [account, category, key]),
    ]);
    if (first.rows[0].id !== second.rows[0].id)
      throw new Error("concurrent same-key calls returned different transactions");
    // Simulate a lost response: intentionally ignore the original result,
    // then submit the exact request again from another connection.
    const replay = await right.query(query, [account, category, key]);
    if (replay.rows[0].id !== first.rows[0].id)
      throw new Error("lost-ACK retry returned a different transaction");
    const count = await client.query(`select
      (select count(*)::integer from public.financial_transactions
       where user_id = $1 and idempotency_key = $2) as transactions,
      (select count(*)::integer from public.transaction_entries
       where user_id = $1 and transaction_id = $3) as entries`,
      [id, key, first.rows[0].id]);
    if (count.rows[0].transactions !== 1 || count.rows[0].entries !== 1)
      throw new Error("concurrent/lost-ACK path duplicated a transaction or account leg");
    console.log("concurrency: independent clients + lost-ACK replay OK");
  } catch (err) {
    failures.push({ file: "manual-capture-concurrency", error: err.message });
  } finally {
    await Promise.allSettled([left?.end(), right?.end()].filter(Boolean));
  }

  console.log(`\ntest files: ${pass} executed OK, ${failures.length} FAILED`);
  for (const f of failures) console.log(`  ✗ ${f.file}\n      ${f.error}`);

  await client.end();
  await pg.stop();
  if (CLEANUP) rmSync(DB_DIR, { recursive: true, force: true });
  process.exit(failures.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error("harness error:", e.message);
  await pg.stop().catch(() => {});
  if (CLEANUP) rmSync(DB_DIR, { recursive: true, force: true });
  process.exit(2);
});
