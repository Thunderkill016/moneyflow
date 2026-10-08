// Gate-5 follow-up (#774, review round-2): end-to-end password reset on a
// synthetic IMPORTED-UUID user — the exact journey a migrated Supabase user
// would take under the forced-reset cutover strategy.
//
//   1. Insert a user with a pre-chosen UUID + credential account (scrypt
//      hash of the OLD password) + a ledger row bound to that UUID.
//   2. POST /request-password-reset → the managed service writes
//      `reset-password:<token>` → user_id into neon_auth.verification
//      (scratch DB read — the mail-delivery leg is a separate blocker).
//   3. POST /reset-password with token + NEW password.
//   4. Assert NO session is auto-created (explicit sign-in required).
//   5. Old password rejected, new accepted, session binds the SAME uuid,
//      and the ledger row is still owned by that uuid.
//   6. Negatives ordered so they can't destroy live state: garbage token,
//      enumeration-identical 200s; then consumed-token reuse and expired
//      token — each on its own fresh verification row.
//
//   NEON_POC_URL=postgres://… NEON_AUTH_BASE_URL=https://… \
//     node scripts/neon-poc/reset-e2e.mjs --project-id polished-pine-75721729
import pg from "pg";
import { hashPassword } from "@better-auth/utils/password";
import { verifyTarget, abort } from "./lib/verify-target.mjs";

const URL_ENV = process.env.NEON_POC_URL;
const AUTH = process.env.NEON_AUTH_BASE_URL;
if (!URL_ENV || !AUTH) abort("NEON_POC_URL + NEON_AUTH_BASE_URL required");

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

const UUID = "11111111-2222-4333-8444-555555555599";
const EMAIL = "reset-e2e@moneyflow.test";
const OLD_PASS = "OldPass!WontWork99";
const NEW_PASS = "NewPass!WorksNow88";

const client = new pg.Client({ connectionString: URL_ENV });
await client.connect();
await verifyTarget(client, URL_ENV);

// ---- setup: imported user + credential + one ledger row --------------------
await client.query(`delete from neon_auth.account where "userId"=$1`, [UUID]);
await client.query(`delete from neon_auth."user" where id=$1`, [UUID]);
await client.query(
  `insert into neon_auth."user" (id,name,email,"emailVerified","createdAt","updatedAt")
   values ($1,$2,$3,true,now(),now())`,
  [UUID, "Reset E2E", EMAIL],
);
await client.query(
  `insert into neon_auth.account (id,"accountId","providerId","userId",password,"createdAt","updatedAt")
   values (gen_random_uuid(),$1::text,'credential',$1::uuid,$2,now(),now())`,
  [UUID, await hashPassword(OLD_PASS)],
);
await client.query(
  `delete from public.accounts where user_id=$1 and name='ResetE2E Ledger'`,
  [UUID],
);
await client.query(
  `insert into public.accounts (id,user_id,name,kind,currency_code)
   values (gen_random_uuid(),$1,'ResetE2E Ledger','cash','VND')`,
  [UUID],
);

const resetRequest = (email) =>
  fetch(`${AUTH}/request-password-reset`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: AUTH },
    body: JSON.stringify({ email }),
  });
// The managed-auth limiter is a shared bucket: a 429 means "cool down", not
// "denied". Steps that require the request to succeed wait out the window.
const RATE_LIMIT_WAIT_MS = 35_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resetRequestPatient = async (email) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await resetRequest(email);
    if (res.status !== 429) return res;
    const hint = Number(res.headers.get("retry-after")) * 1000;
    await sleep(Number.isFinite(hint) && hint > 0 ? hint : RATE_LIMIT_WAIT_MS);
  }
  return resetRequest(email);
};
const resetComplete = (newPassword, token) =>
  fetch(`${AUTH}/reset-password`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: AUTH },
    body: JSON.stringify({ newPassword, token }),
  });
