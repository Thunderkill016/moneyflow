import { parseCsvMatrix } from "../../src/lib/inbox/parse-csv.ts";
import { expect, test, type Page } from "@playwright/test";
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
      moneyValue(
        page,
        `Bạn đang có ${formatVnd(FINANCIAL_TRUTH_EXPECTED.balance)}`,
      ),
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
    await expect(
      page.getByRole("heading", { name: "Tài khoản", exact: true }),
    ).toBeVisible();

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
    expect(
      report.served,
      "the account proof must use the authenticated accounts read path",
    ).toContain("/rest/v1/accounts");
    expect(
      report.served,
      "the account proof must use the authenticated balance read path",
    ).toContain("/rest/v1/account_balances");
  });

  test("authenticated report CSV stays server-owned despite stale demo rows", async ({
    page,
  }) => {
    await page.goto("/reports?period=month");
    await assertAuthenticatedMode(page);
    await page.evaluate(() =>
      localStorage.setItem(
        "moneyflow-demo-transactions-v1",
        JSON.stringify([{ note: "STALE-DEMO-EXPORT", amount: 999_999 }]),
      ),
    );
    await expect(
      page
        .getByRole("banner")
        .getByRole("link", { name: "Xuất CSV", exact: true }),
    ).toHaveAttribute("href", "/reports/export?period=month");
    const response = await page.request.get("/reports/export?period=month");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    const csv = await response.text();
    expect(csv).not.toContain("STALE-DEMO-EXPORT");
    const rows = parseCsvMatrix(csv).slice(1);
    expect(rows.map((row) => [row[2], Number(row[6])]).sort()).toEqual(
      [
        ["HARNESS-INCOME", FINANCIAL_TRUTH_EXPECTED.income],
        ["HARNESS-EXPENSE", -FINANCIAL_TRUTH_EXPECTED.expense],
        ["HARNESS-TRANSFER", FINANCIAL_TRUTH_EXPECTED.transfer],
      ].sort(),
    );
    await assertNoUnservedRequests();
  });
});

function moneyValue(page: Page, ariaLabel: string) {
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
