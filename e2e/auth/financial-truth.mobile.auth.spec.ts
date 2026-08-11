import { expect, test } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  FINANCIAL_TRUTH_EXPECTED,
  seedFinancialTruthScenario,
  signIn,
} from "./harness";

/**
 * Authenticated financial truth — server rows → dashboard outcome.
 *
 * Pure finance tests already own arithmetic properties. This contract owns a
 * different boundary: the healthy authenticated dashboard RPC, row mapping,
 * server/client composition and rendered MoneyValue semantics must preserve the
 * same facts. Expected totals are literals from the fixture, not values
 * calculated with the production summarizer under test.
 */
test.describe("authenticated financial truth", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedFinancialTruthScenario();
    await context.addInitScript(() => {
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
    await signIn(page);
  });

  test("mixed server ledger preserves balance and transfer-neutral period totals", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await assertAuthenticatedMode(page);

    await expect(
      page.locator(
        `[data-money-value="true"][aria-label="Bạn đang có ${formatVnd(
          FINANCIAL_TRUTH_EXPECTED.balance,
        )}"]`,
      ),
      "total balance must come from the two server account balances",
    ).toBeVisible();

    await expect(
      page.locator(
        `[data-money-value="true"][aria-label="Tiền vào tháng này ${formatVnd(
          FINANCIAL_TRUTH_EXPECTED.income,
        )}"]`,
      ),
      "the period income must contain only the income ledger row",
    ).toBeVisible();

    await expect(
      page.locator(
        `[data-money-value="true"][aria-label="Tiền ra tháng này ${formatVnd(
          FINANCIAL_TRUTH_EXPECTED.expense,
        )}"]`,
      ),
      "the period expense must contain only the expense ledger row",
    ).toBeVisible();

    await expect(
      page.locator(
        `[data-money-value="true"][aria-label="Còn lại tháng này Cộng ${formatVnd(
          FINANCIAL_TRUTH_EXPECTED.net,
        )}"]`,
      ),
      "net must remain income minus expense, without the internal transfer",
    ).toBeVisible();

    await expect(
      page.getByText("HARNESS-TRANSFER", { exact: true }),
      "the transfer must still be visible as a real ledger movement",
    ).toBeVisible();
    await expect(
      page.locator(
        `[data-money-tone="transfer"][aria-label="Chuyển ${formatVnd(
          FINANCIAL_TRUTH_EXPECTED.transfer,
        )}"]`,
      ),
      "the visible transfer must keep transfer semantics instead of becoming income or expense",
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
  });
});

/**
 * Test-only formatter for selector text. It intentionally does not import the
 * production money or finance modules, so the outcome check stays independent
 * from the implementation it grades.
 */
function formatVnd(amount: number) {
  return `${new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount)} ₫`;
}
