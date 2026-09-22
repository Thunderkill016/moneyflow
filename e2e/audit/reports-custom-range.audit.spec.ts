import { expect, test } from "@playwright/test";
import { formatReportPeriodTitle } from "../../src/lib/reports.ts";
import { todayInVietnam } from "../../src/lib/vietnam-date.ts";

/**
 * Custom report window — post-MVP depth item 4.
 *
 * Drives the real form rather than asserting the URL builder: the value of this
 * feature is that a reader can pick two dates and get totals for exactly that
 * window, and only the browser can show whether the totals moved with them.
 */

/*
 * Derived from today, not pinned to a month the demo happened to sit in. The
 * fixture dates its rows relative to the current date, so a fixed July window
 * became empty and the assertions below stopped meaning anything.
 *
 * The window is [8 days ago, 2 days ago] on purpose: it always contains the
 * demo salary row (4 days ago) and never contains the two rows dated today, so
 * its count is at least one and always differs from the month preset, whatever
 * day this runs.
 */
function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return new Date(date.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

const TODAY = todayInVietnam();
const RANGE = { from: shiftDays(TODAY, 8), to: shiftDays(TODAY, 2) };
const RANGE_TITLE = formatReportPeriodTitle("custom", RANGE.from, RANGE.to);

/**
 * Scoped to `main` on purpose. The shell renders two other `role="status"`
 * regions — the demo banner and the toast — so an unscoped lookup resolves to
 * three elements and fails on strict mode rather than on the notice.
 */
function reportNotice(page: import("@playwright/test").Page) {
  return page.locator("main").getByRole("status");
}

/** The resolved window's heading — a pill inside the labelled period block. */
function reportPeriodTitle(page: import("@playwright/test").Page) {
  return page.locator("#report-period-title > span").first();
}

/** The export anchor carrying exactly the href the page resolved. */
function reportExport(page: import("@playwright/test").Page, href: string) {
  return page.locator(`a[href="${href}"]`).first();
}

/** Transactions counted inside the rendered window, from the metrics region. */
async function transactionCount(page: import("@playwright/test").Page): Promise<number> {
  const text = await page.locator('[data-slot="report-metrics"]').innerText();
  const match = text.match(/(\d+)\s+giao dịch/);
  expect(match, `expected a transaction count in: ${text}`).not.toBeNull();
  return Number(match![1]);
}

test.describe("reports custom range", () => {
  test("choosing a window changes the heading, the totals and the export link", async ({ page }) => {
    await page.goto("/reports?period=month", { waitUntil: "domcontentloaded" });

    // The preset view must not show the custom form until it is asked for.
    await expect(page.getByLabel("Chọn khoảng ngày")).toHaveCount(0);
    const presetCount = await transactionCount(page);

    await page.getByRole("link", { name: "Tự chọn", exact: true }).click();
    const form = page.getByLabel("Chọn khoảng ngày");
    await expect(form).toBeVisible();

    await form.locator("input[name='from']").fill(RANGE.from);
    await form.locator("input[name='to']").fill(RANGE.to);
    await form.getByRole("button", { name: "Áp dụng" }).click();

    // The window the reader chose is what the URL, the heading and the export carry.
    await expect(page).toHaveURL(new RegExp(`period=custom.*from=${RANGE.from}.*to=${RANGE.to}`));
    await expect(reportPeriodTitle(page)).toHaveText(RANGE_TITLE);
    const exportHref = `/reports/export?period=custom&from=${RANGE.from}&to=${RANGE.to}`;
    await expect(reportExport(page, exportHref)).toHaveAttribute("href", exportHref);

    // Totals must be recomputed from the chosen window, not merely relabelled.
    // A page that ignored the dates would show the preset's count here, and the
    // fixture guarantees the window's count differs from it.
    const customCount = await transactionCount(page);
    expect(customCount).toBeGreaterThan(0);
    expect(customCount).not.toBe(presetCount);

    // Reload proves the window survives in the URL alone, with no client state.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(reportPeriodTitle(page)).toHaveText(RANGE_TITLE);
  });

  test("a reversed window is repaired and the repair is stated", async ({ page }) => {
    await page.goto(`/reports?period=custom&from=${RANGE.to}&to=${RANGE.from}`, {
      waitUntil: "domcontentloaded",
    });
    await expect(reportPeriodTitle(page)).toHaveText(RANGE_TITLE);
    // Silence here would show different dates than were asked for, with no reason given.
    await expect(reportNotice(page)).toContainText("đổi thứ tự");
  });

  test("an unusable window falls back to the month preset and says so", async ({ page }) => {
    await page.goto("/reports?period=custom&from=2026-02-31&to=oops", {
      waitUntil: "domcontentloaded",
    });
    await expect(reportNotice(page)).toContainText("không hợp lệ");
    // Still a usable report rather than an error page.
    await expect(page.locator('[data-slot="report-metrics"]')).toBeVisible();
  });

  test("the export downloads the chosen window, not the month preset", async ({ page }) => {
    // The shell collapses the primary action on narrow viewports, so this test
    // needs a desktop width regardless of the project it runs under.
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(`/reports?period=custom&from=${RANGE.from}&to=${RANGE.to}`, {
      waitUntil: "domcontentloaded",
    });
    const href = `/reports/export?period=custom&from=${RANGE.from}&to=${RANGE.to}`;
    const exportLink = reportExport(page, href);
    await expect(exportLink).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportLink.click(),
    ]);
    expect(download.suggestedFilename()).toBe(`moneyflow-${RANGE.from}-${RANGE.to}.csv`);
  });
});
