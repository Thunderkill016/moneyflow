import { expect, test } from "@playwright/test";

test.describe("Account register detail", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
  });

  test("opens a populated register from an account card", async ({ page }) => {
    await page.goto("/accounts");

    const openRegister = page.getByRole("link", { name: "Xem sổ MB Bank" });
    await expect(openRegister).toBeVisible();
    await openRegister.click();

    await expect(page).toHaveURL(/\/accounts\/demo-account-mb$/);
    await expect(page.getByRole("heading", { name: "MB Bank" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Tóm tắt tài khoản" }),
    ).toBeVisible();
    await expect(page.getByText("Cơm trưa", { exact: true })).toBeVisible();
    await expect(page.getByText("Lương tháng 7", { exact: true })).toBeVisible();
    await expect(page.getByText("Grab đi làm", { exact: true })).toBeHidden();
    await expect(page.getByText("Không gồm chuyển tiền nội bộ").first()).toBeVisible();
  });

  test("shows an honest empty register without inventing movement", async ({ page }) => {
    await page.goto("/accounts/demo-account-usd");

    await expect(page.getByRole("heading", { name: "USD du lịch" })).toBeVisible();
    await expect(
      page.getByText("Chưa có biến động trong tài khoản này", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("0 giao dịch", { exact: false })).toBeVisible();
  });

  test("keeps the account register usable at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/accounts/demo-account-mb");

    await expect(page.getByRole("heading", { name: "MB Bank" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Mở sổ giao dịch" }),
    ).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("does not reveal an unknown account", async ({ page }) => {
    await page.goto("/accounts/not-a-viewer-account");

    /*
     * Non-disclosure is asserted by the account name being absent, below. That
     * is the guarantee: invalid, missing and other-tenant ids all render the
     * same not-found page, so none is distinguishable from the others.
     *
     * The status code is deliberately NOT asserted. `notFound()` is called
     * correctly, but this route sits under `src/app/accounts/loading.tsx`, so
     * Next streams the document and has already flushed 200 by the time the
     * page throws. A 404 status is unreachable on any route with a loading
     * boundary above it, and removing that boundary to win a status code would
     * trade real perceived performance for a header nobody here reads. The
     * uniform 200 leaks nothing, because every unknown id gets the same one.
     *
     * The heading below replaces an assertion on Next's built-in 404 markup,
     * which stopped holding once MoneyFlow gained its own not-found boundary.
     */
    await expect(
      page.getByRole("heading", { name: "Không tìm thấy trang này" }),
    ).toBeVisible();
    await expect(page.getByText("MB Bank", { exact: true })).toHaveCount(0);
  });
});
