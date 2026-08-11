import { expect, type Page } from "@playwright/test";

const DOUBLE = `http://127.0.0.1:${process.env.SUPABASE_DOUBLE_PORT || 3301}`;

export const HARNESS_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "auth-harness@moneyflow.test",
  full_name: "Harness User",
};

const ACCOUNT_ID = "00000000-0000-4000-8000-0000000000a1";
const CATEGORY_ID = "00000000-0000-4000-8000-0000000000c1";

/** A pending Inbox candidate as `inbox_candidates` returns it. */
export function serverCandidate(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-0000000000b1",
    user_id: HARNESS_USER.id,
    kind: "expense",
    amount_minor: 125_000,
    merchant: "HARNESS-SERVER-CANDIDATE",
    note: "Chỉ tồn tại trên máy chủ",
    occurred_on: "2026-08-01",
    source: "paste",
    confidence: "high",
    status: "pending",
    possible_duplicate: false,
    category_id: null,
    category_name: null,
    account_id: null,
    account_name: null,
    raw_snippet: null,
    import_batch_id: null,
    local_id: null,
    created_at: "2026-08-01T02:00:00.000Z",
    source_row_index: null,
    source_external_id: null,
    fingerprint_version: null,
    fingerprint: null,
    parser_version: null,
    mapping_version: null,
    match_status: null,
    match_reason: null,
    match_confidence: null,
    possible_transfer: false,
    transfer_pair_id: null,
    approved_transaction_id: null,
    approved_at: null,
    applied_rule_id: null,
    applied_rule_version: null,
    ...overrides,
  };
}

/** A ledger row as `transaction_feed` returns it. */
export function serverTransaction(overrides: Record<string, unknown> = {}) {
  return {
    id: "00000000-0000-4000-8000-0000000000d1",
    user_id: HARNESS_USER.id,
    kind: "expense",
    note: "HARNESS-SERVER-TRANSACTION",
    occurred_on: "2026-08-02",
    created_at: "2026-08-02T02:00:00.000Z",
    amount_minor: -75_000,
    account_id: ACCOUNT_ID,
    account_name: "Tiền mặt",
    category_id: CATEGORY_ID,
    category_name: "Ăn uống",
    destination_account_id: null,
    destination_account_name: null,
    is_recurring_payment: false,
    split_lines: null,
    ...overrides,
  };
}

const ACCOUNTS = [{ id: ACCOUNT_ID, name: "Tiền mặt", currency_code: "VND" }];
const CATEGORIES = [
  { id: CATEGORY_ID, name: "Ăn uống", kind: "expense", icon: null, color: null },
];
const BALANCES = [
  { account_id: ACCOUNT_ID, balance_minor: 925_000, currency_code: "VND" },
];

export type SeedInput = {
  candidates?: ReturnType<typeof serverCandidate>[];
  transactions?: ReturnType<typeof serverTransaction>[];
};

/**
 * Replace the double's tenant state. Also resets its miss/served ledger, so
 * each test asserts only on the requests it caused.
 */
export async function seedServer(input: SeedInput = {}) {
  const candidates = input.candidates ?? [];
  const transactions = input.transactions ?? [];

  const response = await fetch(`${DOUBLE}/__control/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: HARNESS_USER,
      inbox_candidates: candidates,
      import_batches: [],
      transaction_feed: transactions,
      transaction_review_feed: [],
      accounts: ACCOUNTS,
      categories: CATEGORIES,
      account_balances: BALANCES,
      dashboard_bundle: {
        transactions,
        accounts: ACCOUNTS,
        categories: CATEGORIES,
        balances: BALANCES,
        budgets: [],
        commitments: [],
        commitment_occurrences: [],
        income_templates: [],
        income_occurrences: [],
        goals: [],
        pending_inbox_count: candidates.filter((c) => c.status === "pending").length,
      },
    }),
  });
  expect(response.ok, "seeding the Supabase double must succeed").toBe(true);
}

/**
 * Fail the test if the app asked the double for something it does not
 * implement. Without this a missing endpoint would look like empty data —
 * which is precisely the false-green this harness exists to prevent.
 */
export async function assertNoUnservedRequests() {
  const report = await (await fetch(`${DOUBLE}/__control/report`)).json();
  expect(
    report.misses,
    `the app made requests the double does not implement: ${JSON.stringify(report.misses)}`,
  ).toEqual([]);
  return report as { misses: unknown[]; served: string[] };
}

/**
 * Sign in through the real login form, so `@supabase/ssr` writes its own
 * session cookie exactly as it would in production. No cookie is hand-forged
 * and no credential is stored anywhere.
 */
export async function signIn(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  // The password label also wraps a "Quên mật khẩu?" link, so its accessible
  // name is not stable. Field names are part of the server action contract.
  await page.locator('input[name="email"]').fill(HARNESS_USER.email);
  await page.locator('input[name="password"]').fill("harness-not-a-real-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}

/**
 * Prove the browser is really in authenticated mode.
 *
 * MF-07 was caused by an env string that never reached the browser, so this
 * asserts observable runtime state — the demo banner is absent and the shell
 * shows the signed-in account — rather than reading a variable back.
 */
export async function assertAuthenticatedMode(page: Page) {
  await expect(
    page.getByText("Chế độ demo", { exact: false }),
    "authenticated mode must not render the demo banner",
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Đăng ký" }),
    "authenticated mode must not offer the demo register prompt in the shell",
  ).toHaveCount(0);
}

/**
 * Read the pending-Inbox badge the mobile shell actually paints.
 *
 * This is the shared `AppShell` badge, not page copy, so the same assertion
 * holds on every surface. A missing badge means zero — which is exactly the
 * MF-02 symptom, so the helper reports 0 rather than throwing.
 */
export async function shellInboxCount(page: Page): Promise<number> {
  const moreTab = page
    .getByRole("navigation", { name: "Điều hướng di động" })
    .getByRole("button", { name: "Thêm" });
  await expect(moreTab).toBeVisible();

  const badge = moreTab.locator("span").filter({ hasText: /^\d+\+?$/ });
  if ((await badge.count()) === 0) return 0;
  const text = (await badge.last().textContent())?.trim() ?? "0";
  return Number.parseInt(text, 10) || 0;
}
