import { expect, test } from "@playwright/test";

const SEEDED_TRANSACTIONS = [
  {
    id: "review-expense-one",
    kind: "expense",
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    note: "Cà phê cần sửa",
    accountId: "demo-account-cash",
    account: "Tiền mặt",
    amount: 45_000,
    occurredOn: "2026-08-03",
    occurredAt: "2026-08-03T01:00:00.000Z",
    relativeDate: "Hôm nay",
    reviewStatus: "reviewed",
  },
  {
    id: "review-expense-two",
    kind: "expense",
    categoryId: "demo-category-expense-Ăn uống",
    category: "Ăn uống",
    note: "Bữa trưa cần sửa",
    accountId: "demo-account-cash",
    account: "Tiền mặt",
    amount: 85_000,
    occurredOn: "2026-08-03",
    occurredAt: "2026-08-03T00:30:00.000Z",
    relativeDate: "Hôm nay",
    reviewStatus: "reviewed",
  },
  {
    id: "review-income",
    kind: "income",
    categoryId: "demo-category-income-Lương",
    category: "Lương",
    note: "Lương tháng 8",
    accountId: "demo-account-mb",
    account: "MB Bank",
    amount: 15_000_000,
    occurredOn: "2026-08-02",
    occurredAt: "2026-08-02T02:00:00.000Z",
    relativeDate: "Hôm qua",
    reviewStatus: "reviewed",
  },
  {
    id: "review-transfer",
    kind: "transfer",
    categoryId: "",
    category: "Chuyển tiền",
    note: "Chuyển sang ví",
    accountId: "demo-account-mb",
    account: "MB Bank",
    destinationAccountId: "demo-account-momo",
    destinationAccount: "MoMo",
    amount: 500_000,
    occurredOn: "2026-08-01",
    occurredAt: "2026-08-01T02:00:00.000Z",
    relativeDate: "1 thg 8",
    reviewStatus: "reviewed",
  },
];

test.describe("Transaction review and bounded bulk correction", () => {
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

  test("reviews and corrects selected expenses while blocking mixed selections", async ({
    page,
  }) => {
    await page.goto("/transactions");

    await page.getByLabel("Chọn giao dịch Cà phê cần sửa").check();
    await page.getByLabel("Chọn giao dịch Bữa trưa cần sửa").check();
    await expect(page.getByText("Đã chọn 2 giao dịch")).toBeVisible();

    await page
      .getByRole("button", { name: "Chuyển sang cần kiểm tra" })
      .click();
    await expect(page.getByText(/Đã chuyển 2 giao dịch/)).toBeVisible();

    await page
      .getByLabel("Lọc theo trạng thái kiểm tra")
      .selectOption("needs_review");
    await expect(page).toHaveURL(/review=needs_review/);
    await expect(page.getByText("Cà phê cần sửa", { exact: true })).toBeVisible();
    await expect(page.getByText("Bữa trưa cần sửa", { exact: true })).toBeVisible();
    await expect(page.getByText("Lương tháng 8", { exact: true })).toBeHidden();

    await page.getByRole("button", { name: "Chọn đang hiện" }).click();
    await page
      .getByLabel("Danh mục mới cho giao dịch đã chọn")
      .selectOption({ label: "Mua sắm" });
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Đổi danh mục" }).click();
    await expect(page.getByText(/Đã đổi danh mục cho 2 giao dịch/)).toBeVisible();

    const coffeeRow = page
      .getByText("Cà phê cần sửa", { exact: true })
      .locator("xpath=ancestor::article");
    const lunchRow = page
      .getByText("Bữa trưa cần sửa", { exact: true })
      .locator("xpath=ancestor::article");
    await expect(coffeeRow).toContainText("Mua sắm");
    await expect(lunchRow).toContainText("Mua sắm");

    await page.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await page.getByLabel("Chọn giao dịch Cà phê cần sửa").check();
    await page.getByLabel("Chọn giao dịch Chuyển sang ví").check();
    await expect(
      page.getByText("Không đổi danh mục hàng loạt cho giao dịch chuyển tiền."),
    ).toBeVisible();
    await expect(
      page.getByLabel("Danh mục mới cho giao dịch đã chọn"),
    ).toBeDisabled();
    await expect(page.getByRole("button", { name: "Đổi danh mục" })).toBeDisabled();
  });
});
