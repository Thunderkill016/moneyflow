import { expect, test } from "@playwright/test";
import { seedUiAuditState } from "./responsive-audit";

const MINIMUM_TARGET_SIZE = 44;
const TARGET_VIEWPORTS = new Set([320, 390, 1_366]);
const STORAGE_KEYS = {
  transactions: "moneyflow-demo-transactions-v1",
  inbox: "moneyflow-inbox-candidates-v1",
  onboarding: "moneyflow-onboarding-done",
} as const;

const ROUTES = [
  { label: "landing", path: "/landing" },
  { label: "privacy", path: "/privacy" },
  { label: "login", path: "/login" },
  { label: "register", path: "/register" },
  { label: "forgot-password", path: "/forgot-password" },
  { label: "onboarding", path: "/onboarding" },
  { label: "dashboard", path: "/dashboard" },
  { label: "insights", path: "/insights" },
  { label: "quick-capture", path: "/capture/quick" },
  { label: "transactions", path: "/transactions" },
  { label: "timeline", path: "/timeline" },
  { label: "accounts", path: "/accounts" },
  { label: "budgets", path: "/budgets" },
  { label: "commitments", path: "/commitments" },
  { label: "income-templates", path: "/income-templates" },
  { label: "goals", path: "/goals" },
  { label: "reports", path: "/reports" },
  { label: "categories", path: "/categories" },
  { label: "inbox", path: "/inbox" },
  { label: "rules", path: "/rules" },
  { label: "imports", path: "/imports" },
  { label: "imports-direct", path: "/imports/direct" },
  { label: "settings", path: "/settings" },
  { label: "settings-export", path: "/settings/export" },
  { label: "settings-notifications", path: "/settings/notifications" },
  { label: "settings-privacy", path: "/settings/privacy" },
] as const;

type TargetFinding = {
  route: string;
  resolvedPath: string;
  element: string;
  measuredElement: string;
  width: number;
  height: number;
};

test.describe("minimum interactive target size", () => {
  test.beforeEach(async ({ page }) => {
    await seedUiAuditState(page);
  });

  for (const route of ROUTES) {
    test(`${route.label} keeps every pressable control at least 44×44px`, async ({
      page,
    }, testInfo) => {
      const viewportWidth = page.viewportSize()?.width ?? 0;
      test.skip(
        !TARGET_VIEWPORTS.has(viewportWidth),
        "The product contract is gated at 320px, 390px and 1366px.",
      );

      // Establish the same-origin storage context, then let demo stores fall
      // back to populated sample data so row-level actions are measured.
      await page.goto("/landing", { waitUntil: "domcontentloaded" });
      await page.evaluate(
        ({ keys, isOnboarding }) => {
          window.localStorage.removeItem(keys.transactions);
          window.localStorage.removeItem(keys.inbox);
          if (isOnboarding) {
            window.localStorage.removeItem(keys.onboarding);
          } else {
            window.localStorage.setItem(keys.onboarding, "1");
          }
        },
        { keys: STORAGE_KEYS, isOnboarding: route.path === "/onboarding" },
      );

      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(
        response?.status() ?? 200,
        `${route.path} should not return an HTTP error`,
      ).toBeLessThan(400);

      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
      await expect(page.locator("body")).toContainText(/\S/, { timeout: 15_000 });
      await expect(
        page.locator("[aria-busy='true']:visible, .loading-card:visible"),
        `${route.path} must settle before target-size measurement`,
      ).toHaveCount(0, { timeout: 15_000 });

      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
          }),
      );

      const measuredFindings = await page.evaluate<
        Array<Omit<TargetFinding, "route" | "resolvedPath">>
      >((minimumSize) => {
        const selector = [
          "button",
          "a[href]",
          "[role='button']",
          "[role='tab']",
          "summary",
          "select",
          "input[type='checkbox']",
          "input[type='radio']",
        ].join(",");

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
          const style = getComputedStyle(element);
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

        const isInlineProseLink = (element: HTMLElement): boolean => {
          if (
            !(element instanceof HTMLAnchorElement) ||
            getComputedStyle(element).display !== "inline"
          ) {
            return false;
          }

          const parent = element.parentElement;
          if (!parent) return false;
          const ownText = (element.textContent || "").trim().replace(/\s+/g, " ");
          const parentText = (parent.textContent || "").trim().replace(/\s+/g, " ");
          return ownText.length > 0 && parentText.length > ownText.length;
        };

        const measuredTarget = (element: HTMLElement): HTMLElement => {
          if (
            element instanceof HTMLInputElement &&
            (element.type === "checkbox" || element.type === "radio")
          ) {
            const label = element.labels?.[0];
            if (label && isVisible(label)) return label;
          }
          return element;
        };

        const controls = Array.from(
          new Set(Array.from(document.querySelectorAll<HTMLElement>(selector))),
        ).filter(isVisible);

        const undersized: Array<Omit<TargetFinding, "route" | "resolvedPath">> = [];
        for (const control of controls) {
          if (control.matches(":disabled") || isInlineProseLink(control)) continue;

          const target = measuredTarget(control);
          const rect = target.getBoundingClientRect();
          if (rect.width + 0.01 >= minimumSize && rect.height + 0.01 >= minimumSize) continue;

          undersized.push({
            element: describe(control),
            measuredElement: target === control ? describe(control) : describe(target),
            width: Number(rect.width.toFixed(2)),
            height: Number(rect.height.toFixed(2)),
          });
        }
        return undersized;
      }, MINIMUM_TARGET_SIZE);

      const findings: TargetFinding[] = measuredFindings.map((finding) => ({
        route: route.path,
        resolvedPath: new URL(page.url()).pathname,
        ...finding,
      }));

      await testInfo.attach(`minimum-target-size-${route.label}.json`, {
        body: Buffer.from(
          JSON.stringify(
            {
              minimum: MINIMUM_TARGET_SIZE,
              viewport: page.viewportSize(),
              route: route.path,
              resolvedPath: new URL(page.url()).pathname,
              findings,
            },
            null,
            2,
          ),
        ),
        contentType: "application/json",
      });

      expect(
        findings,
        `Controls below ${MINIMUM_TARGET_SIZE}×${MINIMUM_TARGET_SIZE}px on ${route.path}:\n${findings
          .map(
            (finding) =>
              `- ${finding.element} measured as ${finding.width}×${finding.height}px via ${finding.measuredElement}`,
          )
          .join("\n")}`,
      ).toEqual([]);
    });
  }
});