const signIn = (password) =>
  fetch(`${AUTH}/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: AUTH },
    body: JSON.stringify({ email: EMAIL, password }),
  });
const sessionsFor = async () =>
  (
    await client.query(
      `select count(*)::bigint as n from neon_auth.session where "userId"=$1`,
      [UUID],
    )
  ).rows[0].n;
const latestToken = async () => {
  const {
    rows: [v],
  } = await client.query(
    `select identifier, value from neon_auth.verification
     where identifier like 'reset-password:%' and value = $1
     order by "createdAt" desc limit 1`,
    [UUID],
  );
  return v ? v.identifier.slice("reset-password:".length) : null;
};

// ---- the journey (ordering matters — see header) -----------------------------
let token = null;
let consumedToken = null;
await step("reset request → token row bound to the imported uuid", async () => {
  const res = await resetRequestPatient(EMAIL);
  if (!res.ok) throw new Error(`request ${res.status}`);
  token = await latestToken();
  if (!token) throw new Error("no verification row created for the user");
  return `token created (24-char, bound to ${UUID})`;
});

await step(
  "existing-vs-missing email produces an identical response pair",
  async () => {
    // Full response-pair comparison: status, body shape/content, and
    // differentiating headers — not just a 200 on the missing side.
    const [exists, missing] = await Promise.all([
      resetRequestPatient(EMAIL),
      resetRequestPatient("does-not-exist@moneyflow.test"),
    ]);
    const [be, bm] = [await exists.text(), await missing.text()];
    // Vacuous-pass guard: identical 429s prove nothing about the pair.
    if (exists.status !== 200)
      throw new Error(`pair indeterminate under throttling: ${exists.status}`);
    if (exists.status !== missing.status || be !== bm)
      throw new Error(
        `enumeration leak: ${exists.status}/${be} vs ${missing.status}/${bm}`,
      );
    const diffHeaders = ["retry-after", "location", "set-cookie"].filter(
      (h) => exists.headers.get(h) !== missing.headers.get(h),
    );
    if (diffHeaders.length)
      throw new Error(`differentiating headers: ${diffHeaders.join(",")}`);
    return `status+body+headers identical for both accounts`;
  },
);

await step("garbage token rejected", async () => {
  const res = await resetComplete(NEW_PASS, "forged-token-value");
  if (res.ok) throw new Error("forged token accepted");
  return `${res.status}`;
});

await step("valid token resets — NO session is auto-created", async () => {
  // Re-read: the pair step's fresh request may have rotated the token row.
  const live = await latestToken();
  if (!live) throw new Error("no live verification row");
  consumedToken = live;
  const before = Number(await sessionsFor());
  const res = await resetComplete(NEW_PASS, live);
  if (!res.ok) throw new Error(`reset ${res.status}: ${await res.text()}`);
  const after = Number(await sessionsFor());
  if (after !== before)
    throw new Error(`session rows ${before}→${after} — reset must NOT sign in`);
  return `sessions ${before}→${after}`;
});

await step("consumed token cannot be reused", async () => {
  const res = await resetComplete("ReusePass!777", consumedToken ?? token);
  if (res.ok) throw new Error("consumed token accepted a second reset");
  return `${res.status}`;
});

await step("expired token rejected", async () => {
  await resetRequestPatient(EMAIL); // fresh row — never reuse the consumed one
  const fresh = await latestToken();
  if (!fresh || fresh === token) throw new Error("no fresh token issued");
  await client.query(
    `update neon_auth.verification set "expiresAt" = now() - interval '1 hour'
     where identifier = $1`,
    [`reset-password:${fresh}`],
  );
  const res = await resetComplete("ExpiredPass!999", fresh);
  if (res.ok) throw new Error("expired token accepted");
  return `${res.status}`;
});

await step("old password rejected, new binds the SAME uuid", async () => {
  const oldRes = await signIn(OLD_PASS);
  if (oldRes.ok) throw new Error("old password still works after reset");
  const newRes = await signIn(NEW_PASS);
  if (!newRes.ok) throw new Error(`new password rejected: ${newRes.status}`);
  const data = await newRes.json();
  if (data?.user?.id !== UUID)
    throw new Error(`identity drifted: session user=${data?.user?.id}`);
  return `sign-in 200, user.id = ${data.user.id}`;
});

await step("ledger row still owned by the same uuid after reset", async () => {
  const {
    rows: [r],
  } = await client.query(
    `select count(*)::bigint as n from public.accounts
     where user_id=$1 and name='ResetE2E Ledger'`,
    [UUID],
  );
  if (Number(r.n) !== 1) throw new Error("ledger row lost or re-owned");
  return "account ownership intact";
});

await step(
  "reset abuse burst degrades uniformly, not selectively",
  async () => {
    // Strictly ALTERNATING sequential requests — K,U,K,U… — so both addresses
    // observe adjacent limiter states. Parallel bursts race and produce false
    // asymmetry from a shared bucket that drains mid-flight.
    // Enumeration-safe = the limiter's response does not depend on whether the
    // address exists. Both sides must observe the same STATUS SET; matched
    // all-429s are a saturated shared bucket (fine), matched all-200s are an
    // empty one (also fine) — only a differing set leaks existence.
    const probe = "does-not-exist-2@moneyflow.test";
    const known = [];
    const unknown = [];
    for (let i = 0; i < 5; i++) {
      known.push((await resetRequest(EMAIL)).status);
      unknown.push((await resetRequest(probe)).status);
    }
    // Under one shared bucket the two sides observe adjacent positions, so
    // accepted counts differ by at most 1. A per-address limiter lets the
    // fresh unknown address sail through while the known one sits throttled —
    // a difference >1 — and THAT is the enumeration leak this test hunts.
    const ok = (s) => s === 200;
    const acceptedDiff = Math.abs(
      known.filter(ok).length - unknown.filter(ok).length,
    );
    const foreign = [...known, ...unknown].some((s) => ![200, 429].includes(s));
    if (acceptedDiff > 1 || foreign)
      throw new Error(
        `asymmetric rate limiting: ${known} vs ${unknown} (accepted diff ${acceptedDiff})`,
      );
    return `known: [${known.join(",")}] unknown: [${unknown.join(",")}] — shared bucket`;
  },
);

// ---- cleanup ----------------------------------------------------------------
await client.query(`delete from public.accounts where user_id=$1`, [UUID]);
await client.query(`delete from neon_auth.account where "userId"=$1`, [UUID]);
await client.query(`delete from neon_auth."user" where id=$1`, [UUID]);
await client.end();

const failed = results.filter((r) => !r.ok);
console.log(
  `\nreset-e2e: ${results.length - failed.length} PASS, ${failed.length} FAIL`,
);
process.exit(failed.length ? 1 : 0);
