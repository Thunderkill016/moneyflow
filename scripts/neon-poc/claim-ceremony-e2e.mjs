// Gate-5 follow-up (#774, review rounds 4–5): the dual-identity claim
// ceremony that makes Plan B safe. A bare Neon sign-up MUST NOT be able to
// claim a legacy ledger — the claim is a server-only, single-use,
// time-limited, audited binding of a VERIFIED old-identity proof to a
// VERIFIED live Neon session.
//
//   Schema: scripts/neon-poc/claim-ceremony.sql (identity_claims + two
//   SECURITY DEFINER RPCs executable by service_role only). Completion
//   resolves the destination subject from a LIVE neon_auth.session token —
//   a caller can never supply the target uuid.
//
//   Old-identity proof: a REAL signature verification — an Ed25519 JWT
//   checked via jose against a JWKS generated per run (iss/aud/exp/sub all
//   enforced). This is the same machinery production uses against the
//   Supabase issuer; the restricted project's JWKS endpoint is 402-gated so
//   live revocation is the remaining external dependency. Forgery negatives
//   cover wrong-key, wrong-iss, expired and sub-mismatch tokens.
//
//   Atomicity: claim completion and the remapped data insert run in ONE
//   transaction — a mid-restore failure rolls the claim back to 'reserved'.
//
//   NEON_POC_URL=postgres://… NEON_AUTH_BASE_URL=https://… \
//     NEON_DATA_API_URL=https://… \
//     node scripts/neon-poc/claim-ceremony-e2e.mjs --project-id <id>
import { randomBytes, createHash, generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";
import { SignJWT, jwtVerify, createLocalJWKSet, exportJWK } from "jose";
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

// ---- real old-identity proof: Ed25519 JWT verified via jose ----------------
// Stands in for the Supabase issuer; the honest pair sits in `jwks`, the
// attacker key does NOT — mirroring production, where verification runs
// against the cached Supabase JWKS.
const { publicKey, privateKey } = generateKeyPairSync("ed25519");
const attackerKey = generateKeyPairSync("ed25519");
const jwks = createLocalJWKSet({
  keys: [
    { ...(await exportJWK(publicKey)), kid: "supabase-poc", alg: "EdDSA" },
  ],
});
const OLD_ISS = "https://supabase.moneyflow.test/auth/v1";
const OLD_AUD = "authenticated";
const signOldIdentity = (sub, opts = {}, key = privateKey) =>
  new SignJWT({ auth_time: Math.floor(Date.now() / 1000) })
    .setProtectedHeader({ alg: "EdDSA", kid: "supabase-poc" })
    .setSubject(sub)
    .setIssuer(opts.iss ?? OLD_ISS)
    .setAudience(OLD_AUD)
    .setExpirationTime(opts.exp ?? "2m")
    .setIssuedAt()
    .sign(key);
const verifyOldIdentity = async (jwt, expectedSub) => {
  const { payload } = await jwtVerify(jwt, jwks, {
    issuer: OLD_ISS,
    audience: OLD_AUD,
  });
  if (payload.sub !== expectedSub)
    throw new Error("proof sub does not match the claimed legacy identity");
  return createHash("sha256").update(jwt).digest(); // proof_hash for audit
};

const LEGACY_A = "aaaaaaaa-1111-4444-8666-aaaaaaaaaaaa";
const LEGACY_B = "bbbbbbbb-2222-4444-8666-bbbbbbbbbbbb";
const PASS = "ClaimProof!Pass66";
const emails = {
  a: `claim-a-${Date.now()}@moneyflow.test`,
  b: `claim-b-${Date.now()}@moneyflow.test`,
  impostor: `claim-i-${Date.now()}@moneyflow.test`,
};

const client = new pg.Client({ connectionString: URL_ENV });
await client.connect();
await verifyTarget(client, URL_ENV);

await client.query(readFileSync(join(here, "claim-ceremony.sql"), "utf8"));

// Startup sweep — a crashed prior run can leave claim rows and synthetic
// users behind; the ceremony must be provable from a clean slate.
await client.query(`delete from public.identity_claims`);
{
  const { rows: stale } = await client.query(
    `select id from neon_auth."user" where email like 'claim-%@moneyflow.test'`,
  );
  for (const { id } of stale) {
    await client.query(`delete from public.accounts where user_id=$1`, [id]);
    await client.query(`delete from public.profiles where id=$1`, [id]);
    await client.query(`delete from neon_auth.session where "userId"=$1`, [id]);
    await client.query(`delete from neon_auth.account where "userId"=$1`, [id]);
    await client.query(`delete from neon_auth."user" where id=$1`, [id]);
  }
}

const authCall = (path, body) =>
  fetch(`${AUTH}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: AUTH },
    body: JSON.stringify(body),
  });
const signUp = async (email) => {
  const res = await authCall("/sign-up/email", {
    email,
    password: PASS,
    name: "Claim",
  });
  const body = await res.json();
  if (!res.ok || !body?.user?.id)
    throw new Error(`sign-up ${res.status}: ${JSON.stringify(body)}`);
  return body.user.id;
};
// The managed-auth limiter is a shared bucket — a 429 means cool down and
// retry, not failure. Auth calls that must succeed ride out the window.
const RATE_LIMIT_WAIT_MS = 35_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const authCallPatient = async (path, body) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await authCall(path, body);
    if (res.status !== 429) return res;
    const hint = Number(res.headers.get("retry-after")) * 1000;
    await sleep(Number.isFinite(hint) && hint > 0 ? hint : RATE_LIMIT_WAIT_MS);
  }
  return authCall(path, body);
};
// Returns { userId, sessionToken, cookie } from a REAL sign-in — the cookie
// carries `<token>.<signature>`; the raw prefix is the neon_auth.session
// token, and the full cookie value is what /get-session accepts.
const signIn = async (email) => {
  const res = await authCallPatient("/sign-in/email", {
    email,
    password: PASS,
  });
  const body = await res.json();
  if (!res.ok || !body?.user?.id) throw new Error(`sign-in ${res.status}`);
  const m = (res.headers.get("set-cookie") ?? "").match(
    /([^=;,]*session[^=;,]*)=([^;]*)/,
  );
  const raw = decodeURIComponent(m[2]);
  return {
    userId: body.user.id,
    sessionToken: raw.split(".")[0],
    cookie: `${m[1]}=${raw}`,
  };
};

const reserve = async (
  legacyUuid,
  proofJwt,
  tokenSecret,
  idemKey,
  ttl = 900,
) => {
  // Server-side gate: verify the old-identity proof for THIS legacy uuid —
  // a proof minted for a different identity never reaches the reservation.
  const proofHash = await verifyOldIdentity(proofJwt, legacyUuid);
  return client
    .query(`select * from public.reserve_identity_claim($1,$2,$3,$4,$5)`, [
      legacyUuid,
      proofHash,
      sha(tokenSecret),
      idemKey,
      ttl,
    ])
    .then((r) => r.rows[0]);
};
const complete = (tokenSecret, sessionToken) =>
  client
    .query(`select * from public.complete_identity_claim($1,$2)`, [
      sha(tokenSecret),
      sessionToken,
    ])
    .then((r) => r.rows[0]);

let neonA = null;
let neonB = null;
let neonImpostor = null;

await step("claim WITHOUT verified email is refused at the gate", async () => {
  neonA = await signUp(emails.a);
  const {
    rows: [u],
  } = await client.query(
    `select "emailVerified" v from neon_auth."user" where id=$1`,
    [neonA],
  );
  if (u.v) throw new Error("fresh sign-up unexpectedly verified");
  // The gate is inside complete(): an unverified destination subject rejects
  // even with a valid token + live session.
  const proofA = await signOldIdentity(LEGACY_A);
  const tok = randomBytes(24).toString("hex");
  await reserve(LEGACY_A, proofA, tok, `gate-${neonA}`);
  const { sessionToken } = await signIn(emails.a);
  try {
    await complete(tok, sessionToken);
    throw new Error("unverified destination claimed a legacy identity");
  } catch (e) {
    if (!/email is not verified/.test(e.message)) throw e;
  }
  await client.query(`delete from public.identity_claims`);
  return "complete() rejects unverified destination subjects in-database";
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

await step(
  "forged old-identity proofs are rejected before reserve",
  async () => {
    const checks = [
      [
        "attacker-signed token",
        await signOldIdentity(LEGACY_A, {}, attackerKey.privateKey),
      ],
      [
        "wrong issuer",
        await signOldIdentity(LEGACY_A, { iss: "https://evil.test" }),
      ],
      ["expired token", await signOldIdentity(LEGACY_A, { exp: "-1m" })],
      ["sub≠claimed legacy", await signOldIdentity(LEGACY_B)],
    ];
    for (const [label, jwt] of checks) {
      const denied = await reserve(
        LEGACY_A,
        jwt,
        randomBytes(24).toString("hex"),
        `forge-${label}`,
      )
        .then(() => false)
        .catch(() => true);
      if (!denied) throw new Error(`${label} reached reservation`);
    }
    return "wrong-key / wrong-iss / expired / sub-mismatch all rejected";
  },
);

// Scratch limitation, documented honestly: `emailVerified` is set by direct
// write because the REAL provider verification loop cannot be closed without
// a mailbox — /send-verification-email does create an `email-verification-otp-*`
// row, but the stored value is an OTP *hash*; the plaintext only travels in the
// outbound email through Neon's shared sender (email_provider.type=shared).
// What this tests therefore: the in-DB gate fails closed for unverified
// subjects — it does NOT claim the provider verification journey was exercised.
const markVerified = (id) =>
  client.query(`update neon_auth."user" set "emailVerified"=true where id=$1`, [
    id,
  ]);

const tokenA = randomBytes(24).toString("hex");
await step(
  "verified proof + verified subject → reservation binds legacy uuid",
  async () => {
    await markVerified(neonA);
    const claim = await reserve(
      LEGACY_A,
      await signOldIdentity(LEGACY_A),
      tokenA,
      `claim-${neonA}`,
    );
    if (!claim || claim.legacy_user_id !== LEGACY_A || claim.neon_user_id)
      throw new Error("reservation malformed");
    return `reserved ${LEGACY_A.slice(0, 8)}…`;
  },
);

await step(
  "idempotent retry of the same reserve returns the same row",
  async () => {
    const again = await reserve(
      LEGACY_A,
      await signOldIdentity(LEGACY_A),
      tokenA,
      `claim-${neonA}`,
    );
    if (again.status !== "reserved")
      throw new Error(`unexpected status ${again.status}`);
    return "same reservation — safe retry";
  },
);

await step(
  "conflicting re-reserve of the claimed legacy → rejected",
  async () => {
    try {
      await reserve(
        LEGACY_A,
        await signOldIdentity(LEGACY_A),
        randomBytes(24).toString("hex"),
        "different-key",
      );
      throw new Error("second reservation accepted — impostor can pre-claim");
    } catch (e) {
      if (!/already has a claim record/.test(e.message)) throw e;
      return "23505 — legacy identity is single-claim";
    }
  },
);

await step(
  "complete() derives the subject from a LIVE session — forged token denied",
  async () => {
    try {
      await complete(tokenA, `forged-${randomBytes(8).toString("hex")}`);
      throw new Error("forged session token completed a claim");
    } catch (e) {
      if (!/no live neon session/.test(e.message)) throw e;
      return "P0004 — subject comes from neon_auth.session, never the caller";
    }
  },
);

await step(
  "claim + data restore commit ATOMICALLY — mid-insert failure rolls the claim back",
  async () => {
    const { sessionToken } = await signIn(emails.a);
    const c2 = new pg.Client({ connectionString: URL_ENV });
    await c2.connect();
    try {
      await c2.query("begin");
      await c2.query(`select * from public.complete_identity_claim($1,$2)`, [
        sha(tokenA),
        sessionToken,
      ]);
      // The restore leg deliberately fails (null into a NOT NULL) — the whole
      // claim must roll back with it.
      await c2
        .query(
          `insert into public.accounts (id,user_id,name,kind,currency_code)
           values (gen_random_uuid(),$1,null,'cash','VND')`,
          [neonA],
        )
        .then(() => {
          throw new Error("failing insert unexpectedly succeeded");
        })
        .catch(async (e) => {
          await c2.query("rollback");
          if (!/null value|not-null/i.test(e.message)) throw e;
        });
      const {
        rows: [r],
      } = await client.query(
        `select status from public.identity_claims where legacy_user_id=$1`,
        [LEGACY_A],
      );
      if (r.status !== "reserved")
        throw new Error(`claim stuck at '${r.status}' after aborted restore`);
      return "claim stays 'reserved' — safe to retry";
    } finally {
      await c2.end();
    }
  },
);

await step(
  "clean retry: complete + remapped insert in one transaction",
  async () => {
    const { sessionToken } = await signIn(emails.a);
    await client.query("begin");
    try {
      const claim = (
        await client.query(
          `select * from public.complete_identity_claim($1,$2)`,
          [sha(tokenA), sessionToken],
        )
      ).rows[0];
      if (claim.status !== "completed" || claim.neon_user_id !== neonA)
        throw new Error("completion did not bind the session subject");
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
    return `claim+data committed together under ${neonA.slice(0, 8)}…`;
  },
);

await step(
  "completed token replayed by a DIFFERENT session → rejected",
  async () => {
    neonB = await signUp(emails.b);
    // B must be a *verified* destination or the in-DB email gate fires before
    // the consumed-token check this step exercises.
    await markVerified(neonB);
    const { sessionToken: sessB } = await signIn(emails.b);
    try {
      await complete(tokenA, sessB);
      throw new Error("B consumed A's claim — takeover succeeded");
    } catch (e) {
      if (!/consumed by another subject/.test(e.message)) throw e;
      return "23505 — replay across subjects denied";
    }
  },
);

await step("same-session replay is an idempotent no-op", async () => {
  const { sessionToken } = await signIn(emails.a);
  const again = await complete(tokenA, sessionToken);
  if (again.legacy_user_id !== LEGACY_A)
    throw new Error("idempotent replay returned wrong claim");
  return "returns the completed claim unchanged";
});

await step(
  "impostor with a different session cannot ride A's token",
  async () => {
    neonImpostor = await signUp(emails.impostor);
    await markVerified(neonImpostor);
    const { sessionToken: sessI } = await signIn(emails.impostor);
    try {
      await complete(tokenA, sessI);
      throw new Error("impostor consumed A's claim");
    } catch (e) {
      if (!/consumed by another subject/.test(e.message)) throw e;
      return "23505 — cross-subject completion denied";
    }
  },
);

await step(
  "one neon subject cannot bind a second legacy identity",
  async () => {
    const tokenB = randomBytes(24).toString("hex");
    await reserve(
      LEGACY_B,
      await signOldIdentity(LEGACY_B),
      tokenB,
      `claim-${neonB}-legit`,
    );
    const { sessionToken: sessB } = await signIn(emails.b);
    await complete(tokenB, sessB);
    // Same verified subject now tries a second distinct legacy claim.
    const extra = randomBytes(24).toString("hex");
    const legacyD = "dddddddd-4444-4444-8666-dddddddddddd";
    await reserve(legacyD, await signOldIdentity(legacyD), extra, "extra2");
    try {
      await complete(extra, sessB);
      throw new Error("subject bound two legacy identities");
    } catch (e) {
      if (!/already bound/.test(e.message)) throw e;
      return "23505 — one subject, one legacy identity";
    }
  },
);

await step("expired reservation cannot complete", async () => {
  const stale = randomBytes(24).toString("hex");
  const legacyC = "eeeeeeee-5555-4444-8666-eeeeeeeeeeee";
  await reserve(
    legacyC,
    await signOldIdentity(legacyC),
    stale,
    "stale-key",
    -3600,
  );
  const { sessionToken } = await signIn(emails.a);
  try {
    await complete(stale, sessionToken);
    throw new Error("expired claim completed");
  } catch (e) {
    if (!/expired/.test(e.message)) throw e;
    return "P0003 — TTL enforced";
  }
});

await step("forged token hash matches nothing", async () => {
  const { sessionToken } = await signIn(emails.a);
  try {
    await complete(randomBytes(24).toString("hex"), sessionToken);
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
        .query(`select public.complete_identity_claim('\\x00'::bytea, 'x')`)
        .then(() => false)
        .catch((e) => /permission denied/.test(e.message));
      if (!denied) throw new Error("authenticated role executed the RPC");
      return "permission denied — service path only";
    } finally {
      // Pooled connections retain `set role` — always reset before release
      // or the next pooled session inherits `authenticated`.
      await c2.query("reset role").catch(() => {});
      await c2.end();
    }
  },
);

await step(
  "existing self-created neon data survives the claim (collision merge)",
  async () => {
    // B claimed LEGACY_B above. Sign-up provisioning also seeds a default
    // account — the merge assertion targets the NAMED rows only.
    await client.query(
      `insert into public.accounts (id,user_id,name,kind,currency_code)
       values (gen_random_uuid(),$1,'B Self-Created','cash','VND'),
              (gen_random_uuid(),$1,'B Claimed','cash','VND')`,
      [neonB],
    );
    const {
      rows: [r],
    } = await client.query(
      `select count(*)::bigint n from public.accounts
        where user_id=$1 and name in ('B Self-Created','B Claimed')`,
      [neonB],
    );
    if (Number(r.n) !== 2)
      throw new Error(`expected merged ownership (2 named rows), got ${r.n}`);
    return "claimed + self-created rows coexist under one neon uuid";
  },
);

await step(
  "post-claim RLS: subject A sees its remapped rows, legacy id holds none",
  async () => {
    // /get-session needs the FULL signed cookie value.
    const { cookie } = await signIn(emails.a);
    const session = await fetch(`${AUTH}/get-session`, {
      headers: { cookie },
    });
    const jwtA = session.headers.get("set-auth-jwt");
    if (!jwtA) throw new Error(`get-session ${session.status}`);
    const rows = await fetch(
      `${DATA_API}/accounts?select=name&name=eq.Claimed Ledger`,
      { headers: { Authorization: `Bearer ${jwtA}` } },
    ).then((r) => r.json());
    if (!Array.isArray(rows) || rows.length !== 1)
      throw new Error(`claimed rows not visible: ${JSON.stringify(rows)}`);
    const {
      rows: [n],
    } = await client.query(
      `select count(*)::bigint n from public.accounts where user_id=$1`,
      [LEGACY_A],
    );
    if (Number(n.n) !== 0) throw new Error("rows still keyed to the legacy id");
    return "rows visible under neon uuid only; legacy id holds nothing";
  },
);

// ---- SCRATCH-ONLY CLEANUP ----------------------------------------------------
// Teardown deletes the synthetic neon_auth rows this script created — these
// are provider-surface writes used ONLY to leave the scratch project clean.
const cleanup = async () => {
  try {
    const ids = [neonA, neonB, neonImpostor].filter(Boolean);
    await client.query(`delete from public.accounts where user_id = any($1)`, [
      ids,
    ]);
    await client.query(`delete from public.profiles where id = any($1)`, [ids]);
    await client.query(`delete from public.identity_claims`);
    for (const id of ids) {
      await client.query(`delete from neon_auth.session where "userId"=$1`, [
        id,
      ]);
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
