import { expect, test, type Page } from "@playwright/test";
import { seedServer, signIn } from "./harness";

/**
 * BUG-D — the authenticated account dropdown had no presentation owner.
 *
 * `dropdown-menu.tsx` emitted `ui-dropdown-content`, `ui-dropdown-label`,
 * `ui-dropdown-item` and `ui-dropdown-separator` after the global generation
 * that styled them was retired, so the menu rendered as raw text beside the
 * avatar. The ownership gate had it recorded as debt; this proves the repair at
 * runtime.
 *
 * Desktop and authenticated on purpose: `UserChip` renders a plain chip for a
 * demo viewer, so this path is unreachable from the demo suites.
 */

async function openAccountMenu(page: Page) {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  const trigger = page.getByRole("button", { name: /^Mở menu tài khoản/u });
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return { trigger, menu };
}

test.describe("authenticated account dropdown", () => {
  test.beforeEach(async ({ page }) => {
    await seedServer();
    await page.addInitScript(() => {
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
    await signIn(page);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`renders as a real surface in ${theme}`, async ({ page }) => {
      await page.addInitScript((value) => {
        window.localStorage.setItem("moneyflow-theme", value);
      }, theme);
      const { menu } = await openAccountMenu(page);
      await page.evaluate((value) => {
        document.documentElement.setAttribute("data-theme", value);
      }, theme);

      const surface = await menu.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          background: style.backgroundColor,
          borderWidth: Number.parseFloat(style.borderTopWidth),
          radius: Number.parseFloat(style.borderTopLeftRadius),
          shadow: style.boxShadow,
          width: rect.width,
          insideViewport:
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= window.innerWidth + 1 &&
            rect.bottom <= window.innerHeight + 1,
        };
      });

      // The regression was an unstyled menu: transparent, no border, no radius.
      expect(surface.background, "the menu must paint a surface").not.toBe("rgba(0, 0, 0, 0)");
      expect(surface.borderWidth).toBeGreaterThan(0);
      expect(surface.radius).toBeGreaterThan(0);
      expect(surface.shadow).not.toBe("none");
      expect(surface.width).toBeGreaterThan(150);
      expect(surface.insideViewport, "the portal must not be clipped").toBe(true);

      // Separator is a painted rule, not a bare element.
      const separator = page.getByRole("separator").first();
      const separatorPaint = await separator.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, height: Number.parseFloat(style.height) };
      });
      expect(separatorPaint.background).not.toBe("rgba(0, 0, 0, 0)");
      expect(separatorPaint.height).toBeGreaterThan(0);
    });
  }

  test("menu items are readable and meet the pointer target size", async ({ page }) => {
    await openAccountMenu(page);

    for (const item of await page.getByRole("menuitem").all()) {
      const box = await item.boundingBox();
      expect(box?.height ?? 0, "menu items must meet the 44px target").toBeGreaterThanOrEqual(44);
      const paint = await item.evaluate((element) => getComputedStyle(element).color);
      expect(paint).not.toBe("rgba(0, 0, 0, 0)");
    }

    await expect(page.getByRole("menuitem", { name: /Cài đặt tài khoản/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Đăng xuất/ })).toBeVisible();
  });

  test("keyboard navigation, Escape and focus return still work", async ({ page }) => {
    // Radix owns this behaviour; the presentation fix must not disturb it.
    const { trigger, menu } = await openAccountMenu(page);

    await page.keyboard.press("ArrowDown");
    const highlighted = await page.evaluate(() =>
      document.querySelector('[role="menuitem"][data-highlighted]')?.textContent?.trim() ?? null,
    );
    expect(highlighted, "arrow keys must highlight an item").not.toBeNull();

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger, "focus must return to the trigger").toBeFocused();
  });

  test("the highlighted state is visible, not silent", async ({ page }) => {
    await openAccountMenu(page);
    const first = page.getByRole("menuitem").first();

    const before = await first.evaluate((element) => getComputedStyle(element).backgroundColor);
    await page.keyboard.press("ArrowDown");
    const after = await first.evaluate((element) => getComputedStyle(element).backgroundColor);

    expect(after, "keyboard highlight must change the item's background").not.toBe(before);
  });
});
