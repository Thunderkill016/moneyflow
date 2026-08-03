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

  test("SAFE-04/05/06 repairs mobile Dashboard planning surfaces", async ({
    page,
  }, testInfo) => {
    const width = page.viewportSize()?.width ?? 1_440;
    test.skip(width > 430, "owner evidence is from a phone-sized Dashboard");

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const budget = page.locator(".budget-panel");
    const goal = page.locator(".goal-dashboard-panel");
    const weekly = page.locator(".weekly-summary-panel");

    await expect(budget).toBeVisible();
    await expect(goal).toBeVisible();
    await expect(weekly).toBeVisible();

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

      // The four-card KPI row is now one balance statement. The rule this
      // measures is unchanged: the primary balance surface carries no
      // background image (no gradient).
      const firstKpi = document.querySelector<HTMLElement>(
        '[aria-labelledby="mf-standing-label"]',
      );
      const weeklyPanel = document.querySelector<HTMLElement>(
        ".weekly-summary-panel",
      );
      const weeklyHeading = weeklyPanel?.querySelector<HTMLElement>(
        ".section-heading",
      );
      const weeklyBody = weeklyPanel?.querySelector<HTMLElement>(
        ".weekly-summary-kpis, .planning-card-empty",
      );
      if (!weeklyPanel || !weeklyHeading || !weeklyBody) {
        throw new Error("Missing weekly summary alignment elements");
      }
      const weeklyPanelRect = weeklyPanel.getBoundingClientRect();
      const weeklyHeadingRect = weeklyHeading.getBoundingClientRect();
      const weeklyBodyRect = weeklyBody.getBoundingClientRect();

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
        weekly: {
          bodyGap: weeklyBodyRect.top - weeklyHeadingRect.bottom,
          bodyBottomInset: weeklyPanelRect.bottom - weeklyBodyRect.bottom,
        },
      };
    });

    const budgetImage = await budget.screenshot({ animations: "disabled" });
    const goalImage = await goal.screenshot({ animations: "disabled" });
    const weeklyImage = await weekly.screenshot({ animations: "disabled" });
    await testInfo.attach(`safe-04-budget-${testInfo.project.name}.png`, {
      body: budgetImage,
      contentType: "image/png",
    });
    await testInfo.attach(`safe-05-goal-${testInfo.project.name}.png`, {
      body: goalImage,
      contentType: "image/png",
    });
    await testInfo.attach(`safe-06b-weekly-${testInfo.project.name}.png`, {
      body: weeklyImage,
      contentType: "image/png",
    });
    await testInfo.attach(`safe-04-05-06-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify(metrics, null, 2)),
      contentType: "application/json",
    });

    expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
    expect(metrics.budget.headingDetailDisplay).not.toBe("none");
    expect(metrics.goal.headingDetailDisplay).not.toBe("none");
    expect(metrics.budget.background).toBe(metrics.goal.background);
    expect(metrics.firstKpiBackground).toBe("none");
    expect(metrics.weekly.bodyGap).toBeGreaterThanOrEqual(0);
    expect(metrics.weekly.bodyGap).toBeLessThanOrEqual(24);
    expect(metrics.weekly.bodyBottomInset).toBeGreaterThanOrEqual(0);
  });

  test("SAFE-09 keeps mobile transaction day totals outside transaction rows", async ({
    page,
  }, testInfo) => {
    const width = page.viewportSize()?.width ?? 1_440;
    test.skip(width > 430, "SAFE-09 is specific to phone transaction groups");

    // This audit owns transaction-group geometry, not the quick-capture flow.
    // Seed one contract-valid demo transaction directly, then reload so the
    // locator is resolved after the demo store hydration has completed.
    await page.goto("/transactions", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.localStorage.setItem(
        "moneyflow-demo-transactions-v1",
        JSON.stringify([
          {
            id: "safe-09-layout-fixture",
            kind: "expense",
            categoryId: "safe-09-food",
            category: "Ăn uống",
            note: "SAFE-09 layout fixture",
            accountId: "safe-09-account",
            account: "MB Bank",
            amount: 125_000,
            occurredOn: "2026-08-03",
            occurredAt: "2026-08-03T00:00:00.000Z",
            relativeDate: "Vừa xong",
          },
        ]),
      );
    });
    await page.reload({ waitUntil: "domcontentloaded" });

    const header = page.locator(".date-group-header:visible").first();
    await expect(header).toBeVisible();

    const readMetrics = async () =>
      header.evaluate((element) => {
        if (!element.isConnected) return null;
        const row = element.parentElement?.querySelector<HTMLElement>(".manager-row");
        if (!row?.isConnected) return null;

        const position = getComputedStyle(element).position;
        if (!position) return null;
        const headerRect = element.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        return {
          position,
          headerHeight: headerRect.height,
          headerBottom: headerRect.bottom,
          rowTop: rowRect.top,
          overlap: Math.max(0, headerRect.bottom - rowRect.top),
        };
      });

    await expect
      .poll(
        async () => {
          const current = await readMetrics();
          return current?.position === "static" && current.headerHeight > 0;
        },
        { timeout: 15_000 },
      )
      .toBe(true);

    const metrics = await readMetrics();
    if (!metrics) throw new Error("Missing stable transaction group metrics for SAFE-09");

    const evidence = await page.screenshot({ animations: "disabled" });
    await testInfo.attach(`safe-09-day-total-${testInfo.project.name}.png`, {
      body: evidence,
      contentType: "image/png",
    });
    await testInfo.attach(`safe-09-day-total-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify(metrics, null, 2)),
      contentType: "application/json",
    });

    expect(metrics.position).toBe("static");
    expect(metrics.headerHeight).toBeGreaterThanOrEqual(44);
    expect(metrics.headerBottom).toBeLessThanOrEqual(metrics.rowTop + 1);
    expect(metrics.overlap).toBeLessThanOrEqual(1);
  });

  test("SAFE-04/05 detail summaries stack and actions stay tappable on phones", async ({
    page,
  }) => {
    const width = page.viewportSize()?.width ?? 1_440;
    test.skip(width > 430, "detail repair is asserted on phone widths");

    for (const route of [
      {
        path: "/budgets",
        summary: ".budget-overview",
        actions: ".budget-category-actions a, .budget-category-actions button",
      },
      {
        path: "/goals",
        summary: ".goal-hero",
        actions: ".goal-actions button",
      },
    ]) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const summary = page.locator(route.summary);
      await expect(summary).toBeVisible();

      const gridColumns = await summary.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      );
      expect(gridColumns.trim().split(/\s+/)).toHaveLength(1);

      const actionHeights = await page.locator(route.actions).evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      );
      for (const height of actionHeights) {
        expect(height).toBeGreaterThanOrEqual(44);
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});
