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

  test("reviews account archive consequences and preserves cancel focus", async ({
    page,
  }) => {
    await page.goto("/accounts");

    await expect(
      page.locator('[data-slot="account-overview-workspace"]'),
    ).toBeVisible();
    await expect(page.locator('[data-slot="accounts-summary"]')).toContainText(
      "đang hoạt động",
    );

    const mbCard = page
      .locator('[data-slot="account-card"]')
      .filter({ hasText: "MB Bank" });
    await mbCard.getByRole("button", { name: "Lưu trữ MB Bank" }).click();

    const dialog = page.getByRole("dialog", { name: "Lưu trữ tài khoản" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.locator('[data-slot="account-archive-review"]'),
    ).toContainText("Số dư không còn nằm trong tổng");
    const cancel = dialog.getByRole("button", {
      name: "Giữ tài khoản hoạt động",
    });
    await expect(cancel).toBeFocused();
    await cancel.click();
    await expect(dialog).toBeHidden();
  });

  test("returns account validation focus to the affected field", async ({
    page,
  }) => {
    await page.goto("/accounts");

    const add = await visibleButton(page, "Thêm tài khoản");
    await add.click();

    const dialog = page.getByRole("dialog", { name: "Thêm tài khoản" });
    await expect(dialog).toBeVisible();
    const name = dialog.getByLabel("Tên tài khoản");
    await expect(name).toBeFocused();
    await dialog.getByRole("button", { name: "Thêm tài khoản" }).click();
    await expect(
      dialog.getByText("Tên tài khoản cần từ 1 đến 80 ký tự."),
    ).toBeVisible();
    await expect(name).toBeFocused();
  });

  test("shows a same-currency transfer review without changing the domain owner", async ({
    page,
  }) => {
    await page.goto("/accounts");

    await page
      .getByRole("button", { name: "Chuyển tiền", exact: true })
      .click();
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

  test("keeps Accounts and archive review within a 320px viewport", async ({
    page,
  }) => {
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

test("new demo accounts survive the complete study money journey", async ({
  page,
  context,
}) => {
  // Whole synthetic journey gets two minutes; this is not human task timing.
  test.setTimeout(120_000);
  await context.addInitScript(() =>
    localStorage.setItem("moneyflow-onboarding-done", "1"),
  );
  const { todayInVietnam } = await import("../src/lib/vietnam-date.ts");
  const { parseCsvMatrix } = await import("../src/lib/inbox/parse-csv.ts");
  const today = todayInVietnam();
  const cashNote = "SYNTHETIC_STUDY_CASH_CAFE";
  const bankNote = "SYNTHETIC_STATEMENT_CAFE";
  const transferNote = "SYNTHETIC_STUDY_TRANSFER";
  async function createAccount(name: string, kind: string, opening: string) {
    await page.goto("/accounts");
    await expect(page.locator("html")).toHaveAttribute(
      "data-moneyflow-shell",
      "mounted",
    );
    await (await visibleButton(page, "Thêm tài khoản")).click();
    const dialog = page.getByRole("dialog", { name: "Thêm tài khoản" });
    await dialog.getByLabel("Tên tài khoản").fill(name);
    await dialog.getByLabel("Loại tài khoản").selectOption(kind);
    await dialog.getByLabel("Số dư ban đầu").fill(opening);
    await dialog
      .getByRole("button", { name: "Thêm tài khoản", exact: true })
      .click();
    await expect(dialog).toBeHidden();
    const href = await page
      .getByRole("link", { name: `Xem sổ ${name}`, exact: true })
      .getAttribute("href");
    expect(href).not.toBeNull();
    return href!.split("/").at(-1)!;
  }
  async function balances(cash: string, bank: string) {
    await page.goto("/accounts");
    for (const [name, amount] of [
      ["Study Cash", cash],
      ["Study Bank", bank],
    ]) {
      const card = page
        .locator('[data-slot="account-card"]')
        .filter({ has: page.getByRole("heading", { name, exact: true }) });
      await expect(
        card.getByText(amount, { exact: true }).first(),
      ).toBeVisible();
    }
  }
  const cashId = await createAccount("Study Cash", "cash", "500000");
  const bankId = await createAccount("Study Bank", "bank", "100000");
  await page.reload();
  await balances("500.000 ₫", "100.000 ₫");
  await page.goto(`/accounts/${cashId}`);
  await expect(
    page.getByRole("heading", { name: "Study Cash", exact: true }),
  ).toBeVisible();

  await page.goto("/capture/quick");
  const quick = page.getByRole("dialog", { name: "Ghi giao dịch" });
  await quick.getByLabel(/Số tiền chi/).fill("45000");
  await quick
    .locator('details[data-slot="capture-category-choice"] summary')
    .click();
  await quick.getByLabel("Tài khoản", { exact: true }).selectOption(cashId);
  await quick.getByRole("button", { name: "Ăn uống", exact: true }).click();
  await quick
    .locator('details[data-slot="capture-optional-details"] summary')
    .click();
  await quick.getByPlaceholder("Ví dụ: Cơm trưa").fill(cashNote);
  await quick.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(quick).toBeHidden();
  await balances("455.000 ₫", "100.000 ₫");

  await page.getByRole("button", { name: "Chuyển tiền", exact: true }).click();
  const transfer = page.getByRole("dialog", { name: "Chuyển tiền" });
  await transfer.getByLabel("Từ tài khoản").selectOption(cashId);
  await transfer.getByLabel("Đến tài khoản").selectOption(bankId);
  await transfer.getByLabel("Số tiền chuyển", { exact: true }).fill("50000");
  await transfer.getByLabel("Ghi chú", { exact: true }).fill(transferNote);
  await transfer
    .getByRole("button", { name: "Xác nhận chuyển tiền", exact: true })
    .click();
  await expect(transfer).toBeHidden();
  await balances("405.000 ₫", "150.000 ₫");

  async function upload() {
    await page.goto("/capture/upload");
    await expect(page.locator("html")).toHaveAttribute(
      "data-moneyflow-shell",
      "mounted",
    );
    await page.locator('input[type="file"]').setInputFiles({
      name: "synthetic-study.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `Ngày,Mô tả,Số tiền\n${today},${bankNote},-45000`,
        "utf8",
      ),
    });
    await expect(page).toHaveURL(/\/imports\/.+\/preview$/);
    await page.getByLabel("Sao kê này thuộc tài khoản").selectOption(bankId);
    await page.getByRole("button", { name: "Xem lại đưa vào Inbox" }).click();
    await page
      .getByRole("dialog", { name: "Đưa batch vào Inbox?" })
      .getByRole("button", { name: "Đưa vào Inbox", exact: true })
      .click();
    await expect(page).toHaveURL(/\/inbox$/);
  }
  await upload();
  await page.getByRole("button", { name: `Duyệt ${bankNote}` }).click();
  const review = page.getByRole("dialog", { name: "Duyệt giao dịch" });
  await review
    .getByLabel("Danh mục", { exact: true })
    .selectOption({ label: "Ăn uống" });
  await review
    .getByRole("button", { name: "Duyệt vào sổ", exact: true })
    .click();
  await expect(review).toBeHidden();
  await balances("405.000 ₫", "105.000 ₫");
  await upload();
  await balances("405.000 ₫", "105.000 ₫");

  await page.goto(`/accounts/${bankId}/reconcile`);
  await expect(
    page.locator('[data-demo-reconciliation-ready="true"]'),
  ).toBeVisible();
  await page.getByLabel("Ngày kết thúc sao kê").fill(today);
  await page.getByLabel("Số dư cuối kỳ").fill("105000");
  await page.getByRole("button", { name: "Mở kỳ đối soát" }).click();
  await page
    .getByRole("button", { name: `Đánh dấu đã khớp ${transferNote}` })
    .click();
  await page
    .getByRole("button", { name: `Đánh dấu đã khớp ${bankNote}` })
    .click();
  await expect(
    page.getByText("Đã khớp chính xác. Có thể hoàn tất."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hoàn tất đối soát", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hoàn tất đối soát", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Các kỳ đã hoàn tất" }),
  ).toBeVisible();

  await page.goto("/transactions");
  await page
    .getByRole("button", { name: `Sửa giao dịch ${cashNote}`, exact: true })
    .click();
  const edit = page.getByRole("dialog", { name: "Sửa giao dịch" });
  await edit.getByLabel("Số tiền", { exact: true }).fill("40000");
  await edit.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(edit).toBeHidden();
  await balances("410.000 ₫", "105.000 ₫");

  await page.goto("/settings/export");
  const exportButton = page
    .locator('[data-slot="settings-export-workspace"]')
    .getByRole("button", { name: /Tải xuống/i })
    .first();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    exportButton.click(),
  ]);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const [header, ...rows] = parseCsvMatrix(
    Buffer.concat(chunks).toString("utf8"),
  );
  const noteColumn = header.indexOf("Ghi chú");
  const amountColumn = header.indexOf("Số tiền (VND)");
  expect(noteColumn).toBeGreaterThanOrEqual(0);
  expect(amountColumn).toBeGreaterThanOrEqual(0);
  for (const [note, amount] of [
    [cashNote, "-40000"],
    [bankNote, "-45000"],
  ]) {
    const matching = rows.filter((row) => row[noteColumn] === note);
    expect(matching).toHaveLength(1);
    expect(matching[0][amountColumn]).toBe(amount);
  }
  expect(rows.filter((row) => row[noteColumn] === transferNote)).toHaveLength(
    1,
  );
});

test("demo account edits, archive and restore persist across routes and tabs", async ({
  page,
  context,
}) => {
  await context.addInitScript(() =>
    localStorage.setItem("moneyflow-onboarding-done", "1"),
  );
  await page.goto("/accounts");
  await (await visibleButton(page, "Thêm tài khoản")).click();
  let dialog = page.getByRole("dialog", { name: "Thêm tài khoản" });
  await dialog.getByLabel("Tên tài khoản").fill("Lifecycle Bank");
  await dialog.getByLabel("Loại tài khoản").selectOption("bank");
  await dialog.getByLabel("Số dư ban đầu").fill("100000");
  await dialog
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const observer = await context.newPage();
  await observer.goto("/accounts");
  await expect(
    observer.getByRole("heading", { name: "Lifecycle Bank", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Sửa Lifecycle Bank", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "Sửa tài khoản" });
  await dialog.getByLabel("Tên tài khoản").fill("Renamed Bank");
  await dialog.getByLabel("Số dư ban đầu").fill("120000");
  await dialog
    .getByRole("button", { name: "Lưu thay đổi", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    observer.getByRole("heading", { name: "Renamed Bank", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Lưu trữ Renamed Bank" }).click();
  const archive = page.getByRole("dialog", { name: "Lưu trữ tài khoản" });
  await archive
    .getByRole("button", { name: "Lưu trữ tài khoản", exact: true })
    .click();
  await expect(archive).toBeHidden();
  await page.reload();
  await expect(page.getByText("Renamed Bank", { exact: true })).toBeVisible();
  await page.goto("/capture/quick");
  const quick = page.getByRole("dialog", { name: "Ghi giao dịch" });
  await quick
    .locator('details[data-slot="capture-category-choice"] summary')
    .click();
  await expect(
    quick
      .getByLabel("Tài khoản", { exact: true })
      .locator("option")
      .filter({ hasText: "Renamed Bank" }),
  ).toHaveCount(0);
  await page.goto("/accounts");
  await page
    .locator('[data-slot="archived-account-row"]')
    .filter({ hasText: "Renamed Bank" })
    .getByRole("button", { name: "Khôi phục", exact: true })
    .click();
  await page.reload();
  const card = page
    .locator('[data-slot="account-card"]')
    .filter({ hasText: "Renamed Bank" });
  await expect(
    card.getByText("120.000 ₫", { exact: true }).first(),
  ).toBeVisible();
});

test("blocked demo account writes show failure instead of successful account creation", async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    localStorage.setItem("moneyflow-onboarding-done", "1");
    // Synthetic quota failure at the specific new boundary; other demo data stays intact.
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "moneyflow-demo-accounts-v1")
        throw new DOMException("synthetic quota", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto("/accounts");
  await (await visibleButton(page, "Thêm tài khoản")).click();
  const dialog = page.getByRole("dialog", { name: "Thêm tài khoản" });
  await dialog.getByLabel("Tên tài khoản").fill("Must Not Appear");
  await dialog
    .getByRole("button", { name: "Thêm tài khoản", exact: true })
    .click();
  await expect(dialog.getByText(/Không lưu được tài khoản demo/)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Must Not Appear", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Đã thêm tài khoản demo.", { exact: true }),
  ).toHaveCount(0);
});
