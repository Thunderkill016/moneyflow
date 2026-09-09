import { expect, test } from "@playwright/test";

const CSV = [
  "Ngày,Mô tả,Số tiền",
  "09/09/2026,MON63_BROWSER_EVIDENCE,-321987",
].join("\n");

async function uploadCsv(page: import("@playwright/test").Page) {
  await page.goto("/imports/direct");
  await page.locator('input[type="file"]').setInputFiles({
    name: "mon63-browser-evidence.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(CSV, "utf8"),
  });
  await expect(page.getByText("2. Map cột và đích ghi")).toBeVisible();
  await expect(page.getByRole("button", { name: "Xem lại ghi 1 giao dịch" })).toBeVisible();
}

test("remembered Direct CSV mapping reduces remapping but manual override returns to review evidence", async ({
  page,
}) => {
  await uploadCsv(page);

  await page.getByRole("button", { name: "Nhớ mapping này" }).click();
  await expect(page.getByText("Đã nhớ mapping này trên thiết bị.")).toBeVisible();

  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await uploadCsv(page);

  const applyRemembered = page.getByRole("button", { name: "Dùng mapping đã nhớ" });
  await expect(applyRemembered).toBeVisible();
  await applyRemembered.click();
  await expect(
    page.getByText("Đã dùng mapping đã nhớ. Hãy kiểm tra dry-run trước khi ghi sổ."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Xem lại ghi 1 giao dịch" }).click();
  let dialog = page.getByRole("dialog", { name: "Ghi trực tiếp giao dịch vào sổ?" });
  await expect(dialog).toContainText("Dùng mapping đã nhớ");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByLabel("Mô tả", { exact: true }).selectOption({ label: "Số tiền" });
  await page.getByRole("button", { name: "Xem lại ghi 1 giao dịch" }).click();
  dialog = page.getByRole("dialog", { name: "Ghi trực tiếp giao dịch vào sổ?" });
  await expect(dialog).toContainText("Đã review mapping");
});
