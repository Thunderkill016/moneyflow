import { expect, test } from "@playwright/test";

/**
 * TASK-200 / TASK-116 — Core expense path always green (demo mode).
 *
 * Flow: landing → demo app → quick-add expense → insights shows ledger amount → export download.
 * Does not depend on Inbox / paste / candidates.
 * Runs against Playwright webServer with explicit demo mode.
 * Fail CI if broken: `npm run test:e2e`
 */
const UNIQUE_AMOUNT = "777000";
const UNIQUE_AMOUNT_DISPLAY = "777.000";
const UNIQUE_NOTE = "E2E cafe autopilot TASK-200";

test.describe("Expense path (thu chi)", () => {
  test.beforeEach(async ({ context }) => {
    // Seed once per browser context via localStorage flag (survives full page.goto).
    // Window-level flags reset on each navigation and would wipe the expense we just saved.
    await context.addInitScript(() => {
      try {
        if (window.localStorage.getItem("__mf_e2e_expense_seeded") === "1") return;
        window.localStorage.clear();
        // Empty ledger so the new expense is unambiguous on Insights/export.
        window.localStorage.setItem("moneyflow-demo-transactions-v1", "[]");
        window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
        window.localStorage.setItem("moneyflow-onboarding-done", "1");
        window.localStorage.setItem("__mf_e2e_expense_seeded", "1");
      } catch {
        /* ignore */
      }
    });
  });

  test("landing → demo → quick add expense → insights → export download", async ({
    page,
  }) => {
    // 1) Public landing promises only proven thu-chi behavior.
    await page.goto("/landing");
    await expect(
      page.getByRole("heading", { name: /Ghi thu chi rõ ràng/i }),
    ).toBeVisible();
    await expect(page.locator(".landing-eyebrow")).toHaveText(
      /Quản lý thu chi cá nhân/i,
    );
    const trustBar = page.locator(".landing-trust-bar").first();
    await expect(trustBar).toBeVisible();
    await expect(trustBar).toContainText(/Không mật khẩu NH/i);
    await expect(trustBar).toContainText(/Xuất CSV/i);

    // 2) Enter app via register CTA; demo mode unlocks app without auth.
    await page.getByRole("link", { name: "Bắt đầu miễn phí" }).first().click();
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Tạo tài khoản" }),
    ).toBeVisible();

    // Demo entry: no real credentials — go straight to product home.
    await page.goto("/insights");
    await expect(page.locator(".safe-card-hero")).toBeHidden({ timeout: 20_000 });
    await expect(
      page.locator(".welcome-actions .insights-ghi-chi"),
    ).toBeVisible();

    // Mobile must expose the account sheet from the topbar avatar.
    if ((page.viewportSize()?.width ?? 1_000) <= 760) {
      const accountButton = page.getByRole("button", {
        name: /Mở tài khoản/i,
      });
      await expect(accountButton).toBeVisible();
      await accountButton.click();
      await expect(
        page.getByRole("heading", { name: "Thêm & tài khoản" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Tạo tài khoản/i }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Đóng" }).click();
    }

    // 3) Quick add expense (ledger path — not inbox)
    await page.goto("/capture/quick");
    await expect(
      page.getByRole("heading", { level: 1, name: "Thêm nhanh" }),
    ).toBeVisible();
    // Labels include sign for a11y (not color-only): "Khoản chi (−)"
    const expenseKind = page.getByRole("button", { name: /Khoản chi/i });
    await expect(expenseKind).toBeVisible();
    await expenseKind.click();

    const amount = page.getByLabel(/Số tiền chi/i);
    await amount.fill(UNIQUE_AMOUNT);
    await expect(amount).toHaveValue(UNIQUE_AMOUNT_DISPLAY);

    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
    await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(UNIQUE_NOTE);

    await page.getByRole("button", { name: /Lưu/i }).click();

    // Persist check: demo ledger writes localStorage then may navigate away from form.
    await expect
      .poll(
        async () => {
          return page.evaluate(() => {
            const raw = window.localStorage.getItem(
              "moneyflow-demo-transactions-v1",
            );
            if (!raw) return false;
            try {
              const list = JSON.parse(raw) as Array<{
                amount?: number;
                note?: string;
              }>;
              return list.some(
                (transaction) =>
                  transaction.amount === 777_000 &&
                  String(transaction.note ?? "").includes("TASK-200"),
              );
            } catch {
              return false;
            }
          });
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    // 4) Insights shows the expense amount (recent list + category share).
    // Demo Chi tháng KPI adds a baseline, so assert the ledger rows/amount not the raw KPI alone.
    await page.goto("/insights");
    await expect(page.locator(".safe-card-hero")).toBeHidden();
    await expect(page.locator("section.insights-kpi")).toBeVisible({
      timeout: 20_000,
    });

    const recentRow = page
      .locator(".transaction-row")
      .filter({ hasText: UNIQUE_NOTE });
    await expect(recentRow).toBeVisible({ timeout: 20_000 });
    await expect(recentRow).toContainText(UNIQUE_AMOUNT_DISPLAY);

    // Category bar data is derived from the live ledger (no demo baseline pad).
    await expect(
      page.locator(".insights-category-row").filter({ hasText: "Ăn uống" }),
    ).toContainText(UNIQUE_AMOUNT_DISPLAY);

    // 5) Export / download path (settings export — client-side file)
    await page.goto("/settings/export");
    await expect(
      page.getByRole("heading", { name: "Xuất dữ liệu" }),
    ).toBeVisible();
    await expect(page.getByText(/Tải sổ thu chi|Tải giao dịch/i)).toBeVisible();
    await expect(
      page.getByText(/Dữ liệu của bạn thuộc về bạn/i),
    ).toBeVisible();

    // Wait until download is enabled (client hydrate of local ledger).
    const downloadBtn = page
      .getByRole("button", { name: /Tải xuống/i })
      .first();
    await expect(downloadBtn).toBeEnabled({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      downloadBtn.click(),
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.csv$/i);
    expect(filename.toLowerCase()).toMatch(/moneyflow|giao-dich/);

    await expect(page.getByText(/Đã tải \d+ mục/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
