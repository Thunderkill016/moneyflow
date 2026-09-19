import { expect, test } from "@playwright/test";

test("Activity combines demo ledger and Inbox candidates without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Hoạt động", level: 1 })).toBeVisible();
  await expect(page.locator('[data-activity-type="ledger_transaction"]').first()).toBeVisible();
  await expect(page.locator('[data-activity-type="inbox_candidate"]').first()).toBeVisible();

  const attentionFilter = page.getByRole("button", { name: "Cần xử lý", exact: true });
  await attentionFilter.click();
  await expect(page.locator("[data-activity-type]").first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "demo Activity must not create horizontal page overflow").toBeLessThanOrEqual(1);
});
