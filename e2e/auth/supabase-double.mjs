/**
 * Deterministic Supabase double for authenticated browser tests.
 *
 * Why this exists
 * ---------------
 * Every Playwright suite in this repository forces `NEXT_PUBLIC_APP_MODE=demo`
 * in `webServer.env`, so no browser test has ever exercised the authenticated
 * code path. Three shipped defects (MF-01, MF-02, MF-06) live only on that
 * path. A local Supabase stack needs Docker, and CI is configured with a
 * placeholder project (`https://ci-project.supabase.co`), so neither can run an
 * authenticated browser today.
 *
 * What this double DOES prove
 * ---------------------------
 * The real Next.js app booted in `NEXT_PUBLIC_APP_MODE=authenticated`, going
 * through the real `@supabase/ssr` client, real route loaders, real server
 * components and real React rendering. That is exactly where the ownership
 * bugs live: which source a surface reads from.
 *
 * What it DOES NOT prove
 * ----------------------
 * Nothing about PostgreSQL. Not RLS, not tenant isolation, not SQL invariants,
 * not RPC bodies. Those belong to `npm run test:db` (pgTAP) and must not be
 * inferred from a green run here.
 *
 * Honesty by construction
 * -----------------------
 * The double is strict. Any request path it does not explicitly implement
 * answers 501 and is recorded as a miss. Tests assert the miss list is empty,
 * so "the double silently didn't know about that query" fails the test instead
 * of passing it. That is deliberate: this repository's failure mode is
 * false-green, and a permissive mock would add one more.
 */

import { createServer } from "node:http";

const PORT = Number(process.env.SUPABASE_DOUBLE_PORT || 3301);

/** Every request path the double did not implement. Tests assert this is empty. */
const misses = [];
/** Every REST/RPC path the double did serve, for positive assertions. */
const served = [];

/** Seeded tenant state. Replaced wholesale by POST /__control/seed. */
let state = emptyState();

function emptyState() {
  return {
    user: {
      id: "00000000-0000-4000-8000-000000000001",
      email: "auth-harness@moneyflow.test",
      full_name: "Harness User",
    },
    inbox_candidates: [],
    import_batches: [],
    transaction_feed: [],
    transaction_review_feed: [],
    accounts: [],
    categories: [],
    account_balances: [],
    dashboard_bundle: null,
  };
}

/* -------------------------------------------------------------------------
   Auth
   ------------------------------------------------------------------------- */

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

/**
 * Mint an HS256-shaped access token.
 *
 * `getClaims()` only verifies a signature when the header carries a `kid`
 * (asymmetric signing keys). Without one it falls back to `GET /auth/v1/user`,
 * which this double serves — the same path a project on symmetric keys takes.
 */
function accessToken(user) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: "authenticated",
      aud: "authenticated",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      user_metadata: { full_name: user.full_name },
    }),
  );
  return `${header}.${payload}.${base64url("harness-double-not-verified")}`;
}

function userPayload(user) {
  return {
    id: user.id,
    aud: "authenticated",
    role: "authenticated",
    email: user.email,
    email_confirmed_at: "2026-01-01T00:00:00.000Z",
    phone: "",
    confirmed_at: "2026-01-01T00:00:00.000Z",
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: user.full_name },
    identities: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: new Date().toISOString(),
    is_anonymous: false,
  };
}

function sessionPayload(user) {
  return {
    access_token: accessToken(user),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: "harness-refresh-token",
    user: userPayload(user),
  };
}

/* -------------------------------------------------------------------------
   PostgREST
   ------------------------------------------------------------------------- */

/** Tables/views the app reads. Anything else is a miss, not an empty array. */
const TABLES = new Set([
  "profiles",
  "inbox_candidates",
  "import_batches",
  "transaction_feed",
  "transaction_review_feed",
  "accounts",
  "categories",
  "account_balances",
]);

/**
 * Apply the subset of PostgREST filters the app actually sends.
 * An unrecognised operator is a miss — never a silently ignored filter.
 */
function applyFilters(rows, url, miss) {
  let out = rows;
  for (const [key, raw] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    const [op, ...rest] = raw.split(".");
    const value = rest.join(".");
    if (op === "eq") {
      out = out.filter((row) => String(row[key] ?? "") === value);
    } else if (op === "gte") {
      out = out.filter((row) => String(row[key] ?? "") >= value);
    } else if (op === "lte") {
      out = out.filter((row) => String(row[key] ?? "") <= value);
    } else if (op === "is" && value === "null") {
      out = out.filter((row) => row[key] == null);
    } else {
      miss(`unsupported PostgREST filter ${key}=${raw}`);
    }
  }
  return out;
}

function tableRows(table) {
  if (table === "profiles") {
    return [{ id: state.user.id, full_name: state.user.full_name }];
  }
  return state[table] ?? [];
}

/* -------------------------------------------------------------------------
   Server
   ------------------------------------------------------------------------- */

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-expose-headers": "content-range",
    ...headers,
  });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const miss = (reason) => misses.push({ method: req.method, path, reason });

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,HEAD,OPTIONS",
    });
    res.end();
    return;
  }

  /* ---- control plane (harness only, never part of Supabase) ---- */
  if (path === "/__control/seed") {
    const body = await readBody(req);
    state = { ...emptyState(), ...(body ?? {}) };
    misses.length = 0;
    served.length = 0;
    json(res, 200, { ok: true });
    return;
  }
  if (path === "/__control/report") {
    json(res, 200, { misses, served });
    return;
  }
  if (path === "/__control/health") {
    json(res, 200, { ok: true });
    return;
  }

  /* ---- auth ---- */
  if (path === "/auth/v1/token") {
    await readBody(req);
    json(res, 200, sessionPayload(state.user));
    return;
  }
  if (path === "/auth/v1/user") {
    served.push(path);
    json(res, 200, userPayload(state.user));
    return;
  }
  if (path === "/auth/v1/logout") {
    res.writeHead(204).end();
    return;
  }

  /* ---- PostgREST tables and views ---- */
  if (path.startsWith("/rest/v1/rpc/")) {
    const fn = path.slice("/rest/v1/rpc/".length);
    await readBody(req);
    if (fn === "get_dashboard_bundle") {
      served.push(path);
      json(res, 200, state.dashboard_bundle ?? null);
      return;
    }
    miss(`unimplemented RPC ${fn}`);
    json(res, 501, { message: `harness double has no RPC ${fn}` });
    return;
  }

  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length);
    if (!TABLES.has(table)) {
      miss(`unimplemented table ${table}`);
      json(res, 501, { message: `harness double has no table ${table}` });
      return;
    }
    served.push(path);
    const rows = applyFilters(tableRows(table), url, miss);
    const wantsCount = (req.headers.prefer ?? "").includes("count=exact");
    const headOnly = req.method === "HEAD";
    const headers = wantsCount
      ? { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` }
      : {};
    if (headOnly) {
      res.writeHead(200, {
        "content-type": "application/json",
        "access-control-expose-headers": "content-range",
        ...headers,
      });
      res.end();
      return;
    }
    json(res, 200, rows, headers);
    return;
  }

  miss("unrouted request");
  json(res, 501, { message: `harness double does not implement ${path}` });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[supabase-double] listening on http://127.0.0.1:${PORT}`);
});
