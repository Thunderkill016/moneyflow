#!/usr/bin/env node
// prod-export.mjs — production Supabase → encrypted snapshot via the
// Management API `database/query` endpoint. The project's public API
// gateway is egress-locked (HTTP 402), but the management plane still
// proxies SQL server-side — this is the only viable export path.
//
//   SUPABASE_ACCESS_TOKEN=<mgmt token> node prod-export.mjs
//
// Reads: every public.* base table + auth.users + auth.identities.
// Writes: out/prod-backup-<ts>.enc.json  (AES-256-GCM, PBKDF2 250k)
//         out/prod-backup-<ts>.manifest.json  (row counts + sha256 digests,
//         per-owner amount_minor BigInt sums — NO PII in the manifest)

import {
  createCipheriv,
  createHash,
  randomBytes,
  pbkdf2Sync,
} from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "out");
const PROJECT_REF = "fwpldsdkpzhswpuctbke";
const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const PAGE = 500;
const KDF_ITERATIONS = 250_000;
const KEY_BYTES = 32;

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (!token) fail("SUPABASE_ACCESS_TOKEN required (management token)");

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

async function q(sql) {
  const res = await fetch(MGMT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) fail(`mgmt query HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function canon(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canon(v[k])}`)
    .join(",")}}`;
}
function digestRows(rows) {
  const h = createHash("sha256");
  for (const r of rows.map(canon).sort()) h.update(r).update("\n");
  return h.digest("hex");
}
function encryptArchive(plaintext, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(passphrase, salt, KDF_ITERATIONS, KEY_BYTES, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    format: "moneyflow-backup-encrypted",
    kdf: {
      algo: "pbkdf2-sha256",
      iterations: KDF_ITERATIONS,
      salt: salt.toString("hex"),
    },
    cipher: "aes-256-gcm",
    iv: iv.toString("hex"),
    tag: cipher.getAuthTag().toString("hex"),
    data: ct.toString("base64"),
  };
}

// ---- discover tables -----------------------------------------------------
const tables = (
  await q(
    `select table_name from information_schema.tables
      where table_schema='public' and table_type='BASE TABLE' order by 1`,
  )
).map((r) => r.table_name);
tables.push("__auth_users", "__auth_identities");
console.log(`exporting ${tables.length} tables`);

const pkCache = new Map();
async function pkOf(schema, table) {
  const key = `${schema}.${table}`;
  if (!pkCache.has(key)) {
    const rows = await q(
      `select a.attname from pg_index i
        join pg_attribute a on a.attrelid=i.indrelid and a.attnum=any(i.indkey)
       where i.indisprimary and i.indrelid='${schema}.${table}'::regclass
       order by array_position(i.indkey, a.attnum)`,
    );
    pkCache.set(
      key,
      rows.map((r) => `"${r.attname}"`),
    );
  }
  return pkCache.get(key);
}

async function dumpTable(schema, table) {
  const pk = await pkOf(schema, table);
  const order = pk.length ? pk.join(",") : "1";
  const all = [];
  for (let off = 0; ; off += PAGE) {
    const rows = await q(
      `select * from "${schema}"."${table}" order by ${order} limit ${PAGE} offset ${off}`,
    );
    all.push(...rows);
    if (rows.length < PAGE) return all;
  }
}

const dump = {
  exported_at: new Date().toISOString(),
  project: PROJECT_REF,
  tables: {},
};
const manifest = {
  exported_at: dump.exported_at,
  project: PROJECT_REF,
  tables: {},
};
const moneySums = new Map(); // user_id -> bigint total over amount_minor cols

for (const t of tables) {
  const [schema, name] =
    t === "__auth_users"
      ? ["auth", "users"]
      : t === "__auth_identities"
        ? ["auth", "identities"]
        : ["public", t];
  const rows = await dumpTable(schema, name);
  dump.tables[`${schema}.${name}`] = rows;
  manifest.tables[`${schema}.${name}`] = {
    rows: rows.length,
    sha256: digestRows(rows),
  };
  for (const r of rows)
    if (schema === "public" && r.user_id && r.amount_minor != null)
      moneySums.set(
        r.user_id,
        (moneySums.get(r.user_id) ?? 0n) + BigInt(r.amount_minor),
      );
  console.log(`  ${schema}.${name}: ${rows.length} rows`);
}

manifest.per_owner_amount_minor = Object.fromEntries(
  [...moneySums.entries()].map(([k, v]) => [k, v.toString()]),
);

const pass = process.env.BACKUP_PASSPHRASE?.trim();
if (!pass || pass.length < 12) fail("BACKUP_PASSPHRASE (>=12 chars) required");
mkdirSync(OUT, { recursive: true });
const ts = dump.exported_at.replace(/[:.]/g, "-");
const encPath = join(OUT, `prod-backup-${ts}.enc.json`);
writeFileSync(
  encPath,
  JSON.stringify(encryptArchive(JSON.stringify(dump), pass)),
);
writeFileSync(
  join(OUT, `prod-backup-${ts}.manifest.json`),
  JSON.stringify(manifest, null, 2),
);
console.log(`✔ encrypted snapshot → ${encPath}`);
console.log(`✔ manifest → out/prod-backup-${ts}.manifest.json`);
