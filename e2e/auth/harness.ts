import { expect, type Page } from "@playwright/test";

const DOUBLE = `http://127.0.0.1:${process.env.SUPABASE_DOUBLE_PORT || 3301}`;

export const HARNESS_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "auth-harness@moneyflow.test",
  full_name: "Harness User",
};

const ACCOUNT_ID = "00000000-0000-4000-8000-0000000000a1";
const BANK_ACCOUNT_ID = "00000000-0000-4000-8000-0000000000a2";
const CATEGORY_ID = "00000000-0000-4000-8000-0000000000c1";
const INCOME_CATEGORY_ID = "00000000-0000-4000-8000-0000000000c2";
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

type HarnessAccountRow = {
  id: string;
  name: string;
  kind: "cash" | "bank" | "e_wallet" | "credit_card" | "savings";
  currency_code: string;
  initial_balance_minor: number;
  is_archived: boolean;
};

type HarnessCategoryRow = {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string | null;
  color: string | null;
};

type HarnessBalanceRow = {
  account_id: string;
  balance_minor: number;
  currency_code: string;
};

function currentMonthDate(day: number) {
  return `${CURRENT_MONTH}-${String(day).padStart(2, "0")}`;
}

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

const ACCOUNTS: HarnessAccountRow[] = [
  {
    id: ACCOUNT_ID,
    name: "Tiền mặt",
    kind: "cash",
    currency_code: "VND",
    initial_balance_minor: 925_000,
    is_archived: false,
  },
];
const CATEGORIES: HarnessCategoryRow[] = [
  { id: CATEGORY_ID, name: "Ăn uống", kind: "expense", icon: null, color: null },
];
const BALANCES: HarnessBalanceRow[] = [
  { account_id: ACCOUNT_ID, balance_minor: 925_000, currency_code: "VND" },
];

/**
 * Independent expected outcomes for the mixed-ledger browser scenario.
 *
 * Keep these literal: this contract grades rendered authenticated outcomes and
 * must not call the production finance summarizer to generate its own answers.
 */
export const FINANCIAL_TRUTH_EXPECTED = {
  balance: 2_700_000,
  income: 2_000_000,
  expense: 300_000,
  net: 1_700_000,
  transfer: 500_000,
  cashBalance: 1_200_000,
  bankBalance: 1_500_000,
} as const;

const FINANCIAL_TRUTH_ACCOUNTS: HarnessAccountRow[] = [
  {
    id: ACCOUNT_ID,
    name: "Tiền mặt",
    kind: "cash",
    currency_code: "VND",
    initial_balance_minor: 1_000_000,
    is_archived: false,
  },
  {
    id: BANK_ACCOUNT_ID,
    name: "Ngân hàng",
    kind: "bank",
    currency_code: "VND",
    initial_balance_minor: 0,
    is_archived: false,
  },
];

const FINANCIAL_TRUTH_CATEGORIES: HarnessCategoryRow[] = [
  { id: CATEGORY_ID, name: "Ăn uống", kind: "expense", icon: null, color: null },
  {
    id: INCOME_CATEGORY_ID,
    name: "Lương",
    kind: "income",
    icon: null,
    color: null,
  },
];

const FINANCIAL_TRUTH_BALANCES: HarnessBalanceRow[] = [
  {
    account_id: ACCOUNT_ID,
    balance_minor: FINANCIAL_TRUTH_EXPECTED.cashBalance,
    currency_code: "VND",
  },
  {
    account_id: BANK_ACCOUNT_ID,
    balance_minor: FINANCIAL_TRUTH_EXPECTED.bankBalance,
    currency_code: "VND",
  },
];

const FINANCIAL_TRUTH_TRANSACTIONS = [
  serverTransaction({
    id: "00000000-0000-4000-8000-0000000000d2",
    kind: "income",
    note: "HARNESS-INCOME",
    occurred_on: currentMonthDate(5),
    created_at: `${currentMonthDate(5)}T02:00:00.000Z`,
    amount_minor: FINANCIAL_TRUTH_EXPECTED.income,
    account_id: BANK_ACCOUNT_ID,
    account_name: "Ngân hàng",
    category_id: INCOME_CATEGORY_ID,
    category_name: "Lương",
  }),
  serverTransaction({
    id: "00000000-0000-4000-8000-0000000000d3",
    kind: "expense",
    note: "HARNESS-EXPENSE",
    occurred_on: currentMonthDate(6),
    created_at: `${currentMonthDate(6)}T02:00:00.000Z`,
    amount_minor: -FINANCIAL_TRUTH_EXPECTED.expense,
    account_id: ACCOUNT_ID,
    account_name: "Tiền mặt",
    category_id: CATEGORY_ID,
    category_name: "Ăn uống",
  }),
  serverTransaction({
    id: "00000000-0000-4000-8000-0000000000d4",
    kind: "transfer",
    note: "HARNESS-TRANSFER",
    occurred_on: currentMonthDate(7),
    created_at: `${currentMonthDate(7)}T02:00:00.000Z`,
    amount_minor: -FINANCIAL_TRUTH_EXPECTED.transfer,
    account_id: BANK_ACCOUNT_ID,
    account_name: "Ngân hàng",
    category_id: null,
    category_name: null,
    destination_account_id: ACCOUNT_ID,
    destination_account_name: "Tiền mặt",
  }),
];

export type SeedInput = {
  candidates?: ReturnType<typeof serverCandidate>[];
  transactions?: ReturnType<typeof serverTransaction>[];
  accounts?: HarnessAccountRow[];
  categories?: HarnessCategoryRow[];
  balances?: HarnessBalanceRow[];
};

/**
 * Replace the double's tenant state. Also resets its miss/served ledger, so
 * each test asserts only on the requests it caused.
 */
export async function seedServer(input: SeedInput = {}) {
  const candidates = input.candidates ?? [];
  const transactions = input.transactions ?? [];
  const accounts = input.accounts ?? ACCOUNTS;
  const categories = input.categories ?? CATEGORIES;
  const balances = input.balances ?? BALANCES;

  const response = await fetch(`${DOUBLE}/__control/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: HARNESS_USER,
      inbox_candidates: candidates,
      import_batches: [],
      transaction_feed: transactions,
      transaction_review_feed: [],
      accounts,
      categories,
      account_balances: balances,
      dashboard_bundle: {
        transactions,
        accounts,
        categories,
        balances,
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

/** Seed the canonical mixed ledger used by RRB-01 release-proof assertions. */
export async function seedFinancialTruthScenario() {
  await seedServer({
    transactions: FINANCIAL_TRUTH_TRANSACTIONS,
    accounts: FINANCIAL_TRUTH_ACCOUNTS,
    categories: FINANCIAL_TRUTH_CATEGORIES,
    balances: FINANCIAL_TRUTH_BALANCES,
  });
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
