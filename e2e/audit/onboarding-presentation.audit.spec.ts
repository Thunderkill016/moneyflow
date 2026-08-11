import { expect, test, type Page } from "@playwright/test";

/**
 * Onboarding presentation ownership (MF-04, slice 1).
 *
 * `/onboarding` is the first screen a new account sees, and it rendered as
 * unstyled HTML: the card was transparent with `padding: 0`, no radius, no
 * shadow, and stretched full-bleed to 1280px on desktop. Every CSS gate was
 * green, because none of them asked whether an emitted class had an owner.
 *
 * These assertions are deliberately about *ownership taking effect* — a real
 * surface, bounded width, a working gutter — not about specific brand values.
 * Pinning exact colours here would turn a repair contract into a design lock.
 */

async function openOnboarding(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.removeItem("moneyflow-onboarding-done");
  });
  await page.goto("/onboarding", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function card(page: Page) {
  return page.locator("main > div").first();
}

test.describe("onboarding presentation", () => {
  test("the card is a real surface, not unstyled markup", async ({ page }) => {
    await openOnboarding(page);

    const surface = await card(page).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        padding: Number.parseFloat(style.paddingTop),
        radius: Number.parseFloat(style.borderTopLeftRadius),
        shadow: style.boxShadow,
        width: element.getBoundingClientRect().width,
      };
    });

    expect(surface.background, "the card must paint a surface").not.toBe("rgba(0, 0, 0, 0)");
    expect(surface.padding, "the card must have padding").toBeGreaterThanOrEqual(16);
    expect(surface.radius, "the card must be a rounded surface").toBeGreaterThan(0);
    expect(surface.shadow, "the card must be lifted off the canvas").not.toBe("none");
  });

  test("content stays bounded and inside the page gutter", async ({ page }) => {
    await openOnboarding(page);

    const viewport = page.viewportSize()?.width ?? 1_280;
    const metrics = await page.evaluate(() => {
      const element = document.querySelector("main > div");
      const rect = element?.getBoundingClientRect();
      return {
        cardWidth: rect?.width ?? 0,
        cardLeft: rect?.left ?? 0,
        overflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(metrics.overflow, "onboarding must never scroll sideways").toBeLessThanOrEqual(1);
    expect(metrics.cardLeft, "the card must respect the page gutter").toBeGreaterThan(0);
    expect(metrics.cardWidth).toBeLessThan(viewport);
    // The regression was an uncontrolled full-bleed form on desktop.
    if (viewport >= 1_024) {
      expect(metrics.cardWidth, "wide viewports must keep a readable measure").toBeLessThanOrEqual(
        620,
      );
    }
  });

  test("progress, headings and errors keep their semantics", async ({ page }) => {
    await openOnboarding(page);

    const progress = page.getByRole("progressbar");
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuemax", "3");

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    // Deliberately not asserted here: the wallet step has no reachable
    // client-side validation error. `normalizeCashWalletName` turns a blank
    // name into the default "Tiền mặt" and saves, so the only way to render
    // role="alert" is a save failure. Asserting a styled error without a way to
    // reach it would be a test that proves nothing.
  });

  test("interactive targets meet the minimum size and show focus", async ({ page }) => {
    await openOnboarding(page);

    for (const button of await page.locator("main button").all()) {
      if (!(await button.isVisible())) continue;
      const box = await button.boundingBox();
      expect(box?.height ?? 0, "every action must meet the 44px target").toBeGreaterThanOrEqual(
        44,
      );
    }

    const primary = page.getByRole("button", { name: "Tiếp" });
    await primary.focus();
    const focus = await primary.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.outlineStyle}|${style.outlineWidth}|${style.boxShadow}`;
    });
    expect(focus, "keyboard focus must be visible").not.toBe("none|0px|none");
  });

  test("the three-step journey still works end to end", async ({ page }) => {
    await openOnboarding(page);

    // Step 1 → 2
    await page.getByRole("button", { name: "Tiếp" }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");

    // Step 2 → 3
    await expect(page.getByRole("button", { name: "Quay lại" })).toBeVisible();
    const nameField = page.getByLabel("Tên ví");
    await nameField.fill("Tiền mặt");
    await page.getByRole("button", { name: /^(Tạo ví tiền mặt|Xác nhận ví)$/ }).click();
    await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "3", {
      timeout: 15_000,
    });

    // Step 3 exposes both documented exits and neither is the lab Inbox.
    await expect(page.getByRole("button", { name: "Ghi chi đầu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vào tổng quan" })).toBeVisible();
    await expect(page.locator('a[href="/inbox"]')).toHaveCount(0);
  });
});
