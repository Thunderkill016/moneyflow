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

  test("keeps the full dark landing readable", async ({ page }) => {
    // CI intentionally runs in demo mode, where `/` redirects to `/insights`.
    // Load a stable public route to get the production CSS bundle, then mount,
    // measure and remove representative landing structures synchronously so
    // React hydration cannot replace the fixture between setup and assertion.
    await page.goto("/privacy");

    const result = await page.evaluate(() => {
      type Rgb = { r: number; g: number; b: number };

      document.documentElement.dataset.theme = "dark";

      const fixture = document.createElement("div");
      fixture.innerHTML = `
        <div class="landing-page lp-root">
          <nav class="landing-nav lp-nav">
            <a class="brand" href="/">MoneyFlow</a>
            <a class="primary-button landing-nav-cta" href="/register">Bắt đầu miễn phí</a>
          </nav>

          <header class="lp-hero">
            <div class="lp-hero-inner">
              <h1 class="landing-hero-title lp-hero-title">Ghi thu chi rõ ràng</h1>
              <p class="landing-lead lp-hero-lead">Dữ liệu quan sát được, không đoán số tiền nên tiêu.</p>
              <div class="landing-hero-ctas lp-hero-ctas">
                <a class="cta-primary lp-btn-lg" href="/register">Dùng miễn phí</a>
              </div>
            </div>
          </header>

          <section class="lp-section">
            <div class="lp-section-intro">
              <p class="lp-kicker">Lợi ích</p>
              <h2>Thu chi rõ — quyết định từ dữ liệu thật</h2>
              <p>Không đưa lời khuyên khi dữ liệu chưa đủ.</p>
            </div>
            <ul class="lp-feature-grid">
              <li>
                <h3>Thu · Chi · Chuyển</h3>
                <p>Ba loại rõ. Soft delete. Số nguyên đồng.</p>
              </li>
            </ul>
            <div class="lp-faq-list">
              <details class="lp-faq-item" open>
                <summary>Có xuất dữ liệu được không?</summary>
                <p>Có. Xuất CSV bất cứ lúc nào.</p>
              </details>
            </div>
          </section>

          <section class="landing-cta-band lp-cta">
            <h2>Bắt đầu bằng một khoản chi hôm nay</h2>
            <p>Miễn phí core. Không cần liên kết ngân hàng.</p>
            <div class="landing-cta-band-actions">
              <a class="cta-primary lp-btn-lg" href="/register">Tạo tài khoản miễn phí</a>
            </div>
          </section>

          <footer class="landing-footer lp-footer">
            <div class="landing-footer-inner">
              <a class="brand" href="/">MoneyFlow</a>
              <nav class="landing-footer-links">
                <a href="/privacy">Riêng tư</a>
              </nav>
              <p>© 2026 MoneyFlow.</p>
            </div>
          </footer>
        </div>
      `;

      const root = fixture.firstElementChild;
      if (!(root instanceof HTMLElement)) {
        throw new Error("Failed to create landing contrast fixture");
      }
      document.body.append(root);

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

      const element = (selector: string) => {
        if (root.matches(selector)) return root;
        const match = root.querySelector<HTMLElement>(selector);
        if (!match) throw new Error(`Missing fixture element: ${selector}`);
        return match;
      };

      const color = (selector: string) =>
        parseRgb(getComputedStyle(element(selector)).color);
      const background = (selector: string) =>
        parseRgb(getComputedStyle(element(selector)).backgroundColor);
      const ratio = (foregroundSelector: string, backgroundSelector: string) =>
        contrast(color(foregroundSelector), background(backgroundSelector));

      const measurements = {
        title: ratio(".lp-hero-title", ".landing-page.lp-root"),
        lead: ratio(".lp-hero-lead", ".landing-page.lp-root"),
        navBrand: ratio(".lp-nav .brand", ".lp-nav"),
        navPrimary: ratio(".landing-nav-cta", ".landing-nav-cta"),
        heroPrimary: ratio(".lp-hero-ctas .cta-primary", ".lp-hero-ctas .cta-primary"),
        sectionTitle: ratio(".lp-section-intro h2", ".landing-page.lp-root"),
        sectionCopy: ratio(".lp-section-intro > p:last-child", ".landing-page.lp-root"),
        featureTitle: ratio(".lp-feature-grid h3", ".lp-feature-grid li"),
        featureCopy: ratio(".lp-feature-grid p", ".lp-feature-grid li"),
        faqSummary: ratio(".lp-faq-item summary", ".lp-faq-item"),
        faqCopy: ratio(".lp-faq-item p", ".lp-faq-item"),
        ctaTitle: ratio(".lp-cta h2", ".lp-cta"),
        ctaCopy: ratio(".lp-cta > p", ".lp-cta"),
        ctaPrimary: ratio(".lp-cta .cta-primary", ".lp-cta .cta-primary"),
        footerBrand: ratio(".lp-footer .brand", ".lp-footer"),
        footerLink: ratio(".landing-footer-links a", ".lp-footer"),
        footerCopy: ratio(".landing-footer-inner > p", ".lp-footer"),
        navSurfaceLuminance: luminance(background(".lp-nav")),
        cardSurfaceLuminance: luminance(background(".lp-feature-grid li")),
        footerSurfaceLuminance: luminance(background(".lp-footer")),
      };

      root.remove();
      return measurements;
    });

    expect(result.title).toBeGreaterThanOrEqual(7);
    expect(result.lead).toBeGreaterThanOrEqual(4.5);
    expect(result.navBrand).toBeGreaterThanOrEqual(4.5);
    expect(result.navPrimary).toBeGreaterThanOrEqual(4.5);
    expect(result.heroPrimary).toBeGreaterThanOrEqual(4.5);
    expect(result.sectionTitle).toBeGreaterThanOrEqual(7);
    expect(result.sectionCopy).toBeGreaterThanOrEqual(4.5);
    expect(result.featureTitle).toBeGreaterThanOrEqual(7);
    expect(result.featureCopy).toBeGreaterThanOrEqual(4.5);
    expect(result.faqSummary).toBeGreaterThanOrEqual(4.5);
    expect(result.faqCopy).toBeGreaterThanOrEqual(4.5);
    expect(result.ctaTitle).toBeGreaterThanOrEqual(7);
    expect(result.ctaCopy).toBeGreaterThanOrEqual(4.5);
    expect(result.ctaPrimary).toBeGreaterThanOrEqual(4.5);
    expect(result.footerBrand).toBeGreaterThanOrEqual(7);
    expect(result.footerLink).toBeGreaterThanOrEqual(4.5);
    expect(result.footerCopy).toBeGreaterThanOrEqual(4.5);
    expect(result.navSurfaceLuminance).toBeLessThan(0.08);
    expect(result.cardSurfaceLuminance).toBeLessThan(0.08);
    expect(result.footerSurfaceLuminance).toBeLessThan(0.04);
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
