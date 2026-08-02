import { expect, test } from "@playwright/test";

const SEEDED_TRANSACTIONS = [
  {
    id: "range-small",
    kind: "expense",
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    note: "Cà phê đầu tháng",
    accountId: "demo-account-cash",
    account: "Tiền mặt",
    amount: 45_000,
    occurredOn: "2026-07-10",
    occurredAt: "2026-07-10T02:00:00.000Z",
    relativeDate: "10 thg 7",
  },
  {
    id: "range-middle",
    kind: "expense",
    categoryId: "demo-category-expense-Mua sắm",
    category: "Mua sắm",
    note: "Đi siêu thị",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 280_000,
    occurredOn: "2026-07-15",
    occurredAt: "2026-07-15T02:00:00.000Z",
    relativeDate: "15 thg 7",
  },
  {
    id: "range-transfer",
    kind: "transfer",
    categoryId: "transfer",
    category: "Chuyển tiền",
    note: "Chuyển sang ví",
    accountId: "demo-account-mb",
    account: "MB Bank",
    destinationAccountId: "demo-account-momo",
    destinationAccount: "MoMo",
    amount: 500_000,
    occurredOn: "2026-07-20",
    occurredAt: "2026-07-20T02:00:00.000Z",
    relativeDate: "20 thg 7",
  },
  {
    id: "range-income",
    kind: "income",
    categoryId: "demo-category-income-Lương",
    category: "Lương",
    note: "Lương tháng 7",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 15_000_000,
    occurredOn: "2026-07-25",
    occurredAt: "2026-07-25T02:00:00.000Z",
    relativeDate: "25 thg 7",
  },
];

test.describe("Transaction range filters", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((transactions) => {
      window.localStorage.clear();
      window.localStorage.setItem(
        "moneyflow-demo-transactions-v1",
        JSON.stringify(transactions),
      );
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    }, SEEDED_TRANSACTIONS);
  });

  test("filters inclusively and keeps the current context after correction", async ({
    page,
  }) => {
    await page.goto(
      "/transactions?from=2026-07-11&to=2026-07-20&min=200000&max=500000",
    );

    await expect(page.getByLabel("Từ ngày")).toHaveValue("2026-07-11");
    await expect(page.getByLabel("Đến ngày")).toHaveValue("2026-07-20");
    await expect(page.getByLabel("Số tiền tối thiểu")).toHaveValue("200.000");
    await expect(page.getByLabel("Số tiền tối đa")).toHaveValue("500.000");

    await expect(page.getByText("Đi siêu thị", { exact: true })).toBeVisible();
    await expect(page.getByText("Chuyển sang ví", { exact: true })).toBeVisible();
    await expect(page.getByText("Cà phê đầu tháng", { exact: true })).toBeHidden();
    await expect(page.getByText("Lương tháng 7", { exact: true })).toBeHidden();

    const summary = page.getByRole("region", { name: "Tóm tắt theo bộ lọc" });
    await expect(summary.getByText("2", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Sửa giao dịch Đi siêu thị" }).click();
    const dialog = page.getByRole("dialog", { name: "Sửa giao dịch" });
    await dialog.getByLabel(/^Số tiền/).fill("600000");
    await dialog.getByRole("button", { name: "Lưu thay đổi" }).click();

    await expect(page.getByText("Đi siêu thị", { exact: true })).toBeHidden();
    await expect(page.getByText(/Bộ lọc hiện tại vẫn được giữ/)).toBeVisible();
    await expect(page).toHaveURL(/from=2026-07-11/);
    await expect(page).toHaveURL(/max=500000/);
    await expect(summary.getByText("1", { exact: true })).toBeVisible();
  });

  test("shows a validation error instead of silently swapping invalid bounds", async ({
    page,
  }) => {
    await page.goto("/transactions");
    await page.getByLabel("Số tiền tối thiểu").fill("500000");
    await page.getByLabel("Số tiền tối đa").fill("100000");

    await expect(
      page
        .getByRole("alert")
        .filter({
          hasText:
            "Số tiền tối thiểu phải nhỏ hơn hoặc bằng số tiền tối đa.",
        }),
    ).toBeVisible();
    await expect(page.getByText("Không tìm thấy giao dịch")).toBeVisible();
  });
});
