import { expect, test, type Page } from "@playwright/test";

/**
 * Two contracts from the production Auth/shared-UI reconciliation.
 *
 * BUG-A: password fields had no reveal control on any auth surface.
 * BUG-E: the transaction amount was reported unreadable while typing. It does
 *        not reproduce on current main — semantic colour utilities only started
 *        generating in #339 — so this pins the readable state rather than
 *        inventing a fix for a defect that is gone.
 */

async function openAmountDialog(page: Page) {
  await page.goto("/transactions", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Ghi chi tiêu/ }).first().click();
  const amount = page.locator('dialog[open] input').first();
  await expect(amount).toBeVisible();
  return amount;
}

test.describe("transaction amount stays readable", () => {
  test("the typed amount is visible, unclipped and theme-aware", async ({ page }) => {
    const amount = await openAmountDialog(page);
    await amount.click();
    await amount.type("1250000", { delay: 10 });

    const measured = await amount.evaluate((element: HTMLInputElement) => {
      const style = getComputedStyle(element);
      return {
        value: element.value,
        color: style.color,
        fill: style.webkitTextFillColor,
        opacity: Number.parseFloat(style.opacity),
        caret: style.caretColor,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        fontSize: Number.parseFloat(style.fontSize),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(measured.value, "the value must survive formatting").not.toBe("");
    expect(measured.opacity).toBe(1);
    // An invisible amount is the defect: transparent text, or text painted in
    // the field's own background colour.
    expect(measured.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(measured.fill).not.toBe("rgba(0, 0, 0, 0)");
    expect(measured.fill).toBe(measured.color);
    expect(measured.caret).not.toBe("rgba(0, 0, 0, 0)");
    expect(measured.fontSize).toBeGreaterThanOrEqual(16);
    // Clipping would hide the digits just as effectively as a colour bug.
    expect(measured.scrollWidth).toBeLessThanOrEqual(measured.clientWidth + 1);
    expect(measured.overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("auth password reveal", () => {
  for (const [label, path] of [
    ["login", "/login"],
    ["register", "/register"],
  ] as const) {
    test(`${label} exposes a reveal control that never submits`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });

      const password = page.locator('input[name="password"]');
      await expect(password).toHaveAttribute("type", "password");
      await password.fill("correct horse battery staple");

      const toggle = page.getByRole("button", { name: "Hiện mật khẩu" }).first();
      await expect(toggle).toBeVisible();
      // A bare <button> inside a form submits; this must not.
      await expect(toggle).toHaveAttribute("type", "button");

      const before = page.url();
      await toggle.click();

      await expect(password).toHaveAttribute("type", "text");
      expect(page.url(), "revealing must not submit the form").toBe(before);
      // The value is untouched by revealing it.
      await expect(password).toHaveValue("correct horse battery staple");

      // The accessible name follows the state.
      const hide = page.getByRole("button", { name: "Ẩn mật khẩu" }).first();
      await expect(hide).toBeVisible();
      await hide.click();
      await expect(password).toHaveAttribute("type", "password");
    });
  }

  test("registration asks for a confirmation with the right autocomplete", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });

    const password = page.locator('input[name="password"]');
    const confirm = page.locator('input[name="confirmPassword"]');

    await expect(confirm).toBeVisible();
    // Both are new credentials; neither may advertise itself as the current one.
    await expect(password).toHaveAttribute("autocomplete", "new-password");
    await expect(confirm).toHaveAttribute("autocomplete", "new-password");
    await expect(confirm).toHaveAttribute("type", "password");
  });

  test("login password keeps current-password semantics", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[name="password"]')).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    await expect(page.locator('input[name="confirmPassword"]')).toHaveCount(0);
  });
});
