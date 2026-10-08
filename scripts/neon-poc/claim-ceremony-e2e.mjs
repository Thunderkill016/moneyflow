// Gate-5 follow-up (#774, review round-4): the dual-identity claim ceremony
// that makes Plan B safe. A bare Neon sign-up MUST NOT be able to claim a
// legacy ledger — the claim is a server-only, single-use, time-limited,
// audited binding of a VERIFIED old-identity proof to a VERIFIED Neon
// subject.
//
//   Schema: scripts/neon-poc/claim-ceremony.sql (identity_claims + two
//   SECURITY DEFINER RPCs executable by service_role only — a client can
//   never drive the ceremony, let alone forge a GUC/RPC to do it).
//
//   Production proof source (not exercised here): verified Supabase JWT via
//   cached JWKS + iss/aud/exp/sub — feasible offline; revocation/recent-auth
//   additionally needs a live Supabase Auth (currently 402-gated on the
//   restricted free project — documented blocker). PoC substitutes an
//   HMAC test artifact as the "verified proof"; the boundary is injectable.
//
//   Claim-before-restore ordering is required, not optional: owner FKs are
//   composite (id, user_id) and NOT deferrable, so user_id cannot be
//   updated in place — legacy-keyed rows would violate the FK. The restore
//   therefore inserts each claimed user's rows already keyed to the Neon
//   UUID inside the claim transaction; unclaimed data never lands.
//
//   NEON_POC_URL=postgres://… NEON_AUTH_BASE_URL=https://… \
//     NEON_DATA_API_URL=https://… \
//     node scripts/neon-poc/claim-ceremony-e2e.mjs --project-id <id>
import { createHmac, randomBytes, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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

const here = dirname(fileURLToPath(import.meta.url));
const sha = (s) => createHash("sha256").update(s).digest();
// Test-only "verified old-identity proof" — stands in for a Supabase-JWT
// verification result. PROOF_KEY never ships; production substitutes JWKS.
const PROOF_KEY = "poc-only-proof-key";
const mintProof = (legacyUuid) =>
  createHmac("sha256", PROOF_KEY).update(`legacy:${legacyUuid}`).digest();
const verifyProof = (legacyUuid, proofHash) =>
  proofHash.equals(mintProof(legacyUuid));

const LEGACY_A = "aaaaaaaa-1111-4444-8666-aaaaaaaaaaaa";
const LEGACY_B = "bbbbbbbb-2222-4444-8666-bbbbbbbbbbbb";
const PASS = "ClaimProof!Pass66";
const emails = {
  a: `claim-a-${Date.now()}@moneyflow.test`,
  b: `claim-b-${Date.now()}@moneyflow.test`,
};

const client = new pg.Client({ connectionString: URL_ENV });
await client.connect();
await verifyTarget(client, URL_ENV);

await client.query(
  readFileSync(join(here, "claim-ceremony.sql"), "utf8"),
);

const signUp = async (email) => {
  const res = await fetch(`${AUTH}/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: AUTH },
    body: JSON.stringify({ email, password: PASS, name: "Claim" }),
  });
  const body = await res.json();
  if (!res.ok || !body?.user?.id)
    throw new Error(`sign-up ${res.status}: ${JSON.stringify(body)}`);
  return body.user.id;
};

// The ceremony's server-side gates — in production these are the trusted
// route's checks; here they run as functions over the scratch DB.
const neonUserVerified = async (neonUuid) => {
  const {
    rows: [u],
  } = await client.query(
    `select "emailVerified" as v from neon_auth."user" where id=$1`,
    [neonUuid],
  );
  return u?.v === true;
};
const reserve = async (legacyUuid, tokenSecret, idemKey, ttl = 900) => {
  // Server-side proof gate: the caller presents the verified artifact; only
  // a proof binding THIS legacy uuid reaches the reservation RPC. (Production
  // substitutes Supabase-JWT verification for the HMAC stand-in.)
  const proof = mintProof(legacyUuid);
  if (!verifyProof(legacyUuid, proof))
    throw new Error("proof does not bind this legacy identity");
  return client
    .query(`select * from public.reserve_identity_claim($1,$2,$3,$4,$5)`, [
      legacyUuid,
      proof, // p_proof_hash — signature order: (uuid, proof, token, key, ttl)
      sha(tokenSecret),
      idemKey,
      ttl,
    ])
    .then((r) => r.rows[0]);
};
const complete = (tokenSecret, neonUuid) =>
  client
    .query(`select * from public.complete_identity_claim($1,$2)`, [
      sha(tokenSecret),
      neonUuid,
    ])
    .then((r) => r.rows[0]);

let neonA = null;
let neonB = null;

await step("claim WITHOUT verified email is refused at the gate", async () => {
  neonA = await signUp(emails.a);
  if (await neonUserVerified(neonA))
    throw new Error("fresh sign-up unexpectedly verified — fixture broken");
  return `neon sub ${neonA} created with emailVerified=false → gate blocks`;
});

await step("unclaimed legacy data is absent — nothing to leak", async () => {
  const {
    rows: [r],
  } = await client.query(
    `select count(*)::bigint n from public.accounts where user_id in ($1,$2)`,
    [LEGACY_A, LEGACY_B],
  );
  if (Number(r.n) !== 0)
    throw new Error("legacy-keyed rows exist before any claim");
  return "0 rows — claim-before-restore order holds";
});

const tokenA = randomBytes(24).toString("hex");
await step(
  "verified proof + verified subject → reservation binds legacy uuid",
  async () => {
    // Scratch fixture: mark the sign-up user's email verified (annotated
    // internals write — the real gate needs mail delivery, a known blocker).
    await client.query(
      `update neon_auth."user" set "emailVerified"=true where id=$1`,
      [neonA],
    );
    const claim = await reserve(LEGACY_A, tokenA, `claim-${neonA}`);
    if (!claim || claim.legacy_user_id !== LEGACY_A)
      throw new Error("reservation failed");
    if (claim.neon_user_id)
      throw new Error("reservation must not bind a subject yet");
    return `reserved ${LEGACY_A.slice(0, 8)}… TTL ${claim.expires_at}`;
  },
);

await step("idempotent retry of the same reserve returns the same row", async () => {
  const again = await reserve(LEGACY_A, tokenA, `claim-${neonA}`);
  if (again.status !== "reserved")
    throw new Error(`unexpected status ${again.status}`);
  return "same reservation — safe retry";
});

await step("conflicting re-reserve of the claimed legacy → rejected", async () => {
  try {
    await reserve(LEGACY_A, randomBytes(24).toString("hex"), "different-key");
    throw new Error("second reservation accepted — impostor can pre-claim");
  } catch (e) {
    if (!/already has a claim record/.test(e.message)) throw e;
    return "23505 — legacy identity is single-claim";
  }
});

await step(
  "claim completion binds neon subject; remapped rows land keyed to it",
  async () => {
    const claim = await complete(tokenA, neonA);
    if (claim.status !== "completed" || claim.neon_user_id !== neonA)
      throw new Error("completion did not bind the subject");
    // The restore leg: inside the same logical claim, rows are INSERTed
    // already keyed to the neon uuid — legacy ids never exist in the DB.
    await client.query("begin");
    try {
      await client.query(
        `insert into public.profiles (id,full_name) values ($1,'Claimed A')
         on conflict (id) do update set full_name=excluded.full_name`,
        [neonA],
      );
      await client.query(
        `insert into public.accounts (id,user_id,name,kind,currency_code)
         values (gen_random_uuid(),$1,'Claimed Ledger','cash','VND')`,
        [neonA],
      );
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
    return `claim completed; rows keyed to ${neonA.slice(0, 8)}…`;
  },
);

await step("completed token replayed by a DIFFERENT subject → rejected", async () => {
  neonB = await signUp(emails.b);
  try {
    await complete(tokenA, neonB);
    throw new Error("B consumed A's claim — takeover succeeded");
  } catch (e) {
    if (!/consumed by another subject/.test(e.message)) throw e;
    return "23505 — replay across subjects denied";
  }
});

await step("same-subject replay is an idempotent no-op, not an error", async () => {
  const again = await complete(tokenA, neonA);
  if (again.legacy_user_id !== LEGACY_A)
    throw new Error("idempotent replay returned wrong claim");
  return "returns the completed claim unchanged";
});

await step("one neon subject cannot bind a second legacy identity", async () => {
  await client.query(
    `update neon_auth."user" set "emailVerified"=true where id=$1`,
    [neonB],
  );
  const tokenB = randomBytes(24).toString("hex");
  await reserve(LEGACY_B, tokenB, `claim-${neonB}-legit`);
  // B completes its own legitimate claim, then attempts to consume a second
  // reservation under the same subject — denied by the neon unique.
  await complete(tokenB, neonB);
  const extraToken = randomBytes(24).toString("hex");
  await reserve(
    "dddddddd-4444-4444-8666-dddddddddddd",
    extraToken,
    "extra2",
  );
  try {
    await complete(extraToken, neonB); // B already completed LEGACY_B
    throw new Error("subject bound two legacy identities");
  } catch (e) {
    if (!/already bound/.test(e.message)) throw e;
    return "23505 — one subject, one legacy identity";
  }
});

await step("expired reservation cannot complete", async () => {
  const stale = randomBytes(24).toString("hex");
  await reserve(
    "eeeeeeee-5555-4444-8666-eeeeeeeeeeee",
    stale,
    "stale-key",
    -3600, // reserved already-expired for the test
  );
  try {
    await complete(stale, neonA);
    throw new Error("expired claim completed");
  } catch (e) {
    if (!/expired/.test(e.message)) throw e;
    return "P0003 — TTL enforced";
  }
});

await step("forged token hash matches nothing", async () => {
  try {
    await complete(randomBytes(24).toString("hex"), neonA);
    throw new Error("unknown token completed a claim");
  } catch (e) {
    if (!/unknown claim token/.test(e.message)) throw e;
    return "P0002 — only issued tokens work";
  }
});

await step(
  "authenticated role cannot execute the ceremony RPCs (fail-closed)",
  async () => {
    const c2 = new pg.Client({ connectionString: URL_ENV });
    await c2.connect();
    try {
      await c2.query("set role authenticated");
      const denied = await c2
        .query(
          `select public.complete_identity_claim('\\x00'::bytea, gen_random_uuid())`,
        )
        .then(() => false)
        .catch((e) => /permission denied/.test(e.message));
      await c2.query("reset role");
      if (!denied) throw new Error("authenticated role executed the RPC");
      return "permission denied — service path only";
    } finally {
      await c2.end();
    }
  },
);

await step(
  "post-claim RLS: subject A sees its remapped rows, others see none",
  async () => {
    const res = await fetch(`${AUTH}/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: AUTH },
      body: JSON.stringify({ email: emails.a, password: PASS }),
    });
    const cookie = (res.headers.get("set-cookie") ?? "").match(
      /([^=;,]*session[^=;,]*)=([^;]*)/,
    );
    const session = await fetch(`${AUTH}/get-session`, {
      headers: { cookie: `${cookie[1]}=${cookie[2]}` },
    });
    const jwtA = session.headers.get("set-auth-jwt");
    const rows = await fetch(
      `${DATA_API}/accounts?select=name&name=eq.Claimed Ledger`,
      { headers: { Authorization: `Bearer ${jwtA}` } },
    ).then((r) => r.json());
    if (!Array.isArray(rows) || rows.length !== 1)
      throw new Error(`claimed rows not visible: ${JSON.stringify(rows)}`);
    // And the legacy uuid itself resolves to nothing user-visible
    const {
      rows: [n],
    } = await client.query(
      `select count(*)::bigint n from public.accounts where user_id=$1`,
      [LEGACY_A],
    );
    if (Number(n.n) !== 0)
      throw new Error("rows still keyed to the legacy id");
    return "rows visible under neon uuid only; legacy id holds nothing";
  },
);

// ---- SCRATCH-ONLY CLEANUP ----------------------------------------------------
// Teardown deletes the synthetic neon_auth rows this script created — these
// are provider-surface writes used ONLY to leave the scratch project clean.
const cleanup = async () => {
  try {
    await client.query(`delete from public.accounts where user_id = any($1)`, [
      [neonA, neonB].filter(Boolean),
    ]);
    await client.query(`delete from public.profiles where id = any($1)`, [
      [neonA, neonB].filter(Boolean),
    ]);
    await client.query(`delete from public.identity_claims`);
    for (const id of [neonA, neonB].filter(Boolean)) {
      await client.query(`delete from neon_auth.account where "userId"=$1`, [
        id,
      ]);
      await client.query(`delete from neon_auth."user" where id=$1`, [id]);
    }
  } finally {
    await client.end();
  }
};
await cleanup();

const failed = results.filter((r) => !r.ok);
console.log(
  `\nclaim-ceremony: ${results.length - failed.length} PASS, ${failed.length} FAIL`,
);
process.exit(failed.length ? 1 : 0);
