import { expect, test } from "@playwright/test";
import { tapKeypadAmount } from "./capture-keypad.ts";

/*
 * The payoff moment, proven in a browser rather than only in a unit test.
 *
 * Recording used to end with "Đã lưu giao dịch." — the highest-attention moment in
 * the app returning no information. Two saves in the same category should now end
 * with the category's running total for the month, built from the user's own rows.
 */

/*
 * Deliberately a category the demo ledger does not already use. The demo now
 * carries rows dated today, so "Ăn uống" already holds one and the first save
 * there would be the second entry in its category — which is the case this test
 * checks does NOT report a running total. "Giải trí" keeps the first save
 * genuinely first.
 */
const CATEGORY = "Giải trí";

async function quickSave(
  page: import("@playwright/test").Page,
  amount: string,
  occurredOn?: string,
) {
  await page.goto("/capture/quick");
  const dialog = page.getByRole("dialog", { name: "Ghi giao dịch" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Khoản chi" }).click();
  await tapKeypadAmount(dialog, amount);

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

  const details = dialog.locator('[data-slot="capture-optional-details"]');
  if ((await details.getAttribute("open")) === null) {
    await details.locator("summary").click();
  }
  const date = dialog.getByLabel("Ngày", { exact: true });
  if (occurredOn) await date.fill(occurredOn);
  const recordedDate = await date.inputValue();

  const save = dialog.getByRole("button", { name: "Lưu", exact: true });
  await expect(save).toBeEnabled({ timeout: 15_000 });
  await save.click();
  return recordedDate;
}

test("the second save in a category reports what it adds up to", async ({
  page,
}) => {
  await quickSave(page, "100000");

  // The first entry is the whole total, so repeating it back would be noise.
  const firstNotice = page.getByText(/Đã ghi khoản chi/u).first();
  await expect(firstNotice).toBeVisible();
  await expect(firstNotice).not.toContainText(`${CATEGORY} tháng`);

  const date = await quickSave(page, "50000");

  const secondNotice = page.getByText(/Đã ghi khoản chi/u).first();
  await expect(secondNotice).toBeVisible();
  const [year, month] = date.split("-");
  await expect(secondNotice).toContainText(
    `${CATEGORY} tháng ${Number(month)}/${year}`,
  );
  // 100.000 + 50.000, and the figure has to be the total rather than the entry.
  await expect(secondNotice).toContainText("150.000");
});

// Explicit old dates make this independent of the current clock and demo carryover.
test("backdated saves show the recorded year and exclude another month", async ({
  page,
}) => {
  await quickSave(page, "900000", "2024-12-31");
  await quickSave(page, "100000", "2025-01-05");
  await quickSave(page, "50000", "2025-01-09");
  const notice = page.getByText(/Đã ghi khoản chi/u).first();
  await expect(notice).toContainText(`${CATEGORY} tháng 1/2025: 150.000`);
  await expect(notice).not.toContainText("tháng này");
  await expect(notice).not.toContainText("1.050.000");
});
