import { expect, test } from "@playwright/test";
import { seedUiAuditState } from "./responsive-audit";

/**
 * Regression coverage for issue #145 — desktop dialogs rendered as narrow panels
 * pinned to the top-left corner.
 *
 * Root cause was Tailwind Preflight's `*,::before,::after,::backdrop { margin: 0 }`
 * zeroing the UA's `dialog:modal { margin: auto }`. Nothing existing caught it: the
 * cross-device audit's only dialog check is `dialog-clipped-without-scroll`, which
 * fires when a dialog is vertically clipped without a scroll container, and a
 * dialog sitting in the corner is not clipped.
 *
 * Both halves are asserted, because the obvious fix for one breaks the other: a
 * centring rule carrying class-level specificity outranks the phone bottom-sheet
 * rules and flattens them into floating cards. The shipped rule is
 * `:where(dialog:modal) { margin: auto }` precisely so it loses to those.
 *
 * Viewport comes from the audit project rather than being set here, so this runs
 * across phone, tablet and desktop widths — including the ones the target-size
 * spec skips.
 */

/** Matches the phone bottom-sheet breakpoint in local dialog owner modules. */
const PHONE_MAX_WIDTH = 760;

type DialogCase = {
  label: string;
  route: string;
  opener: RegExp;
  selector: string;
};

/**
 * The `[open]` filter is required, not cosmetic: several dialogs sit in the DOM
 * closed, so a bare owner selector can resolve to multiple elements.
 *
 * Account and transaction forms now both use the shared Phase 2 Dialog primitive.
 * Its stable evidence surface is `data-slot="dialog"`; the audit must not depend on
 * the retired account or transaction global classes.
 */
const CASES: DialogCase[] = [
  {
    label: "account dialog",
    route: "/accounts",
    opener: /^Thêm tài khoản$/,
    selector: 'dialog[data-slot="dialog"][open]',
  },
  {
    label: "transaction dialog",
    route: "/transactions",
    opener: /^Ghi chi tiêu$/,
    selector: 'dialog[data-slot="dialog"][open]',
  },
];

type Geometry = {
  isModal: boolean;
  left: number;
  right: number;
  bottom: number;
  width: number;
  viewportWidth: number;
  viewportHeight: number;
  centreOffsetX: number;
};

/**
 * Dialogs can run an entrance animation. Measuring the moment they become visible
 * catches a transformed intermediate box. Wait for the animation to finish instead
 * of loosening the geometry assertion.
 */
async function settle(page: import("@playwright/test").Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    return el.getAnimations().every((animation) => animation.playState === "finished");
  }, selector);
}

async function measure(dialog: import("@playwright/test").Locator): Promise<Geometry> {
  return dialog.evaluate((el) => {
    const node = el as HTMLDialogElement;
    const rect = node.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    return {
      isModal: node.matches(":modal"),
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      viewportWidth,
      viewportHeight: document.documentElement.clientHeight,
      centreOffsetX: Math.abs((rect.left + rect.right) / 2 - viewportWidth / 2),
    };
  });
}

function assertCentred(box: Geometry, label: string) {
  expect(
    box.centreOffsetX,
    `${label} is off-centre by ${Math.round(box.centreOffsetX)}px ` +
      `(box ${Math.round(box.left)}..${Math.round(box.right)} in ${box.viewportWidth}px)`,
  ).toBeLessThanOrEqual(2);
  expect(
    box.width,
    "a centred modal should not span the whole viewport",
  ).toBeLessThan(box.viewportWidth);
}

function assertBottomSheet(box: Geometry, label: string) {
  expect(
    Math.abs(box.left),
    `${label} should start at the left edge on phones, got ${Math.round(box.left)}`,
  ).toBeLessThanOrEqual(1);
  expect(box.width).toBeGreaterThanOrEqual(box.viewportWidth - 1);
  expect(
    Math.abs(box.bottom - box.viewportHeight),
    `${label} should rest on the bottom edge on phones`,
  ).toBeLessThanOrEqual(1);
}

test.describe("modal dialog placement", () => {
  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  for (const item of CASES) {
    test(`${item.label} is placed deliberately`, async ({ page }, testInfo) => {
      await page.goto(item.route, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: item.opener }).first().click();
      await page.locator(item.selector).waitFor({ state: "visible" });
      await settle(page, item.selector);

      const box = await measure(page.locator(item.selector));
      expect(box.isModal, "dialog must be opened as a modal").toBe(true);

      if (box.viewportWidth <= PHONE_MAX_WIDTH) {
        assertBottomSheet(box, item.label);
        return;
      }

      assertCentred(box, item.label);

      await testInfo.attach(`${item.label}-${testInfo.project.name}.png`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    });
  }

  const chooserTrigger = 'aside[aria-label="Điều hướng chính"] nav button';

  test("capture chooser is placed deliberately", async ({ page }, testInfo) => {
    const width = page.viewportSize()?.width ?? 0;
    test.skip(width <= PHONE_MAX_WIDTH, `chooser has no trigger at ${width}px`);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const trigger = page.locator(chooserTrigger);
    await expect(trigger, "capture chooser trigger should exist beside the nav links")
      .toHaveCount(1);
    await trigger.click();

    const dialog = page.locator("dialog[open]");
    await dialog.waitFor({ state: "visible" });
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll("dialog[open]")).every((el) =>
        el.getAnimations().every((animation) => animation.playState === "finished"),
      ),
    );

    await expect(
      dialog.getByRole("heading", { name: "Ghi giao dịch" }),
      "the open dialog should be the capture chooser",
    ).toBeVisible();

    const box = await measure(dialog);
    expect(box.isModal, "chooser must be opened as a modal").toBe(true);
    assertCentred(box, "capture chooser");

    await testInfo.attach(`capture-chooser-${testInfo.project.name}.png`, {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });

  test("a placed dialog still traps focus and closes on Escape", async ({ page }) => {
    await page.goto(CASES[0]!.route, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: CASES[0]!.opener }).first().click();
    await page.locator(CASES[0]!.selector).waitFor({ state: "visible" });
    await settle(page, CASES[0]!.selector);

    const focusInside = await page.evaluate((sel) => {
      const dialog = document.querySelector(sel);
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    }, CASES[0]!.selector);
    expect(focusInside, "focus should be inside the open modal").toBe(true);

    await page.keyboard.press("Escape");
    await expect(page.locator(CASES[0]!.selector)).toBeHidden();
  });
});
