import { expect, test, type Locator } from "@playwright/test";

const UNIQUE_AMOUNT = "777000";
const UNIQUE_AMOUNT_DISPLAY = "777.000";
const UNIQUE_NOTE = "E2E cafe autopilot TASK-200";
const OPENING_BALANCE_LABEL = "Bạn đang có 1.126.000 ₫";
const AFTER_EXPENSE_BALANCE_LABEL = "Bạn đang có 349.000 ₫";
const KEEP_OPEN_NOTE = "E2E keep-open first";
const CLOSE_AFTER_SAVE_NOTE = "E2E close after save";

async function stabilizeQuickExpense(
  amount: Locator,
  note: Locator,
  save: Locator,
) {
  await expect
    .poll(
      async () => {
        if ((await amount.inputValue()) !== UNIQUE_AMOUNT_DISPLAY) {
          await amount.fill(UNIQUE_AMOUNT);
        }
        if ((await note.inputValue()) !== UNIQUE_NOTE) {
          await note.fill(UNIQUE_NOTE);
        }
        return {
          amount: await amount.inputValue(),
          note: await note.inputValue(),
          saveEnabled: await save.isEnabled(),
        };
      },
      { timeout: 15_000 },
    )
    .toEqual({
      amount: UNIQUE_AMOUNT_DISPLAY,
      note: UNIQUE_NOTE,
      saveEnabled: true,
    });
}

async function openCaptureDetails(scope: Locator, slot: string) {
  const disclosure = scope.locator(`details[data-slot="${slot}"]`);
  await expect(disclosure).toBeVisible();
  if (!(await disclosure.evaluate((element: HTMLDetailsElement) => element.open))) {
    await disclosure.locator("summary").click();
  }
  await expect(disclosure).toHaveAttribute("open", "");
  return disclosure;
}

