import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { auditRoute, type AuditRoute } from "./responsive-audit";

const RICH_TRANSACTIONS = [
  {
    id: "ui-audit-rich-expense",
    kind: "expense",
    categoryId: "demo-category-expense-Nhà ở",
    category: "Nhà ở",
    note: "Thanh toán chi phí sửa chữa căn hộ và thay toàn bộ thiết bị điện trong phòng làm việc tại nhà",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 987_654_321,
    occurredOn: "2026-07-26",
    occurredAt: "2026-07-26T03:30:00.000Z",
    relativeDate: "Hôm nay",
  },
  {
    id: "ui-audit-rich-income",
    kind: "income",
    categoryId: "demo-category-income-Thu nhập khác",
    category: "Thu nhập khác",
    note: "Khoản thu dự án dài hạn với phần mô tả cố ý rất dài để kiểm tra cách giao diện xuống dòng",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 12_345_678_900,
    occurredOn: "2026-07-25",
    occurredAt: "2026-07-25T03:30:00.000Z",
    relativeDate: "Hôm qua",
  },
  {
    id: "ui-audit-rich-transfer",
    kind: "transfer",
    categoryId: "",
    category: "Chuyển tiền",
    note: "Chuyển quỹ dự phòng dài hạn sang ví thanh toán phụ để kiểm tra hiển thị hai tài khoản",
    accountId: "demo-account-mb",
    account: "MB Bank",
    destinationAccountId: "demo-account-momo",
    destinationAccount: "MoMo",
    amount: 4_567_890_123,
    occurredOn: "2026-07-24",
    occurredAt: "2026-07-24T03:30:00.000Z",
    relativeDate: "24 thg 7",
  },
] as const;

const LONG_NOTE =
  "Bữa ăn làm việc với nhóm sản phẩm và đối tác triển khai, ghi chú cố ý dài để kiểm tra xuống dòng trên điện thoại nhỏ";

async function seedRichState(page: Page): Promise<void> {
  await page.addInitScript((transactions) => {
    try {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-demo-transactions-v1", JSON.stringify(transactions));
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    } catch {
      // Same-origin storage becomes available on the first product navigation.
    }
  }, RICH_TRANSACTIONS);
}

async function attachState(page: Page, testInfo: TestInfo, label: string): Promise<void> {
  const state = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
  }));
  const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
  await testInfo.attach(`${label}-${testInfo.project.name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach(`${label}-${testInfo.project.name}.json`, {
    body: Buffer.from(JSON.stringify(state, null, 2)),
    contentType: "application/json",
  });
  expect(
    state.documentWidth,
    `${label} document width ${state.documentWidth}px exceeds viewport ${state.viewportWidth}px`,
  ).toBeLessThanOrEqual(state.viewportWidth + 2);
}

const RICH_ROUTES: AuditRoute[] = [
  { label: "insights-rich-money", path: "/insights" },
  { label: "transactions-rich-money", path: "/transactions" },
  { label: "reports-rich-money", path: "/reports" },
];

test.describe("large VND and long Vietnamese content", () => {
  test.beforeEach(async ({ page }) => {
    await seedRichState(page);
  });

  for (const route of RICH_ROUTES) {
    test(`${route.label} remains usable`, async ({ page }, testInfo) => {
      await auditRoute(page, testInfo, route);
      await expect(page.getByText("987.654.321", { exact: false }).first()).toBeVisible();
    });
  }

  test("quick capture remains usable with a large amount and long note", async ({ page }, testInfo) => {
    await page.goto("/capture/quick", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

    const amount = page.getByLabel(/Số tiền chi/i);
    await expect(amount).toBeVisible();
    await amount.fill("987654321");
    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
    await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(LONG_NOTE);

    await expect(page.getByRole("button", { name: /^Lưu/i })).toBeVisible();
    await expect(page.getByPlaceholder("Ví dụ: Cơm trưa")).toHaveValue(LONG_NOTE);
    await attachState(page, testInfo, "quick-capture-rich-input");
  });
});
