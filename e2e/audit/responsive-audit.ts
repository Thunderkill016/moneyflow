import { expect, type Page, type TestInfo } from "@playwright/test";

export type AuditRoute = {
  label: string;
  path: string;
};

type AuditFinding = {
  severity: "P1" | "P2";
  code: string;
  detail: string;
};

type AuditResult = {
  viewport: { width: number; height: number };
  documentWidth: number;
  findings: AuditFinding[];
};

const APP_STATE_KEYS = {
  seeded: "__mf_ui_audit_seeded",
  transactions: "moneyflow-demo-transactions-v1",
  inbox: "moneyflow-inbox-candidates-v1",
  onboarding: "moneyflow-onboarding-done",
} as const;

export async function seedUiAuditState(page: Page): Promise<void> {
  await page.addInitScript((keys) => {
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
}

export async function applyEnlargedText(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      html { font-size: 200% !important; }
      body { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    `,
  });
}

async function waitForUiToSettle(page: Page, route: AuditRoute): Promise<void> {
  const pendingUi = page.locator("[aria-busy='true']:visible, .loading-card:visible");
  await expect(
    pendingUi,
    `${route.path} must finish its visible loading state before UI evidence is captured`,
  ).toHaveCount(0, { timeout: 15_000 });

  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      }),
  );
}

async function primeFullPageRendering(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const paint = () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });
    const root = document.documentElement;
    const step = Math.max(320, Math.floor(window.innerHeight * 0.75));
    const maxY = Math.max(0, root.scrollHeight - window.innerHeight);

    for (let y = 0; y < maxY; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      await paint();
    }
    window.scrollTo({ top: maxY, behavior: "instant" });
    await paint();
    window.scrollTo({ top: 0, behavior: "instant" });
    await paint();
  });
}

async function attachPaintedRouteDetails(
  page: Page,
  testInfo: TestInfo,
  route: AuditRoute,
): Promise<void> {
  if (route.path !== "/insights" || !testInfo.project.name.startsWith("webkit")) return;

  const cards = [
    { label: "weekly", locator: page.locator(".weekly-summary-panel") },
    { label: "budget", locator: page.locator(".budget-panel") },
    { label: "commitments", locator: page.locator(".right-stack .insight-panel").nth(0) },
    { label: "income", locator: page.locator(".right-stack .insight-panel").nth(1) },
    { label: "goal", locator: page.locator(".goal-dashboard-panel") },
  ];

  for (const card of cards) {
    await expect(card.locator, `${card.label} card must exist on Insights`).toBeVisible();
    await expect(card.locator, `${card.label} card must contain rendered text`).toContainText(/\S/);
    await card.locator.scrollIntoViewIfNeeded();
    const image = await card.locator.screenshot({ animations: "disabled" });
    await testInfo.attach(`insights-${card.label}-${testInfo.project.name}.png`, {
      body: image,
      contentType: "image/png",
    });
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

export async function auditRoute(
  page: Page,
  testInfo: TestInfo,
  route: AuditRoute,
): Promise<void> {
  const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200, `${route.path} should not return an HTTP error`).toBeLessThan(400);

  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
  await expect(page.locator("body")).toContainText(/\S/, { timeout: 15_000 });
  await waitForUiToSettle(page, route);
  await primeFullPageRendering(page);

  const frameworkOverlay = page.locator(
    '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
  );
  await expect(frameworkOverlay, `${route.path} must not show a framework error overlay`).toHaveCount(0);

  const result = await page.evaluate<AuditResult>(() => {
    const findings: AuditFinding[] = [];
    const root = document.documentElement;
    const body = document.body;
    const viewport = {
      width: root.clientWidth,
      height: root.clientHeight,
    };
    const documentWidth = Math.max(root.scrollWidth, body?.scrollWidth ?? 0);

    const describe = (element: Element): string => {
      const html = element as HTMLElement;
      const text = (html.innerText || html.textContent || "").trim().replace(/\s+/g, " ");
      const id = html.id ? `#${html.id}` : "";
      const classes =
        typeof html.className === "string" && html.className.trim()
          ? `.${html.className.trim().split(/\s+/).slice(0, 3).join(".")}`
          : "";
      return `${element.tagName.toLowerCase()}${id}${classes}${text ? ` “${text.slice(0, 80)}”` : ""}`;
    };

    const isVisible = (element: Element): element is HTMLElement => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0 ||
        element.hidden ||
        element.getAttribute("aria-hidden") === "true"
      ) {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && element.getClientRects().length > 0;
    };

    const isInsideHorizontalScroller = (element: HTMLElement): boolean => {
      let parent = element.parentElement;
      while (parent && parent !== body && parent !== root) {
        const style = window.getComputedStyle(parent);
        const canScroll = /(auto|scroll)/.test(style.overflowX);
        if (canScroll && parent.scrollWidth > parent.clientWidth + 1) return true;
        parent = parent.parentElement;
      }
      return false;
    };

    if (documentWidth > viewport.width + 2) {
      findings.push({
        severity: "P1",
        code: "document-horizontal-overflow",
        detail: `document width ${documentWidth}px exceeds viewport ${viewport.width}px`,
      });
    }

    const interactiveSelector = [
      "button",
      "a[href]",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "[role='button']",
      "[role='link']",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const interactive = Array.from(document.querySelectorAll(interactiveSelector)).filter(isVisible);

    for (const element of interactive) {
      const rect = element.getBoundingClientRect();
      const horizontallyOutside = rect.right < -1 || rect.left > viewport.width + 1;
      const horizontallyClipped = rect.left < -1 || rect.right > viewport.width + 1;
      if ((horizontallyOutside || horizontallyClipped) && !isInsideHorizontalScroller(element)) {
        findings.push({
          severity: "P1",
          code: "interactive-outside-viewport",
          detail: `${describe(element)} at x=${Math.round(rect.left)}..${Math.round(rect.right)}`,
        });
      }

      if (rect.width < 24 || rect.height < 24) {
        findings.push({
          severity: "P2",
          code: "small-interactive-target",
          detail: `${describe(element)} is ${Math.round(rect.width)}×${Math.round(rect.height)}px`,
        });
      }

      const text = (element.innerText || element.textContent || "").trim();
      const hasAccessibleHint = Boolean(
        element.getAttribute("aria-label") ||
          element.getAttribute("aria-labelledby") ||
          element.getAttribute("title") ||
          text ||
          element.querySelector("img[alt]:not([alt=''])"),
      );
      if (!hasAccessibleHint) {
        findings.push({
          severity: "P2",
          code: "unnamed-interactive-control",
          detail: describe(element),
        });
      }
    }

    const visibleDialogs = Array.from(
      document.querySelectorAll("[role='dialog'], dialog[open], [aria-modal='true']"),
    ).filter(isVisible);

    for (const dialog of visibleDialogs) {
      const rect = dialog.getBoundingClientRect();
      const style = window.getComputedStyle(dialog);
      const verticallyClipped = rect.top < -1 || rect.bottom > viewport.height + 1;
      const canScroll = /(auto|scroll)/.test(style.overflowY) || dialog.scrollHeight > dialog.clientHeight;
      if (verticallyClipped && !canScroll) {
        findings.push({
          severity: "P1",
          code: "dialog-clipped-without-scroll",
          detail: `${describe(dialog)} at y=${Math.round(rect.top)}..${Math.round(rect.bottom)}`,
        });
      }
    }

    const moneyLike = Array.from(document.querySelectorAll(".font-mono, [data-money]")).filter(
      isVisible,
    );
    for (const element of moneyLike) {
      const style = window.getComputedStyle(element);
      const clipped = element.scrollWidth > element.clientWidth + 1;
      if (clipped && /(hidden|clip)/.test(style.overflowX)) {
        findings.push({
          severity: "P2",
          code: "financial-value-clipped",
          detail: describe(element),
        });
      }
    }

    return { viewport, documentWidth, findings };
  });

  await attachPaintedRouteDetails(page, testInfo, route);

  const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
  const artifactName = `${route.label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "route"}-${testInfo.project.name}`;

  await testInfo.attach(`${artifactName}.png`, {
    body: screenshot,
    contentType: "image/png",
  });
  await testInfo.attach(`${artifactName}.json`, {
    body: Buffer.from(JSON.stringify({ route, project: testInfo.project.name, ...result }, null, 2)),
    contentType: "application/json",
  });

  const advisory = result.findings.filter((finding) => finding.severity === "P2");
  if (advisory.length > 0) {
    testInfo.annotations.push({
      type: "ui-audit-advisory",
      description: `${advisory.length} P2 finding(s); inspect the JSON artifact`,
    });
  }

  const blocking = result.findings.filter((finding) => finding.severity === "P1");
  expect(
    blocking,
    `${route.path} has blocking responsive defects:\n${blocking
      .map((finding) => `- ${finding.code}: ${finding.detail}`)
      .join("\n")}`,
  ).toEqual([]);
}

