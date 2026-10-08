#!/usr/bin/env node
// prod-restore.mjs — production cutover leg of #774.
//
//   SUPABASE mgmt export (out/prod-backup-*.enc.json)
//     → per-user managed-auth accounts on moneyflow-prod (sign-up API,
//       temp password; identity bound by Supabase-verified email match)
//     → single transaction: purge provisioned seeds, insert ALL public
//       rows remapped legacy_uuid → neon_uuid (parents first)
//     → verify: per-table counts, per-owner amount_minor BigInt sums,
//       zero surviving legacy uuids
//
//   node prod-restore.mjs --project-id shy-mud-72113549
//   (conn string: out/prod-neon-conn.txt; backup: newest prod-backup-*.enc.json)
//
// Idempotent: re-running reuses existing accounts (sign-in by email) and
// re-purges/re-inserts the same rows — no duplicates (PKs preserved).

import {
  createDecipheriv,
  createHash,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { verifyTarget, abort } from "./lib/verify-target.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const AUTH =
  "https://ep-morning-band-b3a6dp3y.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth";

function fail(m) {
  console.error(`✖ ${m}`);
  process.exit(1);
}

// ---- decrypt latest backup ----------------------------------------------
const backups = readdirSync(OUT)
  .filter((f) => /^prod-backup-.*\.enc\.json$/.test(f))
  .sort();
if (!backups.length) fail("no prod-backup-*.enc.json in out/");
const BACKUP = join(OUT, backups.at(-1));
const passFile = join(OUT, "prod-backup.passphrase");
if (!existsSync(passFile)) fail("missing out/prod-backup.passphrase");

const env = JSON.parse(readFileSync(BACKUP, "utf8"));
const pass = readFileSync(passFile, "utf8");
const key = pbkdf2Sync(
  pass,
  Buffer.from(env.kdf.salt, "hex"),
  env.kdf.iterations,
  32,
  "sha256",
);
const dec = createDecipheriv("aes-256-gcm", key, Buffer.from(env.iv, "hex"));
dec.setAuthTag(Buffer.from(env.tag, "hex"));
const dump = JSON.parse(
  Buffer.concat([
    dec.update(Buffer.from(env.data, "base64")),
    dec.final(),
  ]).toString(),
);
console.log(`decrypted ${BACKUP.split("/").at(-1)} (${dump.exported_at})`);

const manifestFile = BACKUP.replace(".enc.json", ".manifest.json");
const manifest = existsSync(manifestFile)
  ? JSON.parse(readFileSync(manifestFile, "utf8"))
  : null;

// ---- managed-auth provisioning -------------------------------------------
const authCall = async (path, body) =>
  fetch(`${AUTH}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: AUTH },
    body: JSON.stringify(body),
  });
// Shared-bucket limiter: ride out 429 windows.
const authCallPatient = async (path, body) => {
  for (let i = 0; i < 4; i++) {
    const res = await authCall(path, body);
    if (res.status !== 429) return res;
    const hint = Number(res.headers.get("retry-after")) * 1000;
    await new Promise((r) =>
      setTimeout(r, Number.isFinite(hint) && hint > 0 ? hint : 35_000),
    );
  }
  return authCall(path, body);
};

const connUrl = readFileSync(join(OUT, "prod-neon-conn.txt"), "utf8").trim();
const client = new pg.Client({
  connectionString: connUrl,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await verifyTarget(client, connUrl);

const legacyUsers = dump.tables["auth.users"];
const map = new Map(); // legacy uuid -> neon uuid
const creds = []; // {email, tempPassword} for owner distribution

for (const u of legacyUsers) {
  const email = u.email;
  // Idempotent rerun: reuse the existing Neon account for this email —
  // a fresh temp password would make sign-in fail on the second run.
  const { rows: existing } = await client.query(
    `select id from neon_auth."user" where email=$1`,
    [email],
  );
  let neonId;
  if (existing.length) {
    neonId = existing[0].id;
    console.log(`  ${email}: existing account reused (idempotent rerun)`);
  } else {
    const tempPassword = `MF-${randomBytes(12).toString("base64url")}!${randomBytes(4).toString("hex")}`;
    const res = await authCallPatient("/sign-up/email", {
      email,
      password: tempPassword,
      name: u.raw_user_meta_data?.name ?? email.split("@")[0],
    });
    const body = await res.json().catch(() => ({}));
    neonId = body?.user?.id;
    if (!neonId)
      fail(
        `cannot provision ${email}: sign-up ${res.status} ${JSON.stringify(body)}`,
      );
    creds.push({ email, tempPassword });
  }
  map.set(u.id, neonId);
  // Identity continuity is by Supabase-verified email under owner authority;
  // mark verified so sign-in is not gated on the shared-sender mailbox.
  await client.query(
    `update neon_auth."user" set "emailVerified"=true where id=$1`,
    [neonId],
  );
  console.log(`  ${email}: ${u.id.slice(0, 8)}… → ${neonId.slice(0, 8)}…`);
}

// ---- owner-column discovery (target catalog; cross-schema via pg_constraint)
const { rows: fkRows } = await client.query(`
  select n.nspname as schema, c.relname as table, a.attname as col
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_class rc on rc.oid = con.confrelid
    join pg_namespace rn on rn.oid = rc.relnamespace
    join unnest(con.conkey) with ordinality k(attnum, ord) on true
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
   where con.contype = 'f'
     and ((rn.nspname = 'neon_auth' and rc.relname = 'user')
       or (rn.nspname = 'public' and rc.relname = 'profiles'))
   order by 1, 2`);
const ownerCols = new Map();
for (const r of fkRows) {
  const t = `${r.schema}.${r.table}`;
  if (!ownerCols.has(t)) ownerCols.set(t, []);
  ownerCols.get(t).push(r.col);
}
// Value sweep: columns holding a known legacy uuid are owner refs even
// without an FK (e.g. actor_user_id behind a CHECK constraint).
const knownUuids = new Set(legacyUsers.map((u) => u.id));
const { rows: textCols } = await client.query(`
  select table_schema, table_name, column_name
    from information_schema.columns
   where table_schema = 'public'
     and data_type in ('uuid','text','character varying','jsonb','json')`);
for (const c of textCols) {
  const t = `public.${c.table_name}`;
  const hit = legacyUsers.some((u) =>
    (dump.tables[t] ?? []).some((r) => {
      const v = r[c.column_name];
      if (v === u.id) return true;
      if (v && typeof v === "object") return JSON.stringify(v).includes(u.id);
      return false;
    }),
  );
  if (hit && !(ownerCols.get(t) ?? []).includes(c.column_name)) {
    ownerCols.set(t, [...(ownerCols.get(t) ?? []), c.column_name]);
    console.log(`  sweep: ${t}.${c.column_name} holds legacy uuid (no FK)`);
  }
}

// Parent-first insert order via FK graph on the target.
const { rows: deps } = await client.query(`
  select distinct rn.nspname || '.' || rc.relname as parent,
         n.nspname || '.' || c.relname as child
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_class rc on rc.oid = con.confrelid
    join pg_namespace rn on rn.oid = rc.relnamespace
   where con.contype = 'f' and n.nspname = 'public'`);
const allTables = Object.keys(dump.tables).filter((t) =>
  t.startsWith("public."),
);
const order = [];
const seen = new Set();
const visit = (t, path = new Set()) => {
  if (seen.has(t) || path.has(t)) return;
  path.add(t);
  for (const d of deps.filter((d) => d.child === t && d.parent !== t))
    if (d.parent.startsWith("public.")) visit(d.parent, path);
  seen.add(t);
  order.push(t);
};
for (const t of allTables) visit(t);

// Deep uuid remap (jsonb/object/array values may embed owner uuids).
const deepRemap = (v) => {
  if (typeof v === "string" && map.has(v)) return map.get(v);
  if (Array.isArray(v)) return v.map(deepRemap);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [map.get(k) ?? k, deepRemap(x)]),
    );
  return v;
};

// ---- restore transaction ---------------------------------------------------
const legacyIds = [...map.keys()];
const moneyBefore = new Map();
for (const [t, rows] of Object.entries(dump.tables))
  for (const r of rows)
    if (t.startsWith("public.") && r.user_id && r.amount_minor != null)
      moneyBefore.set(
        r.user_id,
        (moneyBefore.get(r.user_id) ?? 0n) + BigInt(r.amount_minor),
      );

try {
  await client.query("begin");
  // Purge provisioned seeds for each destination subject, children first.
  for (const t of [...order].reverse())
    if (t !== "public.profiles")
      for (const col of ownerCols.get(t) ?? [])
        await client.query(
          `delete from ${t} where "${col}"::text = any($1::text[])`,
          [[...map.values()]],
        );
  // Insert remapped rows parents-first.
  let inserted = 0;
  for (const t of order) {
    const rows = dump.tables[t] ?? [];
    if (!rows.length) continue;
    const cols = Object.keys(rows[0]);
    for (const r0 of rows) {
      const r = Object.fromEntries(
        Object.entries(r0).map(([k, v]) => [k, deepRemap(v)]),
      );
      const vals = cols.map((c) =>
        r[c] !== null && typeof r[c] === "object" ? JSON.stringify(r[c]) : r[c],
      );
      const sql =
        t === "public.profiles"
          ? `insert into ${t} (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})
             on conflict (id) do update set ${cols
               .filter((c) => c !== "id")
               .map((c) => `"${c}"=excluded."${c}"`)
               .join(",")}`
          : `insert into ${t} (${cols.map((c) => `"${c}"`).join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`;
      await client.query(sql, vals);
      inserted++;
    }
  }

  // ---- in-transaction verification -------------------------------------
  for (const t of order) {
    const expected = (dump.tables[t] ?? []).length;
    const cols = ownerCols.get(t) ?? [];
    const where = cols.length
      ? cols.map((c) => `"${c}"::text = any($1::text[])`).join(" or ")
      : "true";
    const { rows: cnt } = await client.query(
      `select count(*)::int n from ${t} where ${where}`,
      [[...map.values()]],
    );
    if (t !== "public.profiles" && cnt[0].n < expected)
      throw new Error(`${t}: restored ${cnt[0].n} < expected ${expected}`);
    // No surviving legacy uuid in any cell of this table (jsonb included —
    // row-to-text serialization exposes embedded values).
    const { rows: leak } = await client.query(
      `select count(*)::int n from ${t} r where r::text ~ any($1::text[])`,
      [legacyIds],
    );
    if (leak[0].n)
      throw new Error(`${t}: ${leak[0].n} rows still carry a legacy uuid`);
  }
  // Money invariants: per-owner amount_minor sums preserved under remap.
  for (const [legacy, sum] of moneyBefore) {
    const neon = map.get(legacy);
    let got = 0n;
    for (const t of order) {
      const { rows: mcols } = await client.query(
        `select 1 from information_schema.columns where table_schema='public'
          and table_name=$1 and column_name='amount_minor'`,
        [t.split(".")[1]],
      );
      if (!mcols.length) continue;
      const { rows: s } = await client.query(
        `select coalesce(sum(amount_minor),0)::text v from ${t} where user_id=$1`,
        [neon],
      );
      got += BigInt(s[0].v);
    }
    if (got !== sum)
      throw new Error(
        `money drift owner ${legacy.slice(0, 8)}: ${sum} -> ${got}`,
      );
  }
  await client.query("commit");
  console.log(`✔ restored ${inserted} rows for ${map.size} owners — commit`);
} catch (e) {
  await client.query("rollback");
  fail(`restore aborted, rolled back: ${e.message}`);
}

if (creds.length) {
  writeFileSync(
    join(OUT, "prod-credentials.txt"),
    creds.map((c) => `${c.email}\t${c.tempPassword}`).join("\n") + "\n",
    { mode: 0o600 },
  );
  console.log(
    `✔ temp credentials → out/prod-credentials.txt (owner distributes)`,
  );
}
await client.end();
console.log("prod-restore: COMPLETE");
