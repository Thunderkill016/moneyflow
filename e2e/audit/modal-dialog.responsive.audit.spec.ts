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

/** Matches the phone bottom-sheet breakpoint in globals.css and app-shell.module.css. */
const PHONE_MAX_WIDTH = 760;

type DialogCase = {
  label: string;
  route: string;
  opener: RegExp;
  selector: string;
};

/**
 * The `[open]` filter is required, not cosmetic: several dialogs share each class
 * and all of them sit in the DOM closed, so a bare class selector resolves to
 * three elements on /transactions.
 *
 * One case per dialog primitive, not per dialog. Every modal in the product carries
 * `.transaction-dialog` or `.account-dialog` except the capture chooser, whose
 * layout lives in the app-shell CSS Module — so that is the one a global dialog
 * rule can silently break, and #145 names it as a third affected flow.
 */
const CASES: DialogCase[] = [
  {
    label: "account dialog",
    route: "/accounts",
    opener: /^Thêm tài khoản$/,
    selector: "dialog.account-dialog[open]",
  },
  {
    label: "transaction dialog",
    route: "/transactions",
    opener: /^Ghi chi tiêu$/,
    selector: "dialog.transaction-dialog[open]",
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
 * The dialogs run a `dialog-in` scale animation. Measuring the moment they become
 * visible catches them mid-transform — a 320px sheet reads as left: 1.69px rather
 * than 0. Wait for the animation to finish instead of loosening the assertion.
 */
async function settle(page: import("@playwright/test").Page, selector: string) {
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    return el.getAnimations().every((animation) => animation.playState === "finished");
  }, selector);
}

/**
 * Measured from the element itself rather than a selector string, because the
 * capture chooser's only class is a hashed CSS Module name that no test can spell.
 */
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
  // Assert the real property — centred — rather than merely "not at x=0", so a
  // half-fixed layout still fails.
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

  /**
   * The "Ghi giao dịch" chooser, third of the three flows named in #145 and the one
   * that matters most here: it is the only modal in the product whose layout lives in
   * a CSS Module rather than globals.css, so it is the dialog a global dialog rule can
   * silently break. A centring rule at class-level specificity would outrank its
   * (0,1,0) `.sheet` rule and flatten the phone sheet into a floating card.
   *
   * Located structurally rather than by accessible name. Its trigger is labelled
   * "Nhập nhanh" (the "Ghi giao dịch" string is the dialog's own heading), and below
   * 1100px the sidebar collapses to icons with that label set to `display: none`,
   * which removes it from the accessible name. The single `<button>` inside the
   * sidebar's primary nav is stable at every width where the sidebar exists.
   */
  const chooserTrigger = 'aside[aria-label="Điều hướng chính"] nav button';

  test("capture chooser is placed deliberately", async ({ page }, testInfo) => {
    const width = page.viewportSize()?.width ?? 0;
    // The sidebar is `display: none` below 760px and the centre mobile nav button
    // runs "Ghi chi tiêu" directly, so the chooser has no phone entry point at all.
    // Skipping explicitly, with the width recorded, rather than letting a missing
    // trigger turn into a silent pass.
    test.skip(width <= PHONE_MAX_WIDTH, `chooser has no trigger at ${width}px`);

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const trigger = page.locator(chooserTrigger);
    // Assert the trigger before clicking. Without this, a renamed sidebar would make
    // the click time out with a locator error rather than a layout failure — and a
    // reader would take the red for a regression in placement.
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
    // #145 requires overlay, focus trap, close button and keyboard dismissal to
    // keep working after the placement fix.
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
