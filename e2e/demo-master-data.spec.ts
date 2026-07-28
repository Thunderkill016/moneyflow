import { expect, test } from "@playwright/test";

const ACCOUNT_NAME = "Ví kiểm thử bền vững";
const ACCOUNT_EDITED_NAME = "Ví kiểm thử đã sửa";
const CATEGORY_NAME = "Chi phí kiểm thử";
const CATEGORY_EDITED_NAME = "Chi phí đã sửa";
const EXPENSE_NOTE = "Giao dịch giữ tham chiếu";

test.describe("Demo master data persistence", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        if (window.localStorage.getItem("__mf_e2e_master_seeded") === "1") {
          return;
        }
        window.localStorage.clear();
        window.localStorage.setItem("moneyflow-demo-transactions-v1", "[]");
        window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
        window.localStorage.setItem("moneyflow-onboarding-done", "1");
        window.localStorage.setItem("__mf_e2e_master_seeded", "1");
      } catch {
        /* ignore */
      }
    });
  });

  test("account/category survive reload and remain valid transaction references", async ({
    page,
  }) => {
    await page.goto("/accounts");
    await page
      .getByRole("button", { name: "Thêm tài khoản", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    const accountDialog = page.getByRole("dialog", {
      name: "Thêm tài khoản",
    });
    await accountDialog.getByLabel("Tên tài khoản").fill(ACCOUNT_NAME);
    await accountDialog.getByLabel("Số dư ban đầu").fill("123000");
    await accountDialog
      .getByRole("button", { name: "Thêm tài khoản", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: ACCOUNT_NAME })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: ACCOUNT_NAME })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Tổng quan tài khoản" }),
    ).toContainText("1.249.000 ₫");
    await page
      .getByRole("button", { name: `Sửa ${ACCOUNT_NAME}`, exact: true })
      .click();
    const editAccountDialog = page.getByRole("dialog", {
      name: "Sửa tài khoản",
    });
    await editAccountDialog
      .getByLabel("Tên tài khoản")
      .fill(ACCOUNT_EDITED_NAME);
    await editAccountDialog.getByLabel("Số dư ban đầu").fill("133000");
    await editAccountDialog
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: ACCOUNT_EDITED_NAME }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Tổng quan tài khoản" }),
    ).toContainText("1.259.000 ₫");

    await page.goto("/categories");
    await page
      .getByRole("button", { name: "Thêm danh mục", exact: true })
      .filter({ visible: true })
      .first()
      .click();
    const categoryDialog = page.getByRole("dialog", {
      name: "Thêm danh mục",
    });
    await categoryDialog.getByLabel("Tên danh mục").fill(CATEGORY_NAME);
    await categoryDialog
      .getByRole("button", { name: "Thêm danh mục", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: CATEGORY_NAME }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: `Đổi tên ${CATEGORY_NAME}`,
        exact: true,
      })
      .click();
    const editCategoryDialog = page.getByRole("dialog", {
      name: "Đổi tên danh mục",
    });
    await editCategoryDialog
      .getByLabel("Tên danh mục")
      .fill(CATEGORY_EDITED_NAME);
    await editCategoryDialog
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: CATEGORY_EDITED_NAME }),
    ).toBeVisible();

    await page.goto("/capture/quick");
    await page.getByLabel("Số tiền chi (₫)").fill("50000");
    await page
      .getByRole("button", { name: CATEGORY_EDITED_NAME, exact: true })
      .click();
    await page
      .locator("#add-tx-account")
      .selectOption({ label: ACCOUNT_EDITED_NAME });
    await page.getByLabel("Ghi chú").fill(EXPENSE_NOTE);
    await page.getByRole("button", { name: "Lưu", exact: true }).click();

    await expect
      .poll(() =>
        page.evaluate(
          ({ accountName, categoryName, note }) => {
            const raw = window.localStorage.getItem(
              "moneyflow-demo-transactions-v1",
            );
            if (!raw) return false;
            const rows = JSON.parse(raw) as Array<{
              account?: string;
              category?: string;
              note?: string;
            }>;
            return rows.some(
              (row) =>
                row.account === accountName &&
                row.category === categoryName &&
                row.note === note,
            );
          },
          {
            accountName: ACCOUNT_EDITED_NAME,
            categoryName: CATEGORY_EDITED_NAME,
            note: EXPENSE_NOTE,
          },
        ),
      )
      .toBe(true);

    await page.goto("/accounts");
    await expect(
      page.getByRole("heading", { name: ACCOUNT_EDITED_NAME }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Tổng quan tài khoản" }),
    ).toContainText("1.209.000 ₫");

    await page.goto("/dashboard");
    await expect(page.getByLabel("Số dư tổng 1.209.000 ₫")).toBeVisible();
    await expect(
      page.locator(".transaction-row").filter({ hasText: EXPENSE_NOTE }),
    ).toContainText(CATEGORY_EDITED_NAME);

    page.once("dialog", (dialog) => dialog.accept());
    await page.goto("/categories");
    await page
      .getByRole("button", {
        name: `Ẩn ${CATEGORY_EDITED_NAME}`,
        exact: true,
      })
      .click();
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: `Hiện lại ${CATEGORY_EDITED_NAME}`,
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", {
        name: `Hiện lại ${CATEGORY_EDITED_NAME}`,
        exact: true,
      })
      .click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: CATEGORY_EDITED_NAME }),
    ).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", {
        name: `Ẩn ${CATEGORY_EDITED_NAME}`,
        exact: true,
      })
      .click();
    await page.reload();

    page.once("dialog", (dialog) => dialog.accept());
    await page.goto("/accounts");
    await page
      .getByRole("button", {
        name: `Lưu trữ ${ACCOUNT_EDITED_NAME}`,
        exact: true,
      })
      .click();
    await page.reload();
    await expect(
      page.getByText(ACCOUNT_EDITED_NAME, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Khôi phục", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Khôi phục", exact: true })
      .click();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: ACCOUNT_EDITED_NAME }),
    ).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", {
        name: `Lưu trữ ${ACCOUNT_EDITED_NAME}`,
        exact: true,
      })
      .click();
    await page.reload();

    await page.goto("/capture/quick");
    await expect(
      page.getByRole("button", {
        name: CATEGORY_EDITED_NAME,
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.locator("#add-tx-account option", {
        hasText: ACCOUNT_EDITED_NAME,
      }),
    ).toHaveCount(0);

    await page.goto("/dashboard");
    await expect(
      page.locator(".transaction-row").filter({ hasText: EXPENSE_NOTE }),
    ).toContainText(CATEGORY_EDITED_NAME);
  });
});
