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

  test("root viewport enables safe-area layout without changing public light mode", async ({
    page,
  }) => {
    await page.goto("/landing", { waitUntil: "domcontentloaded" });

    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
      "content",
      /viewport-fit=cover/u,
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });

  test("landing stays light and readable when the browser prefers dark", async ({ page }, testInfo) => {
    test.skip(testInfo.project.use.colorScheme !== "dark", "dark-preference regression contract");

    await page.goto("/landing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    const navigation = page.getByRole("navigation", {
      name: "Điều hướng trang chủ",
    });
    const brand = navigation.getByRole("link", {
      name: "MoneyFlow, trang chủ",
    });
    const hero = page.locator("#landing-title");
    const lead = page.locator("#landing-title + p");
    const story = page.getByRole("region", {
      name: "Một dòng tiền, ba câu hỏi kiểm tra được.",
    });
    const firstStoryProof = story.getByRole("figure", {
      name: /Bạn vừa ghi gì\?/u,
    });
    const accountProof = story.getByRole("figure", {
      name: /Số dư nào thay đổi\?/u,
    });
    const control = page.getByRole("region", {
      name: "Sổ của bạn. Quyết định của bạn.",
    });
    const finalCta = page.getByRole("region", {
      name: "Tạo một sổ mà mỗi con số đều có chỗ để kiểm tra.",
    });
    const finalCtaTitle = page.getByRole("heading", {
      level: 2,
      name: "Tạo một sổ mà mỗi con số đều có chỗ để kiểm tra.",
    });

    await expect(hero).toBeVisible();
    await expect(story).toBeVisible();
    await expect(firstStoryProof).toBeVisible();
    await expect(accountProof).toBeVisible();
    await expect(control).toBeVisible();
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
      firstStoryBackground: await firstStoryProof.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      accountBackground: await accountProof.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      controlBackground: await control.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      ctaBackground: await finalCta.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
      ctaTitle: await finalCtaTitle.evaluate(
        (element) => getComputedStyle(element).color,
      ),
    };

    /* Public-entry contract: saved or system dark preference cannot darken
       landing surfaces. Workspace routes retain the selectable dark theme. */
    expect(semanticColors.pageBackground).toBe("rgb(248, 250, 252)");
    expect(semanticColors.brand).toBe("rgb(16, 24, 40)");
    expect(semanticColors.hero).toBe("rgb(16, 24, 40)");
    expect(semanticColors.lead).toBe("rgb(71, 84, 103)");
    expect(semanticColors.firstStoryBackground).toBe("rgb(255, 255, 255)");
    expect(semanticColors.accountBackground).toBe("rgb(255, 255, 255)");
    expect(semanticColors.controlBackground).toBe("rgb(255, 255, 255)");
    expect(semanticColors.ctaBackground).toBe("rgb(16, 24, 40)");
    expect(semanticColors.ctaTitle).toBe("rgb(255, 255, 255)");
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

      const firstPaintMetrics = await mobileNavigation.evaluate((navigation) => {
        if (!(navigation.parentElement instanceof HTMLElement)) {
          throw new Error("App shell is missing");
        }
        return {
          itemCount: navigation.children.length,
          navigationHeight: navigation.getBoundingClientRect().height,
          shellPaddingBottom: Number.parseFloat(
            getComputedStyle(navigation.parentElement).paddingBottom,
          ),
          documentOverflow:
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        };
      });

      expect(firstPaintMetrics.itemCount).toBe(5);
      expect(firstPaintMetrics.shellPaddingBottom).toBeGreaterThanOrEqual(
        firstPaintMetrics.navigationHeight - 2,
      );
      expect(firstPaintMetrics.documentOverflow).toBeLessThanOrEqual(1);

      await expect(page.locator("html")).toHaveAttribute(
        "data-moneyflow-shell",
        "mounted",
      );
      const scrollPaddingBottom = await page.locator("html").evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).scrollPaddingBottom),
      );
      expect(scrollPaddingBottom).toBeGreaterThanOrEqual(
        firstPaintMetrics.navigationHeight - 2,
      );
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

      const topbarHeight = await page
        .getByRole("banner")
        .evaluate((element) => element.getBoundingClientRect().height);
      await expect(page.locator("html")).toHaveAttribute(
        "data-moneyflow-shell",
        "mounted",
      );
      const scrollPaddingTop = await page.locator("html").evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).scrollPaddingTop),
      );
      expect(scrollPaddingTop).toBeGreaterThanOrEqual(topbarHeight - 2);
    }
  });

  test("shell modal Sheet closes with Escape and restores trigger focus", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    const viewportWidth = page.viewportSize()?.width ?? 1_440;

    if (viewportWidth <= 760) {
      const trigger = page.getByRole("button", { name: /^Mở tài khoản/u });
      await expect(trigger).toBeVisible();
      await trigger.click();

      const sheet = page.getByRole("dialog", { name: "Thêm & tài khoản" });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole("button", { name: "Đóng" })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(sheet).toBeHidden();
      await expect(trigger).toBeFocused();
      return;
    }

    const trigger = page.getByRole("button", {
      name: "Nhập nhanh",
      exact: true,
    });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const sheet = page.getByRole("dialog", { name: "Ghi giao dịch" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Đóng" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("Accounts exposes its explicit mobile action without replacing Ghi", async ({
    page,
  }) => {
    const viewportWidth = page.viewportSize()?.width ?? 1_440;
    test.skip(viewportWidth > 760, "explicit Accounts action is a mobile shell contract");

    await page.goto("/accounts", { waitUntil: "domcontentloaded" });
    const topbarAction = page
      .getByRole("banner")
      .getByRole("button", { name: "Thêm tài khoản", exact: true });
    const captureAction = page
      .getByRole("navigation", { name: "Điều hướng di động" })
      .getByRole("button", { name: "Ghi chi tiêu", exact: true });

    await expect(topbarAction).toBeVisible();
    await expect(captureAction).toBeVisible();
    const box = await topbarAction.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  /*
   * Regression: route "add" actions used to be passed as `fabAction`, which
   * re-targets the mobile capture tab while its visible text stays "Ghi". The
   * tab then read "Ghi" but opened "Thêm ngân sách" / "Thêm mục tiêu" and
   * announced that name to assistive tech — a WCAG 2.5.3 label-in-name break,
   * and the only capture entry point in the mobile shell was gone.
   *
   * Routes with their own add action expose it in the topbar via
   * `showPrimaryActionOnMobile`, exactly like /accounts above.
   */
  const ROUTES_WITH_OWN_ADD_ACTION = [
    { path: "/budgets", action: "Thêm ngân sách" },
    { path: "/goals", action: "Thêm mục tiêu" },
    { path: "/categories", action: "Thêm danh mục" },
    { path: "/commitments", action: "Thêm khoản định kỳ" },
    { path: "/income-templates", action: "Thêm khoản thu định kỳ" },
  ] as const;

  for (const route of ROUTES_WITH_OWN_ADD_ACTION) {
    test(`${route.path} keeps the mobile capture tab on Ghi chi tiêu`, async ({
      page,
    }) => {
      const viewportWidth = page.viewportSize()?.width ?? 1_440;
      test.skip(viewportWidth > 760, "mobile shell contract");

      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      const captureTab = page
        .getByRole("navigation", { name: "Điều hướng di động" })
        .getByRole("button", { name: "Ghi chi tiêu", exact: true });
      await expect(captureTab).toBeVisible();

      // The visible text must be contained in the accessible name (WCAG 2.5.3).
      await expect(captureTab).toContainText("Ghi");

      // The route's own action stays reachable, in the topbar.
      await expect(
        page.getByRole("banner").getByRole("button", { name: route.action, exact: true }),
      ).toBeVisible();

      // Label and behaviour must agree: tapping must reach capture, never the
      // route's own create dialog. Asserting the name alone would still pass if
      // a route re-pointed the tab while keeping the global label.
      await captureTab.click();
      await expect(page).toHaveURL(/\/capture(\/|$)/);
    });
  }

  /*
   * Same contract for the reconciliation workspace, which needs a real account
   * id so it cannot join the static list above. Its action is a session verb
   * rather than an "add", and it can legitimately be disabled — the contract is
   * that it lives in the topbar and never re-points the capture tab.
   */
  test("reconciliation keeps the mobile capture tab on Ghi chi tiêu", async ({
    page,
  }) => {
    const viewportWidth = page.viewportSize()?.width ?? 1_440;
    test.skip(viewportWidth > 760, "mobile shell contract");

    await page.goto("/accounts", { waitUntil: "domcontentloaded" });
    const accountHref = await page
      .locator('a[href^="/accounts/"]')
      .first()
      .getAttribute("href");
    expect(accountHref, "the audit seed must expose at least one account").toBeTruthy();

    await page.goto(`${accountHref}/reconcile`, { waitUntil: "domcontentloaded" });

    const captureTab = page
      .getByRole("navigation", { name: "Điều hướng di động" })
      .getByRole("button", { name: "Ghi chi tiêu", exact: true });
    await expect(captureTab).toBeVisible();
    await expect(captureTab).toBeEnabled();
    await expect(captureTab).toContainText("Ghi");

    // The reconciliation action stays its own mobile-visible primary action.
    await expect(
      page.getByRole("banner").getByRole("button", { name: /đối soát$/ }),
    ).toBeVisible();

    await captureTab.click();
    await expect(page).toHaveURL(/\/capture(\/|$)/);
  });

  /*
   * The mirror image of the contracts above.
   *
   * The planning and reconciliation routes each own a distinct operation, so
   * their action belongs in the topbar alongside the global capture tab. Inbox's
   * action *is* capture, which the tab already owns — surfacing both would put
   * the same primary action on one mobile viewport twice. One primary action per
   * viewport, so mobile keeps only the tab.
   */
  test("Inbox exposes the global Ghi tab as its only mobile capture action", async ({
    page,
  }) => {
    const viewportWidth = page.viewportSize()?.width ?? 1_440;
    test.skip(viewportWidth > 760, "mobile shell contract");

    await page.goto("/inbox", { waitUntil: "domcontentloaded" });

    const captureTab = page
      .getByRole("navigation", { name: "Điều hướng di động" })
      .getByRole("button", { name: "Ghi chi tiêu", exact: true });
    await expect(captureTab).toBeVisible();
    await expect(captureTab).toContainText("Ghi");

    // No second capture affordance in the topbar at this width.
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Capture", exact: true }),
    ).toBeHidden();

    /*
     * Scoped to the shell chrome — the topbar and the mobile tab bar. The
     * "one primary action per viewport" rule is about the shell's primary
     * action, not about every in-page link. The Capture sheet's own options and
     * the empty-state links legitimately point at /capture and are page
     * content, so counting them would be measuring the wrong contract.
     */
    const shellCaptureActions = await page.evaluate(() => {
      const chrome = [
        document.querySelector("header"),
        document.querySelector('nav[aria-label="Điều hướng di động"]'),
      ].filter((node): node is HTMLElement => node instanceof HTMLElement);

      const isVisible = (element: Element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden";
      };

      return chrome
        .flatMap((root) => Array.from(root.querySelectorAll("a, button")))
        .filter(isVisible)
        .map((element) =>
          (element.getAttribute("aria-label") || element.textContent || "").trim(),
        )
        .filter((name) => /^(Capture|Ghi chi tiêu)$/u.test(name));
    });

    expect(
      shellCaptureActions,
      "the Inbox shell must present exactly one primary capture action on mobile",
    ).toEqual(["Ghi chi tiêu"]);

    await captureTab.click();
    await expect(page).toHaveURL(/\/capture(\/|$)/);
  });
});