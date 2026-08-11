import assert from "node:assert/strict";
import test from "node:test";
import type { InboxCandidate } from "./inbox/candidate-store.ts";
import {
  buildExportContent,
  candidatesToCsv,
  EXPORT_CSV_LABEL,
  EXPORT_SETTINGS_HREF,
  exportFilename,
  filterByOccurredOnRange,
  reportCsvDownloadHref,
  resolveExportCandidates,
  signedExportAmount,
} from "./export-data.ts";
import type { Transaction } from "./sample-data.ts";

const txn = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  kind: "expense",
  categoryId: "food",
  category: "Ăn uống",
  note: "Cafe",
  accountId: "cash",
  account: "Tiền mặt",
  amount: 45_000,
  occurredOn: "2026-07-12",
  occurredAt: "2026-07-12T02:00:00.000Z",
  relativeDate: "Hôm nay",
  ...overrides,
});

const cand = (overrides: Partial<InboxCandidate> = {}): InboxCandidate => ({
  id: "c1",
  kind: "expense",
  amount: 45_000,
  merchant: "Highlands",
  note: "Cafe",
  occurredOn: "2026-07-12",
  source: "paste",
  confidence: "low",
  status: "pending",
  createdAt: "2026-07-12T02:10:00.000Z",
  ...overrides,
});

test("filterByOccurredOnRange is inclusive on from/to", () => {
  const items = [
    txn({ id: "a", occurredOn: "2026-07-01" }),
    txn({ id: "b", occurredOn: "2026-07-12" }),
    txn({ id: "c", occurredOn: "2026-07-20" }),
  ];
  assert.deepEqual(
    filterByOccurredOnRange(items, { from: "2026-07-12", to: "2026-07-12" }).map((i) => i.id),
    ["b"],
  );
  assert.deepEqual(
    filterByOccurredOnRange(items, { from: "", to: "2026-07-12" }).map((i) => i.id),
    ["a", "b"],
  );
  assert.deepEqual(
    filterByOccurredOnRange(items, { from: "2026-07-12", to: "" }).map((i) => i.id),
    ["b", "c"],
  );
});

test("signedExportAmount keeps integer minor units", () => {
  assert.equal(signedExportAmount("expense", 45_000), -45_000);
  assert.equal(signedExportAmount("income", 25_000_000), 25_000_000);
  assert.equal(signedExportAmount("transfer", 2_000_000), 2_000_000);
});

test("candidatesToCsv escapes formulas and preserves integer amounts", () => {
  const csv = candidatesToCsv([
    cand({ merchant: "=HYPERLINK(\"bad\")", amount: 123_456 }),
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /"'=HYPERLINK\(""bad""\)"/);
  assert.match(csv, /"-123456"/);
  assert.match(csv, /Chờ duyệt/);
});

test("buildExportContent CSV for transactions reuses report shape", () => {
  const result = buildExportContent({
    kind: "transactions",
    format: "csv",
    transactions: [txn({ note: "Bữa trưa", amount: 100_000 })],
    candidates: [cand()],
    range: { from: "", to: "" },
    now: new Date("2026-07-15T00:00:00.000Z"),
  });
  assert.equal(result.extension, "csv");
  assert.equal(result.count, 1);
  assert.match(result.body, /"-100000"/);
  assert.match(result.body, /Bữa trưa/);
});

test("buildExportContent all forces JSON with both lists", () => {
  const result = buildExportContent({
    kind: "all",
    format: "csv",
    transactions: [txn()],
    candidates: [cand()],
    range: { from: "2026-07-01", to: "2026-07-31" },
    now: new Date("2026-07-15T12:00:00.000Z"),
  });
  assert.equal(result.extension, "json");
  assert.equal(result.count, 2);
  const parsed = JSON.parse(result.body) as {
    transactions: unknown[];
    candidates: unknown[];
  };
  assert.equal(parsed.transactions.length, 1);
  assert.equal(parsed.candidates.length, 1);
});

test("exportFilename includes kind and optional range", () => {
  const name = exportFilename(
    "candidates",
    "csv",
    { from: "2026-07-01", to: "2026-07-31" },
    new Date("2026-07-15T00:00:00.000Z"),
  );
  assert.equal(name, "moneyflow-ung-vien-2026-07-01-2026-07-31-2026-07-15.csv");
  assert.equal(
    exportFilename("all", "json", { from: "", to: "" }, new Date("2026-07-15T00:00:00.000Z")),
    "moneyflow-toan-bo-2026-07-15.json",
  );
});

test("export discoverability paths: Insights hub + Reports download", () => {
  assert.equal(EXPORT_CSV_LABEL, "Xuất CSV");
  assert.equal(EXPORT_SETTINGS_HREF, "/settings/export");
  assert.equal(reportCsvDownloadHref("month"), "/reports/export?period=month");
  assert.equal(reportCsvDownloadHref("week"), "/reports/export?period=week");
  assert.equal(reportCsvDownloadHref("year"), "/reports/export?period=year");
  assert.equal(reportCsvDownloadHref("nope"), "/reports/export?period=month");
});

/*
 * Regression: an authenticated export must read the server Inbox.
 *
 * The Inbox for a signed-in workspace lives in Supabase, and the browser's
 * local candidate store is emptied by `clearLocalInboxAfterMigrate()`. Reading
 * local candidates while signed in produced an export with zero Inbox rows,
 * even though the delete-account page tells people this download covers
 * transactions and Inbox before permanent deletion.
 */
test("resolveExportCandidates reads the server Inbox for an authenticated viewer", () => {
  const server = [cand({ id: "server-1" }), cand({ id: "server-2" })];

  assert.deepEqual(
    resolveExportCandidates({
      isDemo: false,
      localCandidates: [],
      serverCandidates: server,
    }).map((item) => item.id),
    ["server-1", "server-2"],
  );
});

test("resolveExportCandidates keeps demo on the device store", () => {
  const local = [cand({ id: "local-1" })];

  assert.deepEqual(
    resolveExportCandidates({
      isDemo: true,
      localCandidates: local,
      serverCandidates: [cand({ id: "server-1" })],
    }).map((item) => item.id),
    ["local-1"],
  );
});

test("resolveExportCandidates never falls back to stale local data when signed in", () => {
  // A browser that once ran demo mode still holds those candidates. They are
  // not the account's Inbox, so an unavailable server read exports nothing
  // rather than another context's rows.
  assert.deepEqual(
    resolveExportCandidates({
      isDemo: false,
      localCandidates: [cand({ id: "stale-demo" })],
      serverCandidates: null,
    }),
    [],
  );
});

test("an authenticated export bundle carries the server Inbox rows", () => {
  const content = buildExportContent({
    kind: "candidates",
    format: "csv",
    transactions: [],
    candidates: resolveExportCandidates({
      isDemo: false,
      localCandidates: [],
      serverCandidates: [cand({ id: "server-1", merchant: "Highlands" })],
    }),
    range: { from: "", to: "" },
  });

  assert.equal(content.count, 1);
  assert.match(content.body, /Highlands/);
});
