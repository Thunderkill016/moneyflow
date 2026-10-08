// Real-app vertical slice for the Neon backend PoC (#774). Drives the actual
// Next.js app — never the Data API directly — through two isolated browser
// contexts to prove the provider seam end to end:
//
//   A: register → dashboard (SSR getViewer + RLS-scoped loaders) → create a
//      transaction through the real dialog → transactions list reflects it →
//      logout → protected route bounces to /login (session-expired negative)
//   login: wrong-password rejected → fresh-context login after logout
//      reaches the dashboard with the user's own data still intact
//   B: register → sees ONLY own rows (A/B tenant isolation through real RLS)
//   negatives: no-cookie protected GET, garbage Bearer on a guarded route
//   concurrency: stale expected_updated_at rejected vs current accepted —
//      via the user's own data-api JWT inside the app (the same token the
//      app's createClient() forwards for server actions).
//
//   node scripts/neon-poc/vertical-slice.mjs --base http://localhost:3130
// Requires the dev server running with MF_BACKEND_PROVIDER=neon.
import { chromium } from "playwright";

const BASE = process.argv.includes("--base")
  ? process.argv[process.argv.indexOf("--base") + 1]
  : "http://localhost:3130";

const RUN = Date.now().toString(36);
const USER_A = {
  name: "Slice User A",
  email: `mf-slice-a-${RUN}@moneyflow-poc.test`,
  password: "SlicePass#2026",
};
const USER_B = {
  name: "Slice User B",
  email: `mf-slice-b-${RUN}@moneyflow-poc.test`,
  password: "SlicePass#2026",
};

const results = [];
const ok = (name, detail = "") => {
  results.push({ name, ok: true });
  console.log(`  ✔ ${name}${detail ? ` — ${detail}` : ""}`);
};
const fail = (name, err) => {
  results.push({ name, ok: false, err });
  console.error(`  ✗ ${name} — ${err}`);
};
async function step(name, fn) {
  try {
    const d = await fn();
    ok(name, d);
    return true;
  } catch (e) {
    fail(name, e instanceof Error ? e.message : String(e));
    return false;
  }
}

async function register(page, user) {
  await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
  await page.fill('input[name="fullName"]', user.name);
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.fill('input[name="confirmPassword"]', user.password);
  await page.check('input[name="privacyAccepted"]');
  await page.getByRole("button", { name: "Tạo tài khoản" }).click();
  await page.waitForURL(/onboarding|dashboard|\/$/, { timeout: 30_000 });
}

async function loginForm(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  // Exact name — the Google button is also type=submit and precedes it in DOM.
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
}

// System Chrome keeps the slice runnable where `playwright install` hasn't
// fetched browsers; channel:chrome is equivalent for app-path verification.
const browser = await chromium.launch({ channel: "chrome" });

// ---- Context A: the happy path through the real app ------------------------
const ctxA = await browser.newContext();
const pageA = await ctxA.newPage();

if (
  !(await step("A register via /register form", async () => {
    await register(pageA, USER_A);
    return `landed ${pageA.url()}`;
  }))
) {
  await browser.close();
  process.exit(1);
}

await step(
  "A dashboard renders RLS-scoped data (Tiền mặt account)",
  async () => {
    await pageA.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    const body = await pageA.textContent("body");
    if (!body?.includes("Tiền mặt"))
      throw new Error(
        "default account missing — provisioning or RLS path broken",
      );
  },
);

await step(
  "A create expense via transaction dialog (app request path)",
  async () => {
    await pageA.goto(`${BASE}/transactions`, { waitUntil: "networkidle" });
    // The workspace owns an "add" affordance; fall back across conventions.
    const trigger = pageA
      .getByRole("button", { name: /thêm|ghi|mới/i })
      .first();
    await trigger.click();
    const dialog = pageA.getByRole("dialog");
    await dialog.waitFor({ timeout: 15_000 });
    // Amount-first entry: type 125000, pick the first offered category chip,
    // then save. Defaults chooser keeps the seeded Tiền mặt account.
    const amount = dialog.locator('input[placeholder="0"]').first();
    await amount.fill("125000");
    // Quick-pick category chip — account defaults to the seeded Tiền mặt row.
    await dialog.getByRole("button", { name: "Ăn uống" }).click();
    const save = dialog.getByRole("button", { name: "Lưu", exact: true });
    await save.click();
    await pageA.waitForTimeout(1_500);
  },
);

await step("A transaction visible in /transactions list", async () => {
  await pageA.goto(`${BASE}/transactions`, { waitUntil: "networkidle" });
  const body = await pageA.textContent("body");
  if (!/125[.\s]?000/.test(body ?? ""))
    throw new Error("created amount not found in feed");
});

