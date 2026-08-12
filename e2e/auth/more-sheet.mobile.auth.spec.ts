import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  seedServer,
  signIn,
} from "./harness";

const PHONE_VIEWPORTS = [
  { label: "standard phone", width: 390, height: 844 },
  { label: "short phone", width: 390, height: 568 },
] as const;

async function openMoreSheet(page: Page) {
  const trigger = page
    .getByRole("navigation", { name: "Điều hướng di động" })
    .getByRole("button", { name: "Thêm", exact: true });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const sheet = page.getByRole("dialog", { name: "Thêm & tài khoản" });
  await expect(sheet).toBeVisible();
  return { sheet, trigger };
}

async function scrollToFinalAction(sheet: Locator, logout: Locator) {
  const body = sheet.locator('[data-slot="dialog-body"]');
  await body.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await logout.scrollIntoViewIfNeeded();

  return sheet.evaluate((element) => {
    const sheetBody = element.querySelector<HTMLElement>('[data-slot="dialog-body"]');
    const logout = Array.from(element.querySelectorAll<HTMLElement>("button")).find(
      (button) => button.textContent?.trim() === "Đăng xuất",
    );
    if (!sheetBody || !logout) throw new Error("More sheet is missing its body or final action");

    const scrollOwners: string[] = [];
    let current: HTMLElement | null = logout;
    while (current && current !== element.parentElement) {
      const style = getComputedStyle(current);
      if (
        /(auto|scroll)/.test(style.overflowY) &&
        current.scrollHeight > current.clientHeight + 1
      ) {
        scrollOwners.push(current.dataset.slot ?? current.tagName.toLowerCase());
      }
      current = current.parentElement;
    }

    const action = logout.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const actionCenter = document.elementFromPoint(
      action.left + action.width / 2,
      action.top + action.height / 2,
    );

    return {
      body: {
        clientHeight: sheetBody.clientHeight,
        scrollHeight: sheetBody.scrollHeight,
        scrollTop: sheetBody.scrollTop,
      },
      action: {
        top: action.top,
        bottom: action.bottom,
        left: action.left,
        right: action.right,
      },
      viewport,
      centerTargetsAction: actionCenter?.closest("button") === logout,
      scrollOwners,
    };
  });
}

async function inspectDialogBody(dialog: Locator) {
  return dialog.locator('[data-slot="dialog-body"]').evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      overflowY: style.overflowY,
    };
  });
}

test.describe("PP-12 authenticated mobile More sheet", () => {
  test.beforeEach(async ({ page }) => {
    await seedServer();
    await page.addInitScript(() => {
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
    await signIn(page);
  });

  test("the final Đăng xuất action remains reachable from every supported phone height", async ({
    page,
  }) => {
    for (const viewport of PHONE_VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await assertAuthenticatedMode(page);

      const { sheet, trigger } = await openMoreSheet(page);
      const close = sheet.getByRole("button", { name: "Đóng", exact: true });
      const logout = sheet.getByRole("button", { name: "Đăng xuất", exact: true });
      await expect(close, `${viewport.label} keeps the sheet header usable`).toBeVisible();
      await expect(logout).toBeVisible();

      const result = await scrollToFinalAction(sheet, logout);
      expect(
        result.body.scrollHeight,
        `${viewport.label} needs a real body scroll range for its final account action`,
      ).toBeGreaterThan(result.body.clientHeight);
      expect(result.body.scrollTop, `${viewport.label} body reaches its scroll end`).toBeGreaterThan(0);
      expect(result.scrollOwners, `${viewport.label} has one coherent scroll owner`).toEqual([
        "dialog-body",
      ]);
      expect(result.action.top, `${viewport.label} logout stays below browser chrome`).toBeGreaterThanOrEqual(0);
      expect(result.action.bottom, `${viewport.label} logout clears the bottom edge`).toBeLessThanOrEqual(
        result.viewport.height,
      );
      expect(result.action.left).toBeGreaterThanOrEqual(0);
      expect(result.action.right).toBeLessThanOrEqual(result.viewport.width);
      expect(result.centerTargetsAction, `${viewport.label} logout is not obscured`).toBe(true);
      await logout.click({ trial: true });

      await close.click();
      await expect(sheet).toBeHidden();
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
    }

    await assertNoUnservedRequests();
  });

  test("a representative shared dialog keeps its header and keyboard-focused field reachable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 568 });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await assertAuthenticatedMode(page);

    await page.getByRole("button", { name: "Ghi chi tiêu", exact: true }).first().click();
    const dialog = page.getByRole("dialog", { name: "Ghi chi tiêu" });
    const close = dialog.getByRole("button", { name: "Đóng", exact: true });
    const amount = dialog.getByRole("textbox", { name: "Số tiền chi (₫)" });
    await expect(dialog).toBeVisible();
    await expect(close).toBeVisible();

    const beforeKeyboard = await inspectDialogBody(dialog);
    expect(beforeKeyboard.overflowY).toBe("auto");

    await amount.focus();
    await page.setViewportSize({ width: 390, height: 360 });
    await amount.scrollIntoViewIfNeeded();
    await expect(amount).toBeVisible();
    await expect(close).toBeVisible();

    const body = await inspectDialogBody(dialog);
    expect(body.scrollHeight).toBeGreaterThanOrEqual(body.clientHeight);
    await expect(dialog.getByRole("button", { name: "Lưu", exact: true })).toBeVisible();

    await assertNoUnservedRequests();
  });
});
