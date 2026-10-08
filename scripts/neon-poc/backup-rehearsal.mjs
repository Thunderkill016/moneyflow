// Gate-4 rehearsal for #774: prove the migration backup/restore path end to
// end on the allowlisted scratch project — synthetic data only.
//
//   backup:   inventory every user table (public.* + neon_auth."user"),
//             export rows + canonical FULL-ROW sha256 content checksums +
//             FK-orphan scan + cross-tenant ownership invariants, encrypt the
//             archive with the same envelope shape the app's backup
//             encryption uses (AES-256-GCM, 12-byte IV, 250k PBKDF2 iters).
//             NOTE: managed-auth state (neon_auth.account/session/
//             verification, credentials, provider links) is NOT part of this
//             rehearsal — auth-state recovery is a separate cutover blocker.
//   restore:  create a FRESH scratch database (mf_poc, inside the DB
//             allowlist) on the verified project, replay the generated Neon
//             migrations, restore the archive, re-run the inventory and
//             require an exact checksum match.
//   freeze:   revoke DML from `authenticated`, prove writes are denied while
//             reads survive, then re-grant — the mechanism the cutover
//             write-freeze step relies on.
//
// Every destructive step requires --i-understand-destructive; --dry-run
// inventories without touching anything.
//
//   NEON_POC_URL=postgres://… node scripts/neon-poc/backup-rehearsal.mjs \
//     --project-id polished-pine-75721729 --dry-run
//   … --backup
//   … --restore --i-understand-destructive
//   … --freeze-rehearsal --i-understand-destructive
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { verifyTarget, abort } from "./lib/verify-target.mjs";

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run");
const DO_BACKUP = ARGS.has("--backup");
const DO_RESTORE = ARGS.has("--restore");
const DO_FREEZE = ARGS.has("--freeze-rehearsal");
const DO_CLEANUP = ARGS.has("--cleanup");
const DESTRUCTIVE_OK = ARGS.has("--i-understand-destructive");
const RESTORE_DB = "mf_poc"; // inside verify-target's DB allowlist
const BACKUP_FILE = "scripts/neon-poc/out/backup.enc.json";
const MANIFEST_FILE = "scripts/neon-poc/out/backup-manifest.json";

// Mirrors src/lib/archive/backup-encryption.ts constants — the rehearsal
// validates the same crypto shape the app's downloadable backup uses.
const KDF_ITERATIONS = 250_000;
const IV_BYTES = 12;
const KEY_BYTES = 32;

const URL_ENV = process.env.NEON_POC_URL;
if (!URL_ENV) abort("NEON_POC_URL env var required");

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function requireDestructive(what) {
  if (!DESTRUCTIVE_OK)
    fail(`refusing ${what} without --i-understand-destructive (run --dry-run first)`);
}

const connect = async (connectionString = URL_ENV) => {
  const client = new pg.Client({ connectionString });
  await client.connect();
  return client;
};

// ------------------------------------------------------------- inventory
const USER_TABLES_SQL = `
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE'
    and (table_schema = 'public' or (table_schema = 'neon_auth' and table_name = 'user'))
    and table_name not in ('schema_migrations','supabase_migrations')
  order by table_schema, table_name`;

