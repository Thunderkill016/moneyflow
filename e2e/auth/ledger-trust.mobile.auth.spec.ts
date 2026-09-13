import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  signIn,
} from "./harness";
import { seedLimitedLedgerTrust } from "./ledger-trust-fixture";

test.beforeEach(async ({ page }) => {
  await seedLimitedLedgerTrust();
  // Playwright recommends setting the viewport before navigation. Do that before
  // login so the first authenticated /dashboard render is genuinely a 320px
  // phone render while still preserving the one-RPC assertion.
  await page.setViewportSize({ width: 320, height: 780 });
  await signIn(page);
  await assertAuthenticatedMode(page);
});

test("Home trust stays truthful and usable on a narrow phone in light and dark mode", async ({
  page,
}) => {
  // Successful login already lands on /dashboard. Keep that first render intact
  // so the one-RPC assertion grades real post-auth behaviour instead of a test-
  // induced second navigation.
  const trustRegion = page.getByRole("region", { name: "Độ tin cậy" });
  await expect(trustRegion).toBeVisible();
  await expect(trustRegion.getByText("Sổ tin cậy đến 19/08/2026")).toBeVisible();
  await expect(
    trustRegion.getByText(/không khẳng định nguồn bên ngoài đã đầy đủ/iu),
  ).toBeVisible();

  const action = trustRegion.getByRole("link", { name: "Mở Hộp thư" });
  await expect(action).toHaveAttribute("href", "/inbox");
  await expectMinimumTarget(action);
  await expectNoHorizontalOverflow(page);

  // The trust surface reuses theme-owned dashboard primitives. Toggle the real
  // media query in-place and re-grade the rendered surface instead of inferring
  // dark-mode safety from the demo-only UI audit where authoritative trust is
  // intentionally absent.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(trustRegion).toBeVisible();
  await expect(trustRegion.getByText("Sổ tin cậy đến 19/08/2026")).toBeVisible();
  await expect(action).toBeVisible();
  await expectMinimumTarget(action);
  await expectNoHorizontalOverflow(page);

  const report = await assertNoUnservedRequests();
  expect(
    report.served.filter((path) => path === "/rest/v1/rpc/get_dashboard_bundle"),
  ).toHaveLength(1);
  expect(
    report.served.filter((path) => path.includes("ledger_trust_summary")),
    "Home must not add a second trust RPC beside the bounded dashboard bundle",
  ).toHaveLength(0);
});

async function expectMinimumTarget(action: Locator) {
  const box = await action.boundingBox();
  expect(box?.height ?? 0, "trust maintenance target must be at least 44px").toBeGreaterThanOrEqual(
    44,
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "trust surface must not create horizontal page overflow").toBeLessThanOrEqual(
    1,
  );
}
