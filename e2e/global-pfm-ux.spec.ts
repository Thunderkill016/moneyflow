import { expect, test } from "@playwright/test";

const NOTE = "Benchmark UX cafe";
const AMOUNT = 125_000;

test.describe("Global PFM UX benchmark", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      try {
        if (window.localStorage.getItem("__mf_e2e_benchmark_seeded") === "1") {
          return;
        }
        window.localStorage.clear();
        window.localStorage.setItem("moneyflow-demo-transactions-v1", "[]");
        window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
        window.localStorage.setItem("moneyflow-onboarding-done", "1");
        window.localStorage.setItem("__mf_e2e_benchmark_seeded", "1");
      } catch {
        /* ignore */
      }
    });
  });

  test("keeps the dark landing proposition readable", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
    });

    await expect(page.locator(".lp-hero-title")).toBeVisible();
    await expect(page.locator(".lp-hero-lead")).toBeVisible();

    const result = await page.evaluate(() => {
      type Rgb = { r: number; g: number; b: number };

      const parseRgb = (value: string): Rgb => {
        const channels = value.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
        if (!channels || channels.length !== 3) {
          throw new Error(`Unsupported computed color: ${value}`);
        }
        return { r: channels[0], g: channels[1], b: channels[2] };
      };

      const luminance = ({ r, g, b }: Rgb) => {
        const linear = [r, g, b].map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
      };

      const contrast = (foreground: Rgb, background: Rgb) => {
        const light = Math.max(luminance(foreground), luminance(background));
        const dark = Math.min(luminance(foreground), luminance(background));
        return (light + 0.05) / (dark + 0.05);
      };

      const color = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing element: ${selector}`);
        return parseRgb(getComputedStyle(element).color);
      };

      const background = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing element: ${selector}`);
        return parseRgb(getComputedStyle(element).backgroundColor);
      };

      const canvas = background(".landing-page.lp-root");
      const nav = background(".lp-nav");
      const navCta = background(".landing-nav-cta");
      const heroCta = background(".lp-hero-ctas .cta-primary");

      return {
        title: contrast(color(".lp-hero-title"), canvas),
        lead: contrast(color(".lp-hero-lead"), canvas),
        navBrand: contrast(color(".lp-nav .brand"), nav),
        navPrimary: contrast(color(".landing-nav-cta"), navCta),
        heroPrimary: contrast(color(".lp-hero-ctas .cta-primary"), heroCta),
        navSurfaceLuminance: luminance(nav),
      };
    });

    expect(result.title).toBeGreaterThanOrEqual(7);
    expect(result.lead).toBeGreaterThanOrEqual(4.5);
    expect(result.navBrand).toBeGreaterThanOrEqual(4.5);
    expect(result.navPrimary).toBeGreaterThanOrEqual(4.5);
    expect(result.heroPrimary).toBeGreaterThanOrEqual(4.5);
    expect(result.navSurfaceLuminance).toBeLessThan(0.08);
  });

  test("withdraws untrusted spending advice and keeps a viewport primary action", async ({
    page,
  }) => {
    await page.goto("/insights");
    await expect(page.locator(".safe-card-hero")).toBeHidden();

    const isMobile = (page.viewportSize()?.width ?? 1_000) <= 760;
    const welcomeExpenseAction = page.locator(
      ".welcome-actions .insights-ghi-chi",
    );
    if (isMobile) {
      await expect(welcomeExpenseAction).toBeHidden();
      await expect(page.locator(".mobile-fab")).toBeVisible();
    } else {
      await expect(welcomeExpenseAction).toBeVisible();
    }

    await page.goto("/capture/quick");
    await page.getByRole("button", { name: /Khoản chi/i, exact: true }).click();
    await page.getByLabel(/Số tiền chi/i).fill(String(AMOUNT));
    await page.getByRole("button", { name: "Ăn uống", exact: true }).click();
    await page.getByPlaceholder("Ví dụ: Cơm trưa").fill(NOTE);
    await page.getByRole("button", { name: "Lưu", exact: true }).click();

    await expect
      .poll(
        () =>
          page.evaluate(
            ({ note, amount }) => {
              const raw = window.localStorage.getItem(
                "moneyflow-demo-transactions-v1",
              );
              if (!raw) return false;
              try {
                const list = JSON.parse(raw) as Array<{
                  note?: string;
                  amount?: number;
                }>;
                return list.some(
                  (item) => item.note === note && item.amount === amount,
                );
              } catch {
                return false;
              }
            },
            { note: NOTE, amount: AMOUNT },
          ),
        { timeout: 15_000 },
      )
      .toBe(true);

    await page.goto("/transactions?category=%C4%82n%20u%E1%BB%91ng&kind=expense");
    await expect(page.getByLabel("Lọc theo danh mục")).toHaveValue("Ăn uống");
    await expect(
      page.getByRole("button", { name: "Khoản chi", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.locator(".transaction-summary").getByText("Ròng", { exact: true }),
    ).toBeVisible();
    await expect(page.locator(".manager-row").filter({ hasText: NOTE })).toBeVisible();
    await expect(page.locator(".transaction-summary")).toContainText("−125.000");
  });

  test("shows explicit budget decisions and a transaction drill-down", async ({
    page,
  }) => {
    await page.goto("/budgets");
    const card = page.locator(".budget-category-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByText("Hạn mức", { exact: true })).toBeVisible();
    await expect(card.getByText("Đã chi", { exact: true })).toBeVisible();
    await expect(card.getByText(/Còn lại|Vượt/, { exact: true })).toBeVisible();

    const drillDown = card.getByRole("link", { name: /Xem giao dịch danh mục/i });
    await expect(drillDown).toHaveAttribute("href", /\/transactions\?category=/);
    await drillDown.click();
    await expect(page).toHaveURL(/\/transactions\?category=/);
    await expect(page.getByLabel("Lọc theo danh mục")).not.toHaveValue("all");
  });
});