async function inventory(client, label) {
  // Canonical timestamptz rendering — row_to_json follows the session TZ, so
  // pin UTC or identical rows would hash differently across connections.
  await client.query("set timezone to 'UTC'");
  const { rows: tables } = await client.query(USER_TABLES_SQL);
  const result = {};
  for (const t of tables) {
    const fq = `"${t.table_schema}"."${t.table_name}"`;
    const {
      rows: [{ c }],
    } = await client.query(`select count(*)::bigint as c from ${fq}`);
    /*
     * Full-row content checksum — every column, not just the PK. Each row is
     * serialized canonically (jsonb key order normalized, timestamptz in UTC,
     * bytea as \x-hex), hashed, and aggregated ordered by the row digest so
     * the result is PK-independent and detects ANY value mutation.
     */
    const {
      rows: [{ h }],
    } = await client.query(
      `select encode(sha256(string_agg(d, '|' order by d)::bytea), 'hex') as h
       from (select encode(sha256(row_to_json(r)::text::bytea), 'hex') as d
             from ${fq} r) x`,
    );
    result[`${t.table_schema}.${t.table_name}`] = {
      rows: Number(c),
      content_sha256: h,
    };
  }

  // Cross-tenant ownership invariants — a restore that scrambled row linkage
  // would keep row counts and even PK sets intact; these must stay zero.
  const { rows: tenantViolations } = await client.query(`
    select 'entries_vs_accounts' as check_name, count(*)::bigint as n
      from public.transaction_entries e
      join public.accounts a on a.id = e.account_id
      where e.user_id <> a.user_id
    union all
    select 'entries_vs_transactions', count(*)::bigint
      from public.transaction_entries e
      join public.financial_transactions t on t.id = e.transaction_id
      where e.user_id <> t.user_id
    union all
    select 'recon_vs_accounts', count(*)::bigint
      from public.account_reconciliations r
      join public.accounts a on a.id = r.account_id
      where r.user_id <> a.user_id`);
  for (const v of tenantViolations) {
    if (Number(v.n) > 0)
      fail(`tenant-ownership violation ${v.check_name}: ${v.n} rows`);
  }

  // FK-orphan scan generated from pg_constraint — identifiers come from the
  // catalog itself, never from user input.
  const { rows: fks } = await client.query(`
    select con.conname,
           con.conrelid::regclass::text as child,
           con.confrelid::regclass::text as parent,
           (select json_agg(att.attname order by ord.n)
            from unnest(con.conkey) with ordinality as ord(attnum,n)
            join pg_attribute att on att.attrelid = con.conrelid and att.attnum = ord.attnum) as child_cols,
           (select json_agg(att.attname order by ord.n)
            from unnest(con.confkey) with ordinality as ord(attnum,n)
            join pg_attribute att on att.attrelid = con.confrelid and att.attnum = ord.attnum) as parent_cols
    from pg_constraint con
    join pg_namespace n on n.oid = con.connamespace
    where con.contype = 'f' and n.nspname in ('public','neon_auth')`);
  const orphanReport = [];
  for (const fk of fks) {
    const joinCond = fk.child_cols
      .map((c, i) => `ch."${c}" = pa."${fk.parent_cols[i]}"`)
      .join(" and ");
    const nullGuard = fk.child_cols
      .map((c) => `ch."${c}" is not null`)
      .join(" and ");
    const {
      rows: [{ n }],
    } = await client.query(
      `select count(*)::bigint as n from ${fk.child} ch
       where ${nullGuard}
         and not exists (select 1 from ${fk.parent} pa where ${joinCond})`,
    );
    orphanReport.push({ fk: `${fk.child}→${fk.parent}`, orphans: Number(n) });
  }
  const bad = orphanReport.filter((o) => o.orphans > 0);
  console.log(
    `  inventory ${label}: ${Object.keys(result).length} tables, ${bad.length} FK violations`,
  );
  if (bad.length) fail(`FK orphan violations: ${JSON.stringify(bad)}`);
  return { tables: result, fk: orphanReport };
}

// ---------------------------------------------------------------- crypto
function encryptArchive(plaintext, passphrase) {
  const salt = randomBytes(16);
  const key = pbkdf2Sync(passphrase, salt, KDF_ITERATIONS, KEY_BYTES, "sha256");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return JSON.stringify({
    format: "moneyflow-backup-encrypted",
    version: 1,
    kdf: {
      name: "PBKDF2",
      iterations: KDF_ITERATIONS,
      hash: "SHA-256",
      salt: salt.toString("base64"),
    },
    cipher: {
      name: "AES-GCM",
      iv: iv.toString("base64"),
      data: body.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
    },
  });
}

