import { expect, test, type Locator, type Page } from "@playwright/test";

const RULES_KEY = "moneyflow-rules-v2";
const LEGACY_RULES_KEY = "moneyflow-rules-v1";
const CANDIDATES_KEY = "moneyflow-inbox-candidates-v1";
const RESET_GUARD_KEY = "moneyflow-rules-e2e-reset";
const RULE_DIALOG_ATTEMPT_TIMEOUT_MS = 1_000;
const RULE_DIALOG_HYDRATION_TIMEOUT_MS = 15_000;

async function firstVisibleLocator(locators: Locator): Promise<Locator | null> {
  const count = await locators.count();
  for (let index = 0; index < count; index += 1) {
    const locator = locators.nth(index);
    if (await locator.isVisible()) return locator;
  }
  return null;
}

async function createDemoRule(
  page: Page,
  input: { contains: string; categoryLabel: string; merchant?: string },
) {
  await page.goto("/rules", { waitUntil: "domcontentloaded" });
  const addRuleButtons = page.getByRole("button", {
    name: "Thêm quy tắc",
    exact: true,
  });
  const dialog = page.getByRole("dialog", { name: "Thêm quy tắc" });
  // The action moves between the main empty state and app header by viewport and
  // rule count; its SSR markup becomes actionable only after client hydration.
  await expect(async () => {
    const addRule = await firstVisibleLocator(addRuleButtons);
    expect(addRule).not.toBeNull();
    if (!(await dialog.isVisible())) await addRule!.click();
    await expect(dialog).toBeVisible({ timeout: RULE_DIALOG_ATTEMPT_TIMEOUT_MS });
  }).toPass({ timeout: RULE_DIALOG_HYDRATION_TIMEOUT_MS });
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

  test("retains the exact demo rule revision on a shared candidate without posting", async ({
    page,
  }) => {
    await createDemoRule(page, {
      contains: "HIGHLANDS",
      categoryLabel: "Ăn uống · Tiền ra",
      merchant: "Highlands Coffee",
    });

    await page.goto("/capture/share?text=HIGHLANDS+45k", {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(/\/inbox$/);

    const evidence = await page.evaluate((storageKey) => {
      const candidates = JSON.parse(
        window.localStorage.getItem(storageKey) ?? "[]",
      ) as Array<Record<string, unknown>>;
      return {
        status: candidates[0]?.status,
        ruleId: candidates[0]?.appliedRuleId,
        ruleVersion: candidates[0]?.appliedRuleVersion,
        merchant: candidates[0]?.merchant,
        category: candidates[0]?.category,
        transactions: JSON.parse(
          window.localStorage.getItem("moneyflow-demo-transactions-v1") ?? "[]",
        ) as unknown[],
      };
    }, CANDIDATES_KEY);

    expect(evidence.status).toBe("pending");
    expect(evidence.ruleId).toEqual(expect.any(String));
    expect(evidence.ruleVersion).toBe(1);
    expect(evidence.merchant).toBe("Highlands Coffee");
    expect(evidence.category).toBe("Ăn uống");
    expect(evidence.transactions).toHaveLength(0);
  });

  test("normalizes a matching Direct CSV dry-run before its explicit review", async ({
    page,
  }) => {
    await createDemoRule(page, {
      contains: "HIGHLANDS",
      categoryLabel: "Ăn uống · Tiền ra",
      merchant: "Highlands Coffee",
    });

    await page.goto("/imports/direct", { waitUntil: "domcontentloaded" });

    const csv = {
      name: "highlands.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "date,description,amount\n2026-08-25,HIGHLANDS Q1,-45000\n",
      ),
    };
    const dryRun = page.getByRole("heading", { name: "3. Dry-run", exact: true });

    /*
     * `setInputFiles` dispatches `change` on the input, and React attaches that
     * listener only once the route has hydrated. Setting the file before then
     * drops the event with no error at all: the page simply stays on "1. Chọn CSV",
     * which is exactly what CI captured on a slower runner while this passed
     * locally every time. Re-set the file until the page reacts, rather than
     * guessing a delay that would be too short on a slow machine and wasted on a
     * fast one.
     */
    await expect(async () => {
      await page.locator('input[type="file"]').setInputFiles(csv);
      await expect(dryRun).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    const dryRunSection = page.locator('[data-slot="direct-import-preview"]');
    await expect(dryRun).toBeVisible();
    await expect(dryRunSection.getByText("Highlands Coffee", { exact: true })).toBeVisible();
    await expect(
      dryRunSection.getByText("Quy tắc đã áp dụng", { exact: true }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Xem lại ghi 1 giao dịch" }).click();
    const review = page.getByRole("dialog", {
      name: "Ghi trực tiếp giao dịch vào sổ?",
    });
    await expect(review).toContainText("Quy tắc đã áp dụng");
    await expect(review).toContainText("1 dòng");
    await expect(review.getByRole("button", { name: "Ghi 1 giao dịch" })).toBeVisible();

    const transactions = await page.evaluate(() =>
      JSON.parse(window.localStorage.getItem("moneyflow-demo-transactions-v1") ?? "[]"),
    );
    expect(transactions).toHaveLength(0);
  });

  test("saves a reviewed merchant rule without posting the current candidate", async ({
    page,
  }) => {
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Nạp dữ liệu mẫu", exact: true }).click();
    await page.getByRole("button", { name: /Duyệt Highlands Coffee/ }).click();

    const review = page.getByRole("dialog", { name: "Duyệt giao dịch" });
    await expect(review).toContainText(
      /nơi giao dịch chứa “Highlands Coffee” → Ăn uống/i,
    );
    await review.getByRole("button", { name: "Lưu thành quy tắc" }).click();
    await expect(review).toContainText(/Ứng viên này vẫn chờ bạn duyệt vào sổ riêng/i);

    const persisted = await page.evaluate(({ candidatesKey, rulesKey }) => {
      const candidates = JSON.parse(
        window.localStorage.getItem(candidatesKey) ?? "[]",
      ) as Array<Record<string, unknown>>;
      const rules = JSON.parse(
        window.localStorage.getItem(rulesKey) ?? "[]",
      ) as Array<Record<string, unknown>>;
      return { candidate: candidates[0], rule: rules[0] };
    }, { candidatesKey: CANDIDATES_KEY, rulesKey: RULES_KEY });

    expect(persisted.candidate?.status).toBe("pending");
    expect(persisted.rule).toMatchObject({
      contains: "Highlands Coffee",
      field: "merchant",
      merchant: "Highlands Coffee",
      category: "Ăn uống",
      categoryKind: "expense",
      enabled: true,
      version: 1,
    });
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
