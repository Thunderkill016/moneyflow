import { readFile } from "node:fs/promises";
import { parseCsvMatrix } from "../src/lib/inbox/parse-csv.ts";
import { demoAccountRows } from "../src/lib/demo/transaction-fixtures.ts";
import type { Transaction } from "../src/lib/transactions/contracts.ts";
import { expect, test } from "@playwright/test";
import { formatReportPeriodTitle } from "../src/lib/reports.ts";
import { todayInVietnam } from "../src/lib/vietnam-date.ts";

/*
 * Derived from today, not pinned to a month the demo happened to sit in. The
 * fixture now dates its rows relative to the current date, so a fixed July
 * window became empty and the assertions below stopped meaning anything.
 *
 * The window is [8 days ago, 2 days ago] on purpose: it always contains the
 * demo salary row (4 days ago) and never contains the two rows dated today, so
 * its count is at least one and always differs from the month preset, whatever
 * day this runs.
 */
function shiftDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return new Date(date.getTime() - days * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const TODAY = todayInVietnam();
const RANGE = { from: shiftDays(TODAY, 8), to: shiftDays(TODAY, 2) };
const RANGE_TITLE = formatReportPeriodTitle("custom", RANGE.from, RANGE.to);

function reportNotice(page: import("@playwright/test").Page) {
  return page.locator("main").getByRole("status");
}

function reportPeriodTitle(page: import("@playwright/test").Page) {
  return page.locator("#report-period-title > span").first();
}

function reportExport(page: import("@playwright/test").Page) {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Xuất CSV", exact: true });
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
    await expect(reportPeriodTitle(page)).toHaveText(RANGE_TITLE);

    await expect(reportExport(page)).toBeEnabled();

    const customCount = await transactionCount(page);
    expect(customCount).toBeGreaterThan(0);
    expect(customCount).not.toBe(presetCount);

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(reportPeriodTitle(page)).toHaveText(RANGE_TITLE);
  });

  test("a reversed window is repaired and the repair is stated", async ({
    page,
  }) => {
    await page.goto(
      `/reports?period=custom&from=${RANGE.to}&to=${RANGE.from}`,
      { waitUntil: "domcontentloaded" },
    );
    await expect(reportPeriodTitle(page)).toHaveText(RANGE_TITLE);
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
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto(
      `/reports?period=custom&from=${RANGE.from}&to=${RANGE.to}`,
      { waitUntil: "domcontentloaded" },
    );
    const exportLink = reportExport(page);
    await expect(exportLink).toBeVisible();
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      exportLink.click(),
    ]);
    expect(download.suggestedFilename()).toBe(
      `moneyflow-${RANGE.from}-${RANGE.to}.csv`,
    );
  });
});

test("demo report CSV follows added, corrected and removed ledger rows after reload", async ({
  page,
}) => {
  const expense: Transaction = {
    id: "synthetic-report-expense",
    kind: "expense",
    categoryId: "cat-food",
    category: "Ăn uống",
    note: "Synthetic report parity",
    accountId: "demo-account-cash",
    account: "Tiền mặt",
    amount: 777_000,
    occurredOn: RANGE.to,
    occurredAt: `${RANGE.to}T05:00:00.000Z`,
    relativeDate: "Ngày thử nghiệm",
  };
  const income: Transaction = {
    ...expense,
    id: "synthetic-income",
    kind: "income",
    categoryId: "cat-salary",
    category: "Lương",
    note: "Synthetic income",
    amount: 900_000,
  };
  const transfer: Transaction = {
    ...expense,
    id: "synthetic-transfer",
    kind: "transfer",
    category: "Chuyển tiền",
    note: "Synthetic transfer",
    amount: 50_000,
    destinationAccountId: "demo-account-mb",
    destinationAccount: "MB Bank",
  };
  const outside: Transaction = {
    ...expense,
    id: "outside-window",
    note: "Outside report window",
    occurredOn: TODAY,
  };
  const phases = [
    {
      ledger: [expense, income, transfer, outside],
      expense: 777_000,
      count: 3,
    },
    {
      ledger: [
        { ...expense, amount: 40_000, note: "Corrected synthetic report" },
        income,
        transfer,
        outside,
      ],
      expense: 40_000,
      count: 3,
    },
    { ledger: [income, transfer, outside], expense: 0, count: 2 },
    { ledger: [], expense: 0, count: 0 },
  ];
  await page.goto(`/reports?period=custom&from=${RANGE.from}&to=${RANGE.to}`);
  for (const phase of phases) {
    await page.evaluate(
      (ledger) =>
        localStorage.setItem(
          "moneyflow-demo-transactions-v1",
          JSON.stringify(ledger),
        ),
      phase.ledger,
    );
    await page.reload();
    const button = reportExport(page);
    await expect(button).toBeEnabled();
    await expect.poll(() => transactionCount(page)).toBe(phase.count);
    const expenseLabel = `Tiền ra Chi trừ ${new Intl.NumberFormat("vi-VN").format(phase.expense)} ₫`;
    await expect(
      page
        .locator('[data-slot="report-metrics"]')
        .getByLabel(expenseLabel, { exact: true }),
    ).toBeVisible();
    const expected = phase.ledger.filter(
      (row) => row.occurredOn >= RANGE.from && row.occurredOn <= RANGE.to,
    );
    // Two independent clicks must each download the current hydrated snapshot.
    for (let repeat = 0; repeat < 2; repeat += 1) {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        button.click(),
      ]);
      expect(download.suggestedFilename()).toBe(
        `moneyflow-${RANGE.from}-${RANGE.to}.csv`,
      );
      const path = await download.path();
      expect(path).not.toBeNull();
      const rows = parseCsvMatrix(await readFile(path!, "utf8")).slice(1);
      expect(rows.map((row) => [row[0], row[2], Number(row[6])])).toEqual(
        expected.map((row) => [
          row.occurredOn,
          row.note,
          row.kind === "expense" ? -row.amount : row.amount,
        ]),
      );
      const expenseTotal = rows
        .filter((row) => row[1] === "Chi tiêu")
        .reduce((sum, row) => sum - Number(row[6]), 0);
      expect(expenseTotal).toBe(phase.expense);
    }
  }
  const direct = await page.request.get("/reports/export?period=month");
  expect(direct.status()).toBe(409);
  expect(await direct.text()).toContain("Dữ liệu demo nằm trên thiết bị");
});

test("unsafe demo net worth keeps reports and CSV usable without changing stored balances", async ({
  page,
}) => {
  await page.goto(`/reports?period=custom&from=${RANGE.from}&to=${RANGE.to}`);
  const accounts = demoAccountRows.map(({ balance, ...metadata }) => {
    void balance;
    return metadata;
  });
  accounts.push({
    ...accounts[0],
    id: "11111111-1111-4111-8111-111111111111",
    name: "Synthetic maximum balance",
    initialBalance: Number.MAX_SAFE_INTEGER,
  });
  const raw = JSON.stringify({ version: 1, accounts });
  await page.evaluate(
    (value) => localStorage.setItem("moneyflow-demo-accounts-v1", value),
    raw,
  );
  await page.reload();
  await expect(page.locator('[data-slot="report-balance"]')).toContainText(
    "Không thể tính hoặc tải dữ liệu số dư",
  );
  await expect(page.locator('[data-slot="report-metrics"]')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    reportExport(page).click(),
  ]);
  expect(download.suggestedFilename()).toBe(
    `moneyflow-${RANGE.from}-${RANGE.to}.csv`,
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("moneyflow-demo-accounts-v1"),
    ),
  ).toBe(raw);
});
