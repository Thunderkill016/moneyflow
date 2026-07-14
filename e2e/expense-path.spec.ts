import { expect, test } from "@playwright/test";

/**
 * TASK-116 — Core expense path smoke (demo mode).
 *
 * Flow: landing → demo app → quick-add expense → insights shows amount → export download.
 * Does not depend on Inbox / paste / candidates.
 * Runs against Playwright webServer with placeholder Supabase (demo viewer).
 */
const UNIQUE_AMOUNT = "777000";
const UNIQUE_AMOUNT_DISPLAY = "777.000";
const UNIQUE_NOTE = "E2E cafe autopilot TASK-116";

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
    // 1) Public landing (product: thu chi / có thể chi — not inbox-first marketing)
    await page.goto("/landing");
    await expect(
      page.getByRole("heading", { name: /có thể chi bao nhiêu/i }),
    ).toBeVisible();
    await expect(page.locator(".landing-eyebrow")).toHaveText(
      /Quản lý thu chi cá nhân/i,
    );
    await expect(page.locator(".landing-trust-line")).toContainText(
      /Không hỏi mật khẩu ngân hàng/i,
    );

    // 2) Enter app via register CTA; demo mode (placeholder Supabase) unlocks app without auth
    await page.getByRole("link", { name: "Bắt đầu miễn phí" }).first().click();
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Tạo tài khoản" }),
    ).toBeVisible();

    // Demo entry: no real credentials — go straight to product home
    await page.goto("/insights");
    await expect(page.getByText(/Có thể chi hôm nay/i).first()).toBeVisible({
      timeout: 20_000,
    });

    // 3) Quick add expense (ledger path — not inbox)
    await page.goto("/capture/quick");
    await expect(page.getByRole("heading", { level: 1, name: "Thêm nhanh" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Khoản chi", exact: true }),
    ).toBeVisible();

    // Ensure expense kind
    await page.getByRole("button", { name: "Khoản chi", exact: true }).click();

    const amount = page.getByLabel("Số tiền");
    await amount.fill(UNIQUE_AMOUNT);
    await expect(amount).toHaveValue(UNIQUE_AMOUNT_DISPLAY);

    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
    await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(UNIQUE_NOTE);

    await page.getByRole("button", { name: "Lưu", exact: true }).click();

    // Persist check: demo ledger writes localStorage then may navigate away from form.
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          const raw = window.localStorage.getItem("moneyflow-demo-transactions-v1");
          if (!raw) return false;
          try {
            const list = JSON.parse(raw) as Array<{ amount?: number; note?: string }>;
            return list.some(
              (t) => t.amount === 777_000 && String(t.note ?? "").includes("TASK-116"),
            );
          } catch {
            return false;
          }
        });
      }, { timeout: 15_000 })
      .toBe(true);

    // 4) Insights shows the expense amount (recent list + category share).
    // Demo Chi tháng KPI adds a baseline, so assert the ledger rows/amount not the raw KPI alone.
    await page.goto("/insights");
    await expect(page.getByText(/Có thể chi hôm nay/i).first()).toBeVisible();
    await expect(page.locator("section.insights-kpi")).toBeVisible({
      timeout: 20_000,
    });

    const recentRow = page.locator(".transaction-row").filter({ hasText: UNIQUE_NOTE });
    await expect(recentRow).toBeVisible({ timeout: 20_000 });
    await expect(recentRow).toContainText(UNIQUE_AMOUNT_DISPLAY);

    // Category bar data is derived from the live ledger (no demo baseline pad).
    await expect(
      page.locator(".insights-category-row").filter({ hasText: "Ăn uống" }),
    ).toContainText(UNIQUE_AMOUNT_DISPLAY);

    // 5) Export / download path (settings export — client-side file)
    await page.goto("/settings/export");
    await expect(page.getByRole("heading", { name: "Xuất dữ liệu" })).toBeVisible();
    await expect(page.getByText(/Tải giao dịch/i)).toBeVisible();

    // Wait until download is enabled (client hydrate of local ledger)
    const downloadBtn = page
      .locator("main.export-workspace")
      .getByRole("button", { name: /Tải xuống/i });
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
