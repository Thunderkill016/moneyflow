import { expect, test } from "@playwright/test";

function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const absolute = year * 12 + month - 1 + offset;
  const nextYear = Math.floor(absolute / 12);
  const nextMonth = ((absolute % 12) + 12) % 12;
  return `${String(nextYear).padStart(4, "0")}-${String(nextMonth + 1).padStart(2, "0")}`;
}

function monthEnd(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

function monthInput(page: import("@playwright/test").Page) {
  return page.locator("input[name='month']");
}

function monthNotice(page: import("@playwright/test").Page) {
  return page.locator("main").getByRole("status");
}

test.describe("budget month history", () => {
  test("month navigation changes the workspace and keeps missing comparison truthful", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" });

    const currentMonth = await monthInput(page).inputValue();
    expect(currentMonth).toMatch(/^\d{4}-\d{2}$/);
    await expect(page.locator(".budget-card-grid .budget-category-card")).toHaveCount(3);
    await expect(page.locator(".budget-overview small").first()).not.toContainText(
      "Chưa có dữ liệu",
    );

    await page.getByRole("link", { name: "Tháng trước" }).click();
    const previousMonth = shiftMonth(currentMonth, -1);
    await expect(page).toHaveURL(new RegExp(`month=${previousMonth}`));
    await expect(monthInput(page)).toHaveValue(previousMonth);
    await expect(page.locator(".budget-card-grid .budget-category-card")).toHaveCount(3);

    // The demo has no data for the month before this selected previous month.
    // Missing comparison must stay missing rather than being treated as numeric zero.
    await expect(page.locator(".budget-overview small").first()).toContainText(
      "Chưa có dữ liệu tháng trước",
    );
  });

  test("category drill-down carries the exact selected month expense window", async ({ page }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" });
    const currentMonth = await monthInput(page).inputValue();
    const selectedMonth = shiftMonth(currentMonth, -1);
    await page.goto(`/budgets?month=${selectedMonth}`, { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: /Xem giao dịch danh mục/ }).first().click();
    const url = new URL(page.url());
    expect(url.pathname).toBe("/transactions");
    expect(url.searchParams.get("from")).toBe(`${selectedMonth}-01`);
    expect(url.searchParams.get("to")).toBe(monthEnd(selectedMonth));
    expect(url.searchParams.get("kind")).toBe("expense");
    expect(url.searchParams.get("category")).toBeTruthy();
  });

  test("invalid and future months are repaired with an explanation", async ({ page }) => {
    await page.goto("/budgets?month=2099-01", { waitUntil: "domcontentloaded" });
    await expect(monthNotice(page)).toContainText("Tháng tương lai");
    await expect(monthInput(page)).not.toHaveValue("2099-01");

    await page.goto("/budgets?month=2026-13", { waitUntil: "domcontentloaded" });
    await expect(monthNotice(page)).toContainText("không hợp lệ");
  });

  test("an older month renders an honest empty state and can receive its own budget", async ({
    page,
  }) => {
    await page.goto("/budgets", { waitUntil: "domcontentloaded" });
    const currentMonth = await monthInput(page).inputValue();
    const olderMonth = shiftMonth(currentMonth, -2);

    await page.goto(`/budgets?month=${olderMonth}`, { waitUntil: "domcontentloaded" });
    await expect(monthInput(page)).toHaveValue(olderMonth);
    await expect(page.getByRole("heading", { name: /Chưa có ngân sách cho/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Thêm ngân sách" }).first()).toBeEnabled();
  });
});
