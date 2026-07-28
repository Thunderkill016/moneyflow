import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { auditRoute, type AuditRoute } from "./responsive-audit";

const LONG_EXPENSE_NOTE =
  "Thanh toán chi phí sửa chữa căn hộ và thay toàn bộ thiết bị điện trong phòng làm việc tại nhà";
const LONG_INCOME_NOTE =
  "Khoản thu dự án dài hạn với phần mô tả cố ý rất dài để kiểm tra cách giao diện xuống dòng";
const LONG_TRANSFER_NOTE =
  "Chuyển quỹ dự phòng dài hạn sang ví thanh toán phụ để kiểm tra hiển thị hai tài khoản";
const LONG_CAPTURE_NOTE =
  "Bữa ăn làm việc với nhóm sản phẩm và đối tác triển khai, ghi chú cố ý dài để kiểm tra xuống dòng trên điện thoại nhỏ";

function vietnamDate(daysAgo: number): string {
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1_000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function richTransactions() {
  const today = vietnamDate(0);
  const yesterday = vietnamDate(1);
  const twoDaysAgo = vietnamDate(2);

  return [
    {
      id: "ui-audit-rich-expense",
      kind: "expense",
      categoryId: "demo-category-expense-Nhà ở",
      category: "Nhà ở",
      note: LONG_EXPENSE_NOTE,
      accountId: "demo-account-mb",
      account: "MB Bank",
      amount: 987_654_321,
      occurredOn: today,
      occurredAt: `${today}T03:30:00.000Z`,
      relativeDate: "Hôm nay",
    },
    {
      id: "ui-audit-rich-income",
      kind: "income",
      categoryId: "demo-category-income-Thu nhập khác",
      category: "Thu nhập khác",
      note: LONG_INCOME_NOTE,
      accountId: "demo-account-mb",
      account: "MB Bank",
      amount: 12_345_678_900,
      occurredOn: yesterday,
      occurredAt: `${yesterday}T03:30:00.000Z`,
      relativeDate: "Hôm qua",
    },
    {
      id: "ui-audit-rich-transfer",
      kind: "transfer",
      categoryId: "",
      category: "Chuyển tiền",
      note: LONG_TRANSFER_NOTE,
      accountId: "demo-account-mb",
      account: "MB Bank",
      destinationAccountId: "demo-account-momo",
      destinationAccount: "MoMo",
      amount: 4_567_890_123,
      occurredOn: twoDaysAgo,
      occurredAt: `${twoDaysAgo}T03:30:00.000Z`,
      relativeDate: "Hai ngày trước",
    },
  ];
}

async function seedRichState(page: Page): Promise<void> {
  await page.addInitScript((transactions) => {
    try {
      window.localStorage.clear();
      window.localStorage.setItem(
        "moneyflow-demo-transactions-v1",
        JSON.stringify(transactions),
      );
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
      window.localStorage.setItem("__mf_ui_audit_rich_seeded", "1");
    } catch {
      // Storage can be unavailable before the first same-origin navigation.
    }
  }, richTransactions());
}

async function assertNoClippedMoney(page: Page, route: AuditRoute): Promise<void> {
  const result = await page.locator(".font-mono, [data-money]").evaluateAll((elements) => {
    const visibleMoney = elements.filter((element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity) !== 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
    }) as HTMLElement[];

    const clipped = visibleMoney
      .filter((element) => {
        const style = window.getComputedStyle(element);
        return (
          element.scrollWidth > element.clientWidth + 1 &&
          /(hidden|clip)/.test(style.overflowX)
        );
      })
      .map((element) => (element.innerText || element.textContent || "").trim());

    return { visibleCount: visibleMoney.length, clipped };
  });

  expect(result.visibleCount, `${route.path} should render visible money values`).toBeGreaterThan(0);
  expect(result.clipped, `${route.path} has clipped visible money values`).toEqual([]);
}

async function attachFilledCaptureState(page: Page, testInfo: TestInfo): Promise<void> {
  const note = page.getByPlaceholder("Ví dụ: Cơm trưa");
  const save = page.getByRole("button", { name: /^Lưu$/ }).first();

  const metrics = await page.evaluate(
    ({ notePlaceholder }) => {
      const noteInput = Array.from(document.querySelectorAll("input, textarea")).find(
        (element) => element.getAttribute("placeholder") === notePlaceholder,
      );
      const saveButton = Array.from(document.querySelectorAll("button")).find(
        (element) => (element.textContent || "").trim() === "Lưu",
      );
      if (!(noteInput instanceof HTMLElement) || !(saveButton instanceof HTMLElement)) {
        throw new Error("Filled quick-capture controls are missing");
      }

      const root = document.documentElement;
      const body = document.body;
      const noteRect = noteInput.getBoundingClientRect();
      const saveRect = saveButton.getBoundingClientRect();
      return {
        viewportWidth: root.clientWidth,
        documentWidth: Math.max(root.scrollWidth, body.scrollWidth),
        noteRect: { left: noteRect.left, right: noteRect.right },
        saveRect: { left: saveRect.left, right: saveRect.right },
      };
    },
    { notePlaceholder: "Ví dụ: Cơm trưa" },
  );

  await expect(note).toHaveValue(LONG_CAPTURE_NOTE);
  await expect(save).toBeVisible();
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 2);
  expect(metrics.noteRect.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.noteRect.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.saveRect.left).toBeGreaterThanOrEqual(-1);
  expect(metrics.saveRect.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);

  const label = `quick-capture-rich-input-${testInfo.project.name}`;
  const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
  await testInfo.attach(`${label}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach(`${label}.json`, {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: "application/json",
  });
}

const RICH_ROUTES: Array<AuditRoute & { expected: string[] }> = [
  {
    label: "dashboard-rich-money",
    path: "/dashboard",
    expected: ["987.654.321"],
  },
  {
    label: "transactions-rich-money",
    path: "/transactions",
    expected: ["987.654.321", "12.345.678.900", "4.567.890.123"],
  },
  {
    label: "reports-rich-money",
    path: "/reports",
    expected: ["987.654.321", "12.345.678.900"],
  },
];

test.describe("large VND and long Vietnamese responsive states", () => {
  test.describe.configure({ mode: "parallel" });

  test.beforeEach(async ({ page }) => {
    await seedRichState(page);
  });

  for (const route of RICH_ROUTES) {
    test(`${route.label} remains usable`, async ({ page }, testInfo) => {
      await auditRoute(page, testInfo, route);

      for (const expected of route.expected) {
        await expect(page.locator("body")).toContainText(expected);
      }
      await assertNoClippedMoney(page, route);

      if (route.path === "/transactions") {
        const row = page.locator(".manager-row").filter({ hasText: LONG_EXPENSE_NOTE }).first();
        await expect(row).toBeVisible();
        const rect = await row.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return {
            left: box.left,
            right: box.right,
            viewportWidth: document.documentElement.clientWidth,
          };
        });
        expect(rect.left).toBeGreaterThanOrEqual(-1);
        expect(rect.right).toBeLessThanOrEqual(rect.viewportWidth + 1);
      }
    });
  }

  test("quick capture remains usable with a large amount and long note", async ({
    page,
  }, testInfo) => {
    const route = { label: "quick-capture-rich-input", path: "/capture/quick" };
    await auditRoute(page, testInfo, route);

    await page.getByRole("button", { name: "Khoản chi", exact: true }).first().click();
    const amount = page.getByLabel(/Số tiền chi/i);
    await expect(amount).toBeVisible();
    await amount.fill("987654321");
    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
    await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(LONG_CAPTURE_NOTE);

    await attachFilledCaptureState(page, testInfo);
  });
});
