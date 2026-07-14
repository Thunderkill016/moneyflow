import { expect, test } from "@playwright/test";

/**
 * TASK-029 — Inbox happy-path smoke (demo mode).
 *
 * Flow: landing → register (view) → onboarding skip → paste → inbox visible.
 * Runs against a Playwright webServer with placeholder Supabase so demo
 * mode unlocks /inbox and /capture without real auth.
 */
test.describe("Inbox happy path", () => {
  test.beforeEach(async ({ context }) => {
    // Seed once per browser context. Null candidate key would load demo samples;
    // empty JSON array keeps Inbox empty until paste commits.
    await context.addInitScript(() => {
      const flag = "__mf_e2e_seeded";
      const w = window as Window & { [flag]?: boolean };
      if (w[flag]) return;
      w[flag] = true;
      try {
        window.localStorage.clear();
        window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      } catch {
        /* ignore */
      }
    });
  });

  test("landing → register skip → paste → inbox shows candidate", async ({
    page,
  }) => {
    // 1) Landing (public route; `/` would redirect demo users to /inbox)
    await page.goto("/landing");
    await expect(
      page.getByRole("heading", { name: /Hộp thư cho mọi/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/Không bao giờ hỏi mật khẩu hay OTP ngân hàng/i),
    ).toBeVisible();

    // 2) Register CTA
    await page.getByRole("link", { name: "Bắt đầu miễn phí" }).first().click();
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Tạo tài khoản" }),
    ).toBeVisible();
    await expect(page.locator("p.auth-trust")).toHaveText(
      /Dữ liệu của bạn thuộc về bạn/,
    );

    // 3) Skip register → onboarding skip (post-register path without auth)
    await page.goto("/onboarding");
    await expect(
      page.getByRole("heading", { name: /Bạn kiểm soát dữ liệu/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Để sau — vào Inbox trống/i }).click();
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();

    // 4) Paste capture
    await page.goto("/capture/paste");
    await expect(
      page.getByRole("heading", { name: /Dán bất cứ thứ gì/i }),
    ).toBeVisible();

    const textarea = page.getByLabel("Nội dung");
    await textarea.fill("cafe 45k");
    await page.getByRole("button", { name: "Phân tích" }).click();

    await expect(page.getByText(/Tìm thấy 1 giao dịch/i)).toBeVisible();
    await expect(
      page.locator(".capture-paste-preview-amount").first(),
    ).toContainText(/45/);

    await page.getByRole("button", { name: "Vào Inbox" }).click();

    // 5) Inbox shows the pasted candidate
    await expect(page).toHaveURL(/\/inbox/);
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await expect(page.getByText(/Cần duyệt:\s*1/i)).toBeVisible({
      timeout: 20_000,
    });
    const list = page.getByRole("region", { name: "Danh sách chờ duyệt" });
    await expect(list.getByRole("button", { name: /^Cafe$/i })).toBeVisible();
    await expect(list.locator(".inbox-row-amount").first()).toContainText("45.000");
    await expect(list.locator(".source-badge").first()).toHaveText("paste");
  });
});
