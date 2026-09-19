import { expect, test } from "@playwright/test";

test.describe("Vietnam bank-export guidance", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
  });

  test("shows conservative bank guidance without claiming live sync", async ({
    page,
  }) => {
    await page.goto("/capture/upload");

    await expect(
      page.getByRole("heading", { name: "Tải sao kê / file giao dịch" }),
    ).toBeVisible();

    const guidance = page.getByRole("region", {
      name: "Sao kê ngân hàng Việt Nam",
    });
    await expect(guidance).toBeVisible();
    await expect(guidance).toContainText(
      "MoneyFlow chưa tự nhận diện cấu trúc file theo ngân hàng",
    );
    await expect(guidance).toContainText(
      "ứng dụng không yêu cầu thông tin đăng nhập ngân hàng",
    );
    await expect(guidance).toContainText("Vietcombank:");
    await expect(guidance).toContainText("ACB:");
    await expect(guidance).toContainText("VietinBank:");
    await expect(guidance).toContainText(/mapping|parser|review/i);
    await expect(guidance).not.toContainText(/đã kết nối|live sync|đồng bộ tự động/i);
  });
});
