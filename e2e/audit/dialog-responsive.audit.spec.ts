import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { seedUiAuditState } from "./responsive-audit";

type DialogCase = {
  label: string;
  path: string;
  action: RegExp;
};

const CASES: DialogCase[] = [
  { label: "account-create", path: "/accounts", action: /^Thêm tài khoản$/i },
  { label: "budget-create", path: "/budgets", action: /^Thêm ngân sách$/i },
  { label: "commitment-create", path: "/commitments", action: /^Thêm khoản định kỳ$/i },
  {
    label: "income-template-create",
    path: "/income-templates",
    action: /^Thêm khoản thu định kỳ$/i,
  },
  { label: "goal-create", path: "/goals", action: /^Thêm mục tiêu$/i },
];

async function firstVisible(locator: Locator): Promise<Locator | null> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) return candidate;
  }
  return null;
}

async function waitForFirstVisible(locator: Locator, message: string): Promise<Locator> {
  await expect
    .poll(async () => Boolean(await firstVisible(locator)), {
      message,
      timeout: 10_000,
    })
    .toBe(true);

  const visible = await firstVisible(locator);
  expect(visible, message).not.toBeNull();
  return visible!;
}

async function auditOpenDialog(page: Page, testInfo: TestInfo, label: string): Promise<void> {
  const dialogs = page.locator("[role='dialog'], dialog[open], [aria-modal='true']");
  const dialog = await waitForFirstVisible(dialogs, `${label} must open a visible dialog/sheet`);
  await expect(dialog).toBeVisible();

  const result = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const dialogElement = Array.from(
      document.querySelectorAll("[role='dialog'], dialog[open], [aria-modal='true']"),
    ).find((element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    }) as HTMLElement | undefined;

    if (!dialogElement) {
      return { errors: ["No visible dialog element"], viewport: null, dialog: null };
    }

    const rect = dialogElement.getBoundingClientRect();
    const style = window.getComputedStyle(dialogElement);
    const viewport = { width: root.clientWidth, height: root.clientHeight };
    const documentWidth = Math.max(root.scrollWidth, body.scrollWidth);
    const errors: string[] = [];
    const canScrollY =
      /(auto|scroll)/.test(style.overflowY) ||
      dialogElement.scrollHeight > dialogElement.clientHeight + 1;

    if (documentWidth > viewport.width + 2) {
      errors.push(`document width ${documentWidth}px exceeds viewport ${viewport.width}px`);
    }
    if (rect.left < -1 || rect.right > viewport.width + 1) {
      errors.push(`dialog x=${Math.round(rect.left)}..${Math.round(rect.right)} exceeds viewport`);
    }
    if ((rect.top < -1 || rect.bottom > viewport.height + 1) && !canScrollY) {
      errors.push(
        `dialog y=${Math.round(rect.top)}..${Math.round(rect.bottom)} is clipped without scrolling`,
      );
    }

    const controls = Array.from(
      dialogElement.querySelectorAll(
        "button, a[href], input:not([type='hidden']), select, textarea, [role='button'], [tabindex]:not([tabindex='-1'])",
      ),
    ).filter((element): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      const controlStyle = window.getComputedStyle(element);
      const controlRect = element.getBoundingClientRect();
      return (
        controlStyle.display !== "none" &&
        controlStyle.visibility !== "hidden" &&
        controlRect.width > 0 &&
        controlRect.height > 0
      );
    });

    for (const control of controls) {
      const controlRect = control.getBoundingClientRect();
      if (controlRect.left < -1 || controlRect.right > viewport.width + 1) {
        errors.push(
          `${control.tagName.toLowerCase()} is horizontally clipped at ${Math.round(controlRect.left)}..${Math.round(controlRect.right)}`,
        );
      }
    }

    return {
      errors,
      viewport,
      dialog: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        canScrollY,
        controlCount: controls.length,
      },
    };
  });

  const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
  await testInfo.attach(`${label}-${testInfo.project.name}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach(`${label}-${testInfo.project.name}.json`, {
    body: Buffer.from(JSON.stringify(result, null, 2)),
    contentType: "application/json",
  });

  expect(result.errors, result.errors.join("\n")).toEqual([]);
}

test.describe("core create-dialog states", () => {
  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  for (const item of CASES) {
    test(`${item.label} remains usable`, async ({ page }, testInfo) => {
      await page.goto(item.path, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

      const action = await waitForFirstVisible(
        page.getByRole("button", { name: item.action }),
        `${item.path} must expose ${item.action}`,
      );
      await action.click();
      await auditOpenDialog(page, testInfo, item.label);
    });
  }
});
