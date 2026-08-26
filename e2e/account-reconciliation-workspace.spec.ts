import { expect, test, type Page } from "@playwright/test";

const DEMO_KEY = "moneyflow-account-reconciliation-v1:demo-account-mb";

async function fillStatementBalanceAfterHydration(
  page: Page,
  formattedBalance: string,
) {
  const balanceInput = page.getByLabel("Số dư cuối kỳ");
  const rawBalance = formattedBalance.replaceAll(".", "");

  await expect
    .poll(
      async () => {
        await balanceInput.fill(rawBalance);
        return balanceInput.inputValue();
      },
      {
        message: "reconciliation balance input should be controlled by the hydrated client",
        timeout: 15_000,
      },
    )
    .toBe(formattedBalance);
}

async function fillStatementForm(
  page: Page,
  statementDate: string,
  formattedBalance: string,
) {
  await fillStatementBalanceAfterHydration(page, formattedBalance);

  const dateInput = page.getByLabel("Ngày kết thúc sao kê");
  await dateInput.fill(statementDate);
  await expect(dateInput).toHaveValue(statementDate);
}

test.describe("Account reconciliation workspace", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((storageKey) => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
      window.localStorage.removeItem(storageKey);
    }, DEMO_KEY);
  });

  test("is discoverable from the account register and requires an explicit balance", async ({ page }) => {
    await page.goto("/accounts/demo-account-mb");
    await page.getByRole("link", { name: "Đối soát" }).click();

    await expect(page).toHaveURL(/\/accounts\/demo-account-mb\/reconcile$/);
    await expect(
      page.getByRole("heading", { name: "Đối soát MB Bank" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Mở kỳ đối soát" })).toBeDisabled();

    await fillStatementBalanceAfterHydration(page, "-100.000");
    await expect(page.getByRole("button", { name: "Mở kỳ đối soát" })).toBeEnabled();
  });

  test("starts, clears, completes and reopens an exact-zero demo statement", async ({ page }) => {
    await page.goto("/accounts/demo-account-mb/reconcile");

    await expect(
      page.getByRole("heading", { name: "Đối soát MB Bank" }),
    ).toBeVisible();
    await fillStatementForm(page, "2026-07-14", "15.777.000");
    await expect(page.getByRole("button", { name: "Mở kỳ đối soát" })).toBeEnabled();
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

  test("suggests an exact-difference row without clearing it automatically", async ({ page }) => {
    await page.goto("/accounts/demo-account-mb/reconcile");
    await fillStatementForm(page, "2026-07-14", "15.777.000");
    await page.getByRole("button", { name: "Mở kỳ đối soát" }).click();

    await page.getByRole("button", { name: "Đánh dấu đã khớp Cơm trưa" }).click();
    await page
      .getByRole("button", { name: "Đánh dấu đã khớp Lương tháng 7" })
      .click();

    const hint = page.locator('[data-exact-difference-candidate="true"]');
    await expect(hint).toHaveCount(1);
    await expect(hint).toContainText("Kiểm tra giao dịch này");
    const hintedRow = page.locator("article").filter({ has: hint });
    await expect(hintedRow).toContainText("Đồ dùng cá nhân");
    await expect(
      page.getByRole("button", { name: "Đánh dấu đã khớp Đồ dùng cá nhân" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Hoàn tất đối soát" }),
    ).toBeDisabled();

    await page
      .getByRole("button", { name: "Đánh dấu đã khớp Đồ dùng cá nhân" })
      .click();

    await expect(hint).toHaveCount(0);
    await expect(
      page.getByText("Đã khớp chính xác. Có thể hoàn tất."),
    ).toBeVisible();
  });

  test("does not enable completion while the statement difference is nonzero", async ({ page }) => {
    await page.goto("/accounts/demo-account-mb/reconcile");
    await fillStatementForm(page, "2026-07-14", "15.777.000");
    await expect(page.getByRole("button", { name: "Mở kỳ đối soát" })).toBeEnabled();
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
    const response = await page.goto("/accounts/not-a-viewer-account/reconcile");

    /*
     * The status code is the real non-disclosure guarantee: an unknown account
     * must not be distinguishable from a path that does not exist. Asserting it
     * is stronger than any markup check, which is why it leads here — the
     * previous assertions pinned Next's built-in 404 markup and stopped holding
     * when MoneyFlow gained its own not-found boundary. The account-name check
     * below is unchanged and is what actually proves nothing leaked.
     */
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Không tìm thấy trang này" }),
    ).toBeVisible();
    await expect(page.getByText("MB Bank", { exact: true })).toHaveCount(0);
  });
});
