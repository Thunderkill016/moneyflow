import { expect, test } from "@playwright/test";
import { auditRoute, seedUiAuditState, type AuditRoute } from "./responsive-audit";

const CRITICAL_ROUTES: AuditRoute[] = [
  { label: "landing", path: "/landing" },
  { label: "insights", path: "/insights" },
  { label: "quick-capture", path: "/capture/quick" },
  { label: "transactions", path: "/transactions" },
];

test.describe("critical browser compatibility audit", () => {
  test.describe.configure({ mode: "parallel" });

  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  for (const route of CRITICAL_ROUTES) {
    test(`${route.label} works in the critical browser matrix`, async ({ page }, testInfo) => {
      await auditRoute(page, testInfo, route);
    });
  }

  test("landing dark mode keeps semantic text and surfaces readable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.use.colorScheme !== "dark", "dark-theme regression contract");

    await page.goto("/landing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator(".lp-hero-title")).toBeVisible();

    const colors = await page.evaluate(() => {
      const readStyle = (selector: string): CSSStyleDeclaration => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        return window.getComputedStyle(element);
      };

      return {
        brand: readStyle(".lp-nav .brand").color,
        hero: readStyle(".lp-hero-title").color,
        lead: readStyle(".lp-hero-lead").color,
        navBackground: readStyle(".lp-nav").backgroundColor,
        proofBackground: readStyle(".landing-proof-list li").backgroundColor,
        previewBackground: readStyle(".preview-dash-stats").backgroundColor,
        ctaBackgroundImage: readStyle(".lp-cta").backgroundImage,
        ctaTitle: readStyle(".lp-cta h2").color,
      };
    });

    expect(colors.brand).toBe("rgb(237, 237, 237)");
    expect(colors.hero).toBe("rgb(237, 237, 237)");
    expect(colors.lead).toBe("rgb(160, 160, 168)");
    expect(colors.navBackground).toBe("rgb(26, 26, 30)");
    expect(colors.proofBackground).toBe("rgb(26, 26, 30)");
    expect(colors.previewBackground).toBe("rgb(26, 26, 30)");
    expect(colors.ctaBackgroundImage).toContain("linear-gradient");
    expect(colors.ctaTitle).toBe("rgb(255, 255, 255)");
  });
});
