import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { seedUiAuditState } from "./responsive-audit";

const TRANSACTIONS_KEY = "moneyflow-demo-transactions-v1";
const CANDIDATES_KEY = "moneyflow-inbox-candidates-v1";

type StateEvidence = {
  viewport: { width: number; height: number };
  documentWidth: number;
  alerts: Array<{ text: string; left: number; right: number; top: number; bottom: number }>;
  dialogs: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
    canScrollY: boolean;
  }>;
  errors: string[];
};

async function auditCurrentState(
  page: Page,
  testInfo: TestInfo,
  label: string,
  options: { requireAlert?: boolean; requireDialog?: boolean } = {},
): Promise<void> {
  await expect(page.locator("body")).toContainText(/\S/, { timeout: 15_000 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      }),
  );

  const evidence = await page.evaluate<StateEvidence>(
    ({ requireAlert, requireDialog }) => {
      const root = document.documentElement;
      const body = document.body;
      const viewport = { width: root.clientWidth, height: root.clientHeight };
      const documentWidth = Math.max(root.scrollWidth, body.scrollWidth);
      const errors: string[] = [];

      const isVisible = (element: Element): element is HTMLElement => {
        if (!(element instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) !== 0 &&
          element.hidden !== true &&
          element.getAttribute("aria-hidden") !== "true" &&
          rect.width > 0 &&
          rect.height > 0 &&
          element.getClientRects().length > 0
        );
      };

      const isInsideHorizontalScroller = (element: HTMLElement): boolean => {
        let parent = element.parentElement;
        while (parent && parent !== body && parent !== root) {
          const style = window.getComputedStyle(parent);
          if (
            /(auto|scroll)/.test(style.overflowX) &&
            parent.scrollWidth > parent.clientWidth + 1
          ) {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      };

      if (documentWidth > viewport.width + 2) {
        errors.push(`document width ${documentWidth}px exceeds viewport ${viewport.width}px`);
      }

      const controls = Array.from(
        document.querySelectorAll(
          "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [role='link'], [tabindex]:not([tabindex='-1'])",
        ),
      ).filter(isVisible);

      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (
          (rect.left < -1 || rect.right > viewport.width + 1) &&
          !isInsideHorizontalScroller(control)
        ) {
          const name =
            control.getAttribute("aria-label") ||
            control.innerText.trim().replace(/\s+/g, " ").slice(0, 80) ||
            control.tagName.toLowerCase();
          errors.push(
            `control “${name}” is horizontally clipped at ${Math.round(rect.left)}..${Math.round(rect.right)}`,
          );
        }
      }

      const dialogs = Array.from(
        document.querySelectorAll("[role='dialog'], dialog[open], [aria-modal='true']"),
      )
        .filter(isVisible)
        .map((dialog) => {
          const rect = dialog.getBoundingClientRect();
          const style = window.getComputedStyle(dialog);
          const canScrollY =
            /(auto|scroll)/.test(style.overflowY) ||
            dialog.scrollHeight > dialog.clientHeight + 1;
          if (rect.left < -1 || rect.right > viewport.width + 1) {
            errors.push(
              `dialog x=${Math.round(rect.left)}..${Math.round(rect.right)} exceeds viewport`,
            );
          }
          if ((rect.top < -1 || rect.bottom > viewport.height + 1) && !canScrollY) {
            errors.push(
              `dialog y=${Math.round(rect.top)}..${Math.round(rect.bottom)} is clipped without scrolling`,
            );
          }
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            canScrollY,
          };
        });

      const alerts = Array.from(document.querySelectorAll("[role='alert']"))
        .filter(isVisible)
        .map((alert) => {
          const rect = alert.getBoundingClientRect();
          if (rect.left < -1 || rect.right > viewport.width + 1) {
            errors.push(
              `alert x=${Math.round(rect.left)}..${Math.round(rect.right)} exceeds viewport`,
            );
          }
          return {
            text: alert.innerText.trim().replace(/\s+/g, " ").slice(0, 160),
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
          };
        });

      if (requireAlert && alerts.length === 0) {
        errors.push("expected a visible validation alert");
      }
      if (requireDialog && dialogs.length === 0) {
        errors.push("expected a visible dialog");
      }

      return { viewport, documentWidth, alerts, dialogs, errors };
    },
    {
      requireAlert: options.requireAlert === true,
      requireDialog: options.requireDialog === true,
    },
  );

  const artifactName = `${label}-${testInfo.project.name}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  await testInfo.attach(`${artifactName}.png`, {
    body: await page.screenshot({ fullPage: true, animations: "disabled" }),
    contentType: "image/png",
  });
  await testInfo.attach(`${artifactName}.json`, {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: "application/json",
  });

  expect(evidence.errors, evidence.errors.join("\n")).toEqual([]);
}

async function readDemoMutationState(page: Page) {
  return page.evaluate(
    ({ transactionsKey, candidatesKey }) => {
      const transactions = JSON.parse(
        window.localStorage.getItem(transactionsKey) ?? "[]",
      ) as Array<Record<string, unknown>>;
      const candidates = JSON.parse(
        window.localStorage.getItem(candidatesKey) ?? "[]",
      ) as Array<Record<string, unknown>>;
      return {
        transactionCount: transactions.length,
        candidateStatuses: candidates.map((item) => item.status),
      };
    },
    { transactionsKey: TRANSACTIONS_KEY, candidatesKey: CANDIDATES_KEY },
  );
}

test.describe("Phase B safety and review states", () => {
  test.describe.configure({ mode: "parallel" });

  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  test("paste error and preview preserve review-before-ledger", async ({ page }, testInfo) => {
    await page.goto("/capture/paste", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Dán bất cứ thứ gì" }),
    ).toBeVisible();

    const content = page.getByLabel("Nội dung");
    await content.fill("xin chào");
    await page.getByRole("button", { name: "Phân tích", exact: true }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(content).toHaveAttribute("aria-invalid", "true");
    await auditCurrentState(page, testInfo, "paste-validation-error", {
      requireAlert: true,
    });

    await content.fill("cafe 45k");
    await page.getByRole("button", { name: "Phân tích", exact: true }).click();

    await expect(page.getByRole("status")).toContainText(/Tìm thấy 1 giao dịch/);
    await expect(page.getByRole("button", { name: "Vào Inbox", exact: true })).toBeVisible();
    await expect(
      page.getByText(/Không có nút .*ghi thẳng vào sổ.*mọi mục đều chờ bạn duyệt/i),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Duyệt vào sổ/i })).toHaveCount(0);
    await auditCurrentState(page, testInfo, "paste-review-preview");
  });

  test("Inbox review validation leaves ledger and candidate pending", async ({ page }, testInfo) => {
    await page.goto("/inbox", { waitUntil: "domcontentloaded" });
    const seed = page.getByRole("button", { name: "Nạp dữ liệu mẫu", exact: true });
    await expect(seed).toBeVisible();
    await seed.click();

    const review = page.getByRole("button", { name: /^Duyệt .+/ }).first();
    await expect(review).toBeVisible();
    await review.click();
    await expect(
      page.getByRole("heading", { level: 2, name: "Duyệt giao dịch" }),
    ).toBeVisible();

    const before = await readDemoMutationState(page);
    await page.getByLabel("Loại").selectOption("transfer");

    const source = page.getByLabel("Từ tài khoản");
    const destination = page.getByLabel("Đến tài khoản");
    const firstAccountId = await source.locator("option").first().getAttribute("value");
    expect(firstAccountId).toBeTruthy();
    await source.selectOption(firstAccountId!);
    await destination.selectOption(firstAccountId!);
    await page.getByRole("button", { name: "Duyệt vào sổ", exact: true }).click();

    await expect(page.getByRole("alert")).toHaveText(
      "Hai tài khoản chuyển phải khác nhau.",
    );
    const after = await readDemoMutationState(page);
    expect(after.transactionCount).toBe(before.transactionCount);
    expect(after.candidateStatuses).toEqual(before.candidateStatuses);

    await auditCurrentState(page, testInfo, "inbox-review-validation", {
      requireAlert: true,
      requireDialog: true,
    });
  });

  test("delete-account confirmation is exact and never submitted", async ({ page }, testInfo) => {
    await page.goto("/settings/delete-account", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: "Xóa tài khoản" }),
    ).toBeVisible();

    const form = page.locator("form.delete-account-form");
    const confirmation = page.getByLabel(/Gõ XÓA để xác nhận/);
    const destructiveSubmit = form.getByRole("button", {
      name: "Xóa vĩnh viễn",
      exact: true,
    });

    await confirmation.fill("XOA");
    await expect(confirmation).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(/Chưa khớp.*XÓA/)).toBeVisible();
    await expect(destructiveSubmit).toBeDisabled();
    await auditCurrentState(page, testInfo, "delete-confirmation-invalid");

    await confirmation.fill("XÓA");
    await expect(confirmation).toHaveAttribute("aria-invalid", "false");
    await expect(page.getByText(/Xác nhận hợp lệ/)).toBeVisible();
    await expect(destructiveSubmit).toBeEnabled();
    await auditCurrentState(page, testInfo, "delete-confirmation-valid");

    await expect(page).toHaveURL(/\/settings\/delete-account$/);
  });
});
