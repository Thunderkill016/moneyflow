import { expect, test } from "@playwright/test";
import { assertNoUnservedRequests, seedServer, serverCandidate } from "./harness";

/**
 * Negative contract for the authenticated harness.
 *
 * Every other spec here signs in first, so a double that handed out a session
 * to anyone would make all of them pass for the wrong reason. This asserts the
 * other half: with no session, a protected route must not render the signed-in
 * workspace.
 *
 * It deliberately tests observable product behaviour — where the browser ends
 * up and what is on the page — and never inspects, forges or deletes a Supabase
 * cookie. Cookie names are implementation detail of @supabase/ssr.
 */
test.describe("unauthenticated boundary", () => {
  test.beforeEach(async () => {
    // Seed a populated tenant. If the boundary leaks, the workspace renders
    // real data and the failure is unmistakable rather than an empty shell.
    await seedServer({ candidates: [serverCandidate()] });
  });

  test("a browser with no session cannot reach the authenticated workspace", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(
      page,
      "a session-less browser must land on the unauthenticated boundary",
    ).toHaveURL(/\/login(\?|$)/);

    await expect(
      page.getByRole("navigation", { name: "Điều hướng di động" }),
      "the signed-in shell must not render without a session",
    ).toHaveCount(0);

    await expect(
      page.getByText("HARNESS-SERVER-CANDIDATE"),
      "no tenant data may reach a session-less browser",
    ).toHaveCount(0);

    await expect(page.locator('input[name="password"]')).toBeVisible();

    await assertNoUnservedRequests();
  });

  test("the double refuses a bearer token it never issued", async ({ request }) => {
    // The app never sends a forged token, so this asks the double directly.
    // Without it, a permissive /auth/v1/user would authenticate anything and
    // every positive test in this suite would pass for the wrong reason.
    const port = process.env.SUPABASE_DOUBLE_PORT || 3301;
    const response = await request.get(`http://127.0.0.1:${port}/auth/v1/user`, {
      headers: { authorization: "Bearer not-a-token-this-double-issued" },
    });

    expect(
      response.status(),
      "an unknown bearer token must be rejected the way Supabase Auth rejects it",
    ).toBe(401);
  });
});
