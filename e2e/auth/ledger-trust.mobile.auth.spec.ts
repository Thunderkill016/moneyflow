import { expect, test } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  HARNESS_USER,
  signIn,
} from "./harness";

const DOUBLE = `http://127.0.0.1:${process.env.SUPABASE_DOUBLE_PORT || 3301}`;
const ACCOUNT_ID = "00000000-0000-4000-8000-0000000000a1";
const CATEGORY_ID = "00000000-0000-4000-8000-0000000000c1";

async function seedLimitedTrust() {
  const account = {
    id: ACCOUNT_ID,
    name: "Tiền mặt",
    kind: "cash",
    currency_code: "VND",
    initial_balance_minor: 925_000,
    is_archived: false,
  };
  const category = {
    id: CATEGORY_ID,
    name: "Ăn uống",
    kind: "expense",
    icon: null,
    color: null,
  };
  const balance = {
    account_id: ACCOUNT_ID,
    balance_minor: 925_000,
    currency_code: "VND",
  };

  const response = await fetch(`${DOUBLE}/__control/seed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      user: HARNESS_USER,
      inbox_candidates: [],
      import_batches: [],
      transaction_feed: [],
      transaction_review_feed: [],
      accounts: [account],
      categories: [category],
      account_balances: [balance],
      dashboard_bundle: {
        transactions: [],
        accounts: [account],
        categories: [category],
        balances: [balance],
        budgets: [],
        commitments: [],
        commitment_occurrences: [],
        income_templates: [],
        income_occurrences: [],
        goals: [],
        pending_inbox_count: 1,
        ledger_trust: {
          trusted_through: "2026-08-19",
          base_reconciliation_through: "2026-08-31",
          status: "trusted_limited",
          reason: "known_unresolved_work",
          active_account_count: 1,
          clean_reconciled_account_count: 1,
          pending_inbox_count: 1,
          needs_review_transaction_count: 0,
          unreconciled_account_leg_count: 0,
          earliest_unresolved_on: "2026-08-20",
          coverage_scope: "known_ledger_state_only",
        },
      },
    }),
  });
  expect(response.ok, "seeding the authenticated trust fixture must succeed").toBe(
    true,
  );
}

test.beforeEach(async ({ page }) => {
  await seedLimitedTrust();
  await signIn(page);
  await assertAuthenticatedMode(page);
});

test("Home shows a bounded trusted-through state and one next action", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const trustRegion = page.getByRole("region", { name: "Độ tin cậy" });
  await expect(trustRegion).toBeVisible();
  await expect(trustRegion.getByText("Sổ tin cậy đến 19/08/2026")).toBeVisible();
  await expect(
    trustRegion.getByText(/không khẳng định nguồn bên ngoài đã đầy đủ/iu),
  ).toBeVisible();

  const action = trustRegion.getByRole("link", { name: "Mở Hộp thư" });
  await expect(action).toHaveAttribute("href", "/inbox");
  const box = await action.boundingBox();
  expect(box?.height ?? 0, "trust maintenance target must be at least 44px").toBeGreaterThanOrEqual(
    44,
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "trust surface must not create horizontal page overflow").toBeLessThanOrEqual(
    1,
  );

  const report = await assertNoUnservedRequests();
  expect(
    report.served.filter((path) => path === "/rest/v1/rpc/get_dashboard_bundle"),
  ).toHaveLength(1);
  expect(
    report.served.filter((path) => path.includes("ledger_trust_summary")),
    "Home must not add a second trust RPC beside the bounded dashboard bundle",
  ).toHaveLength(0);
});