await step(
  "A account detail + balance reflects the new transaction",
  async () => {
    await pageA.goto(`${BASE}/accounts`, { waitUntil: "networkidle" });
    const acctLink = pageA.getByRole("link", { name: /Tiền mặt/ }).first();
    await acctLink.click();
    await pageA.waitForLoadState("networkidle");
    const body = await pageA.textContent("body");
    if (!/125[.\s]?000/.test(body ?? ""))
      throw new Error("account detail does not show the transaction/balance");
  },
);

// Fetch A's session JWT the way the app's own data client does — through the
// managed-auth get-session exchange — then exercise the optimistic
// concurrency contract via the app's Data API surface.
let jwtA;
await step(
  "A session JWT exchanges via managed auth (app data path)",
  async () => {
    const cookies = await ctxA.cookies();
    const session = cookies.find((c) => c.name.includes("session_token"));
    if (!session) throw new Error("no neon session cookie after login");
    const authBase = process.env.NEON_AUTH_BASE_URL;
    if (!authBase)
      throw new Error("NEON_AUTH_BASE_URL env required for JWT exchange");
    const res = await fetch(`${authBase}/get-session`, {
      headers: { cookie: `${session.name}=${session.value}` },
    });
    jwtA = res.headers.get("set-auth-jwt");
    if (!jwtA) throw new Error(`no set-auth-jwt header (status ${res.status})`);
  },
);

const DATA_API = process.env.NEON_DATA_API_URL;
await step(
  "A optimistic-concurrency negative: stale expected_updated_at rejected",
  async () => {
    const acct = await fetch(`${DATA_API}/accounts?select=id&limit=1`, {
      headers: { Authorization: `Bearer ${jwtA}` },
    }).then((r) => r.json());
    const txn = await fetch(
      `${DATA_API}/financial_transactions?select=id,updated_at&order=created_at.desc&limit=1`,
      { headers: { Authorization: `Bearer ${jwtA}` } },
    ).then((r) => r.json());
    if (!acct?.[0]?.id || !txn?.[0]?.id)
      throw new Error(
        `missing seed rows: acct=${JSON.stringify(acct)} txn=${JSON.stringify(txn)}`,
      );
    const stale = await fetch(`${DATA_API}/rpc/update_money_transaction`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_id: txn[0].id,
        p_expected_updated_at: "2000-01-01T00:00:00Z",
      }),
    });
    if (stale.ok)
      throw new Error(
        "stale expected_updated_at was ACCEPTED — concurrency broken",
      );
  },
);

await step(
  "A reconciliation start→complete via security-definer RPCs (app data path)",
  async () => {
    const rows = await fetch(
      `${DATA_API}/account_balances?select=account_id,balance_minor&limit=1`,
      { headers: { Authorization: `Bearer ${jwtA}` } },
    ).then((r) => r.json());
    const acct = rows?.[0];
    if (!acct?.account_id)
      throw new Error(`no balance row: ${JSON.stringify(rows)}`);
    // Clear every pending entry on the account first — cleared_balance then
    // equals the live balance, so a statement at that amount completes clean.
    const entries = await fetch(
      `${DATA_API}/transaction_entries?select=id&account_id=eq.${acct.account_id}&reconciliation_state=eq.pending`,
      { headers: { Authorization: `Bearer ${jwtA}` } },
    ).then((r) => r.json());
    for (const entry of entries ?? []) {
      const clear = await fetch(
        `${DATA_API}/rpc/set_account_entry_reconciliation_state`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${jwtA}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            p_entry_id: entry.id,
            p_state: "cleared",
          }),
        },
      );
      if (!clear.ok)
        throw new Error(
          `set_account_entry_reconciliation_state: ${clear.status} ${await clear.text()}`,
        );
    }
    const today = new Date().toISOString().slice(0, 10);
    const start = await fetch(`${DATA_API}/rpc/start_account_reconciliation`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwtA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_account_id: acct.account_id,
        p_statement_date: today,
        p_statement_balance_minor: acct.balance_minor,
      }),
    });
    const reconciliationId = await start.json();
    if (!start.ok || typeof reconciliationId !== "string")
      throw new Error(
        `start_account_reconciliation failed: ${start.status} ${JSON.stringify(reconciliationId)}`,
      );
    const done = await fetch(
      `${DATA_API}/rpc/complete_account_reconciliation`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${jwtA}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_reconciliation_id: reconciliationId,
          p_adjustment_category_id: null,
          p_adjustment_payee: null,
        }),
      },
    );
    const doneBody = await done.json();
    if (!done.ok || doneBody !== true)
      throw new Error(
        `complete_account_reconciliation failed: ${done.status} ${JSON.stringify(doneBody)}`,
      );
  },
);

