import { expect, test, type Page } from "@playwright/test";
import { TURNSTILE_SCRIPT_LOAD_DEADLINE_MS } from "../src/lib/auth-captcha";

const CAPTCHA_TOKEN = 'input[name="captchaToken"]';
const TURNSTILE_SCRIPT = "**/turnstile/v0/api.js?**";
const TURNSTILE_STATUS = 'small[role="status"][aria-live="polite"]';

const authCases = [
  { path: "/login", submit: "Đăng nhập" },
  { path: "/register", submit: "Tạo tài khoản" },
  { path: "/forgot-password", submit: "Gửi liên kết" },
] as const;

async function holdTurnstileScript(page: Page) {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route(TURNSTILE_SCRIPT, async (route) => {
    await held;
    await route.abort("failed").catch(() => undefined);
  });

  return async () => {
    release();
    await page.unrouteAll({ behavior: "wait" });
  };
}

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

  test("a stalled Turnstile script fails closed with finite recovery", async ({
    page,
  }) => {
    await page.clock.install();
    const releaseScript = await holdTurnstileScript(page);

    try {
      for (const authCase of authCases) {
        await page.goto(authCase.path, { waitUntil: "domcontentloaded" });

        const token = page.locator(CAPTCHA_TOKEN);
        const submit = page.getByRole("button", {
          name: authCase.submit,
          exact: true,
        });
        const status = page.locator(TURNSTILE_STATUS);

        await expect(token).toHaveValue("");
        await expect(submit).toBeDisabled();
        await expect(status).toHaveText("Đang tải xác minh bảo mật…");
        await expect(page.locator("script#moneyflow-auth-turnstile")).toHaveCount(
          1,
        );

        await page.clock.fastForward(TURNSTILE_SCRIPT_LOAD_DEADLINE_MS + 1);

        await expect(status).toHaveText(
          "Không thể tải xác minh bảo mật. Kiểm tra kết nối rồi tải lại trang.",
        );
        await expect(token).toHaveValue("");
        await expect(submit).toBeDisabled();

        const retry = page.getByRole("button", { name: "Tải lại trang" });
        await expect(retry).toBeVisible();
        await retry.focus();
        await expect(retry).toBeFocused();
      }
    } finally {
      await releaseScript();
    }
  });

  test("successful script readiness is not overwritten by the watchdog", async ({
    page,
  }) => {
    await page.clock.install();
    await page.route(TURNSTILE_SCRIPT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: `
          window.turnstile = {
            render: function (_container, options) {
              options.callback("test-turnstile-token");
              return "test-widget";
            },
            reset: function () {},
            remove: function () {}
          };
        `,
      });
    });

    await page.goto("/login");

    const token = page.locator(CAPTCHA_TOKEN);
    const status = page.locator(TURNSTILE_STATUS);
    const submit = page.getByRole("button", { name: "Đăng nhập", exact: true });

    await expect(token).toHaveValue("test-turnstile-token");
    await expect(status).toHaveText("Đã xác minh bảo mật.");
    await expect(submit).toBeEnabled();

    await page.clock.fastForward(TURNSTILE_SCRIPT_LOAD_DEADLINE_MS + 1);

    await expect(token).toHaveValue("test-turnstile-token");
    await expect(status).toHaveText("Đã xác minh bảo mật.");
    await expect(submit).toBeEnabled();
  });

  test("Turnstile recovery action reloads without bypassing the token gate", async ({
    page,
  }) => {
    await page.clock.install();
    const releaseScript = await holdTurnstileScript(page);

    try {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await expect(page.locator("script#moneyflow-auth-turnstile")).toHaveCount(1);
      await page.clock.fastForward(TURNSTILE_SCRIPT_LOAD_DEADLINE_MS + 1);

      const retry = page.getByRole("button", { name: "Tải lại trang" });
      await expect(retry).toBeVisible();
      await retry.focus();
      await expect(retry).toBeFocused();
      await retry.press("Enter");

      await expect(page.locator(TURNSTILE_STATUS)).toHaveText(
        "Đang tải xác minh bảo mật…",
      );
      await expect(page.locator(CAPTCHA_TOKEN)).toHaveValue("");
      await expect(
        page.getByRole("button", { name: "Đăng nhập", exact: true }),
      ).toBeDisabled();
    } finally {
      await releaseScript();
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
