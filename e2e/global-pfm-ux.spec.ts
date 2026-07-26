import { expect, test } from "@playwright/test";

const NOTE = "Benchmark UX cafe";
const AMOUNT = 125_000;

test.describe("Global PFM UX benchmark", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        if (window.localStorage.getItem("__mf_e2e_benchmark_seeded") === "1") {
          return;
        }
        window.localStorage.clear();
        window.localStorage.setItem("moneyflow-demo-transactions-v1", "[]");
        window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
        window.localStorage.setItem("moneyflow-onboarding-done", "1");
        window.localStorage.setItem("__mf_e2e_benchmark_seeded", "1");
      } catch {
        /* ignore */
      }
    });
  });

  test("withdraws untrusted spending advice and keeps a viewport primary action", async ({
    page,
  }) => {
    await page.goto("/insights");
    await expect(page.locator(".safe-card-hero")).toBeHidden();

    const isMobile = (page.viewportSize()?.width ?? 1_000) <= 760;
    const welcomeExpenseAction = page.locator(
      ".welcome-actions .insights-ghi-chi",
    );
    if (isMobile) {
      await expect(welcomeExpenseAction).toBeHidden();
      await expect(page.locator(".mobile-fab")).toBeVisible();
    } else {
      await expect(welcomeExpenseAction).toBeVisible();
    }

    await page.goto("/capture/quick");
    await page.getByRole("button", { name: /Khoản chi/i, exact: true }).click();
    await page.getByLabel(/Số tiền chi/i).fill(String(AMOUNT));
    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
    await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(NOTE);
    await page.getByRole("button", { name: "Lưu", exact: true }).click();

    await expect
      .poll(
        () =>
          page.evaluate(
            ({ note, amount }) => {
              const raw = window.localStorage.getItem(
                "moneyflow-demo-transactions-v1",
              );
              if (!raw) return false;
              try {
                const list = JSON.parse(raw) as Array<{
                  note?: string;
                  amount?: number;
                }>;
                return list.some(
                  (item) => item.note === note && item.amount === amount,
                );
              } catch {
                return false;
              }
            },
            { note: NOTE, amount: AMOUNT },
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/transactions?category=%C4%82n%20u%E1%BB%91ng&kind=expense");
    await expect(page.getByLabel("Lọc theo danh mục")).toHaveValue("Ăn uống");
    await expect(
      page.getByRole("button", { name: "Khoản chi", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator(".transaction-summary").getByText("Ròng", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".manager-row").filter({ hasText: NOTE })).toBeVisible();
    await expect(page.locator(".transaction-summary")).toContainText("−125.000");
  });

  test("shows explicit budget decisions and a transaction drill-down", async ({
    page,
  }) => {
    await page.goto("/budgets");
    const card = page.locator(".budget-category-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByText("Hạn mức", { exact: true })).toBeVisible();
    await expect(card.getByText("Đã chi", { exact: true })).toBeVisible();
    await expect(card.getByText(/Còn lại|Vượt/, { exact: true })).toBeVisible();

    const drillDown = card.getByRole("link", { name: /Xem giao dịch danh mục/i });
    await expect(drillDown).toHaveAttribute("href", /\/transactions\?category=/);
    await drillDown.click();
    await expect(page).toHaveURL(/\/transactions\?category=/);
    await expect(page.getByLabel("Lọc theo danh mục")).not.toHaveValue("all");
  });
});
