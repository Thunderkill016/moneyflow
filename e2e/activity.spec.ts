import { expect, test } from "@playwright/test";

test("Activity combines demo ledger and Inbox candidates without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Hoạt động", level: 1 })).toBeVisible();
  await expect(page.locator('[data-activity-type="ledger_transaction"]').first()).toBeVisible();
  await expect(page.locator('[data-activity-type="inbox_candidate"]').first()).toBeVisible();

  const attentionFilter = page.getByRole("button", { name: "Cần xử lý", exact: true });
  await attentionFilter.click();
  await expect(page.locator("[data-activity-type]").first()).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, "demo Activity must not create horizontal page overflow").toBeLessThanOrEqual(1);
});

test("Activity actions open the exact transaction editor and pending candidate review", async ({
  page,
}) => {
  await page.goto("/activity", { waitUntil: "domcontentloaded" });

  // Ledger item → /transactions?open=<id> → the edit dialog opens on that row;
  // the consumed param is stripped while other filters stay intact.
  await page
    .locator('[data-activity-type="ledger_transaction"]')
    .first()
    .getByRole("link")
    .first()
    .click();
  await page.waitForURL(/\/transactions/);
  await expect(
    page.getByRole("dialog", { name: "Sửa giao dịch" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/open=/);

  // Stale/foreign ids fail safe: notice, no dialog.
  await page.goto("/transactions?open=does-not-exist", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Không tìm thấy giao dịch")).toBeVisible();

  // Candidate item → /inbox?candidate=<id> → the review panel opens on it.
  await page.goto("/activity", { waitUntil: "domcontentloaded" });
  await page
    .locator('[data-activity-type="inbox_candidate"]')
    .first()
    .getByRole("link")
    .first()
    .click();
  await page.waitForURL(/\/inbox/);
  await expect(
    page.getByRole("dialog", { name: "Duyệt giao dịch" }),
  ).toBeVisible();
  await expect(page).not.toHaveURL(/candidate=/);
});
