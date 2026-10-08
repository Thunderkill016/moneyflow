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
const DO_REMAP = ARGS.has("--remap-rehearsal");
const DESTRUCTIVE_OK = ARGS.has("--i-understand-destructive");
const RESTORE_DB = "mf_poc"; // inside verify-target's DB allowlist
const BACKUP_FILE = "scripts/neon-poc/out/backup.enc.json";
const MANIFEST_FILE = "scripts/neon-poc/out/backup-manifest.json";
const REMAP_MANIFEST = "scripts/neon-poc/out/remap-manifest.enc.json";

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
    fail(
      `refusing ${what} without --i-understand-destructive (run --dry-run first)`,
    );
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
  const body = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
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

/*
 * Insert a table's rows, optionally substituting owner-column values through
 * a {legacyUuid: neonUuid} map. disable trigger user — not superuser, so
 * session_replication_role and DISABLE TRIGGER ALL are denied. USER scope
 * suppresses provisioning (on_auth_user_created) and rewrite triggers
 * (set_updated_at) that would otherwise seed/perturb rows; FK constraint
 * triggers stay enforced.
 */
/*
 * Drop + recreate the allowlisted scratch database, install the minimal
 * managed-surface stub a provisioned project would provide, and replay the
 * deterministic generated migration set. Shared by --restore and
 * --remap-rehearsal.
 */
async function prepareScratchDb() {
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
  return { url: restoreUrl };
}

async function insertRows(client, name, rows, map = null) {
  const [schema, table] = name.split(".");
  const fq = `"${schema}"."${table}"`;
  const cols = Object.keys(rows[0]);
  const perRow = `(${cols.map((_, j) => `$${j + 1}`).join(",")})`;
  await client.query(`alter table ${fq} disable trigger user`);
  for (const row of rows) {
    await client.query(
      `insert into ${fq} (${cols.map((c) => `"${c}"`).join(",")}) values ${perRow}`,
      cols.map((c) => {
        // Owner remap at INSERT: rows land already keyed to the neon uuid —
        // a missed map entry leaves the legacy uuid, which fails the FK to
        // neon_auth."user" (no legacy rows exist) and is caught as a negative.
        // remapValue recurses into jsonb so embedded owner refs remap too.
        const v = map ? remapValue(row[c], map) : row[c];
        // pg serializes JS arrays as Postgres ARRAY literals ({...}), which
        // jsonb columns reject — send JSON text and let the cast parse it.
        return v !== null && typeof v === "object" ? JSON.stringify(v) : v;
      }),
    );
  }
  await client.query(`alter table ${fq} enable trigger user`);
}

