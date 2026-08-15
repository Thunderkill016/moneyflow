import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * RRB-07 — WCAG 2.2 SC 3.3.8 Accessible Authentication (Minimum).
 *
 * This spec owns MoneyFlow-controlled browser mechanisms only. It proves that
 * login/re-auth/recovery inputs expose browser/password-manager purpose
 * semantics and that real clipboard paste is not blocked. It also proves the
 * app offers its Google OAuth alternative on password-authentication surfaces.
 *
 * It does not certify Cloudflare/Google provider-managed challenge behavior or
 * claim whole-site WCAG conformance.
 */
test.describe("accessible authentication mechanisms", () => {
  test("login supports autofill, password paste and the OAuth alternative", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');

    await expect(email).toBeVisible();
    await expect(email).toHaveAccessibleName("Email");
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("autocomplete", "email");

    await expect(password).toBeVisible();
    await expect(password).toHaveAccessibleName(/Mật khẩu/);
    await expect(password).toHaveAttribute("autocomplete", "current-password");

    await pasteFromClipboard(page, email, "paste-login@example.test");
    await pasteFromClipboard(page, password, "paste-current-password-value");

    await expect(
      page.getByRole("button", { name: "Tiếp tục với Google" }),
      "MoneyFlow-owned login UI should expose the OAuth alternative without requiring password recall",
    ).toBeVisible();
  });

  test("account-deletion re-auth keeps password-manager and paste mechanisms", async ({ page }) => {
    await page.goto(
      "/login?reauth=1&next=%2Fsettings%2Fdelete-account",
      { waitUntil: "domcontentloaded" },
    );

    await expect(page.getByRole("heading", { name: "Xác nhận đây là bạn" })).toBeVisible();

    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');

    await expect(email).toHaveAttribute("autocomplete", "email");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
    await pasteFromClipboard(page, email, "reauth-paste@example.test");
    await pasteFromClipboard(page, password, "reauth-current-password-value");

    await expect(
      page.getByRole("button", { name: "Xác thực lại với Google" }),
      "re-auth should keep the app-owned OAuth alternative without performing the destructive action",
    ).toBeVisible();
  });

  test("password recovery email can be identified and pasted without transcription", async ({ page }) => {
    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Đặt lại mật khẩu" })).toBeVisible();

    const email = page.locator('input[name="email"]');
    await expect(email).toHaveAccessibleName("Email");
    await expect(email).toHaveAttribute("type", "email");
    await expect(email).toHaveAttribute("autocomplete", "email");
    await pasteFromClipboard(page, email, "recovery-paste@example.test");
  });

  test("setting the replacement password supports password managers and paste", async ({ page }) => {
    await page.goto("/update-password", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Tạo mật khẩu mới" })).toBeVisible();

    const password = page.locator('input[name="password"]');
    await expect(password).toHaveAccessibleName("Mật khẩu");
    await expect(password).toHaveAttribute("autocomplete", "new-password");
    await pasteFromClipboard(page, password, "paste-new-password-value");
  });

  test("registration keeps new-credential semantics as supporting evidence", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });

    const email = page.locator('input[name="email"]');
    const password = page.locator('input[name="password"]');
    const confirm = page.locator('input[name="confirmPassword"]');

    await expect(email).toHaveAttribute("autocomplete", "email");
    await expect(password).toHaveAttribute("autocomplete", "new-password");
    await expect(confirm).toHaveAttribute("autocomplete", "new-password");

    await pasteFromClipboard(page, password, "registration-paste-password");
    await pasteFromClipboard(page, confirm, "registration-paste-password");
  });
});

async function pasteFromClipboard(page: Page, input: Locator, value: string) {
  const origin = new URL(page.url()).origin;
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"], { origin });
  await page.evaluate(async (text) => navigator.clipboard.writeText(text), value);

  await input.fill("");
  await input.focus();
  await page.keyboard.press("Control+V");

  await expect(
    input,
    "authentication fields must not block clipboard paste used by password managers or external credential tools",
  ).toHaveValue(value);
}
