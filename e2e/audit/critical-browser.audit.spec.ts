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
      const normalizeColor = (value: string): string => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.body.append(probe);
        const normalized = window.getComputedStyle(probe).color;
        probe.remove();
        return normalized;
      };

      const rootStyle = window.getComputedStyle(document.documentElement);
      const readColor = (selector: string): string => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        return window.getComputedStyle(element).color;
      };
      const readBackground = (selector: string): string => {
        const element = document.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
        return window.getComputedStyle(element).backgroundColor;
      };

      return {
        expectedPrimary: normalizeColor(rootStyle.getPropertyValue("--color-text-primary").trim()),
        expectedMuted: normalizeColor(rootStyle.getPropertyValue("--color-text-secondary").trim()),
        brand: readColor(".lp-nav .brand"),
        hero: readColor(".lp-hero-title"),
        lead: readColor(".lp-hero-lead"),
        navBackground: readBackground(".lp-nav"),
        proofBackground: readBackground(".landing-proof-list li"),
      };
    });

    expect(colors.brand).toBe(colors.expectedPrimary);
    expect(colors.hero).toBe(colors.expectedPrimary);
    expect(colors.lead).toBe(colors.expectedMuted);
    expect(colors.navBackground).not.toBe("rgb(255, 255, 255)");
    expect(colors.proofBackground).not.toBe("rgb(255, 255, 255)");
    expect(colors.navBackground).not.toBe("rgba(0, 0, 0, 0)");
    expect(colors.proofBackground).not.toBe("rgba(0, 0, 0, 0)");
  });
});