async function restore() {
  requireDestructive(`create/drop scratch database ${RESTORE_DB}`);
  if (!existsSync(BACKUP_FILE))
    fail(`${BACKUP_FILE} missing — run --backup first`);
  const pass = process.env.BACKUP_REHEARSAL_PASS;
  if (!pass) fail("BACKUP_REHEARSAL_PASS env required");

  const { url: restoreUrl } = await prepareScratchDb();
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
    await insertRows(client, name, rows);
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

/*
 * --remap-rehearsal (review round-4, #774): prove the Plan-B data path on a
 * REAL multi-user dataset. Every legacy owner uuid in the backup is mapped
 * to a fresh neon uuid (the map stands in for the claim ceremony's output);
 * rows are inserted already keyed to the new ids — the FK surface forces
 * claim-before-restore ordering because (id, user_id) composite FKs are not
 * deferrable and legacy-keyed rows could never exist.
 *
 * Verified: bijective mapping manifest (encrypted, uuids only — no PII),
 * per-table canonical multiset equality with the map applied (canonicalization
 * is RECURSIVE — nested jsonb keys sorted, none dropped), zero legacy uuids
 * surviving anywhere in serialized rows (uuid-equality is the owner-reference
 * policy: any string equal to a legacy id remaps, embedded or not), per-owner
 * financial totals preserved, and every money-shaped column proven to hold
 * exact integers — no float drift.
 * Negatives: an unmapped owner aborts on FK violation, a mid-restore abort
 * leaves zero rows (single-transaction atomicity) with a clean deterministic
 * rerun, and a nested jsonb mutation in the restored db is detected by the
 * multiset comparison.
 */
const OWNER_COLS_SQL = `
  -- every (table, column) that references the user-identity surface:
  -- neon_auth."user"(id) directly, or public.profiles(id) which is itself
  -- user-keyed (pattern_dismissals.user_id → profiles.id). Plus the identity
  -- PKs themselves, so neon_auth."user".id and profiles.id remap too.
  -- NOTE: pg_constraint, not information_schema.constraint_column_usage —
  -- the latter's schema-qualified join silently drops cross-schema FKs
  -- (public.* → neon_auth."user"), which is the whole point here.
  select cn.nspname as table_schema, cc.relname as table_name,
         att.attname as column_name
  from pg_constraint c
  join pg_class cc on cc.oid = c.conrelid
  join pg_namespace cn on cn.oid = cc.relnamespace
  join pg_class pc on pc.oid = c.confrelid
  join pg_namespace pn on pn.oid = pc.relnamespace
  join unnest(c.conkey) k(attnum) on true
  join pg_attribute att on att.attrelid = cc.oid and att.attnum = k.attnum
  where c.contype = 'f'
    and ((pn.nspname = 'neon_auth' and pc.relname = 'user')
      or (pn.nspname = 'public' and pc.relname = 'profiles'))
  union select 'neon_auth', 'user', 'id'
  union select 'public', 'profiles', 'id'`;

// Canonical row serialization for multiset comparison. RECURSIVE: object
// keys are sorted at every nesting level — the JSON.stringify array-replacer
// form only sorted top-level keys and worse, treated the key list as an
// allowlist applied to nested objects, silently dropping jsonb sub-keys.
// Arrays keep element order (order is semantics), objects canonicalize.
const canon = (v) => {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
    .join(",")}}`;
};
const canonRow = canon;
const canonDigest = (row) =>
  createHash("sha256").update(canonRow(row), "utf8").digest("hex");

// Explicit uuid policy: ANY string value anywhere in a row (scalar column or
// nested inside jsonb) that equals a known legacy owner id IS an owner
// reference and is remapped to the neon uuid. This is the only consistent
// treatment — a uuid that survives inside a jsonb payload is a dangling
// cross-reference the way an unmapped user_id is.
const remapValue = (v, map) => {
  if (typeof v === "string") return map[v] ?? v;
  if (Array.isArray(v)) return v.map((x) => remapValue(x, map));
  if (v !== null && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, remapValue(x, map)]),
    );
  return v;
};
const remapRowDeep = (row, map) => (map ? remapValue(row, map) : { ...row });

// Money-precision invariant: any column that looks monetary must hold an
// exact integer (VND đồng is stored as integer, never float). Numbers in the
// dump may be JS numbers or bigint-as-strings — both must be safe integers.
const MONEY_COL = /amount|balance|minor/i;
const assertIntegerMoney = (rows, where) => {
  for (const row of rows)
    for (const [c, v] of Object.entries(row))
      if (v !== null && MONEY_COL.test(c) && !Number.isSafeInteger(Number(v)))
        fail(`non-integer money at ${where}.${c} = ${JSON.stringify(v)}`);
};

// Proof the comparator actually detects nested mutation — a comparator that
// cannot fail cannot verify anything.
const canonSelfTest = () => {
  const a = { top: 1, nested: { z: [1, { k: "v" }], a: "x" }, flag: true };
  const sameReordered = {
    nested: { a: "x", z: [1, { k: "v" }] },
    flag: true,
    top: 1,
  };
  const mutated = JSON.parse(JSON.stringify(a));
  mutated.nested.z[1].k = "w";
  const mutatedDeep = JSON.parse(JSON.stringify(a));
  mutatedDeep.nested.z[1].extra = 1;
  if (canonDigest(a) !== canonDigest(sameReordered))
    fail("canon: key-order produced a false difference");
  if (canonDigest(a) === canonDigest(mutated))
    fail("canon: nested value mutation undetected");
  if (canonDigest(a) === canonDigest(mutatedDeep))
    fail("canon: nested key insertion undetected");
};

async function remapRehearsal() {
  requireDestructive(`remap rehearsal into scratch database ${RESTORE_DB}`);
  if (!existsSync(BACKUP_FILE))
    fail(`${BACKUP_FILE} missing — run --backup first`);
  const pass = process.env.BACKUP_REHEARSAL_PASS;
  if (!pass) fail("BACKUP_REHEARSAL_PASS env required");
  const dump = JSON.parse(
    decryptArchive(readFileSync(BACKUP_FILE, "utf8"), pass),
  );

  // Discover the owner-column surface from the source catalog (identical on
  // the replayed schema), then build the bijective legacy→neon map.
  const src = await connect();
  await verifyTarget(src, URL_ENV);
  const { rows: oc } = await src.query(OWNER_COLS_SQL);
  const ownerCols = new Map();
  for (const { table_schema, table_name, column_name } of oc) {
    const k = `${table_schema}.${table_name}`;
    if (!ownerCols.has(k)) ownerCols.set(k, new Set());
    ownerCols.get(k).add(column_name);
  }
  const owners = new Set();
  for (const [t, cols] of ownerCols)
    for (const row of dump.tables[t] ?? [])
      for (const c of cols) if (row[c]) owners.add(row[c]);

  /*
   * Value sweep — the FK catalog cannot see owner references that are NOT
   * foreign keys: financial_mutation_audit_events.actor_user_id is nullable
   * (system actors) and bound only by CHECK actor_user_id = user_id; audit
   * payloads and provenance columns can embed owner uuids too. Any dump cell
   * equal to a known owner id IS an owner reference — remap it or the CHECK
   * constraints and audit provenance would break.
   */
  const swept = [];
  for (const [t, rows] of Object.entries(dump.tables)) {
    for (const row of rows) {
      for (const [c, v] of Object.entries(row)) {
        if (typeof v === "string" && owners.has(v)) {
          if (!ownerCols.has(t)) ownerCols.set(t, new Set());
          if (!ownerCols.get(t).has(c)) {
            ownerCols.get(t).add(c);
            swept.push(`${t}.${c}`);
          }
        }
      }
    }
  }
  if (swept.length)
    console.log(`  value-sweep added owner cols: ${swept.join(", ")}`);

  const map = {};
  for (const o of owners) map[o] = crypto.randomUUID();
  const legacySet = new Set(Object.keys(map));
  const neonVals = Object.values(map);
  if (new Set(neonVals).size !== neonVals.length) fail("map is not bijective");
  writeFileSync(
    REMAP_MANIFEST,
    encryptArchive(
      JSON.stringify({ captured_at: new Date().toISOString(), map }),
      pass,
    ),
  );
  console.log(
    `  remap map: ${neonVals.length} owners → fresh uuids (manifest encrypted to ${REMAP_MANIFEST})`,
  );

  const { url } = await prepareScratchDb();
  const client = await connect(url.toString());
  await client.query("set timezone to 'UTC'");

  // Topo insert order — same as restore().
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
    await insertRows(client, name, rows, map);
  }
  await client.query("commit");

  // --- verification: multiset equality under the map ----------------------
  canonSelfTest();
  for (const [t, rows] of Object.entries(dump.tables))
    assertIntegerMoney(rows, `dump.${t}`);
  const mismatched = [];
  let totalRows = 0;
  let legacySurvivors = 0;
  for (const name of names) {
    const expected = (dump.tables[name] ?? []).map((r) =>
      canonDigest(remapRowDeep(r, map)),
    );
    const fq = `"${name.split(".")[0]}"."${name.split(".")[1]}"`;
    const { rows: got } = await client.query(
      `select row_to_json(r) as j from (select * from ${fq}) r`,
    );
    totalRows += got.length;
    assertIntegerMoney(
      got.map((r) => r.j),
      `restored.${name}`,
    );
    const gotDigests = got.map((r) => canonDigest(r.j));
    if (
      expected.length !== gotDigests.length ||
      expected.sort().join() !== gotDigests.sort().join()
    )
      mismatched.push(name);
    // No owner column may still carry a legacy uuid.
    const oset = ownerCols.get(name);
    if (oset)
      for (const r of got)
        for (const c of oset) if (legacySet.has(r.j[c])) legacySurvivors++;
  }
  if (mismatched.length)
    fail(`remap checksum mismatch on: ${mismatched.join(", ")}`);
  if (legacySurvivors)
    fail(`${legacySurvivors} owner cells still carry a legacy uuid`);

  // Structural invariant: NO restored row may contain a legacy uuid anywhere
  // in its serialized form — catches embedded references in jsonb payloads
  // and columns neither the FK catalog nor the value sweep classified.
  let embedded = 0;
  for (const name of names) {
    const fq = `"${name.split(".")[0]}"."${name.split(".")[1]}"`;
    const { rows: got } = await client.query(
      `select row_to_json(r)::text as t from (select * from ${fq}) r`,
    );
    for (const r of got)
      for (const legacy of legacySet) if (r.t.includes(legacy)) embedded++;
  }
  if (embedded)
    fail(
      `${embedded} embedded legacy-uuid references survived — check jsonb/provenance columns`,
    );

  // Financial invariant: per-owner amount totals preserved under the map.
  const sumFor = (rows, oset, key = "user_id") => {
    const sums = {};
    for (const r of rows) {
      const owner = map[r[key]] ?? r[key];
      sums[owner] = (sums[owner] ?? 0) + Number(r.amount_minor ?? 0);
    }
    return sums;
  };
  const srcSums = sumFor(dump.tables["public.transaction_entries"] ?? []);
  const { rows: dstEntries } = await client.query(
    `select user_id, amount_minor from public.transaction_entries`,
  );
  const dstSums = {};
  for (const r of dstEntries)
    dstSums[r.user_id] = (dstSums[r.user_id] ?? 0) + Number(r.amount_minor);
  for (const [owner, sum] of Object.entries(srcSums))
    if (dstSums[owner] !== sum)
      fail(
        `amount_minor total drifted for owner ${owner}: ${sum}→${dstSums[owner]}`,
      );

  console.log(
    `  ✔ remap: ${totalRows} rows across ${names.length} tables, multisets equal under map, 0 legacy uuids, per-owner totals preserved`,
  );
  await client.end();

  // --- negatives on a FRESH mf_poc — inserting into the populated one would
  // hit PK conflicts, not the FK semantics being tested. Recreate, attempt a
  // restore with a deliberately incomplete map, prove the FK aborts the whole
  // transaction (zero committed rows), then prove a clean rerun reproduces
  // the identical state (retry after abort is safe and deterministic).
  const verifyAll = async () => {
    const c = await connect(url.toString());
    await c.query("set timezone to 'UTC'");
    const mism = [];
    for (const name of names) {
      const expected = (dump.tables[name] ?? [])
        .map((r) => canonDigest(remapRowDeep(r, map)))
        .sort();
      const fq = `"${name.split(".")[0]}"."${name.split(".")[1]}"`;
      const { rows: got } = await c.query(
        `select row_to_json(r) as j from (select * from ${fq}) r`,
      );
      const digests = got.map((r) => canonDigest(r.j)).sort();
      if (
        expected.length !== digests.length ||
        expected.join() !== digests.join()
      )
        mism.push(name);
    }
    await c.end();
    return mism;
  };

  await prepareScratchDb();
  const negUrl = new URL(URL_ENV);
  negUrl.pathname = `/${RESTORE_DB}`;
  {
    const doomed = await connect(negUrl.toString());
    const victim = Object.keys(map)[0];
    const orphanMap = { ...map };
    delete orphanMap[victim]; // one owner deliberately unmapped (unclaimed)
    let fkCaught = false;
    await doomed.query("begin");
    await doomed.query("set constraints all deferred");
    try {
      for (const name of names) {
        let rows = dump.tables[name];
        if (!rows.length) continue;
        if (name === "neon_auth.user")
          // An unclaimed owner has no subject row — exactly what a
          // claim-before-restore restore produces.
          rows = rows.filter((r) => r.id !== victim);
        await insertRows(doomed, name, rows, orphanMap);
      }
      await doomed.query("commit");
    } catch (e) {
      await doomed.query("rollback").catch(() => {});
      fkCaught = /foreign key|23503/i.test(e.message);
    }
    if (!fkCaught)
      fail(
        "unmapped owner insert did NOT trip the FK — claim-before-restore unsafe",
      );
    const {
      rows: [r],
    } = await doomed.query(`select count(*)::bigint n from public.accounts`);
    if (Number(r.n) !== 0)
      fail(`aborted restore committed ${r.n} rows — atomicity broken`);
    await doomed.end();
    console.log(
      "  ✔ negative: dropped map entry → FK violation, rollback left 0 rows",
    );
  }

  // Clean rerun into the same db — the retry must reproduce identical state.
  {
    const rerun = await connect(negUrl.toString());
    await rerun.query("begin");
    await rerun.query("set constraints all deferred");
    for (const name of names) {
      const rows = dump.tables[name];
      if (!rows.length) continue;
      await insertRows(rerun, name, rows, map);
    }
    await rerun.query("commit");
    await rerun.end();
    const mism = await verifyAll();
    if (mism.length) fail(`post-abort rerun diverged: ${mism.join(", ")}`);
    console.log(
      "  ✔ retry-after-abort reproduces identical multisets — safe reruns",
    );
  }

  // Live nested-jsonb mutation negative: alter one key INSIDE a jsonb column
  // of the restored db and prove the multiset comparison reports the table.
  // A comparator that cannot fail cannot verify anything.
  {
    const probe = await connect(negUrl.toString());
    let probeDone = false;
    for (const name of names) {
      if (probeDone) break;
      const rows = dump.tables[name] ?? [];
      for (const row of rows.slice(0, 50)) {
        if (probeDone) break;
        for (const [c, v] of Object.entries(row)) {
          if (!v || typeof v !== "object" || Array.isArray(v)) continue;
          // Find a path two levels deep (nested object/array) for a true
          // NESTED mutation; fall back to a top-level key if none exists.
          const k1 = Object.keys(v)[0];
          if (k1 === undefined) continue;
          const inner = v[k1];
          const k2 =
            inner && typeof inner === "object"
              ? Object.keys(inner)[0]
              : undefined;
          const path = k2 !== undefined ? `{${k1},${k2}}` : `{${k1}}`;
          const [schema, table] = name.split(".");
          try {
            await probe.query(
              `update "${schema}"."${table}"
                  set "${c}" = jsonb_set("${c}"::jsonb, '${path}', '"__tampered__"')
                where ctid = (select ctid from "${schema}"."${table}"
                              where "${c}" is not null limit 1)`,
            );
          } catch {
            continue; // not a jsonb-typed column — try the next candidate
          }
          const mism = await verifyAll();
          if (!mism.includes(name))
            fail(`nested jsonb mutation on ${name}.${c}${path} UNDETECTED`);
          console.log(
            `  ✔ negative: nested jsonb mutation at ${name}.${c}${path} detected`,
          );
          probeDone = true;
          break;
        }
      }
    }
    if (!probeDone)
      console.log("  (no populated jsonb column to mutate — skipped)");
    await probe.end();
  }
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

if (
  !DRY_RUN &&
  !DO_BACKUP &&
  !DO_RESTORE &&
  !DO_FREEZE &&
  !DO_CLEANUP &&
  !DO_REMAP
)
  fail(
    "choose --dry-run, --backup, --restore, --freeze-rehearsal, --remap-rehearsal, or --cleanup",
  );
if (DRY_RUN) {
  const client = await connect();
  await verifyTarget(client, URL_ENV);
  const inv = await inventory(client, "dry-run");
  await client.end();
  console.log(JSON.stringify(inv, null, 1).slice(0, 2000));
} else {
  if (DO_BACKUP) await backup();
  if (DO_RESTORE) await restore();
  if (DO_REMAP) await remapRehearsal();
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
