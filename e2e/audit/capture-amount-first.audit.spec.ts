import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { seedUiAuditState } from "./responsive-audit";

const CONSTRAINED_PHONE = { width: 390, height: 568 };

async function measureCapture(page: Page) {
  return page.evaluate(() => {
    const viewport = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight,
    };
    const dialog = document.querySelector("dialog[open]") as HTMLDialogElement | null;
    const amount = document.querySelector(
      'dialog[open] input[id="add-tx-amount"]',
    ) as HTMLInputElement | null;
    const save = Array.from(
      document.querySelectorAll("dialog[open] button"),
    ).find((button) => button.getAttribute("aria-label") === "Lưu") as
      | HTMLButtonElement
      | undefined;
    const defaults = document.querySelector(
      'dialog[open] [data-slot="capture-fast-defaults"]',
    ) as HTMLElement | null;
    const suggestions = document.querySelector(
      'dialog[open] [data-slot="capture-category-suggestions"]',
    ) as HTMLElement | null;
    const fullChoices = document.querySelector(
      'dialog[open] details[data-slot="capture-category-choice"]',
    ) as HTMLDetailsElement | null;
    const optional = document.querySelector(
      'dialog[open] details[data-slot="capture-optional-details"]',
    ) as HTMLDetailsElement | null;

    const rect = (element: Element | null | undefined) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      };
    };

    return {
      viewport,
      documentWidth: Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ),
      dialog: rect(dialog),
      amount: rect(amount),
      save: rect(save),
      defaults: rect(defaults),
      suggestions: rect(suggestions),
      fullChoicesOpen: fullChoices?.open ?? null,
      optionalOpen: optional?.open ?? null,
      activeId:
        document.activeElement instanceof HTMLElement
          ? document.activeElement.id
          : null,
    };
  });
}

test.describe("Capture 4 compact keyboard-first phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(CONSTRAINED_PHONE);
    await seedUiAuditState(page);
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem(
          "moneyflow-quick-add-prefs-v1",
          JSON.stringify({
            kind: "expense",
            accountId: "demo-account-mb",
            categoryId: "demo-category-expense-Ăn uống",
            keepOpen: false,
            recentCategoryIds: [
              "demo-category-expense-Ăn uống",
              "demo-category-expense-Di chuyển",
            ],
            recentPresets: [
              {
                kind: "expense",
                accountId: "demo-account-mb",
                categoryId: "demo-category-expense-Ăn uống",
              },
            ],
          }),
        );
      } catch {
        /* storage may be unavailable before same-origin navigation */
      }
    });
  });

  test("amount, selected context, two corrections and explicit Save stay reachable", async ({
    page,
  }, testInfo: TestInfo) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

    const nav = page.getByRole("navigation", { name: "Điều hướng di động" });
    await nav.getByRole("button", { name: "Ghi chi tiêu" }).click();

    const dialog = page.getByRole("dialog", { name: "Ghi khoản chi" });
    await expect(dialog).toBeVisible();

    const amount = dialog.getByLabel(/Số tiền (chi|thu)/i);
    await expect(amount).toBeFocused();
    await amount.fill("85000");

    const defaults = dialog.locator('[data-slot="capture-fast-defaults"]');
    const suggestions = dialog.locator('[data-slot="capture-category-suggestions"]');
    await expect(defaults).toBeVisible();
    await expect(defaults).toContainText("Ăn uống");
    await expect(defaults).toContainText("MB Bank");
    await expect(suggestions).toBeVisible();
    await expect(suggestions.locator("button")).toHaveCount(2);
    await expect(
      suggestions.locator('details[data-slot="capture-category-choice"] > summary'),
    ).toContainText("Khác");
    await expect(
      dialog.locator('details[data-slot="capture-category-choice"]'),
    ).not.toHaveAttribute("open", "");
    await expect(
      dialog.locator('details[data-slot="capture-optional-details"]'),
    ).not.toHaveAttribute("open", "");

    const save = dialog.getByRole("button", { name: "Lưu", exact: true });
    await expect(save).toBeVisible();
    await expect(save).toBeEnabled();

    const measurement = await measureCapture(page);
    const screenshot = await page.screenshot({
      fullPage: true,
      animations: "disabled",
    });
    await testInfo.attach(`capture-compact-${testInfo.project.name}.png`, {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach(`capture-compact-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify(measurement, null, 2)),
      contentType: "application/json",
    });

    expect(measurement.viewport).toEqual(CONSTRAINED_PHONE);
    expect(measurement.documentWidth).toBeLessThanOrEqual(CONSTRAINED_PHONE.width + 1);
    expect(measurement.dialog).not.toBeNull();
    expect(measurement.amount).not.toBeNull();
    expect(measurement.defaults).not.toBeNull();
    expect(measurement.suggestions).not.toBeNull();
    expect(measurement.save).not.toBeNull();
    expect(measurement.fullChoicesOpen).toBe(false);
    expect(measurement.optionalOpen).toBe(false);
    expect(measurement.activeId).toBe("add-tx-amount");
    expect(measurement.save!.bottom).toBeLessThanOrEqual(CONSTRAINED_PHONE.height + 1);
    expect(measurement.save!.top).toBeGreaterThanOrEqual(-1);
    expect(measurement.defaults!.right).toBeLessThanOrEqual(CONSTRAINED_PHONE.width + 1);
    expect(measurement.suggestions!.right).toBeLessThanOrEqual(CONSTRAINED_PHONE.width + 1);
  });
});