import { expect, test } from "@playwright/test";
import { seedUiAuditState } from "./responsive-audit";

/**
 * Every interactive control in the app shell must have a non-empty accessible
 * name, at every width.
 *
 * Found while fixing #145. Between 761px and 1100px the sidebar collapses to
 * icons and hides its labels:
 *
 *   .navLink > span, .navButton > span, .settingsLink > span { display: none }
 *
 * `display: none` removes a node from the accessible name computation, and the
 * icons are `aria-hidden="true"` — so five controls on every authenticated route
 * were announced as bare "link" and "button" with nothing else. That is WCAG 2.1
 * 4.1.2 Name, Role, Value, and it is invisible to every gate this repository has:
 * the layout is correct, contrast is correct, target size is correct, nothing
 * overflows, and the name is simply absent.
 *
 * Measured before the fix, at 768 and 1024, on /dashboard, /transactions,
 * /accounts and /settings — 5 unnamed controls on each, 20 in total. At 1366 and
 * at 390 there were none: at 1366 the labels are visible, and at 390 the sidebar
 * is `display: none` so its controls are not in the accessibility tree at all.
 * The defect lived only in the band between.
 *
 * This spec deliberately checks *every* control rather than the five known ones.
 * A test that lists what it already knows is broken cannot catch the sixth.
 */

const ROUTES = ["/dashboard", "/transactions", "/accounts", "/settings"];

/**
 * Mirrors the accessible-name computation closely enough for this purpose:
 * `aria-label`, `aria-labelledby`, `title`, or descendant text that is neither
 * `display: none`/`visibility: hidden` nor `aria-hidden`. It does not implement
 * the full spec — it does not need to. Every case here is either plainly named or
 * plainly nameless, and a partial implementation that errs toward "named" only
 * ever under-reports.
 */
async function unnamedControls(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const FOCUSABLE =
      "a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])";

    const hasVisibleText = (root: Element): boolean => {
      for (const node of Array.from(root.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) return true;
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as Element;
        if (el.getAttribute("aria-hidden") === "true") continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (hasVisibleText(el)) return true;
      }
      return false;
    };

    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll(FOCUSABLE))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (el.getAttribute("aria-hidden") === "true") continue;

      if (el.getAttribute("aria-label")?.trim()) continue;
      if (el.getAttribute("aria-labelledby")?.trim()) continue;
      if (el.getAttribute("title")?.trim()) continue;
      // An input is named by its <label>, not by its own content.
      if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA") {
        const id = el.getAttribute("id");
        if (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) continue;
        if (el.closest("label")) continue;
        if ((el as HTMLInputElement).placeholder?.trim()) continue;
      }
      if (hasVisibleText(el)) continue;

      const href = el.getAttribute("href");
      out.push(`<${el.tagName.toLowerCase()}${href ? ` href="${href}"` : ""}>`);
    }
    return out;
  });
}

test.describe("app shell accessible names", () => {
  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  for (const route of ROUTES) {
    test(`every control on ${route} has an accessible name`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      // The sidebar renders with the shell, so nothing needs to settle — but the
      // route's own content mounts after hydration and can add controls.
      await page.locator("main, [role='main']").first().waitFor({ state: "visible" });

      const unnamed = await unnamedControls(page);
      expect(
        unnamed,
        `${unnamed.length} control(s) with no accessible name on ${route}: ${unnamed.join(", ")}`,
      ).toEqual([]);
    });
  }
});
