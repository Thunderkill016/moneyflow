import { test } from "@playwright/test";
import { assertKeyboardFocusVisible } from "./keyboard-focus";
import { seedUiAuditState } from "./responsive-audit";

test.describe("keyboard navigation audit", () => {
  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  test("landing exposes visible keyboard focus", async ({ page }, testInfo) => {
    await page.goto("/landing", { waitUntil: "domcontentloaded" });
    await assertKeyboardFocusVisible(page, testInfo);
  });

  test("quick capture exposes visible keyboard focus", async ({ page }, testInfo) => {
    await page.goto("/capture/quick", { waitUntil: "domcontentloaded" });
    await assertKeyboardFocusVisible(page, testInfo);
  });
});
