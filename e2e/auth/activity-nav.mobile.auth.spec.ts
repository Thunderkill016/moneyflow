import { expect, test } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  seedServer,
  signIn,
} from "./harness";

test.beforeEach(async ({ page }) => {
  await seedServer();
  await page.setViewportSize({ width: 390, height: 568 });
  await signIn(page);
  await assertAuthenticatedMode(page);
});

test("Activity is discoverable from More without replacing Transactions or Inbox", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  const mobileNav = page.getByRole("navigation", { name: "Điều hướng di động" });
  const transactions = mobileNav.getByRole("link", { name: "Giao dịch", exact: true });
  await expect(transactions).toHaveAttribute("href", "/transactions");

  await mobileNav.getByRole("button", { name: "Thêm", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Thêm & tài khoản" });
  await expect(sheet).toBeVisible();

  const activity = sheet.getByRole("link", { name: "Hoạt động", exact: true });
  const inbox = sheet.getByRole("link", { name: "Cần xem", exact: true });
  await expect(activity).toHaveAttribute("href", "/activity");
  await expect(inbox).toHaveAttribute("href", "/inbox");

  await activity.scrollIntoViewIfNeeded();
  const target = await activity.boundingBox();
  expect(target?.height ?? 0, "Activity More-sheet target must be at least 44px").toBeGreaterThanOrEqual(44);

  await activity.click();
  await expect(page).toHaveURL(/\/activity$/u);
  await expect(page.getByRole("heading", { name: "Hoạt động", level: 1 })).toBeVisible();

  await assertNoUnservedRequests();
});