export async function assertKeyboardFocusVisible(page: Page, testInfo: TestInfo): Promise<void> {
  const findings: string[] = [];

  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press("Tab");
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
        }),
    );

    const focusState = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || active === document.body) return null;
      const rect = active.getBoundingClientRect();
      const style = window.getComputedStyle(active);
      return {
        element: `${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ""}`,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        outline: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight,
      };
    });

    if (!focusState) continue;
    const outside =
      focusState.right < -1 ||
      focusState.left > focusState.viewportWidth + 1 ||
      focusState.bottom < -1 ||
      focusState.top > focusState.viewportHeight + 1;
    if (outside) findings.push(`${focusState.element} is outside the viewport after Tab ${index + 1}`);

    const hasOutline =
      focusState.outline !== "none" &&
      focusState.outlineWidth !== "0px" &&
      focusState.outlineWidth !== "0";
    const hasBoxShadow =
      focusState.boxShadow !== "none" &&
      focusState.boxShadow !== "rgba(0, 0, 0, 0) 0px 0px 0px 0px";
    if (!hasOutline && !hasBoxShadow) {
      findings.push(`${focusState.element} has no visible focus indicator`);
    }
  }

  await testInfo.attach(`keyboard-${testInfo.project.name}.json`, {
    body: Buffer.from(JSON.stringify({ findings }, null, 2)),
    contentType: "application/json",
  });

  expect(findings, findings.join("\n")).toEqual([]);
}
