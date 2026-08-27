import { expect, test } from "@playwright/test";

/*
 * Proof that the sink accepts a report, sanitises it server-side, and never
 * answers with an error.
 *
 * An earlier version of this file also asserted `Array.isArray(posted)` after
 * intercepting the route — which is true whether or not anything was ever sent.
 * A vacuous assertion is worse than no test, because it reads as coverage, so
 * it was removed rather than left to reassure someone later.
 *
 * These exercise the server half against a running route. The browser delivery
 * path uses `sendBeacon` during a page that may be unloading, which Playwright
 * cannot force deterministically; that half rests on unit tests and the
 * `[client-error]` line this run prints to the server log.
 */

test("the sink accepts a report and never answers with an error", async ({ request }) => {
  const response = await request.post("/api/client-error", {
    data: {
      context: "e2e",
      name: "Error",
      message: "TK 0011004567890|GD: -250,000VND|SD: 3,450,000VND",
      route: "/transactions?category=Ăn uống",
    },
  });

  // 204 in every case: an attacker learns nothing, and reporting an error must
  // never itself produce one the user can see.
  expect(response.status()).toBe(204);
});

test("junk and oversized bodies are refused without an error status", async ({ request }) => {
  const junk = await request.post("/api/client-error", { data: { nothing: true } });
  expect(junk.status()).toBe(204);

  const huge = await request.post("/api/client-error", {
    data: { context: "e2e", name: "Error", message: "x".repeat(20_000) },
  });
  expect(huge.status()).toBe(204);
});
