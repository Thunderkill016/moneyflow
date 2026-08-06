import { expect, test } from "@playwright/test";

const RANGE = { from: "2026-07-01", to: "2026-07-31" };

function reportNotice(page: import("@playwright/test").Page) {
  return page.locator("main").getByRole("status");
}

function reportPeriodTitle(page: import("@playwright/test").Page) {
  return page.locator("#report-period-title > span").first();
}

function reportExport(
  page: import("@playwright/test").Page,
  href: string,
) {
  return page.locator(`a[href="${href}"]:visible`).first();
}

async function transactionCount(
  page: import("@playwright/test").Page,
): Promise<number> {
  const text = await page.locator('[data-slot="report-metrics"]').innerText();
  const match = text.match(/(\d+)\s+giao dịch/);
  expect(match, `expected a transaction count in: ${text}`).not.toBeNull();
  return Number(match![1]);
}

test.describe("reports custom range", () => {
  test("choosing a window changes the heading, the totals and the export link", async ({
    page,
  }) => {
    await page.goto("/reports?period=month", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByLabel("Chọn khoảng ngày")).toHaveCount(0);
    const presetCount = await transactionCount(page);

    await page.getByRole("link", { name: "Tự chọn", exact: true }).click();
    const form = page.getByLabel("Chọn khoảng ngày");
    await expect(form).toBeVisible();

    await form.locator("input[name='from']").fill(RANGE.from);
    await form.locator("input[name='to']").fill(RANGE.to);
    await form.getByRole("button", { name: "Áp dụng" }).click();

    await expect(page).toHaveURL(
      new RegExp(`period=custom.*from=${RANGE.from}.*to=${RANGE.to}`),
    );
    await expect(reportPeriodTitle(page)).toHaveText("1/7 – 31/7/2026");

    const href = `/reports/export?period=custom&from=${RANGE.from}&to=${RANGE.to}`;
    await expect(reportExport(page, href)).toHaveAttribute("href", href);

    const customCount = await transactionCount(page);
    expect(customCount).toBeGreaterThan(0);
    expect(customCount).not.toBe(presetCount);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(reportPeriodTitle(page)).toHaveText("1/7 – 31/7/2026");
  });

  test("a reversed window is repaired and the repair is stated", async ({
    page,
  }) => {
    await page.goto(
      `/reports?period=custom&from=${RANGE.to}&to=${RANGE.from}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(reportPeriodTitle(page)).toHaveText("1/7 – 31/7/2026");
    await expect(reportNotice(page)).toContainText("đổi thứ tự");
  });

  test("an unusable window falls back to the month preset and says so", async ({
    page,
  }) => {
    await page.goto("/reports?period=custom&from=2026-02-31&to=oops", {
      waitUntil: "domcontentloaded",
    });
    await expect(reportNotice(page)).toContainText("không hợp lệ");
    await expect(page.locator('[data-slot="report-metrics"]')).toBeVisible();
  });

  test("the export downloads the chosen window, not the month preset", async ({
    page,
  }) => {
    await page.goto(
      `/reports?period=custom&from=${RANGE.from}&to=${RANGE.to}`,
      { waitUntil: "domcontentloaded" },
    );
    const href = `/reports/export?period=custom&from=${RANGE.from}&to=${RANGE.to}`;
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      reportExport(page, href).click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `moneyflow-${RANGE.from}-${RANGE.to}.csv`,
    );
  });
});
