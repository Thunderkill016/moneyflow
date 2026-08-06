import { expect, test, type Page } from "@playwright/test";

const RULES_KEY = "moneyflow-rules-v2";
const LEGACY_RULES_KEY = "moneyflow-rules-v1";
const CANDIDATES_KEY = "moneyflow-inbox-candidates-v1";
const RESET_GUARD_KEY = "moneyflow-rules-e2e-reset";

async function createDemoRule(
  page: Page,
  input: { contains: string; categoryLabel: string; merchant?: string },
) {
  await page.goto("/rules", { waitUntil: "domcontentloaded" });
  await page
    .getByRole("button", { name: "Thêm quy tắc", exact: true })
    .first()
    .click();

  const dialog = page.getByRole("dialog", { name: "Thêm quy tắc" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Nếu chứa").fill(input.contains);
  await dialog
    .getByLabel("Thì danh mục")
    .selectOption({ label: input.categoryLabel });
  if (input.merchant) {
    await dialog
      .getByLabel("Đổi tên nơi giao dịch (tùy chọn)")
      .fill(input.merchant);
  }
  await dialog.getByRole("button", { name: "Lưu quy tắc" }).click();
  await expect(dialog).toBeHidden();
}

test.describe("Deterministic rules workspace", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(
      ({ rulesKey, legacyKey, candidatesKey, resetGuardKey }) => {
        if (window.sessionStorage.getItem(resetGuardKey) === "1") return;
        window.sessionStorage.setItem(resetGuardKey, "1");
        window.localStorage.clear();
        window.localStorage.setItem(candidatesKey, "[]");
        window.localStorage.setItem("moneyflow-onboarding-done", "1");
        window.localStorage.removeItem(rulesKey);
        window.localStorage.removeItem(legacyKey);
      },
      {
        rulesKey: RULES_KEY,
        legacyKey: LEGACY_RULES_KEY,
        candidatesKey: CANDIDATES_KEY,
        resetGuardKey: RESET_GUARD_KEY,
      },
    );
  });

  test("creates, previews and disables a versioned demo rule without posting", async ({
    page,
  }) => {
    await createDemoRule(page, {
      contains: "HIGHLANDS",
      categoryLabel: "Ăn uống · Tiền ra",
      merchant: "Highlands Coffee",
    });

    const rule = page
      .locator('[data-slot="rules-list"] li')
      .filter({ hasText: "Highlands Coffee" });
    await expect(rule).toContainText("Ăn uống");
    await expect(rule).toContainText("Phiên bản 1");

    await page.getByLabel("Nội dung mẫu").fill("highlands 45k");
    const preview = page
      .locator("main")
      .getByRole("status")
      .filter({ hasText: "Khớp quy tắc ưu tiên v1:" });
    await expect(preview).toContainText("Highlands Coffee");
    await expect(page.getByText(/không tự tạo giao dịch trong sổ/i)).toBeVisible();

    await rule.getByRole("button", { name: "Tắt", exact: true }).click();
    await expect(rule).toContainText("Đã tắt");
    await expect(
      page.getByText("Không có quy tắc đang bật nào khớp nội dung này."),
    ).toBeVisible();
  });

  test("retains the exact demo rule revision on a pasted candidate", async ({
    page,
  }) => {
    await createDemoRule(page, {
      contains: "HIGHLANDS",
      categoryLabel: "Ăn uống · Tiền ra",
      merchant: "Highlands Coffee",
    });

    await page.goto("/capture/paste", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Áp dụng quy tắc danh mục")).toBeVisible();
    await page.getByLabel("Nội dung").fill("HIGHLANDS 45k");
    await page.getByRole("button", { name: "Phân tích", exact: true }).click();
    await expect(page.getByText("Ăn uống · v1", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Vào Inbox", exact: true }).click();
    await expect(page).toHaveURL(/\/inbox$/);

    const evidence = await page.evaluate((storageKey) => {
      const candidates = JSON.parse(
        window.localStorage.getItem(storageKey) ?? "[]",
      ) as Array<Record<string, unknown>>;
      return {
        ruleId: candidates[0]?.appliedRuleId,
        ruleVersion: candidates[0]?.appliedRuleVersion,
        merchant: candidates[0]?.merchant,
        category: candidates[0]?.category,
      };
    }, CANDIDATES_KEY);

    expect(evidence.ruleId).toEqual(expect.any(String));
    expect(evidence.ruleVersion).toBe(1);
    expect(evidence.merchant).toBe("Highlands Coffee");
    expect(evidence.category).toBe("Ăn uống");
  });

  test("reordering changes the deterministic winner", async ({ page }) => {
    await createDemoRule(page, {
      contains: "SHOP",
      categoryLabel: "Ăn uống · Tiền ra",
    });
    await createDemoRule(page, {
      contains: "SHOP",
      categoryLabel: "Mua sắm · Tiền ra",
    });

    await page.getByLabel("Nội dung mẫu").fill("SHOP ABC");
    const initialPreview = page
      .locator("main")
      .getByRole("status")
      .filter({ hasText: "Khớp quy tắc ưu tiên" });
    await expect(initialPreview).toContainText("Ăn uống");

    await page
      .getByRole("button", { name: /Tăng ưu tiên.*Mua sắm/ })
      .click();
    const reorderedPreview = page
      .locator("main")
      .getByRole("status")
      .filter({ hasText: "Khớp quy tắc ưu tiên v2:" });
    await expect(reorderedPreview).toContainText("Mua sắm");
  });

  test("keeps rule controls usable at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/rules", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Quy tắc", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Nội dung mẫu")).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
