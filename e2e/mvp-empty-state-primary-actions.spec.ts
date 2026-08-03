import { expect, test } from "@playwright/test";

const CORE_ROUTES = [
  "/dashboard",
  "/transactions",
  "/accounts",
  "/categories",
  "/budgets",
  "/commitments",
  "/goals",
  "/reports",
  "/settings/export",
] as const;

const APP_STATE_KEYS = {
  seeded: "__mf_mvp_empty_state_seeded",
  transactions: "moneyflow-demo-transactions-v1",
  inbox: "moneyflow-inbox-candidates-v1",
  onboarding: "moneyflow-onboarding-done",
} as const;

async function settleRoute(page: import("@playwright/test").Page) {
  await expect(
    page.locator("[aria-busy='true']:visible, .loading-card:visible"),
  ).toHaveCount(0, { timeout: 15_000 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      }),
  );
}

test.describe("locked MVP empty-state release gate", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript((keys) => {
      try {
        if (window.localStorage.getItem(keys.seeded) === "1") return;
        window.localStorage.clear();
        window.localStorage.setItem(keys.transactions, "[]");
        window.localStorage.setItem(keys.inbox, "[]");
        window.localStorage.setItem(keys.onboarding, "1");
        window.localStorage.setItem(keys.seeded, "1");
      } catch {
        // Storage can be unavailable before the first same-origin navigation.
      }
    }, APP_STATE_KEYS);
  });

  test("every rendered core empty-state action region has exactly one primary action", async ({
    page,
  }, testInfo) => {
    const evidence: Array<{
      route: (typeof CORE_ROUTES)[number];
      actionRegions: number;
      primaryActions: number[];
      secondaryActions: number[];
    }> = [];

    for (const route of CORE_ROUTES) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 200, `${route} should load`).toBeLessThan(400);
      await expect(page.locator("body")).toContainText(/\S/, { timeout: 15_000 });
      await settleRoute(page);

      const actionRegions = page.locator(
        ".empty-state-actions:visible, .report-empty:visible > div",
      );
      const actionRegionCount = await actionRegions.count();
      const primaryActions: number[] = [];
      const secondaryActions: number[] = [];

      for (let index = 0; index < actionRegionCount; index += 1) {
        const region = actionRegions.nth(index);
        const primary = region.locator(".primary-button:visible");
        const secondary = region.locator(".secondary-button:visible");
        const primaryCount = await primary.count();
        const secondaryCount = await secondary.count();

        primaryActions.push(primaryCount);
        secondaryActions.push(secondaryCount);
        expect(
          primaryCount,
          `${route} empty-state action region ${index + 1} must expose exactly one visible primary action`,
        ).toBe(1);
        expect(
          secondaryCount,
          `${route} empty-state action region ${index + 1} may expose at most one muted secondary action`,
        ).toBeLessThanOrEqual(1);
      }

      evidence.push({
        route,
        actionRegions: actionRegionCount,
        primaryActions,
        secondaryActions,
      });
    }

    const transactionsEvidence = evidence.find((item) => item.route === "/transactions");
    expect(
      transactionsEvidence?.actionRegions ?? 0,
      "the deterministic empty transaction store must render the real Transactions empty action region",
    ).toBeGreaterThanOrEqual(1);

    expect(
      evidence.reduce((sum, item) => sum + item.actionRegions, 0),
      "the cross-route candidate must render at least one real empty-state action region",
    ).toBeGreaterThan(0);

    await testInfo.attach(`mvp-empty-state-actions-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify(evidence, null, 2)),
      contentType: "application/json",
    });
  });

  test("Báo cáo exposes direct CSV and reaches advanced export in one click", async ({ page }) => {
    await page.goto("/reports", { waitUntil: "domcontentloaded" });
    await settleRoute(page);

    const directCsv = page.locator('a[href^="/reports/export?period="]:visible').first();
    await expect(directCsv).toBeVisible();
    await expect(directCsv).toHaveAttribute("href", "/reports/export?period=month");

    const advancedExport = page.getByRole("link", { name: "Tùy chọn xuất", exact: true });
    await expect(advancedExport).toBeVisible();
    await advancedExport.click();
    await expect(page).toHaveURL(/\/settings\/export(?:\?.*)?$/);
  });
});
