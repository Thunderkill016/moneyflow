import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  signIn,
} from "./harness";
import { seedLimitedLedgerTrust } from "./ledger-trust-fixture";

test.beforeEach(async ({ page }) => {
  await seedLimitedLedgerTrust();
  await signIn(page);
  await assertAuthenticatedMode(page);
});

test("Home trust remains bounded on desktop in light and dark mode", async ({
  page,
}) => {
  // Successful login is the dashboard navigation under test. Do not reload it:
  // an extra page.goto would manufacture a second dashboard RPC and make the
  // performance assertion grade the test harness rather than the product.
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
    "desktop Home must keep trust inside the existing dashboard bundle",
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
