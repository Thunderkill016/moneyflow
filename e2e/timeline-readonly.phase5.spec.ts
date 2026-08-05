import { expect, test } from "@playwright/test";

const REVIEWED_NOTE = "Giao dịch đã duyệt trên timeline";
const NEEDS_REVIEW_NOTE = "Giao dịch cần kiểm tra không được lên timeline";

function todayInVietnam(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

test("Phase 5 timeline reads the demo ledger but exposes no mutation controls", async ({
  page,
}) => {
  const today = todayInVietnam();
  await page.addInitScript(
    ({ reviewedNote, needsReviewNote, occurredOn }) => {
      window.localStorage.clear();
      window.localStorage.setItem(
        "moneyflow-demo-transactions-v1",
        JSON.stringify([
          {
            id: "phase5-timeline-reviewed",
            kind: "expense",
            categoryId: "demo-category-expense-Ăn uống",
            category: "Ăn uống",
            note: reviewedNote,
            accountId: "demo-account-mb",
            account: "MB Bank",
            amount: 125_000,
            occurredOn,
            occurredAt: `${occurredOn}T03:30:00.000Z`,
            relativeDate: "Hôm nay",
            reviewStatus: "reviewed",
          },
          {
            id: "phase5-timeline-needs-review",
            kind: "expense",
            categoryId: "demo-category-expense-Mua sắm",
            category: "Mua sắm",
            note: needsReviewNote,
            accountId: "demo-account-mb",
            account: "MB Bank",
            amount: 275_000,
            occurredOn,
            occurredAt: `${occurredOn}T04:30:00.000Z`,
            relativeDate: "Hôm nay",
            reviewStatus: "needs_review",
          },
        ]),
      );
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    },
    {
      reviewedNote: REVIEWED_NOTE,
      needsReviewNote: NEEDS_REVIEW_NOTE,
      occurredOn: today,
    },
  );

  await page.goto("/timeline", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Dòng thời gian (đã duyệt)",
      exact: true,
    }),
  ).toBeVisible();

  const timeline = page.locator('[data-slot="timeline-workspace"]');
  await expect(timeline).toContainText(REVIEWED_NOTE);
  await expect(timeline).not.toContainText(NEEDS_REVIEW_NOTE);
  await expect(timeline.locator('[data-slot="timeline-row"]')).toHaveCount(1);

  await expect(page.getByLabel("Lọc theo danh mục")).toHaveCount(0);
  await expect(page.getByLabel("Lọc theo trạng thái kiểm tra")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Đánh dấu đã duyệt", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Sửa giao dịch/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Xóa giao dịch/i })).toHaveCount(0);

  const search = page.getByLabel("Tìm trong dòng thời gian");
  await search.fill("không khớp");
  await expect(timeline).toContainText("Không tìm thấy giao dịch đã duyệt");
  await page.getByRole("button", { name: "Xóa tìm kiếm", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(timeline).toContainText(REVIEWED_NOTE);
});
