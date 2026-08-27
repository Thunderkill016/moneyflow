import { expect, test, type Page } from "@playwright/test";
import { source as AXE_SOURCE } from "axe-core";

/**
 * WCAG 2.2 Level AA — the conformance target YNAB publishes for its own product,
 * so it is the bar this ledger is measured against rather than one we invented.
 * Only these tags run: axe's wider catalogue includes best-practice rules that are
 * advice, not conformance, and failing a build on advice trains people to ignore it.
 */
const WCAG_AA_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Same key the root layout bootstrap reads, so the stamp survives first paint. */
const THEME_STORAGE_KEY = "moneyflow-theme";

const ROUTES = [
  "/dashboard",
  "/transactions",
  "/accounts",
  "/budgets",
  "/commitments",
  "/goals",
  "/reports",
  "/timeline",
  "/inbox",
  "/categories",
  "/rules",
  "/imports",
  "/capture",
  "/onboarding",
  "/settings",
  "/settings/backup",
  "/settings/export",
  "/security",
  "/privacy",
] as const;

type Violation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: { target: string[]; failureSummary?: string }[];
};

async function violationsOn(page: Page, path: string): Promise<Violation[]> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.status(), `${path} must render before it can be audited`).toBeLessThan(400);
  // Routes render a `<main aria-busy="true">` skeleton first; auditing that measures
  // an empty shell and passes for the wrong reason. Wait for the settled main instead
  // of `networkidle`, which never fires on link-dense routes because Next keeps
  // prefetching every visible <Link>.
  await page.locator('main:not([aria-busy="true"])').first().waitFor({ state: "visible" });
  await page.addScriptTag({ content: AXE_SOURCE });
  const result = await page.evaluate(
    (tags) =>
      (window as unknown as { axe: { run: (c: Document, o: unknown) => Promise<{ violations: Violation[] }> } }).axe.run(
        document,
        { runOnly: { type: "tag", values: tags } },
      ),
    WCAG_AA_TAGS,
  );
  return result.violations;
}

function describeViolations(path: string, violations: Violation[]) {
  return violations
    .map(
      (violation) =>
        `${path} [${violation.id}/${violation.impact}] ${violation.help}\n` +
        violation.nodes
          .slice(0, 4)
          .map((node) => `      ${node.target.join(" ")}`)
          .join("\n"),
    )
    .join("\n");
}

// One test per route rather than one sweep: a single test over 19 routes exceeds
// the audit timeout, and a failure names the page instead of the whole ledger.
for (const theme of ["light", "dark"] as const) {
  test.describe(`WCAG 2.2 AA — ${theme}`, () => {
    test.use({ colorScheme: theme });

    test.beforeEach(async ({ page }) => {
      await page.addInitScript(
        ([key, value]) => {
          try {
            window.localStorage.setItem(key, value);
          } catch {
            // Private-mode storage denial must not decide the theme silently.
          }
        },
        [THEME_STORAGE_KEY, theme] as const,
      );
    });

    for (const path of ROUTES) {
      test(`${path} has no WCAG 2.2 AA violations`, async ({ page }) => {
        const violations = await violationsOn(page, path);
        const report = describeViolations(path, violations);
        expect(report, report).toBe("");
      });
    }
  });
}
