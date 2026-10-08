// Gate-5 follow-up (#774, review round-3): the OFFICIAL-PATH identity
// reconciliation. Neon's own docs state Managed Better Auth cannot import
// Supabase password hashes and that migrated users receive NEW user_ids
// (docs/auth/migrate/from-supabase). This script proves the supported
// alternative — no writes to managed auth internals:
//
//   1. LEGACY_UUID is a would-be Supabase id; it is NEVER inserted into
//      neon_auth — the user onboards through the real sign-up API and gets a
//      provider-generated NEON_UUID.
//   2. A ledger row arrives with user_id remapped legacy→neon AT INSERT time
//      (what a restore would do once the cutover map exists), because every
//      user_id FKs to neon_auth."user"(id).
//   3. Sign-in returns user.id === NEON_UUID; a Data API request with the
//      user's JWT sees the remapped row (RLS) — proving the security model
//      needs no UUID preservation.
//   4. A second signed-up user sees zero of the first user's rows (tenant
//      isolation holds on remapped ids).
//
//   NEON_POC_URL=postgres://… NEON_AUTH_BASE_URL=https://… \
//     NEON_DATA_API_URL=https://… \
//     node scripts/neon-poc/identity-remap-e2e.mjs --project-id <id>
import pg from "pg";
import { verifyTarget, abort } from "./lib/verify-target.mjs";

const URL_ENV = process.env.NEON_POC_URL;
const AUTH = process.env.NEON_AUTH_BASE_URL;
const DATA_API = process.env.NEON_DATA_API_URL;
if (!URL_ENV || !AUTH || !DATA_API)
  abort("NEON_POC_URL + NEON_AUTH_BASE_URL + NEON_DATA_API_URL required");

const results = [];
const ok = (n, d = "") => {
  results.push({ n, ok: true });
  console.log(`  ✔ ${n}${d ? ` — ${d}` : ""}`);
};
const bad = (n, e) => {
  results.push({ n, ok: false });
  console.error(`  ✗ ${n} — ${e}`);
};
const step = async (n, fn) => {
  try {
    ok(n, await fn());
  } catch (e) {
    bad(n, e instanceof Error ? e.message : String(e));
  }
};

const LEGACY_UUID = "22222222-3333-4444-8555-666666666600"; // never in neon_auth
const PASS = "RemapProof!Pass77";
const emails = {
  a: `remap-a-${Date.now()}@moneyflow.test`,
  b: `remap-b-${Date.now()}@moneyflow.test`,
};

const client = new pg.Client({ connectionString: URL_ENV });
await client.connect();
await verifyTarget(client, URL_ENV);

const authCall = async (path, body, cookie) => {
  const res = await fetch(`${AUTH}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: AUTH,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return res;
};

let neonUuid = null;
let sessionCookie = null;
await step("user onboards via real sign-up — gets a fresh Neon uuid", async () => {
  const res = await authCall("/sign-up/email", {
    email: emails.a,
    password: PASS,
    name: "Remap Proof A",
  });
  const body = await res.json();
  if (!res.ok || !body?.user?.id)
    throw new Error(`sign-up ${res.status}: ${JSON.stringify(body)}`);
  neonUuid = body.user.id;
  if (neonUuid === LEGACY_UUID)
    throw new Error("provider collided with the legacy id — impossible");
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/([^=;,]*session[^=;,]*)=([^;]*)/);
  if (!m) throw new Error("no session cookie issued on sign-up");
  sessionCookie = `${m[1]}=${m[2]}`;
  return `neon sub ${neonUuid} ≠ legacy ${LEGACY_UUID}`;
});

await step(
  "restore inserts ledger row with user_id remapped legacy→neon",
  async () => {
    // Cutover map is built from observed sign-ups; the restore applies it at
    // INSERT time so the FK to neon_auth."user" is never violated by a
    // non-existent legacy id.
    const { rowCount } = await client.query(
      `insert into public.accounts (id,user_id,name,kind,currency_code)
       values (gen_random_uuid(),$1,'Remap Ledger','cash','VND')`,
      [neonUuid],
    );
    if (rowCount !== 1) throw new Error("remapped insert failed");
    return `1 row keyed to ${neonUuid} (was ${LEGACY_UUID})`;
  },
);

let jwt = null;
await step("sign-in → session → Data API JWT binds the neon uuid", async () => {
  const res = await authCall("/sign-in/email", {
    email: emails.a,
    password: PASS,
  });
  const body = await res.json();
  if (!res.ok || body?.user?.id !== neonUuid)
    throw new Error(`sign-in ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/([^=;,]*session[^=;,]*)=([^;]*)/);
  const session = await fetch(`${AUTH}/get-session`, {
    headers: { cookie: sessionCookie },
  });
  jwt = session.headers.get("set-auth-jwt");
  if (!jwt) throw new Error(`no JWT (status ${session.status})`);
  if (!m && !sessionCookie) throw new Error("no session material");
  return `user.id = ${body.user.id}`;
});

await step("remapped row visible through RLS under the neon uuid", async () => {
  const rows = await fetch(`${DATA_API}/accounts?select=id,name&limit=50`, {
    headers: { Authorization: `Bearer ${jwt}` },
  }).then((r) => r.json());
  const mine = Array.isArray(rows)
    ? rows.filter((r) => r.name === "Remap Ledger")
    : [];
  if (mine.length !== 1)
    throw new Error(`expected the remapped row, got ${JSON.stringify(rows)}`);
  return `row visible under subject ${neonUuid}`;
});

await step("second neon subject sees zero remapped rows (isolation)", async () => {
  const res = await authCall("/sign-up/email", {
    email: emails.b,
    password: PASS,
    name: "Remap Proof B",
  });
  const body = await res.json();
  if (!res.ok || !body?.user?.id)
    throw new Error(`sign-up B ${res.status}`);
  const cookieB = (res.headers.get("set-cookie") ?? "").match(
    /([^=;,]*session[^=;,]*)=([^;]*)/,
  );
  const session = await fetch(`${AUTH}/get-session`, {
    headers: { cookie: `${cookieB[1]}=${cookieB[2]}` },
  });
  const jwtB = session.headers.get("set-auth-jwt");
  const rows = await fetch(`${DATA_API}/accounts?select=id,name&limit=50`, {
    headers: { Authorization: `Bearer ${jwtB}` },
  }).then((r) => r.json());
  const leak = Array.isArray(rows)
    ? rows.filter((r) => r.name === "Remap Ledger")
    : ["<non-array response>"];
  if (leak.length !== 0) throw new Error(`isolation breach: ${leak.length} rows`);
  return "0 foreign rows";
});

// ---- cleanup ---------------------------------------------------------------
await client.query(`delete from public.accounts where user_id=$1`, [neonUuid]);
if (neonUuid) {
  await client.query(`delete from neon_auth.account where "userId"=$1`, [
    neonUuid,
  ]);
  await client.query(`delete from neon_auth."user" where id=$1`, [neonUuid]);
}
await client.end();

const failed = results.filter((r) => !r.ok);
console.log(
  `\nidentity-remap: ${results.length - failed.length} PASS, ${failed.length} FAIL`,
);
process.exit(failed.length ? 1 : 0);