test.describe("Expense path (thu chi)", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        if (
          window.localStorage.getItem("__mf_e2e_expense_seeded") === "1"
        )
          return;
        window.localStorage.clear();
        window.localStorage.setItem(
          "moneyflow-demo-transactions-v1",
          "[]",
        );
        window.localStorage.setItem(
          "moneyflow-inbox-candidates-v1",
          "[]",
        );
        window.localStorage.setItem("moneyflow-onboarding-done", "1");
        window.localStorage.setItem("__mf_e2e_expense_seeded", "1");
      } catch {
        /* ignore */
      }
    });
  });

  test("landing → register → quick add expense → dashboard → export download", async ({
    page,
  }) => {
    await page.goto("/landing");
    await expect(
      page.getByRole("heading", {
        name: "Từ lúc ghi đến lúc hiểu tiền của mình.",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Không liên kết ngân hàng", { exact: true }),
    ).toBeVisible();
    const trustList = page.getByRole("list", {
      name: "Cam kết chính",
    });
    await expect(trustList).toBeVisible();
    await expect(trustList).toContainText("Không liên kết ngân hàng");
    await expect(trustList).toContainText("Có thể sửa và phục hồi");
    await expect(trustList).toContainText("Xuất CSV khi cần");

    await page
      .getByRole("link", { name: "Tạo sổ của bạn", exact: true })
      .click();
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Tạo tài khoản MoneyFlow" }),
    ).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.locator(".safe-card-hero")).toBeHidden({
      timeout: 20_000,
    });
    await expect(
      page.getByLabel(OPENING_BALANCE_LABEL, { exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    const isMobile = (page.viewportSize()?.width ?? 1_000) <= 760;
    await expect(
      page.locator(".welcome-actions .insights-ghi-chi"),
    ).toBeHidden();
    const surfacedPrimaryAction = isMobile
      ? page
          .getByRole("navigation", { name: "Điều hướng di động" })
          .getByRole("button", { name: "Ghi chi tiêu" })
      : page
          .getByRole("banner")
          .getByRole("button", { name: "Ghi chi tiêu" });
    await expect(surfacedPrimaryAction).toBeVisible();

    if (isMobile) {
      const accountButton = page.getByRole("button", {
        name: /Mở tài khoản/i,
      });
      await expect(accountButton).toBeVisible();
      await accountButton.click();
      await expect(
        page.getByRole("heading", { name: "Thêm & tài khoản" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: /Tạo tài khoản/i }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Đóng" }).click();
    }

    await page.goto("/capture/quick");
    const quickDialog = page.getByRole("dialog", { name: "Ghi giao dịch" });
    await expect(quickDialog).toBeVisible();

    const expenseKind = quickDialog.getByRole("button", { name: "Khoản chi" });
    await expect(expenseKind).toBeVisible();
    await expenseKind.click();

    const amount = quickDialog.getByLabel(/Số tiền chi/i);
    await expect(amount).toBeFocused();
    await amount.fill(UNIQUE_AMOUNT);
    await expect(amount).toHaveValue(UNIQUE_AMOUNT_DISPLAY);

    await expect(
      quickDialog.locator('[data-slot="capture-account-choice"] summary'),
    ).toBeVisible();
    await expect(
      quickDialog.locator('[data-slot="capture-category-choice"] summary'),
    ).toBeVisible();

    const categoryDisclosure = await openCaptureDetails(
      quickDialog,
      "capture-category-choice",
    );
    await categoryDisclosure
      .getByRole("button", { name: "Ăn uống", exact: true })
      .click();

    await openCaptureDetails(quickDialog, "capture-optional-details");
    const note = quickDialog.getByPlaceholder("Ví dụ: Cơm trưa");
    await note.fill(UNIQUE_NOTE);

    const form = quickDialog.locator("form");
    const save = form.getByRole("button", { name: "Lưu", exact: true });
    await stabilizeQuickExpense(amount, note, save);
    await save.click();

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const raw = window.localStorage.getItem(
              "moneyflow-demo-transactions-v1",
            );
            if (!raw) return false;
            try {
              const list = JSON.parse(raw) as Array<{
                amount?: number;
                note?: string;
              }>;
              return list.some(
                (transaction) =>
                  transaction.amount === 777_000 &&
                  String(transaction.note ?? "").includes("TASK-200"),
              );
            } catch {
              return false;
            }
          }),
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/dashboard");
    await expect(page.locator(".safe-card-hero")).toBeHidden();
    await expect(
      page.getByRole("region", { name: "Bạn đang có" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByLabel(AFTER_EXPENSE_BALANCE_LABEL, { exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    const recentRow = page
      .locator(".transaction-row")
      .filter({ hasText: UNIQUE_NOTE });
    await expect(recentRow).toBeVisible({ timeout: 20_000 });
    await expect(recentRow).toContainText(UNIQUE_AMOUNT_DISPLAY);
    await expect(
      page.locator(".insights-category-row").filter({ hasText: "Ăn uống" }),
    ).toContainText(UNIQUE_AMOUNT_DISPLAY);

    await page.reload();
    await expect(
      page.getByLabel(AFTER_EXPENSE_BALANCE_LABEL, { exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto("/settings/export");
    const exportWorkspace = page.locator(
      '[data-slot="settings-export-workspace"]',
    );
    await expect(exportWorkspace).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Xuất giao dịch và Inbox" }),
    ).toBeVisible();
    await expect(exportWorkspace).toContainText(
      "chưa phải bản sao lưu đầy đủ có thể khôi phục tài khoản",
    );

    const downloadBtn = exportWorkspace
      .getByRole("button", { name: /Tải xuống/i })
      .first();
    await expect(downloadBtn).toBeEnabled({ timeout: 15_000 });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      downloadBtn.click(),
    ]);

    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.csv$/i);
    expect(filename.toLowerCase()).toMatch(/moneyflow|giao-dich/);
    await expect(page.getByText(/Đã tải \d+ mục/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("dashboard keeps the form open only when requested", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByLabel(OPENING_BALANCE_LABEL, { exact: true }),
    ).toBeVisible({ timeout: 20_000 });

    const isMobile = (page.viewportSize()?.width ?? 1_000) <= 760;
    const openButton = isMobile
      ? page
          .getByRole("navigation", { name: "Điều hướng di động" })
          .getByRole("button", { name: "Ghi chi tiêu" })
      : page
          .locator("header")
          .getByRole("button", { name: "Ghi chi tiêu" });
    await expect(openButton).toBeVisible();
    await openButton.click();

    const dialog = page.getByRole("dialog", { name: "Ghi chi tiêu" });
    await expect(dialog).toBeVisible();

    const amount = dialog.getByLabel(/Số tiền chi/i);
    await expect(amount).toBeFocused();
    await expect(dialog.locator('[data-slot="capture-account-choice"] summary')).toBeVisible();
    await expect(dialog.locator('[data-slot="capture-category-choice"] summary')).toBeVisible();

    if (isMobile) {
      const save = dialog.getByRole("button", { name: "Lưu", exact: true });
      await expect(save).toBeVisible();
      const saveBox = await save.boundingBox();
      expect(saveBox).not.toBeNull();
      expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(
        (page.viewportSize()?.height ?? 10_000) + 1,
      );
    }

    const categoryDisclosure = await openCaptureDetails(
      dialog,
      "capture-category-choice",
    );
    await categoryDisclosure.getByRole("button", { name: /Ăn uống/i }).click();
    await openCaptureDetails(dialog, "capture-optional-details");

    const note = dialog.getByPlaceholder("Ví dụ: Cơm trưa");
    const keepOpen = dialog.getByRole("checkbox", {
      name: /Lưu xong thêm tiếp/i,
    });

    await keepOpen.check();
    await amount.fill("120000");
    await note.fill(KEEP_OPEN_NOTE);
    await dialog
      .getByRole("button", { name: "Lưu & thêm tiếp", exact: true })
      .click();

    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("status")).toContainText("Đã lưu");
    await expect(amount).toHaveValue("");
    await expect(amount).toBeFocused();

    await expect
      .poll(
        () =>
          page.evaluate((targetNote) => {
            const raw = window.localStorage.getItem(
              "moneyflow-demo-transactions-v1",
            );
            const list = raw
              ? (JSON.parse(raw) as Array<{ note?: string }>)
              : [];
            return list.filter((item) => item.note === targetNote).length;
          }, KEEP_OPEN_NOTE),
        { timeout: 15_000 },
      )
      .toBe(1);

    await keepOpen.uncheck();
    await amount.fill("80000");
    await note.fill(CLOSE_AFTER_SAVE_NOTE);
    await dialog.getByRole("button", { name: "Lưu", exact: true }).click();

    await expect(dialog).toBeHidden();
    await expect
      .poll(
        () =>
          page.evaluate((targetNote) => {
            const raw = window.localStorage.getItem(
              "moneyflow-demo-transactions-v1",
            );
            const list = raw
              ? (JSON.parse(raw) as Array<{ note?: string }>)
              : [];
            return list.filter((item) => item.note === targetNote).length;
          }, CLOSE_AFTER_SAVE_NOTE),
        { timeout: 15_000 },
      )
      .toBe(1);
  });

  test("direct capture modes select income and reuse the trusted transfer flow", async ({
    page,
  }) => {
    await page.goto("/capture/quick?kind=income");
    const quickDialog = page.getByRole("dialog", { name: "Ghi giao dịch" });
    await expect(quickDialog).toBeVisible();
    await expect(
      quickDialog.getByRole("button", { name: "Khoản thu" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(quickDialog.getByLabel(/Số tiền thu/i)).toBeFocused();

    await page.goto("/capture/quick?kind=transfer");
    const transferDialog = page.getByRole("dialog", { name: "Chuyển tiền" });
    await expect(transferDialog).toBeVisible();
    await expect(transferDialog.getByLabel("Số tiền chuyển")).toBeFocused();
  });
});
