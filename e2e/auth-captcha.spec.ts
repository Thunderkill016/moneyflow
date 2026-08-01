import { expect, test } from "@playwright/test";

const CAPTCHA_TOKEN = 'input[name="captchaToken"]';

const authCases = [
  { path: "/login", submit: "Mở MoneyFlow" },
  { path: "/register", submit: "Tạo không gian tài chính" },
  { path: "/forgot-password", submit: "Gửi liên kết khôi phục" },
] as const;

test.describe("Auth CAPTCHA provider readiness", () => {
  test("Turnstile produces a token for every email-auth entry point", async ({
    page,
  }) => {
    for (const authCase of authCases) {
      await page.goto(authCase.path);

      const token = page.locator(CAPTCHA_TOKEN);
      await expect(token).toHaveCount(1);
      await expect(token).not.toHaveValue("", { timeout: 30_000 });
      await expect(
        page.getByRole("button", { name: authCase.submit, exact: true }),
      ).toBeEnabled();

      const viewportFits = await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      );
      expect(viewportFits).toBe(true);
    }
  });

  test("Turnstile stays inside a 320px phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/login");

    await expect(page.locator(CAPTCHA_TOKEN)).not.toHaveValue("", {
      timeout: 30_000,
    });

    const overflow = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));

    expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewport);
    expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewport);
  });
});
