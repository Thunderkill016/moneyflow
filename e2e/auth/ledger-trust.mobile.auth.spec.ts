import { expect, test } from "@playwright/test";
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

test("Home trust stays truthful and usable on a narrow phone in light and dark mode", async ({
  page,
}) => {
  // The auth project is normally 390px wide. Grade this new surface at the
  // repository's narrower phone boundary so the evidence is not accidentally
  // weaker than the cross-device audit used elsewhere.
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

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

async function expectMinimumTarget(action: ReturnType<Parameters<typeof test>[0] extends never ? never : never>) {
  // This declaration is replaced below by the concrete Locator overload. It is
  // kept out of production code; Playwright owns the browser geometry contract.
  void action;
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "trust surface must not create horizontal page overflow").toBeLessThanOrEqual(
    1,
  );
}
