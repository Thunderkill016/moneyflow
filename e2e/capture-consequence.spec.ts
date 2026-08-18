import { expect, test } from "@playwright/test";

/*
 * The payoff moment, proven in a browser rather than only in a unit test.
 *
 * Recording used to end with "Đã lưu giao dịch." — the highest-attention moment in
 * the app returning no information. Two saves in the same category should now end
 * with the category's running total for the month, built from the user's own rows.
 */

const CATEGORY = "Ăn uống";

async function quickSave(page: import("@playwright/test").Page, amount: string) {
  await page.goto("/capture/quick");
  const dialog = page.getByRole("dialog", { name: "Ghi giao dịch" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Khoản chi" }).click();
  await dialog.getByLabel(/Số tiền chi/iu).fill(amount);

  /*
   * Choosing the category is best-effort on purpose. After the first successful
   * capture the learned presets from #412 make the flow amount-only, so the
   * category control is simply absent the second time — and that preset is what
   * keeps both entries in the same category, which is the point of the test.
   */
  const choice = dialog.locator('[data-slot="capture-category-choice"]');
  if (await choice.count()) {
    const summary = choice.locator("summary");
    if (await summary.count()) await summary.click();
    const option = choice.getByRole("button", { name: CATEGORY, exact: true });
    if (await option.count()) await option.click();
  }

  const save = dialog.getByRole("button", { name: "Lưu", exact: true });
  await expect(save).toBeEnabled({ timeout: 15_000 });
  await save.click();
}

test("the second save in a category reports what it adds up to", async ({ page }) => {
  await quickSave(page, "100000");

  // The first entry is the whole total, so repeating it back would be noise.
  const firstNotice = page.getByText(/Đã ghi khoản chi/u).first();
  await expect(firstNotice).toBeVisible();
  await expect(firstNotice).not.toContainText("tháng này");

  await quickSave(page, "50000");

  const secondNotice = page.getByText(/Đã ghi khoản chi/u).first();
  await expect(secondNotice).toBeVisible();
  await expect(secondNotice).toContainText(`${CATEGORY} tháng này`);
  // 100.000 + 50.000, and the figure has to be the total rather than the entry.
  await expect(secondNotice).toContainText("150.000");
});
