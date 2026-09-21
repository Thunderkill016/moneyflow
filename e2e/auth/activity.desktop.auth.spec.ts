import { expect, test } from "@playwright/test";
import { seedActivityScenario } from "./activity-fixture";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  signIn,
} from "./harness";

test.beforeEach(async ({ page }) => {
  await seedActivityScenario();
  await signIn(page);
  await assertAuthenticatedMode(page);
});

test("Activity renders the unified workstream on desktop in light and dark mode", async ({
  page,
}) => {
  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Hoạt động", level: 1 })).toBeVisible();
  await expect(page.locator('[data-activity-type="ledger_transaction"]')).toHaveCount(2);
  await expect(page.locator('[data-activity-type="inbox_candidate"]')).toHaveCount(2);
  await expect(page.getByText("Bữa trưa cần xem lại", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Highlands Coffee", { exact: true })).toHaveCount(1);

  const incomingFilter = page.getByRole("button", { name: "Chờ vào sổ", exact: true });
  await incomingFilter.click();
  await expect(page.locator('[data-activity-type="inbox_candidate"]')).toHaveCount(2);
  await expect(page.locator('[data-activity-type="ledger_transaction"]')).toHaveCount(0);

  const firstCandidateAction = page.getByRole("link", { name: /Mở Cần xem|Xử lý/u }).first();
  await expect(firstCandidateAction).toHaveAttribute(
    "href",
    "/inbox?candidate=40000000-0000-4000-8000-000000000001",
  );
  const actionBox = await firstCandidateAction.boundingBox();
  expect(actionBox?.height ?? 0).toBeGreaterThanOrEqual(44);

  let overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.getByText("Nguồn: CSV", { exact: true })).toBeVisible();
  await expect(firstCandidateAction).toBeVisible();
  overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await assertNoUnservedRequests();
});