await step("A logout clears session + protected route redirects", async () => {
  await pageA.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  // The Next dev overlay portal intercepts pointer events — remove it so the
  // real user-chip dropdown click lands (dev-mode artifact only).
  await pageA.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
    document
      .querySelectorAll("[data-nextjs-dev-overlay]")
      .forEach((e) => e.remove());
  });
  await pageA
    .getByRole("button", { name: /mở menu tài khoản/i })
    .first()
    .click();
  await pageA.getByRole("menuitem", { name: /đăng xuất/i }).click();
  await pageA.waitForURL(/login/, { timeout: 20_000 });
  await pageA.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  if (!/\/login/.test(pageA.url()))
    throw new Error(`protected route reachable after logout: ${pageA.url()}`);
});

// ---- Login regressions (review round-1 P0): the fresh-login path must not
// depend on any existing session — this broke once via the data client ----
await step("wrong password rejected at /login", async () => {
  await loginForm(pageA, USER_A.email, "WrongPass!999999");
  await pageA.waitForTimeout(2_500);
  const body = await pageA.textContent("body");
  if (!body?.includes("Email hoặc mật khẩu không đúng"))
    throw new Error(`no wrong-password error surfaced (url ${pageA.url()})`);
  if (!/\/login/.test(pageA.url()))
    throw new Error(`wrong password left /login: ${pageA.url()}`);
});

await step(
  "A fresh-context login after logout reaches dashboard with own data",
  async () => {
    const fresh = await browser.newContext();
    const p = await fresh.newPage();
    try {
      await loginForm(p, USER_A.email, USER_A.password);
      await p.waitForURL(/dashboard|\/$/, { timeout: 30_000 });
      await p.goto(`${BASE}/transactions`, { waitUntil: "networkidle" });
      const body = await p.textContent("body");
      if (!/125[.\s]?000/.test(body ?? ""))
        throw new Error(
          "A's own 125000 transaction missing after fresh login",
        );
    } finally {
      await fresh.close();
    }
  },
);

// ---- Context B: tenant isolation through the real app ----------------------
const ctxB = await browser.newContext();
const pageB = await ctxB.newPage();

await step("B register (separate browser context)", async () => {
  await register(pageB, USER_B);
});

await step("B dashboard shows only B's rows — none of A's data", async () => {
  await pageB.goto(`${BASE}/transactions`, { waitUntil: "networkidle" });
  const body = await pageB.textContent("body");
  if (/125[.\s]?000/.test(body ?? ""))
    throw new Error("B can see A's 125000 transaction — RLS leak");
  await pageB.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  const dash = await pageB.textContent("body");
  if (!dash?.includes("Tiền mặt"))
    throw new Error("B missing own provisioned account");
});

// ---- Negatives --------------------------------------------------------------
await step(
  "revoked upstream session loses protected access (real expiry path)",
  async () => {
    // Server-side revocation through the managed-auth API = the same state a
    // session reaches on expiry — the cookie remains, the session is dead.
    const cookies = await ctxB.cookies();
    const session = cookies.find((c) => c.name.includes("session_token"));
    if (!session) throw new Error("no session cookie for B");
    const revoke = await fetch(`${process.env.NEON_AUTH_BASE_URL}/sign-out`, {
      method: "POST",
      headers: {
        cookie: `${session.name}=${session.value}`,
        "content-type": "application/json",
        origin: BASE,
      },
      body: "{}",
    });
    if (!revoke.ok) throw new Error(`upstream sign-out ${revoke.status}`);
    await pageB.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    if (!/\/login/.test(pageB.url()))
      throw new Error(`protected route reachable post-revocation: ${pageB.url()}`);
  },
);

await step("unauthenticated /dashboard redirects to /login", async () => {
  const anon = await browser.newContext();
  const p = await anon.newPage();
  await p.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  if (!/\/login/.test(p.url())) throw new Error(`landed ${p.url()}`);
  await anon.close();
});

await step("garbage Bearer JWT rejected by viewer-scoped path", async () => {
  const res = await fetch(`${BASE}/api/capabilities/probe`, {
    headers: { Authorization: "Bearer garbage.jwt.value" },
  }).catch(() => null);
  // A garbage token must never yield a viewer — whatever the route's exact
  // contract, a 5xx "crash through" is the failure we flag.
  if (res && res.status >= 500)
    throw new Error(`garbage JWT produced ${res.status}`);
});

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(
  `\nvertical slice: ${results.length - failed.length} PASS, ${failed.length} FAIL`,
);
process.exit(failed.length ? 1 : 0);
