import { expect, test } from "@playwright/test";
import { auditRoute, seedUiAuditState, type AuditRoute } from "./responsive-audit";

const ROUTES: AuditRoute[] = [
  { label: "landing", path: "/landing" },
  { label: "login", path: "/login" },
  { label: "register", path: "/register" },
  { label: "insights", path: "/insights" },
  { label: "quick-capture", path: "/capture/quick" },
  { label: "transactions", path: "/transactions" },
  { label: "accounts", path: "/accounts" },
  { label: "budgets", path: "/budgets" },
  { label: "commitments", path: "/commitments" },
  { label: "income-templates", path: "/income-templates" },
  { label: "goals", path: "/goals" },
  { label: "reports", path: "/reports" },
  { label: "categories", path: "/categories" },
  { label: "inbox", path: "/inbox" },
  { label: "timeline", path: "/timeline" },
  { label: "rules", path: "/rules" },
  { label: "imports", path: "/imports" },
  { label: "imports-direct", path: "/imports/direct" },
  { label: "settings", path: "/settings" },
  { label: "settings-export", path: "/settings/export" },
];

test.describe("cross-device responsive audit", () => {
  test.describe.configure({ mode: "parallel" });

  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  for (const route of ROUTES) {
    test(`${route.label} stays usable`, async ({ page }, testInfo) => {
      await auditRoute(page, testInfo, route);
    });
  }

  test("SAFE-02 keeps Login visible and tappable on mobile", async ({ page }, testInfo) => {
    const width = page.viewportSize()?.width ?? 1_440;
    test.skip(width > 560, "SAFE-02 is specific to the mobile header breakpoint");

    await page.goto("/landing", { waitUntil: "domcontentloaded" });
    const navigation = page.getByRole("navigation", {
      name: "Điều hướng trang chủ",
    });
    const login = navigation.getByRole("link", { name: "Đăng nhập" });

    await expect(login).toHaveCount(1);
    await expect(login).toBeVisible();
    const box = await login.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);

    await testInfo.attach(`safe-02-login-${testInfo.project.name}.json`, {
      body: Buffer.from(
        JSON.stringify(
          {
            finding: "SAFE-02",
            viewport: page.viewportSize(),
            display: await login.evaluate((element) => getComputedStyle(element).display),
            width: box!.width,
            height: box!.height,
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
  });

  test("SAFE-04/05/06 baseline captures mobile Dashboard planning surfaces", async ({
    page,
  }, testInfo) => {
    const width = page.viewportSize()?.width ?? 1_440;
    test.skip(width > 430, "owner evidence is from a phone-sized Dashboard");

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const budget = page.locator(".budget-panel");
    const goal = page.locator(".goal-dashboard-panel");

    await expect(budget).toBeVisible();
    await expect(goal).toBeVisible();

    const metrics = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const rect = element.getBoundingClientRect();
        const headingDetail = element.querySelector<HTMLElement>(".section-heading p");
        return {
          selector,
          width: rect.width,
          background: getComputedStyle(element).backgroundColor,
          borderColor: getComputedStyle(element).borderColor,
          headingDetailDisplay: headingDetail
            ? getComputedStyle(headingDetail).display
            : null,
        };
      };

      const firstKpi = document.querySelector<HTMLElement>(
        ".insights-kpi > article:first-child",
      );

      return {
        viewport: {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        budget: read(".budget-panel"),
        goal: read(".goal-dashboard-panel"),
        firstKpiBackground: firstKpi
          ? getComputedStyle(firstKpi).backgroundImage
          : null,
      };
    });

    const budgetImage = await budget.screenshot({ animations: "disabled" });
    const goalImage = await goal.screenshot({ animations: "disabled" });
    await testInfo.attach(`safe-04-budget-${testInfo.project.name}.png`, {
      body: budgetImage,
      contentType: "image/png",
    });
    await testInfo.attach(`safe-05-goal-${testInfo.project.name}.png`, {
      body: goalImage,
      contentType: "image/png",
    });
    await testInfo.attach(`safe-04-05-06-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify(metrics, null, 2)),
      contentType: "application/json",
    });

    expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
  });
});
