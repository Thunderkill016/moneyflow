import { expect, test } from "@playwright/test";

const RULES_KEY = "moneyflow-rules-v2";
const LEGACY_RULES_KEY = "moneyflow-rules-v1";
const CANDIDATES_KEY = "moneyflow-inbox-candidates-v1";
const RESET_GUARD_KEY = "moneyflow-rules-e2e-reset";

async function createDemoRule(
  page: import("@playwright/test").Page,
  input: { contains: string; categoryLabel: string; merchant?: string },
) {
  await page.goto("/rules");
  await page
    .getByRole("button", { name: "Thêm quy tắc", exact: true })
    .first()
    .click();
  await page.getByLabel("Nếu chứa").fill(input.contains);
  await page
    .getByLabel("Thì danh mục")
    .selectOption({ label: input.categoryLabel });
  if (input.merchant) {
    await page.getByLabel("Đổi tên nơi chi (tùy chọn)").fill(input.merchant);
  }
  await page.getByRole("button", { name: "Lưu quy tắc" }).click();
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

    await expect(
      page.getByText("“HIGHLANDS” → Highlands Coffee → Ăn uống"),
    ).toBeVisible();
    await expect(page.getByText("v1", { exact: true })).toBeVisible();

    await page.getByLabel("Nội dung mẫu").fill("highlands 45k");
    await expect(page.getByText(/Khớp v1:/)).toBeVisible();
    await expect(page.getByText(/không tự ghi vào sổ/i)).toBeVisible();

    await page.getByRole("button", { name: "Bật", exact: true }).click();
    await expect(page.getByText("Đã tắt", { exact: true })).toBeVisible();
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

    await page.goto("/capture/paste");
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
    await expect(page.getByText(/→ Ăn uống/).last()).toBeVisible();

    await page
      .getByRole("button", { name: /Tăng ưu tiên.*Mua sắm/ })
      .click();
    await expect(page.getByText(/Khớp v2:.*Mua sắm/)).toBeVisible();
  });

  test("keeps rule controls usable at phone width", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/rules");

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
