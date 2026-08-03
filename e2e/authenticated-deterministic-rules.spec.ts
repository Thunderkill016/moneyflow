import { expect, test } from "@playwright/test";

const RULES_KEY = "moneyflow-rules-v2";
const LEGACY_RULES_KEY = "moneyflow-rules-v1";

test.describe("Deterministic rules workspace", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(({ rulesKey, legacyKey }) => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
      window.localStorage.removeItem(rulesKey);
      window.localStorage.removeItem(legacyKey);
    }, { rulesKey: RULES_KEY, legacyKey: LEGACY_RULES_KEY });
  });

  test("creates, previews and disables a versioned demo rule without posting", async ({ page }) => {
    await page.goto("/rules");

    await expect(page.getByRole("heading", { name: "Quy tắc", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Thêm quy tắc", exact: true }).first().click();
    await page.getByLabel("Nếu chứa").fill("HIGHLANDS");
    await page.getByLabel("Thì danh mục").selectOption({ label: /Ăn uống/ });
    await page.getByLabel("Đổi tên nơi chi (tùy chọn)").fill("Highlands Coffee");
    await page.getByRole("button", { name: "Lưu quy tắc" }).click();

    await expect(page.getByText("“HIGHLANDS” → Highlands Coffee → Ăn uống")).toBeVisible();
    await expect(page.getByText("v1", { exact: true })).toBeVisible();

    await page.getByLabel("Nội dung mẫu").fill("highlands 45k");
    await expect(page.getByText(/Khớp v1:/)).toBeVisible();
    await expect(page.getByText(/không tự ghi vào sổ/i)).toBeVisible();

    await page.getByRole("button", { name: "Bật", exact: true }).click();
    await expect(page.getByText("Đã tắt", { exact: true })).toBeVisible();
    await expect(page.getByText("Không có quy tắc đang bật nào khớp nội dung này.")).toBeVisible();
  });

  test("reordering changes the deterministic winner", async ({ page }) => {
    await page.goto("/rules");

    await page.getByRole("button", { name: "Thêm quy tắc", exact: true }).first().click();
    await page.getByLabel("Nếu chứa").fill("SHOP");
    await page.getByLabel("Thì danh mục").selectOption({ label: /Ăn uống/ });
    await page.getByRole("button", { name: "Lưu quy tắc" }).click();

    await page.getByRole("button", { name: "Thêm quy tắc", exact: true }).first().click();
    await page.getByLabel("Nếu chứa").fill("SHOP");
    await page.getByLabel("Thì danh mục").selectOption({ label: /Mua sắm/ });
    await page.getByRole("button", { name: "Lưu quy tắc" }).click();

    await page.getByLabel("Nội dung mẫu").fill("SHOP ABC");
    await expect(page.getByText(/→ Ăn uống/).last()).toBeVisible();

    await page.getByRole("button", { name: /Tăng ưu tiên.*Mua sắm/ }).click();
    await expect(page.getByText(/Khớp v2:.*Mua sắm/)).toBeVisible();
  });

  test("keeps rule controls usable at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/rules");

    await expect(page.getByRole("heading", { name: "Quy tắc", exact: true })).toBeVisible();
    await expect(page.getByLabel("Nội dung mẫu")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
