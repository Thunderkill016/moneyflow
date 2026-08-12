import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ROUTES = ["/landing", "/dashboard", "/transactions", "/budgets", "/accounts"];
const routes = (process.env.DESIGN_ROUTES || DEFAULT_ROUTES.join(","))
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

function slugifyRoute(route: string): string {
  if (route === "/") return "root";
  return route.replace(/^\//, "").replace(/[^a-z0-9]+/giu, "-") || "root";
}

async function settle(page: import("@playwright/test").Page): Promise<void> {
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await expect(page.locator("body")).toContainText(/\S/, { timeout: 15_000 });
  await page.locator("[aria-busy='true']:visible, .loading-card:visible").waitFor({
    state: "detached",
    timeout: 15_000,
  }).catch(() => undefined);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      }),
  );
}

test.describe("MoneyFlow design evidence", () => {
  for (const route of routes) {
    test(`${route} captures a stable visual artifact`, async ({ page }, testInfo) => {
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem("moneyflow-onboarding-done", "1");
        } catch {
          // Storage can be unavailable before first same-origin navigation.
        }
      });

      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 200, `${route} should render without HTTP failure`).toBeLessThan(400);
      await settle(page);

      const frameworkOverlay = page.locator(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
      );
      await expect(frameworkOverlay, `${route} must not show a framework error overlay`).toHaveCount(0);

      const outputDirectory = path.join("output", "design-harness", "screenshots");
      await mkdir(outputDirectory, { recursive: true });
      const fileName = `${slugifyRoute(route)}-${testInfo.project.name}.png`;
      const screenshotPath = path.join(outputDirectory, fileName);

      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
        caret: "hide",
      });

      await testInfo.attach(fileName, {
        path: screenshotPath,
        contentType: "image/png",
      });
    });
  }
});
