import { expect, test } from "@playwright/test";

const DEMO_KEY = "moneyflow-account-reconciliation-v1:demo-account-mb";

test.describe("Account reconciliation workspace", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((storageKey) => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
      window.localStorage.removeItem(storageKey);
    }, DEMO_KEY);
  });

  test("starts, clears, completes and reopens an exact-zero demo statement", async ({ page }) => {
    await page.goto("/accounts/demo-account-mb/reconcile");

    await expect(
      page.getByRole("heading", { name: "Đối soát MB Bank" }),
    ).toBeVisible();
    await page.getByLabel("Ngày kết thúc sao kê").fill("2026-07-14");
    await page.getByLabel("Số dư cuối kỳ").fill("15.777.000");
    await page.getByRole("button", { name: "Mở kỳ đối soát" }).click();

    await expect(page.getByText("Kỳ sao kê 14/07/2026 đang mở")).toBeVisible();
    await page.getByRole("button", { name: "Đánh dấu đã khớp Cơm trưa" }).click();
    await page
      .getByRole("button", { name: "Đánh dấu đã khớp Đồ dùng cá nhân" })
      .click();
    await page
      .getByRole("button", { name: "Đánh dấu đã khớp Lương tháng 7" })
      .click();

    await expect(
      page.getByText("Đã khớp chính xác. Có thể hoàn tất."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Hoàn tất đối soát" }).click();

    await expect(page.getByRole("heading", { name: "Các kỳ đã hoàn tất" })).toBeVisible();
    await expect(page.getByText("1 kỳ", { exact: true })).toBeVisible();
    await expect(page.getByText("Kỳ sao kê 14/07/2026", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Mở lại kỳ gần nhất" }).click();
    await expect(page.getByText("Kỳ sao kê 14/07/2026 đang mở")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bỏ đánh dấu đã khớp Cơm trưa" }),
    ).toBeVisible();
  });

  test("does not enable completion while the statement difference is nonzero", async ({ page }) => {
    await page.goto("/accounts/demo-account-mb/reconcile");
    await page.getByLabel("Ngày kết thúc sao kê").fill("2026-07-14");
    await page.getByLabel("Số dư cuối kỳ").fill("15.777.000");
    await page.getByRole("button", { name: "Mở kỳ đối soát" }).click();

    await expect(
      page.getByRole("button", { name: "Hoàn tất đối soát" }),
    ).toBeDisabled();
    await expect(
      page.getByText("Tiếp tục đối chiếu giao dịch, không tự bù chênh lệch."),
    ).toBeVisible();
  });

  test("keeps the reconciliation form usable at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/accounts/demo-account-mb/reconcile");

    await expect(
      page.getByRole("heading", { name: "Đối soát MB Bank" }),
    ).toBeVisible();
    await expect(page.getByLabel("Ngày kết thúc sao kê")).toBeVisible();
    await expect(page.getByLabel("Số dư cuối kỳ")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("does not reveal an unknown account through the reconciliation route", async ({ page }) => {
    await page.goto("/accounts/not-a-viewer-account/reconcile");

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText("MB Bank", { exact: true })).toHaveCount(0);
  });
});
