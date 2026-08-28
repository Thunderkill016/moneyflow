import { expect, test, type Locator, type Page } from "@playwright/test";

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function fillHydratedConfirmation(
  confirmation: Locator,
  submit: Locator,
) {
  await expect
    .poll(
      async () => {
        if ((await confirmation.inputValue()) !== "XÓA") {
          await confirmation.fill("XÓA");
        }
        return {
          value: await confirmation.inputValue(),
          enabled: await submit.isEnabled(),
        };
      },
      { timeout: 15_000 },
    )
    .toEqual({ value: "XÓA", enabled: true });
}

test.describe("Phase 8 secondary and safety flows", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
  });

  test("keeps custom Reports range and export scope truthful", async ({
    page,
  }) => {
    await page.goto(
      "/reports?period=custom&from=2026-07-01&to=2026-07-31",
    );

    await expect(
      page.locator('[data-slot="reports-workspace"]'),
    ).toBeVisible();
    await expect(page.locator('[data-slot="report-periods"]')).toBeVisible();
    await expect(page.locator('[data-slot="report-metrics"]')).toBeVisible();
    await expect(
      page.getByText(/không phải bản sao lưu có thể khôi phục toàn bộ tài khoản/i),
    ).toBeVisible();
    await expect(page.getByLabel("Chọn khoảng ngày")).toBeVisible();
  });

  test("reviews category hide consequences and starts on cancel", async ({
    page,
  }) => {
    await page.goto("/categories");

    await expect(
      page.locator('[data-slot="categories-workspace"]'),
    ).toBeVisible();
    const firstCard = page.locator('[data-slot="category-card"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.getByRole("button", { name: /^Ẩn / }).click();

    const dialog = page.getByRole("dialog", { name: "Ẩn danh mục?" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator('[data-slot="category-review"]'),
    ).toContainText("Giao dịch, ngân sách và lịch sử cũ không bị xóa");
    await expect(dialog.getByRole("button", { name: "Hủy" })).toBeFocused();
  });

  test("shows low-confidence Inbox review and fail-closed grouped approval", async ({
    page,
  }) => {
    await page.goto("/inbox");

    await expect(page.locator('[data-slot="inbox-workspace"]')).toBeVisible();
    await page
      .getByRole("button", { name: /Highlands Coffee/ })
      .first()
      .click();

    const review = page.getByRole("dialog", { name: "Duyệt giao dịch" });
    await expect(review).toBeVisible();
    await expect(review).toContainText("Độ tin thấp");
    await review.getByRole("button", { name: "Hủy" }).click();

    await page.getByLabel("Chọn Highlands Coffee").check();
    await page.getByLabel("Chọn LUONG CT").check();
    const bulkBar = page.locator('[data-slot="inbox-bulk-review"]');
    await expect(bulkBar).toBeVisible();
    await expect(bulkBar).toContainText("Cần xem lại sẽ không được ghi sổ");

    // This selection contains no deterministic Ready candidate. The grouped
    // approval path must fail closed before a confirmation dialog can open.
    const reviewButton = bulkBar.getByRole("button", {
      name: "Xem lại",
      exact: true,
    });
    await expect(reviewButton).toBeDisabled();
    await expect(
      page.getByRole("dialog", { name: "Xác nhận hành động hàng loạt" }),
    ).toHaveCount(0);
  });

  test("states Rules and Imports remain review-first", async ({ page }) => {
    await page.goto("/rules");
    await expect(page.locator('[data-slot="rules-workspace"]')).toBeVisible();
    await expect(
      page.getByText(/không tự tạo giao dịch trong sổ/i),
    ).toBeVisible();

    await page.goto("/imports");
    await expect(page.locator('[data-slot="imports-workspace"]')).toBeVisible();
    await expect(
      page.getByText(/parse → xem trước → Inbox → duyệt → sổ/i),
    ).toBeVisible();
    await expect(
      page.getByText(/Xóa metadata không xóa giao dịch đã được duyệt vào sổ/i),
    ).toBeVisible();
  });

  test("states export and parser capability boundaries", async ({ page }) => {
    await page.goto("/settings/export");
    await expect(
      page.locator('[data-slot="settings-export-workspace"]'),
    ).toBeVisible();
    await expect(page.getByText(/chưa phải bản sao lưu đầy đủ/i)).toBeVisible();
    await expect(
      page.getByText(/Accounts, categories, budgets, goals/i),
    ).toBeVisible();

    await page.goto("/settings/privacy");
    await expect(
      page.locator('[data-slot="settings-privacy-workspace"]'),
    ).toBeVisible();
    const capability = page.locator(
      '[data-slot="privacy-capability-status"]',
    );
    await expect(capability).toContainText(
      "Chưa khả dụng · không ghi consent",
    );
    await expect(capability.locator('input[type="checkbox"]')).toBeDisabled();
    await expect(capability).toContainText("Chia sẻ mẫu đã ẩn danh");
  });

  test("requires typed confirmation then a final account-deletion review", async ({
    page,
  }) => {
    await page.goto("/settings/delete-account");

    await expect(
      page.locator('[data-slot="settings-delete-account-workspace"]'),
    ).toBeVisible();
    const main = page.getByRole("main");
    const confirmation = main.getByLabel("Gõ XÓA để xác nhận");
    const reviewSubmit = main.getByRole("button", {
      name: "Xem lại xóa",
      exact: true,
    });
    await fillHydratedConfirmation(confirmation, reviewSubmit);
    await reviewSubmit.click();

    const dialog = page.getByRole("dialog", {
      name: "Xóa vĩnh viễn tài khoản và dữ liệu?",
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator('[data-slot="delete-account-review"]'),
    ).toContainText("Dọn local stores sau kết quả máy chủ");
    await expect(dialog.getByRole("button", { name: "Hủy" })).toBeFocused();
  });

  test("renders partial deletion cleanup as an explicit receipt", async ({
    page,
  }) => {
    await page.goto(
      "/account-deletion-result?deleted=1&serverCleanup=unverified&localCleanup=partial&localFailed=2",
    );

    const main = page.getByRole("main");
    const receipt = main.locator('[data-slot="account-deletion-receipt"]');
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText("cleanup chưa xác minh đầy đủ");
    await expect(receipt).toContainText("2 khóa báo lỗi");
    await expect(
      main.getByRole("alert").filter({ hasText: "Cần kiểm tra thêm" }),
    ).toContainText("Cần kiểm tra thêm");
  });

  test("keeps critical Phase 8 pages within a 320px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    for (const route of [
      "/reports?period=custom&from=2026-07-01&to=2026-07-31",
      "/categories",
      "/inbox",
      "/settings/export",
      "/settings/privacy",
      "/settings/delete-account",
    ]) {
      await page.goto(route);
      await assertNoHorizontalOverflow(page);
    }
  });
});
