import { expect, test } from "@playwright/test";

/*
 * Offline AWARENESS, proven in a browser. Not offline capability: nothing is
 * queued or cached, and this spec must never be read as evidence that a user
 * can record something while disconnected.
 */

test.describe("connectivity awareness", () => {
  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
  });

  test("says it is offline, keeps the ledger readable, and clears on reconnect", async ({
    page,
    context,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });

    const notice = page.getByText(/Đang mất kết nối/u);
    await expect(notice, "nothing to say while connected").toBeHidden();

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await expect(notice).toBeVisible();

    /*
     * The claim in the notice has to hold: reading still works from what is
     * already rendered, and only saving does not.
     */
    await expect(page.getByText("15.735.000 ₫").first()).toBeVisible();

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(notice, "it must not linger once connectivity returns").toBeHidden();
  });

  test("the notice is context, not an alarm that blocks the page", async ({
    page,
    context,
  }) => {
    await page.goto("/dashboard", { waitUntil: "networkidle" });
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event("offline")));

    const notice = page.getByText(/Đang mất kết nối/u);
    await expect(notice).toBeVisible();

    // Losing signal is not something the reader caused, so it must not trap them.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(
      page
        .getByRole("navigation")
        .first()
        .getByRole("link", { name: "Giao dịch", exact: true }),
    ).toBeVisible();
  });
});