function decryptArchive(envelope, passphrase) {
  const doc = JSON.parse(envelope);
  const key = pbkdf2Sync(
    passphrase,
    Buffer.from(doc.kdf.salt, "base64"),
    doc.kdf.iterations,
    KEY_BYTES,
    "sha256",
  );
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(doc.cipher.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(doc.cipher.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(doc.cipher.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

// ------------------------------------------------------------------ steps
async function backup() {
  const pass = process.env.BACKUP_REHEARSAL_PASS;
  if (!pass || pass.length < 16)
    fail("BACKUP_REHEARSAL_PASS env (>=16 chars) required");

  const client = await connect();
  await verifyTarget(client, URL_ENV);
  const inv = await inventory(client, "source");

  const { rows: tables } = await client.query(USER_TABLES_SQL);
  const dump = { captured_at: new Date().toISOString(), tables: {} };
  for (const t of tables) {
    const fq = `"${t.table_schema}"."${t.table_name}"`;
    const { rows } = await client.query(
      `select row_to_json(r) as j from (select * from ${fq}) r`,
    );
    dump.tables[`${t.table_schema}.${t.table_name}`] = rows.map((r) => r.j);
  }
  await client.end();

  const plaintext = JSON.stringify(dump);
  const sha = createHash("sha256").update(plaintext).digest("hex");
  const envelope = encryptArchive(plaintext, pass);
  // Round-trip proofs: correct passphrase reproduces the archive; a wrong
  // one MUST fail authentication (AES-GCM tag).
  if (decryptArchive(envelope, pass) !== plaintext)
    fail("encrypt/decrypt round-trip mismatch");
  try {
    decryptArchive(envelope, `${pass}-wrong`);
    fail("wrong passphrase decrypted the archive");
  } catch (e) {
    if (!/state|tag|auth/i.test(e.message)) throw e;
  }

  writeFileSync(BACKUP_FILE, envelope);
  writeFileSync(
    MANIFEST_FILE,
    JSON.stringify({ sha256: sha, inventory: inv }, null, 2),
  );
  console.log(
    `  ✔ backup: ${tables.length} tables → ${BACKUP_FILE} (sha256 ${sha.slice(0, 16)}…, AES-256-GCM round-trip + wrong-pass negatives verified)`,
  );
}

async function restore() {
  requireDestructive(`create/drop scratch database ${RESTORE_DB}`);
  if (!existsSync(BACKUP_FILE))
    fail(`${BACKUP_FILE} missing — run --backup first`);
  const pass = process.env.BACKUP_REHEARSAL_PASS;
  if (!pass) fail("BACKUP_REHEARSAL_PASS env required");

  const admin = await connect();
  await verifyTarget(admin, URL_ENV);
  await admin.query(`drop database if exists ${RESTORE_DB} with (force)`);
  await admin.query(`create database ${RESTORE_DB}`);
  await admin.end();
  console.log(`  created empty scratch db ${RESTORE_DB}`);

  // A fresh database lacks the managed surface (neon_auth lives only on the
  // provisioned db). Recreate the minimal stub a provisioned project would
  // provide so transformed FKs (…→ neon_auth."user") resolve — matching the
  // columns the generated migrations reference.
  const restoreUrl = new URL(URL_ENV);
  restoreUrl.pathname = `/${RESTORE_DB}`;
  const stub = await connect(restoreUrl.toString());
  await stub.query(`
    create schema if not exists neon_auth;
    -- Full column set of the managed mirror table so every dumped column
    -- restores verbatim — the full-row checksum intentionally catches stubs
    -- that silently drop managed state. Credentials/session/provider links
    -- (neon_auth.account/session/verification) remain a separate blocker.
    create table if not exists neon_auth."user" (
      id uuid primary key,
      name text,
      email text,
      "emailVerified" boolean,
      image text,
      "createdAt" timestamptz,
      "updatedAt" timestamptz,
      role text,
      banned boolean,
      "banReason" text,
      "banExpires" timestamptz
    );
    -- Managed-auth stubs so policies/RPC bodies compile on a database where
    -- pg_session_jwt does not exist. Rehearsal DB is SQL-restore only; the
    -- real provisioned functions read request.jwt.claims — these return null.
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid
      language sql stable as $$ select null::uuid $$;
    create or replace function auth.jwt() returns jsonb
      language sql stable as $$ select null::jsonb $$;`);
  await stub.end();

  // Schema: replay the deterministic generated Neon migration set through the
  // hardened remote path — mf_poc is inside the project's DB allowlist, so
  // verifyTarget still passes and the same freshness gate applies.
  execFileSync(
    process.execPath,
    [
      "scripts/neon-poc/replay-migrations.mjs",
      "--remote",
      "--project-id",
      process.argv[process.argv.indexOf("--project-id") + 1],
    ],
    {
      stdio: "inherit",
      env: { ...process.env, NEON_POC_URL: restoreUrl.toString() },
    },
  );

  const client = await connect(restoreUrl.toString());
  const dump = JSON.parse(
    decryptArchive(readFileSync(BACKUP_FILE, "utf8"), pass),
  );

  // FK-safe insert order: topological depth over pg_constraint (parents first).
  const { rows: order } = await client.query(`
    with recursive dep(name, depth) as (
      select (pn.nspname || '.' || pc.relname), 1
      from pg_constraint c
      join pg_class pc on pc.oid = c.confrelid
      join pg_namespace pn on pn.oid = pc.relnamespace
      join pg_class cc on cc.oid = c.conrelid
      join pg_namespace cn on cn.oid = cc.relnamespace
      where c.contype='f' and cn.nspname in ('public','neon_auth')
      union
      select (pn.nspname || '.' || pc.relname), dep.depth+1
      from dep
      join pg_class cc on true
      join pg_namespace cn
        on cn.oid = cc.relnamespace
       and (cn.nspname || '.' || cc.relname) = dep.name
      join pg_constraint c on c.conrelid = cc.oid and c.contype='f'
      join pg_class pc on pc.oid = c.confrelid
      join pg_namespace pn on pn.oid = pc.relnamespace
      where dep.depth < 30
    )
    select name, max(depth) as depth from dep group by name`);
  const depthOf = new Map(order.map((o) => [o.name, o.depth]));
  const names = Object.keys(dump.tables).sort(
    (a, b) => (depthOf.get(b) ?? 0) - (depthOf.get(a) ?? 0),
  );

  await client.query("begin");
  await client.query("set constraints all deferred");
  for (const name of names) {
    const rows = dump.tables[name];
    if (!rows.length) continue;
    const [schema, table] = name.split(".");
    const fq = `"${schema}"."${table}"`;
    const cols = Object.keys(rows[0]);
    const perRow = `(${cols.map((_, j) => `$${j + 1}`).join(",")})`;
    // disable trigger user — not superuser, so session_replication_role and
    // DISABLE TRIGGER ALL are denied. USER scope suppresses provisioning
    // (on_auth_user_created) and rewrite triggers (set_updated_at) that would
    // otherwise seed/perturb rows; FK constraint triggers stay enforced.
    await client.query(`alter table ${fq} disable trigger user`);
    for (const row of rows) {
      await client.query(
        `insert into ${fq} (${cols.map((c) => `"${c}"`).join(",")}) values ${perRow}`,
        cols.map((c) => row[c]),
      );
    }
    await client.query(`alter table ${fq} enable trigger user`);
    console.log(`    restored ${name}: ${rows.length} rows`);
  }
  await client.query("commit");

  const restored = await inventory(client, "restored");
  const manifest = JSON.parse(readFileSync(MANIFEST_FILE, "utf8"));
  const compare = (inv) => {
    const mism = [];
    for (const [t, src] of Object.entries(manifest.inventory.tables)) {
      if (
        !inv.tables[t] ||
        inv.tables[t].rows !== src.rows ||
        inv.tables[t].content_sha256 !== src.content_sha256
      )
        mism.push(t);
    }
    return mism;
  };
  const mism = compare(restored);
  if (mism.length) fail(`checksum mismatch on: ${mism.join(", ")}`);
  console.log(
    `  ✔ restore: ${names.length} tables rebuilt in ${RESTORE_DB}, full-row checksums identical`,
  );

  /*
   * Mutation-negative: corrupt ONE financial value while keeping its PK and
   * the row count stable. The inventory MUST flag it — proves the checksum
   * actually covers row content, not just keys (review round-1 requirement).
   */
  const {
    rows: [victim],
  } = await client.query(
    `select id from public.transaction_entries order by id limit 1`,
  );
  if (victim) {
    await client.query(
      `update public.transaction_entries set amount_minor = amount_minor + 1 where id = $1`,
      [victim.id],
    );
    const mutated = await inventory(client, "mutated");
    if (!compare(mutated).includes("public.transaction_entries"))
      fail("mutation-negative failed: corrupted amount went undetected");
    console.log(
      "  ✔ mutation-negative: +1 amount_minor flagged by content checksum",
    );
  }
  await client.end();
}

async function freezeRehearsal() {
  requireDestructive("freeze/re-grant on scratch");
  const client = await connect();
  await verifyTarget(client, URL_ENV);
  // Freeze = authenticated loses writes; reads keep working (RLS intact).
  await client.query(
    `revoke insert, update, delete on all tables in schema public from authenticated`,
  );
  console.log("  freeze applied — DML revoked from authenticated");
  const {
    rows: [w],
  } = await client.query(
    `select has_table_privilege('authenticated','public.accounts','insert') as can_write`,
  );
  if (w.can_write) fail("freeze failed — authenticated still has insert");
  const {
    rows: [r],
  } = await client.query(
    `select has_table_privilege('authenticated','public.accounts','select') as can_read`,
  );
  if (!r.can_read) fail("freeze broke reads");
  await client.query(
    `grant insert, update, delete on all tables in schema public to authenticated`,
  );
  const {
    rows: [after],
  } = await client.query(
    `select has_table_privilege('authenticated','public.accounts','insert') as can_write`,
  );
  await client.end();
  if (!after.can_write) fail("re-grant failed — freeze not rolled back");
  console.log("  ✔ freeze: writes denied, reads preserved, grant restored");
}

if (!DRY_RUN && !DO_BACKUP && !DO_RESTORE && !DO_FREEZE && !DO_CLEANUP)
  fail("choose --dry-run, --backup, --restore, --freeze-rehearsal, or --cleanup");
if (DRY_RUN) {
  const client = await connect();
  await verifyTarget(client, URL_ENV);
  const inv = await inventory(client, "dry-run");
  await client.end();
  console.log(JSON.stringify(inv, null, 1).slice(0, 2000));
} else {
  if (DO_BACKUP) await backup();
  if (DO_RESTORE) await restore();
  if (DO_FREEZE) await freezeRehearsal();
  if (DO_CLEANUP) {
    requireDestructive(`drop scratch database ${RESTORE_DB}`);
    const client = await connect();
    await verifyTarget(client, URL_ENV);
    await client.query(`drop database if exists ${RESTORE_DB} with (force)`);
    await client.end();
    console.log(`  ✔ cleanup: scratch database ${RESTORE_DB} dropped`);
  }
}
