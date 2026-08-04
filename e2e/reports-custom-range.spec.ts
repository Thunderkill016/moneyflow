import { expect, test } from "@playwright/test";

/**
 * Custom report window — post-MVP depth item 4.
 *
 * Drives the real form rather than asserting the URL builder: the value of this
 * feature is that a reader can pick two dates and get totals for exactly that
 * window, and only the browser can show whether the totals moved with them.
 */

/*
 * July 2026 on purpose: the demo fixture's transactions all fall there, so the
 * custom window has data while the month preset (August, at the time of writing)
 * has none. A window where both are empty would let this test pass on a page that
 * ignored the dates entirely.
 */
const RANGE = { from: "2026-07-01", to: "2026-07-31" };

/**
 * Scoped to `main` on purpose. The shell renders two other `role="status"`
 * regions — the demo banner and the toast — so an unscoped lookup resolves to
 * three elements and fails on strict mode rather than on the notice.
 */
function reportNotice(page: import("@playwright/test").Page) {
  return page.locator("main").getByRole("status");
}

/** Transactions counted inside the rendered window, from the metrics region. */
async function transactionCount(page: import("@playwright/test").Page): Promise<number> {
  const text = await page.locator(".report-metrics article").first().innerText();
  const match = text.match(/(\d+)\s+giao dịch/);
  expect(match, `expected a transaction count in: ${text}`).not.toBeNull();
  return Number(match![1]);
}

test.describe("reports custom range", () => {
  test("choosing a window changes the heading, the totals and the export link", async ({ page }) => {
    await page.goto("/reports?period=month", { waitUntil: "domcontentloaded" });

    // The preset view must not show the custom form until it is asked for.
    await expect(page.locator("form[aria-label='Chọn khoảng ngày']")).toHaveCount(0);
    const presetCount = await transactionCount(page);

    await page.getByRole("link", { name: "Tự chọn", exact: true }).click();
    const form = page.locator("form[aria-label='Chọn khoảng ngày']");
    await expect(form).toBeVisible();

    await form.locator("input[name='from']").fill(RANGE.from);
    await form.locator("input[name='to']").fill(RANGE.to);
    await form.getByRole("button", { name: "Áp dụng" }).click();

    // The window the reader chose is what the URL, the heading and the export carry.
    await expect(page).toHaveURL(new RegExp(`period=custom.*from=${RANGE.from}.*to=${RANGE.to}`));
    await expect(page.locator(".reports-period-pill")).toHaveText("1/7 – 31/7/2026");
    await expect(page.locator("a.report-export")).toHaveAttribute(
      "href",
      `/reports/export?period=custom&from=${RANGE.from}&to=${RANGE.to}`,
    );

    // Totals must be recomputed from the chosen window, not merely relabelled.
    // Asserting a concrete count rather than "different from before": the demo
    // fixture lives entirely in July, so a page that ignored the dates would show
    // the preset's count here and this would catch it.
    const customCount = await transactionCount(page);
    expect(customCount).toBeGreaterThan(0);
    expect(customCount).not.toBe(presetCount);

    // Reload proves the window survives in the URL alone, with no client state.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".reports-period-pill")).toHaveText("1/7 – 31/7/2026");
  });

  test("a reversed window is repaired and the repair is stated", async ({ page }) => {
    await page.goto(`/reports?period=custom&from=${RANGE.to}&to=${RANGE.from}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page.locator(".reports-period-pill")).toHaveText("1/7 – 31/7/2026");
    // Silence here would show different dates than were asked for, with no reason given.
    await expect(reportNotice(page)).toContainText("đổi thứ tự");
  });

  test("an unusable window falls back to the month preset and says so", async ({ page }) => {
    await page.goto("/reports?period=custom&from=2026-02-31&to=oops", {
      waitUntil: "domcontentloaded",
    });
    await expect(reportNotice(page)).toContainText("không hợp lệ");
    // Still a usable report rather than an error page.
    await expect(page.locator(".report-metrics article").first()).toBeVisible();
  });

  test("the export downloads the chosen window, not the month preset", async ({ page }) => {
    await page.goto(`/reports?period=custom&from=${RANGE.from}&to=${RANGE.to}`, {
      waitUntil: "domcontentloaded",
    });
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("a.report-export").click(),
    ]);
    expect(download.suggestedFilename()).toBe(`moneyflow-${RANGE.from}-${RANGE.to}.csv`);
  });
});
