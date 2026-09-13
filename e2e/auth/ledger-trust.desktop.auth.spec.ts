import { expect, test, type Page } from "@playwright/test";
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
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const trustRegion = page.getByRole("region", { name: "Độ tin cậy" });
  await expect(trustRegion).toBeVisible();
  await expect(trustRegion.getByText("Sổ tin cậy đến 19/08/2026")).toBeVisible();
  await expect(
    trustRegion.getByText(/không khẳng định nguồn bên ngoài đã đầy đủ/iu),
  ).toBeVisible();
  await expect(
    trustRegion.getByRole("link", { name: "Mở Hộp thư" }),
  ).toHaveAttribute("href", "/inbox");
  await expectNoHorizontalOverflow(page);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(trustRegion).toBeVisible();
  await expect(trustRegion.getByText("Sổ tin cậy đến 19/08/2026")).toBeVisible();
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

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "trust surface must not create horizontal page overflow").toBeLessThanOrEqual(
    1,
  );
}
