import { expect, test, type Locator, type Page } from "@playwright/test";

async function firstVisible(locator: Locator): Promise<Locator | null> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  return null;
}

async function visibleButton(page: Page, name: string) {
  const locator = page.getByRole("button", { name, exact: true });
  await expect
    .poll(async () => Boolean(await firstVisible(locator)), {
      message: `Expected a visible ${name} button`,
      timeout: 10_000,
    })
    .toBe(true);
  const button = await firstVisible(locator);
  expect(button).not.toBeNull();
  return button!;
}

test.describe("Phase 6 Accounts and Transfer", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
  });

  test("reviews account archive consequences and preserves cancel focus", async ({ page }) => {
    await page.goto("/accounts");

    await expect(page.locator('[data-slot="account-overview-workspace"]')).toBeVisible();
    await expect(page.locator('[data-slot="accounts-summary"]')).toContainText(
      "đang hoạt động",
    );

    const mbCard = page
      .locator('[data-slot="account-card"]')
      .filter({ hasText: "MB Bank" });
    await mbCard.getByRole("button", { name: "Lưu trữ MB Bank" }).click();

    const dialog = page.getByRole("dialog", { name: "Lưu trữ tài khoản" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('[data-slot="account-archive-review"]')).toContainText(
      "Số dư không còn nằm trong tổng",
    );
    const cancel = dialog.getByRole("button", {
      name: "Giữ tài khoản hoạt động",
    });
    await expect(cancel).toBeFocused();
    await cancel.click();
    await expect(dialog).toBeHidden();
  });

  test("returns account validation focus to the affected field", async ({ page }) => {
    await page.goto("/accounts");

    const add = await visibleButton(page, "Thêm tài khoản");
    await add.click();

    const dialog = page.getByRole("dialog", { name: "Thêm tài khoản" });
    await expect(dialog).toBeVisible();
    const name = dialog.getByLabel("Tên tài khoản");
    await expect(name).toBeFocused();
    await dialog.getByRole("button", { name: "Thêm tài khoản" }).click();
    await expect(dialog.getByText("Tên tài khoản cần từ 1 đến 80 ký tự.")).toBeVisible();
    await expect(name).toBeFocused();
  });

  test("shows a same-currency transfer review without changing the domain owner", async ({ page }) => {
    await page.goto("/accounts");

    await page.getByRole("button", { name: "Chuyển tiền", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Chuyển tiền" });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("textbox", { name: "Số tiền chuyển", exact: true })
      .fill("50000");

    const review = dialog.locator('[data-slot="transfer-review"]');
    await expect(review).toContainText("MB Bank");
    await expect(review).toContainText("Tiền mặt");
    await expect(review).toContainText(/50[.\s]?000/);
    await expect(dialog).toContainText("tổng tài sản không đổi");
  });

  test("keeps Accounts and archive review within a 320px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/accounts");

    const mbCard = page
      .locator('[data-slot="account-card"]')
      .filter({ hasText: "MB Bank" });
    await mbCard.getByRole("button", { name: "Lưu trữ MB Bank" }).click();
    const dialog = page.getByRole("dialog", { name: "Lưu trữ tài khoản" });
    await expect(dialog).toBeVisible();

    const geometry = await page.evaluate(() => {
      const root = document.documentElement;
      const openDialog = document.querySelector("dialog[open]");
      const rect = openDialog?.getBoundingClientRect();
      return {
        overflow: root.scrollWidth - root.clientWidth,
        left: rect?.left ?? -1,
        right: rect?.right ?? -1,
        viewport: root.clientWidth,
      };
    });

    expect(geometry.overflow).toBeLessThanOrEqual(1);
    expect(geometry.left).toBeGreaterThanOrEqual(-1);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewport + 1);
  });
});
