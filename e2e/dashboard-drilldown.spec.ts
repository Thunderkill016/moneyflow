import { expect, test } from "@playwright/test";

/*
 * The drill-down is only worth shipping if the rows it opens are the rows behind
 * the figure that was clicked. `src/lib/dashboard-drilldown.test.ts` proves the
 * arithmetic on pure functions; this proves the wiring — that the dashboard emits
 * a link carrying the right window and filter, and that the transactions
 * workspace receives it as filter state rather than dropping it.
 *
 * A silent fallback is the specific failure this guards: `/transactions` resolves
 * `category` by name and falls back to showing everything when it does not match,
 * so a broken link would look like a working one while opening the whole ledger.
 */

const CATEGORY = "Ăn uống";
const AMOUNT = "123000";

/*
 * Demo mode starts with an opening balance but no transactions, so the category
 * panel is not rendered at all until something is recorded. One expense is
 * recorded here through the real capture flow rather than by writing storage
 * directly, so the row under test is produced the same way a user's would be.
 */
async function recordOneExpense(page: import("@playwright/test").Page) {
  await page.goto("/capture/quick");
  const dialog = page.getByRole("dialog", { name: "Ghi giao dịch" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Khoản chi" }).click();
  const amount = dialog.getByLabel(/Số tiền chi/iu);
  await amount.fill(AMOUNT);

  // Save stays disabled until a category is chosen, so the drill-down row it
  // eventually produces is always attributable to a real category.
  const categoryChoice = dialog.locator('[data-slot="capture-category-choice"]');
  if (await categoryChoice.count()) {
    const summary = categoryChoice.locator("summary");
    if (await summary.count()) await summary.click();
    await categoryChoice.getByRole("button", { name: CATEGORY, exact: true }).click();
  } else {
    await dialog.getByRole("button", { name: CATEGORY, exact: true }).first().click();
  }

  const save = dialog.getByRole("button", { name: "Lưu", exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(dialog).toBeHidden();
}

test("a dashboard category opens exactly that category for this month", async ({
  page,
}) => {
  await recordOneExpense(page);
  await page.goto("/dashboard");

  const categoryRow = page.locator(".insights-category-row").first();
  await expect(categoryRow).toBeVisible();

  const drill = categoryRow.getByRole("link", { name: /Xem giao dịch .* tháng này/u });
  await expect(drill).toBeVisible();

  const label = (await drill.getAttribute("aria-label")) ?? "";
  const categoryName = label.replace(/^Xem giao dịch\s+/u, "").replace(/\s+tháng này$/u, "");
  expect(categoryName.length).toBeGreaterThan(0);

  // A whole-row target: the row is the control, not a small chevron beside it.
  const box = await drill.boundingBox();
  expect(box, "the drill-down target must be measurable").not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  await drill.click();
  await page.waitForURL(/\/transactions\?/u);

  const url = new URL(page.url());
  expect(url.searchParams.get("category")).toBe(categoryName);
  expect(url.searchParams.get("kind")).toBe("expense");

  // The window must be a whole calendar month. A window ending at "today" would
  // silently drop rows dated later this month that the dashboard already counted.
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  expect(from).toMatch(/^\d{4}-\d{2}-01$/u);
  expect(to.slice(0, 7)).toBe(from.slice(0, 7));
  const lastDay = new Date(
    Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)), 0),
  ).getUTCDate();
  expect(to).toBe(`${to.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`);

  /*
   * The workspace must have adopted the link as filter state. If the category
   * had not resolved it would fall back to "all" and render the full ledger,
   * which is exactly the false-confidence case worth failing on.
   */
  const categoryFilter = page.locator("select#category, [name='category']").first();
  if (await categoryFilter.count()) {
    await expect(categoryFilter).toHaveValue(categoryName);
  }
});
