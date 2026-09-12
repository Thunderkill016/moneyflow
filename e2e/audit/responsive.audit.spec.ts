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
    test.skip(width > 430, "SAFE-09 is specific to the mobile transaction layout");

    await page.goto("/transactions", { waitUntil: "domcontentloaded" });
    const dayHeaders = page.locator(".transactions-day-header");
    const transactionRows = page.locator(".transaction-row");

    await expect(dayHeaders.first()).toBeVisible();
    await expect(transactionRows.first()).toBeVisible();

    const metrics = await page.evaluate(() => {
      const headers = Array.from(
        document.querySelectorAll<HTMLElement>(".transactions-day-header"),
      );
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>(".transaction-row"),
      );
      return {
        viewport: {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        headers: headers.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height,
          };
        }),
        rows: rows.map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height,
          };
        }),
      };
    });

    await testInfo.attach(`safe-09-transactions-${testInfo.project.name}.json`, {
      body: Buffer.from(JSON.stringify(metrics, null, 2)),
      contentType: "application/json",
    });

    expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
    for (const header of metrics.headers) {
      expect(header.height).toBeGreaterThan(0);
      for (const row of metrics.rows) {
        const overlaps = header.top < row.bottom && header.bottom > row.top;
        expect(overlaps).toBe(false);
      }
    }
  });
});
