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

const MOBILE_PLANNING_LINKS = [
  { name: /Ngân sách/, href: "/budgets" },
  { name: /Định kỳ/, href: "/commitments" },
  { name: /Lương định kỳ/, href: "/income-templates" },
  { name: /Mục tiêu/, href: "/goals" },
] as const;

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

  test("THU-41 keeps compact Dashboard planning navigation usable on mobile", async ({
    page,
  }, testInfo) => {
    const width = page.viewportSize()?.width ?? 1_440;
    test.skip(width > 430, "THU-41 mobile evidence is phone-sized");

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    const navigation = page.getByRole("navigation", {
      name: "Kế hoạch từ Tổng quan",
    });
    await expect(navigation).toBeVisible();

    const links = [] as Array<{
      href: string;
      x: number;
      right: number;
      width: number;
      height: number;
    }>;

    for (const expected of MOBILE_PLANNING_LINKS) {
      const link = navigation.getByRole("link", { name: expected.name });
      await expect(link).toHaveCount(1);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", expected.href);

      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);

      links.push({
        href: expected.href,
        x: box!.x,
        right: box!.x + box!.width,
        width: box!.width,
        height: box!.height,
      });
    }

    // Detailed planning stays one tap away instead of competing with the ledger
    // on the signed-in home. These historical dashboard cards must not creep
    // back in as a second planning surface.
    await expect(page.locator(".budget-panel")).toHaveCount(0);
    await expect(page.locator(".goal-dashboard-panel")).toHaveCount(0);
    await expect(page.locator(".weekly-summary-panel")).toHaveCount(0);

    const metrics = await page.evaluate(() => {
      const firstKpi = document.querySelector<HTMLElement>(
        '[aria-labelledby="mf-standing-label"]',
      );
      return {
        viewport: {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        firstKpiBackground: firstKpi
          ? getComputedStyle(firstKpi).backgroundImage
          : null,
      };
    });

    const image = await navigation.screenshot({ animations: "disabled" });
    await testInfo.attach(`thu-41-planning-nav-${testInfo.project.name}.png`, {
      body: image,
      contentType: "image/png",
    });
    await testInfo.attach(`thu-41-planning-nav-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify({ ...metrics, links }, null, 2)),
      contentType: "application/json",
    });

    expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
    expect(metrics.firstKpiBackground).toBe("none");
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

    const header = page
      .locator('[data-slot="ledger-day-group"]:visible > header')
      .first();
    await expect(header).toBeVisible();

    const readMetrics = async () =>
      header.evaluate((element) => {
        if (!element.isConnected) return null;
        const row = element.parentElement?.querySelector<HTMLElement>(
          '[data-slot="ledger-row"]',
        );
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
        summaryName: "Tổng quan ngân sách",
        listSlot: "budget-list",
      },
      {
        path: "/goals",
        summaryName: "Tổng quan mục tiêu",
        listSlot: "goal-list",
      },
    ]) {
      await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const summary = page.getByRole("region", { name: route.summaryName });
      await expect(summary).toBeVisible();

      const gridColumns = await summary.evaluate(
        (element) => getComputedStyle(element).gridTemplateColumns,
      );
      expect(gridColumns.trim().split(/\s+/)).toHaveLength(1);

      const actions = page.locator(
        `[data-slot="${route.listSlot}"] [data-slot="planning-card-actions"] a, ` +
          `[data-slot="${route.listSlot}"] [data-slot="planning-card-actions"] button`,
      );
      await expect(actions.first()).toBeVisible();
      const actionHeights = await actions.evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      );
      expect(actionHeights.length).toBeGreaterThan(0);
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
