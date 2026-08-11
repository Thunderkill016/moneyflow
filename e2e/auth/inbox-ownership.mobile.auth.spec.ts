import { expect, test } from "@playwright/test";
import {
  assertAuthenticatedMode,
  assertNoUnservedRequests,
  seedServer,
  serverCandidate,
  serverTransaction,
  shellInboxCount,
  signIn,
} from "./harness";

/**
 * MF-01 and MF-02 — authenticated Inbox ownership.
 *
 * Both defects were invisible to every existing browser suite because those
 * suites force demo mode, where reading browser storage is correct. Here the
 * server holds the Inbox and the browser store is deliberately empty, so any
 * surface still reading localStorage collapses to zero and fails.
 */

const SERVER_CANDIDATES = [
  serverCandidate(),
  serverCandidate({
    id: "00000000-0000-4000-8000-0000000000b2",
    merchant: "HARNESS-SERVER-CANDIDATE-2",
    amount_minor: 64_000,
    occurred_on: "2026-08-03",
  }),
];

test.describe("authenticated Inbox ownership", () => {
  test.beforeEach(async ({ page, context }) => {
    await seedServer({
      candidates: SERVER_CANDIDATES,
      transactions: [serverTransaction()],
    });
    // The account's Inbox lives on the server. An authenticated browser's
    // local store is emptied by clearLocalInboxAfterMigrate(), so model that.
    await context.addInitScript(() => {
      window.localStorage.setItem("moneyflow-inbox-candidates-v1", "[]");
      window.localStorage.setItem("moneyflow-import-batches-v1", "[]");
      window.localStorage.setItem("moneyflow-onboarding-done", "1");
    });
    await signIn(page);
  });

  test("MF-07: the harness really boots authenticated, not demo", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await assertAuthenticatedMode(page);

    const report = await assertNoUnservedRequests();
    expect(
      report.served,
      "authenticated mode must actually talk to Supabase",
    ).toContain("/auth/v1/user");
  });

  /* ---------------- MF-02 ---------------- */

  const BADGE_SURFACES = [
    "/dashboard",
    "/settings",
    "/settings/privacy",
    "/settings/export",
    "/settings/notifications",
    "/settings/appearance",
    "/settings/delete-account",
  ] as const;

  for (const surface of BADGE_SURFACES) {
    test(`MF-02: ${surface} shows the server pending count`, async ({ page }) => {
      await page.goto(surface, { waitUntil: "domcontentloaded" });
      await assertAuthenticatedMode(page);

      await expect
        .poll(() => shellInboxCount(page), {
          message: `${surface} must show the canonical server count, not the empty local store`,
          timeout: 15_000,
        })
        .toBe(SERVER_CANDIDATES.length);

      await assertNoUnservedRequests();
    });
  }

  /* ---------------- MF-01 ---------------- */

  test("MF-01: the Inbox export contains the server candidates", async ({ page }) => {
    await page.goto("/settings/export", { waitUntil: "domcontentloaded" });
    await assertAuthenticatedMode(page);

    await page.getByRole("radio", { name: /Ứng viên/ }).check();

    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Tải xuống/ }).first().click(),
    ]).then(([d]) => d);

    const body = await readDownload(download);

    for (const candidate of SERVER_CANDIDATES) {
      expect(
        body,
        `export must contain server candidate ${candidate.merchant}`,
      ).toContain(candidate.merchant);
    }
    expect(
      body,
      "export must not invent candidates that are not on the server",
    ).not.toContain("LOCAL-ONLY");

    await assertNoUnservedRequests();
  });

  test("MF-01: the combined export carries server ledger and server Inbox", async ({
    page,
  }) => {
    await page.goto("/settings/export", { waitUntil: "domcontentloaded" });

    await page.getByRole("radio", { name: /Toàn bộ JSON/ }).check();

    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Tải xuống/ }).first().click(),
    ]).then(([d]) => d);

    const parsed = JSON.parse(await readDownload(download));
    const serialised = JSON.stringify(parsed);

    expect(serialised).toContain("HARNESS-SERVER-TRANSACTION");
    expect(serialised).toContain("HARNESS-SERVER-CANDIDATE");

    await assertNoUnservedRequests();
  });

  /* ---------------- MF-01, failure safety ---------------- */

  test("MF-01: a stale demo Inbox in the browser never reaches an authenticated export", async ({
    page,
    context,
  }) => {
    // A browser that previously ran demo mode still holds those rows. They are
    // not this account's Inbox and must never appear in its export.
    await context.addInitScript(() => {
      window.localStorage.setItem(
        "moneyflow-inbox-candidates-v1",
        JSON.stringify([
          {
            id: "cand-local-stale",
            kind: "expense",
            amount: 999_000,
            merchant: "LOCAL-ONLY-STALE-CANDIDATE",
            note: "",
            occurredOn: "2026-07-01",
            source: "paste",
            confidence: "low",
            status: "pending",
            createdAt: "2026-07-01T00:00:00.000Z",
          },
        ]),
      );
    });

    await page.goto("/settings/export", { waitUntil: "domcontentloaded" });
    await page.getByRole("radio", { name: /Ứng viên/ }).check();

    const download = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Tải xuống/ }).first().click(),
    ]).then(([d]) => d);

    const body = await readDownload(download);

    expect(
      body,
      "an authenticated export must never fall back to demo browser rows",
    ).not.toContain("LOCAL-ONLY-STALE-CANDIDATE");
    expect(body).toContain("HARNESS-SERVER-CANDIDATE");

    await assertNoUnservedRequests();
  });
});

async function readDownload(download: {
  createReadStream: () => Promise<NodeJS.ReadableStream>;
}): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
}
