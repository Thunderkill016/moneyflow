import { expect, test } from "@playwright/test";
import { auditRoute, seedUiAuditState, type AuditRoute } from "./responsive-audit";

const CRITICAL_ROUTES: AuditRoute[] = [
  { label: "landing", path: "/landing" },
  { label: "dashboard", path: "/dashboard" },
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
    const hero = page.getByRole("heading", {
      level: 1,
      name: "Ghi thu chi trong vài giây. Biết chính xác tiền đi đâu.",
    });
    const lead = page.locator("#landing-title + p");
    const proof = page.getByRole("region", { name: "Điểm nổi bật" });
    const preview = page.getByRole("img", {
      name: /Mô phỏng màn hình tổng quan/i,
    });
    const finalCta = page.getByRole("region", {
      name: "Ghi khoản đầu tiên của bạn hôm nay",
    });
    const finalCtaTitle = page.getByRole("heading", {
      level: 2,
      name: "Ghi khoản đầu tiên của bạn hôm nay",
    });

    await expect(hero).toBeVisible();
    await expect(preview).toBeVisible();
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
      proofBackground: await proof.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
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

    expect(semanticColors.pageBackground).toBe("rgb(13, 21, 17)");
    expect(semanticColors.brand).toBe("rgb(240, 247, 243)");
    expect(semanticColors.hero).toBe("rgb(240, 247, 243)");
    expect(semanticColors.lead).toBe("rgb(168, 183, 174)");
    expect(semanticColors.proofBackground).toBe("rgb(20, 31, 25)");
    expect(semanticColors.previewBackground).toBe("rgb(26, 40, 32)");
    expect(semanticColors.ctaBackground).toBe("rgb(74, 213, 138)");
    expect(semanticColors.ctaTitle).toBe("rgb(7, 21, 14)");
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
        page.getByRole("button", { name: "Ghi chi tiêu" }),
      ).toBeVisible();
    }
  });
});
