import { expect, test } from "@playwright/test";
import { auditRoute, seedUiAuditState, type AuditRoute } from "./responsive-audit";

const CRITICAL_ROUTES: AuditRoute[] = [
  { label: "landing", path: "/landing" },
  { label: "dashboard", path: "/dashboard" },
  { label: "inbox", path: "/inbox" },
  { label: "budgets", path: "/budgets" },
  { label: "goals", path: "/goals" },
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

    const navigation = page.getByRole("navigation", {
      name: "Điều hướng trang chủ",
    });
    const brand = navigation.getByRole("link", {
      name: "MoneyFlow, trang chủ",
    });
    const hero = page.locator("#landing-title");
    const lead = page.locator("#landing-title + p");
    const preview = page.getByRole("figure", {
      name: "Ảnh giao diện MoneyFlow: tài khoản",
    });
    const ownership = page.getByRole("region", {
      name: "Dữ liệu của bạn vẫn thuộc về bạn.",
    });
    const finalCta = page.getByRole("region", {
      name: "Sẵn sàng bắt đầu?",
    });
    const finalCtaTitle = page.getByRole("heading", {
      level: 2,
      name: "Sẵn sàng bắt đầu?",
    });

    await expect(hero).toBeVisible();
    await expect(preview).toBeVisible();
    await expect(ownership).toBeVisible();
    await expect(finalCta).toBeVisible();

    const semanticColors = {
      pageBackground: await page.locator("main").evaluate((element) => {
        if (!(element.parentElement instanceof HTMLElement)) {
          throw new Error("Landing root is missing");
        }
        return getComputedStyle(element.parentElement).backgroundColor;
      }),
      brand: await brand.evaluate((element) => getComputedStyle(element).color),
      hero: await hero.evaluate((element) => getComputedStyle(element).color),
      lead: await lead.evaluate((element) => getComputedStyle(element).color),
      previewBackground: await preview.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      ctaBackground: await finalCta.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      ctaTitle: await finalCtaTitle.evaluate(
        (element) => getComputedStyle(element).color,
      ),
    };

    expect(semanticColors.pageBackground).toBe("rgb(17, 19, 24)");
    expect(semanticColors.brand).toBe("rgb(244, 242, 237)");
    expect(semanticColors.hero).toBe("rgb(244, 242, 237)");
    expect(semanticColors.lead).toBe("rgb(183, 186, 194)");
    expect(semanticColors.previewBackground).toBe("rgb(24, 27, 34)");
    expect(semanticColors.ctaBackground).toBe("rgb(32, 43, 85)");
    expect(semanticColors.ctaTitle).toBe("rgb(244, 242, 237)");
  });

  test("signed-in shell exposes one authored navigation model", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { level: 1, name: /Chào/i }),
    ).toBeVisible();
    await expect(page.locator(".safe-card-hero")).toBeHidden();
    await expect(page.locator(".mobile-fab")).toHaveCount(0);

    const viewportWidth = page.viewportSize()?.width ?? 1_440;
    const mobileNavigation = page.getByRole("navigation", {
      name: "Điều hướng di động",
    });
    const desktopNavigation = page.getByRole("complementary", {
      name: "Điều hướng chính",
    });

    if (viewportWidth <= 760) {
      await expect(mobileNavigation).toBeVisible();
      await expect(desktopNavigation).toBeHidden();
      await expect(
        mobileNavigation.getByRole("button", { name: "Ghi chi tiêu" }),
      ).toBeVisible();

      const metrics = await mobileNavigation.evaluate((navigation) => {
        if (!(navigation.parentElement instanceof HTMLElement)) {
          throw new Error("App shell is missing");
        }
        const navigationHeight = navigation.getBoundingClientRect().height;
        const shellPaddingBottom = Number.parseFloat(
          getComputedStyle(navigation.parentElement).paddingBottom,
        );
        return {
          itemCount: navigation.children.length,
          navigationHeight,
          shellPaddingBottom,
          documentOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });

      expect(metrics.itemCount).toBe(5);
      expect(metrics.shellPaddingBottom).toBeGreaterThanOrEqual(
        metrics.navigationHeight - 2,
      );
      expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
    } else {
      await expect(desktopNavigation).toBeVisible();
      await expect(mobileNavigation).toBeHidden();
      await expect(
        page.getByRole("link", { name: "MoneyFlow, về Tổng quan" }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("banner")
          .getByRole("button", { name: "Ghi chi tiêu", exact: true }),
      ).toBeVisible();
    }
  });
});
