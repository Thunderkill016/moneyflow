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
    const account = document.querySelector(
      'dialog[open] details[data-slot="capture-account-choice"] > summary',
    ) as HTMLElement | null;
    const category = document.querySelector(
      'dialog[open] details[data-slot="capture-category-choice"] > summary',
    ) as HTMLElement | null;
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
      account: rect(account),
      category: rect(category),
      optionalOpen: optional?.open ?? null,
      activeId:
        document.activeElement instanceof HTMLElement
          ? document.activeElement.id
          : null,
    };
  });
}

test.describe("Capture 2.0 amount-first constrained phone", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(CONSTRAINED_PHONE);
    await seedUiAuditState(page);
  });

  test("amount, remembered defaults and explicit Save stay reachable without opening secondary detail", async ({
    page,
  }, testInfo: TestInfo) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

    const nav = page.getByRole("navigation", { name: "Điều hướng di động" });
    await nav.getByRole("button", { name: "Ghi chi tiêu" }).click();

    const dialog = page.getByRole("dialog", { name: "Ghi chi tiêu" });
    await expect(dialog).toBeVisible();

    const amount = dialog.getByLabel(/Số tiền (chi|thu)/i);
    await expect(amount).toBeFocused();
    await amount.fill("85000");

    await expect(
      dialog.locator('details[data-slot="capture-account-choice"] > summary'),
    ).toBeVisible();
    await expect(
      dialog.locator('details[data-slot="capture-category-choice"] > summary'),
    ).toBeVisible();
    await expect(
      dialog.locator('details[data-slot="capture-optional-details"]'),
    ).not.toHaveAttribute("open", "");

    const save = dialog.getByRole("button", { name: "Lưu", exact: true });
    await expect(save).toBeVisible();

    const measurement = await measureCapture(page);
    const screenshot = await page.screenshot({
      fullPage: true,
      animations: "disabled",
    });
    await testInfo.attach(`capture-amount-first-${testInfo.project.name}.png`, {
      body: screenshot,
      contentType: "image/png",
    });
    await testInfo.attach(`capture-amount-first-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify(measurement, null, 2)),
      contentType: "application/json",
    });

    expect(measurement.viewport).toEqual(CONSTRAINED_PHONE);
    expect(measurement.documentWidth).toBeLessThanOrEqual(CONSTRAINED_PHONE.width + 1);
    expect(measurement.dialog).not.toBeNull();
    expect(measurement.amount).not.toBeNull();
    expect(measurement.account).not.toBeNull();
    expect(measurement.category).not.toBeNull();
    expect(measurement.save).not.toBeNull();
    expect(measurement.optionalOpen).toBe(false);
    expect(measurement.activeId).toBe("add-tx-amount");
    expect(measurement.save!.bottom).toBeLessThanOrEqual(CONSTRAINED_PHONE.height + 1);
    expect(measurement.save!.top).toBeGreaterThanOrEqual(-1);
    expect(measurement.account!.right).toBeLessThanOrEqual(CONSTRAINED_PHONE.width + 1);
    expect(measurement.category!.right).toBeLessThanOrEqual(CONSTRAINED_PHONE.width + 1);
  });
});
