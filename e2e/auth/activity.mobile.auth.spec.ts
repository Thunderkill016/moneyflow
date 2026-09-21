import { expect, test, type Locator, type Page } from "@playwright/test";
import { seedActivityScenario } from "./activity-fixture";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  signIn,
} from "./harness";

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "Activity must not create horizontal page overflow").toBeLessThanOrEqual(1);
}

async function expectMinimumTarget(locator: Locator) {
  const box = await locator.boundingBox();
  expect(box?.height ?? 0, "Activity primary targets must be at least 44px").toBeGreaterThanOrEqual(44);
}

function summaryValue(page: Page, label: string) {
  return page
    .getByRole("region", { name: "Tóm tắt hoạt động" })
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("strong")
    .first();
}

test.beforeEach(async ({ page }) => {
  await seedActivityScenario();
  await page.setViewportSize({ width: 320, height: 780 });
  await signIn(page);
  await assertAuthenticatedMode(page);
});

test("Activity merges pending evidence and posted review work without duplication on a narrow phone", async ({
  page,
}) => {
  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Hoạt động", level: 1 })).toBeVisible();
  await expect(page.getByText("Bữa trưa cần xem lại", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Lương đã vào sổ", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Highlands Coffee", { exact: true })).toHaveCount(1);
  await expect(page.getByText("GRAB *TRIP", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Nguồn: CSV", { exact: true })).toBeVisible();
  await expect(page.getByText("Bằng chứng nguồn đang chờ", { exact: true })).toBeVisible();

  await expect(summaryValue(page, "Cần xử lý")).toHaveText("2");
  await expect(summaryValue(page, "Chờ vào sổ")).toHaveText("2");
  await expect(summaryValue(page, "Đã vào sổ")).toHaveText("2");

  const attentionFilter = page.getByRole("button", { name: "Cần xử lý", exact: true });
  await expectMinimumTarget(attentionFilter);
  await attentionFilter.click();

  await expect(page.locator("[data-activity-type]")).toHaveCount(2);
  await expect(page.getByText("Bữa trưa cần xem lại", { exact: true })).toBeVisible();
  await expect(page.getByText("GRAB *TRIP", { exact: true })).toBeVisible();
  await expect(page.getByText("Lương đã vào sổ", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Highlands Coffee", { exact: true })).toHaveCount(0);

  const reviewAction = page.getByRole("link", { name: "Xem lại" });
  await expect(reviewAction).toHaveAttribute(
    "href",
    "/transactions?review=needs_review&open=30000000-0000-4000-8000-000000000001",
  );
  await expectMinimumTarget(reviewAction);
  await expectNoHorizontalOverflow(page);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.getByRole("heading", { name: "Hoạt động", level: 1 })).toBeVisible();
  await expect(reviewAction).toBeVisible();
  await expectMinimumTarget(reviewAction);
  await expectNoHorizontalOverflow(page);

  await assertNoUnservedRequests();
});

test("candidate read failure keeps healthy ledger visible and marks combined counts unknown", async ({
  page,
}) => {
  await page.route("**/activity", async (route) => {
    if (route.request().method() === "POST") {
      await route.abort("failed");
      return;
    }
    await route.continue();
  });

  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Nguồn chờ vào sổ chưa tải được" }),
  ).toBeVisible();
  await expect(page.getByText("Bữa trưa cần xem lại", { exact: true })).toBeVisible();
  await expect(page.getByText("Lương đã vào sổ", { exact: true })).toBeVisible();
  await expect(page.getByText("Highlands Coffee", { exact: true })).toHaveCount(0);
  await expect(summaryValue(page, "Cần xử lý")).toHaveText("—");
  await expect(summaryValue(page, "Chờ vào sổ")).toHaveText("—");
  await expect(summaryValue(page, "Đã vào sổ")).toHaveText("2");
  await expectNoHorizontalOverflow(page);
});

test("review-state failure keeps posted facts visible but marks attention coverage unknown", async ({
  page,
}) => {
  await seedActivityScenario({ invalidReview: true });
  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Trạng thái cần xem lại chưa tải được" }),
  ).toBeVisible();
  await expect(page.getByText("Bữa trưa cần xem lại", { exact: true })).toBeVisible();
  await expect(page.getByText("Lương đã vào sổ", { exact: true })).toBeVisible();
  await expect(page.getByText("GRAB *TRIP", { exact: true })).toBeVisible();
  await expect(summaryValue(page, "Cần xử lý")).toHaveText("—");
  await expect(summaryValue(page, "Chờ vào sổ")).toHaveText("2");
  await expect(summaryValue(page, "Đã vào sổ")).toHaveText("2");

  await page.getByRole("button", { name: "Cần xử lý", exact: true }).click();
  await expect(page.locator("[data-activity-type]")).toHaveCount(1);
  await expect(page.getByText("GRAB *TRIP", { exact: true })).toBeVisible();
  await expect(page.getByText("Bữa trưa cần xem lại", { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await assertNoUnservedRequests();
});

test("ledger read failure keeps candidate evidence visible without inventing readiness", async ({
  page,
}) => {
  await seedActivityScenario({ invalidLedger: true });
  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Phần giao dịch đã vào sổ chưa tải được" }),
  ).toBeVisible();
  await expect(page.getByText("Highlands Coffee", { exact: true })).toBeVisible();
  await expect(page.getByText("GRAB *TRIP", { exact: true })).toBeVisible();
  await expect(page.getByText("Bữa trưa cần xem lại", { exact: true })).toHaveCount(0);
  await expect(summaryValue(page, "Cần xử lý")).toHaveText("—");
  await expect(summaryValue(page, "Chờ vào sổ")).toHaveText("2");
  await expect(summaryValue(page, "Đã vào sổ")).toHaveText("—");

  const candidateRows = page.locator('[data-activity-type="inbox_candidate"]');
  await expect(candidateRows).toHaveCount(2);
  await expect(candidateRows.getByText("Cần xử lý", { exact: true })).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await assertNoUnservedRequests();
});
