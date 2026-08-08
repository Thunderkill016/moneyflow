import { expect, test } from "@playwright/test";

test.describe("Account deletion recent authentication", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
  });

  test("renders the explicit deletion step-up login without carrying destructive confirmation", async ({
    page,
  }) => {
    await page.goto(
      "/login?reauth=1&next=%2Fsettings%2Fdelete-account",
    );

    await expect(
      page.getByRole("heading", { name: "Xác nhận đây là bạn" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Xác thực lại với Google" }),
    ).toBeVisible();
    await expect(page.locator('input[name="reauth"]').first()).toHaveValue("1");
    await expect(
      page.getByRole("link", { name: /Quay lại xóa tài khoản/ }).first(),
    ).toHaveAttribute("href", "/settings/delete-account");
    await expect(page.getByPlaceholder("XÓA")).toHaveCount(0);
  });

  test("ordinary login can return an expired session to deletion without claiming step-up continuity", async ({
    page,
  }) => {
    await page.goto("/login?next=%2Fsettings%2Fdelete-account");

    await expect(
      page.getByRole("heading", { name: "Đăng nhập vào MoneyFlow" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tiếp tục với Google" }),
    ).toBeVisible();
    await expect(page.locator('input[name="reauth"]').first()).toHaveValue("0");
    await expect(page.getByPlaceholder("XÓA")).toHaveCount(0);
  });

  test("ignores reauth presentation for unrelated internal next paths", async ({ page }) => {
    await page.goto("/login?reauth=1&next=%2Fdashboard");

    await expect(
      page.getByRole("heading", { name: "Đăng nhập vào MoneyFlow" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tiếp tục với Google" }),
    ).toBeVisible();
    await expect(page.locator('input[name="reauth"]').first()).toHaveValue("0");
  });
});
