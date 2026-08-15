import { expect, test } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  FINANCIAL_TRUTH_EXPECTED,
  seedFinancialTruthScenario,
  signIn,
} from "./harness";

/**
 * RRB-01 — authenticated financial truth.
 *
 * Pure finance and pgTAP tests own arithmetic/database invariants. This test
 * owns the user-visible composition boundary: deterministic authenticated
 * server rows must reach the real routes/components without changing balance,
 * income, expense, net or transfer semantics.
 */
test.describe("authenticated financial truth", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedFinancialTruthScenario();
    await context.addInitScript(() => {
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
    await signIn(page);
  });

  test("mixed ledger preserves dashboard totals, transfer neutrality and account balances", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await assertAuthenticatedMode(page);

    await expect(
      moneyValue(page, `Bạn đang có ${formatVnd(FINANCIAL_TRUTH_EXPECTED.balance)}`),
      "total balance must equal the two seeded server account balances",
    ).toBeVisible();

    await expect(
      moneyValue(
        page,
        `Tiền vào tháng này ${formatVnd(FINANCIAL_TRUTH_EXPECTED.income)}`,
      ),
      "period income must contain only the income ledger row",
    ).toBeVisible();

    await expect(
      moneyValue(
        page,
        `Tiền ra tháng này ${formatVnd(FINANCIAL_TRUTH_EXPECTED.expense)}`,
      ),
      "period expense must contain only the expense ledger row",
    ).toBeVisible();

    await expect(
      moneyValue(
        page,
        `Còn lại tháng này Cộng ${formatVnd(FINANCIAL_TRUTH_EXPECTED.net)}`,
      ),
      "net must remain income minus expense without the internal transfer",
    ).toBeVisible();

    await expect(
      page.getByText("HARNESS-TRANSFER", { exact: true }),
      "the internal transfer must remain visible as a ledger movement",
    ).toBeVisible();
    await expect(
      page.locator(
        `[data-money-value="true"][data-money-tone="transfer"][aria-label="Chuyển ${formatVnd(
          FINANCIAL_TRUTH_EXPECTED.transfer,
        )}"]`,
      ),
      "the visible transfer must keep transfer semantics rather than becoming income or expense",
    ).toBeVisible();

    await page.goto("/accounts", { waitUntil: "domcontentloaded" });
    await assertAuthenticatedMode(page);
    await expect(page.getByRole("heading", { name: "Tài khoản", exact: true })).toBeVisible();

    await expect(
      moneyValue(
        page,
        `Số dư hiện tại Tiền mặt ${formatVnd(FINANCIAL_TRUTH_EXPECTED.cashBalance)}`,
      ),
      "cash account must render the seeded current balance",
    ).toBeVisible();
    await expect(
      moneyValue(
        page,
        `Số dư hiện tại Ngân hàng ${formatVnd(FINANCIAL_TRUTH_EXPECTED.bankBalance)}`,
      ),
      "bank account must render the seeded current balance",
    ).toBeVisible();

    const report = await assertNoUnservedRequests();
    expect(
      report.served,
      "the financial truth contract must exercise the healthy bundled dashboard read path",
    ).toContain("/rest/v1/rpc/get_dashboard_bundle");
    expect(
      report.served,
      "the browser must authenticate through the Supabase boundary",
    ).toContain("/auth/v1/user");
    expect(report.served, "the account proof must use the authenticated accounts read path").toContain(
      "/rest/v1/accounts",
    );
    expect(
      report.served,
      "the account proof must use the authenticated balance read path",
    ).toContain("/rest/v1/account_balances");
  });
});

function moneyValue(page: Parameters<typeof test>[0] extends never ? never : any, ariaLabel: string) {
  return page.locator(`[data-money-value="true"][aria-label="${ariaLabel}"]`);
}

/**
 * Test-only formatter. It intentionally does not import production money or
 * finance modules, so the outcome check stays independent from the code it grades.
 */
function formatVnd(amount: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)} ₫`;
}
