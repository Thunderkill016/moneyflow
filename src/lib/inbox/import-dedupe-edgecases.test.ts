/**
 * QA round 3 — import dedupe edge cases (scope B).
 *
 * Each edge case below is proven by a unit test against the real
 * dedupe/matching functions. No E2E needed.
 *
 * Edge cases:
 *  1. Same file imported twice      → second import marks everything duplicate.
 *  2. Two different files, same txs → fingerprint match catches them.
 *  3. 23:59 vs 00:01 (date rolls)  → exact fingerprint misses; inbox near-tier
 *                                    (±2d) flags for review. Direct-CSV preview
 *                                    has no near tier (documented limitation).
 *  4. Amount 0 / negative / unsafe  → rejected at parse; plan marks invalid.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { demoAccounts, demoCategories } from "../demo/transaction-fixtures.ts";
import {
  annotateCandidates,
  candidateFingerprint,
  findDuplicateMatches,
  type LedgerLike,
} from "./detect.ts";
import {
  planDirectCsvImport,
  type DirectImportMapping,
  type DirectImportRowPlan,
} from "./direct-csv-import.ts";
import { parseCsvDateCell, parseCsvStatement } from "./parse-csv.ts";
import { parseVndAmountToken } from "./parse-text.ts";
import type { InboxCandidate } from "./candidate-store.ts";

const account = demoAccounts[0]!;
const expenseCat = demoCategories.find((c) => c.kind === "expense")!;
const incomeCat = demoCategories.find((c) => c.kind === "income")!;

const baseMapping: DirectImportMapping = {
  accountId: account.id,
  expenseCategoryId: expenseCat.id,
  incomeCategoryId: incomeCat.id,
};

const CSV_TWO_ROWS = [
  "Ngay,Mo ta,So tien",
  "2026-10-05,Cafe Highlands,45000",
  "2026-10-05,An trua com van phong,120000",
].join("\n");

function planFor(csvText: string, ledger: LedgerLike[] = []) {
  const parsed = parseCsvStatement(csvText, { fileName: "stmt.csv" });
  assert.equal(parsed.ok, true, `CSV should parse: ${parsed.error ?? ""}`);
  assert.ok(parsed.rows.length > 0, "CSV should yield rows");
  return planDirectCsvImport(
    parsed.rows,
    ledger,
    baseMapping,
    demoAccounts,
    demoCategories,
  );
}

/** Ledger rows as they would exist after committing the first import. */
function ledgerFromPlan(plan: { ready: DirectImportRowPlan[] }): LedgerLike[] {
  return plan.ready.map((row, index) => ({
    id: `ledger-${index}`,
    kind: row.kind,
    amount: row.amount,
    occurredOn: row.occurredOn,
    note: row.note,
    accountId: row.accountId,
    account: account.name,
  }));
}

function makeCandidate(
  overrides: Partial<InboxCandidate> & { id: string },
): InboxCandidate {
  return {
    kind: "expense",
    amount: 45000,
    merchant: "Cafe Highlands",
    note: "",
    occurredOn: "2026-10-05",
    source: "csv",
    confidence: "high",
    status: "pending",
    accountId: account.id,
    account: account.name,
    rawSnippet: "2026-10-05 | Cafe Highlands | 45000",
    createdAt: "2026-10-06T00:00:00.000Z",
    ...overrides,
  };
}

test("edge 1: same file imported twice — second import marks all duplicates", () => {
  const first = planFor(CSV_TWO_ROWS);
  assert.equal(first.readyCount, 2);
  assert.equal(first.duplicateCount, 0);

  const second = planFor(CSV_TWO_ROWS, ledgerFromPlan(first));
  assert.equal(second.readyCount, 0);
  assert.equal(second.duplicateCount, 2);
  for (const row of second.rows) {
    assert.equal(row.status, "duplicate");
    assert.match(row.reason ?? "", /đã có trên sổ/);
    assert.ok(row.duplicateOfLedgerId, "points at the ledger row");
  }
});

test("edge 2: two different files, same transactions — fingerprint catches them", () => {
  // Different column order / header wording, same underlying transactions.
  const fileA = [
    "Date,Description,Amount",
    "2026-10-05,Cafe Highlands,45000",
  ].join("\n");
  const fileB = [
    "So tien,Mo ta,Ngay",
    "45000,Cafe Highlands,2026-10-05",
  ].join("\n");

  const rowsA = parseCsvStatement(fileA, { fileName: "a.csv" });
  const rowsB = parseCsvStatement(fileB, { fileName: "b.csv" });
  assert.equal(rowsA.ok, true);
  assert.equal(rowsB.ok, true);
  assert.equal(rowsA.rows.length, 1);
  assert.equal(rowsB.rows.length, 1);

  const a = rowsA.rows[0]!;
  const b = rowsB.rows[0]!;
  const fpA = candidateFingerprint({
    amount: a.amount,
    occurredOn: a.occurredOn,
    accountId: account.id,
    merchant: a.merchant,
    note: a.note,
    rawSnippet: undefined,
  });
  const fpB = candidateFingerprint({
    amount: b.amount,
    occurredOn: b.occurredOn,
    accountId: account.id,
    merchant: b.merchant,
    note: b.note,
    rawSnippet: undefined,
  });
  assert.equal(
    fpA,
    fpB,
    "same account/date/amount/description → same fingerprint across files",
  );

  // Peer-candidate matching (both files sitting in Inbox as pending).
  const candidates = [
    makeCandidate({ id: "cand-a" }),
    makeCandidate({ id: "cand-b" }),
  ];
  const matches = findDuplicateMatches(candidates);
  assert.equal(matches.length, 2);
  assert.equal(matches[0]!.dayDiff, 0, "exact fingerprint tier");
});

test("edge 3: 23:59 vs 00:01 — date roll breaks exact fingerprint", () => {
  // Parsers are date-only: the time of day is discarded, so the same
  // transaction exported at 23:59 in file A lands on a different calendar
  // date than the 00:01 export in file B.
  assert.equal(parseCsvDateCell("2026-10-06 23:59", "2026-10-06").date, "2026-10-06");
  assert.equal(parseCsvDateCell("2026-10-07 00:01", "2026-10-06").date, "2026-10-07");

  const csvA = ["Ngay,Mo ta,So tien", "2026-10-06 23:59,Cafe Highlands,45000"].join("\n");
  const csvB = ["Ngay,Mo ta,So tien", "2026-10-07 00:01,Cafe Highlands,45000"].join("\n");
  const rowsA = parseCsvStatement(csvA, { fileName: "a.csv" });
  const rowsB = parseCsvStatement(csvB, { fileName: "b.csv" });
  assert.equal(rowsA.ok, true);
  assert.equal(rowsB.ok, true);

  // Direct-CSV preview: exact fingerprint only → NOT flagged as duplicate.
  const importB = planFor(csvB, ledgerFromPlan(planFor(csvA)));
  const dupes = importB.rows.filter((r) => r.status === "duplicate");
  assert.equal(
    dupes.length,
    0,
    "direct-CSV preview misses the 23:59/00:01 pair (no near tier) — documented gap",
  );

  // Inbox review path: ±2d near tier flags it for human review.
  const near = findDuplicateMatches([
    makeCandidate({ id: "cand-a", occurredOn: "2026-10-06" }),
    makeCandidate({ id: "cand-b", occurredOn: "2026-10-07" }),
  ]);
  assert.equal(near.length, 2);
  assert.equal(near[0]!.dayDiff, 1, "near tier: 1 day apart");

  const annotated = annotateCandidates([
    makeCandidate({ id: "cand-a", occurredOn: "2026-10-06" }),
    makeCandidate({ id: "cand-b", occurredOn: "2026-10-07" }),
  ]);
  assert.equal(annotated[0]!.possibleDuplicate, true);
  assert.equal(annotated[0]!.nearMatch, true);
  assert.equal(annotated[0]!.duplicateDayDiff, 1);
});

test("edge 4: amount 0 / negative / unsafe integer are rejected at parse", () => {
  assert.equal(parseVndAmountToken("0"), null, "zero → null");
  assert.equal(parseVndAmountToken("9007199254740992"), null, "> MAX_SAFE_INTEGER → null");
  assert.equal(
    parseVndAmountToken("9007199254740991"),
    9007199254740991,
    "MAX_SAFE_INTEGER itself is accepted",
  );
  assert.equal(parseVndAmountToken("1.234.567.890.123.456.789"), null, "huge grouped → null");

  // CSV rows: zero amounts are dropped; a leading minus is direction evidence
  // (parsed as a positive expense), never a negative ledger amount.
  const csv = [
    "Ngay,Mo ta,So tien",
    "2026-10-05,Giao dich 0 dong,0",
    "2026-10-05,Giao dich am,-50000",
    "2026-10-05,Giao dich hop le,45000",
  ].join("\n");
  const parsed = parseCsvStatement(csv, { fileName: "stmt.csv" });
  assert.equal(parsed.ok, true);
  assert.equal(parsed.rows.length, 2, "zero row dropped; signed row kept as expense");
  const signed = parsed.rows.find((r) => r.merchant === "Giao dich am")!;
  assert.equal(signed.kind, "expense");
  assert.equal(signed.amount, 50000, "sign becomes direction, amount stays positive");
  assert.ok(
    parsed.rows.every((r) => r.amount > 0),
    "no candidate ever carries a non-positive amount",
  );

  // Belt-and-braces: a manually-built row with an invalid amount is marked
  // skipped_invalid by the planner, never "ready".
  const base = parseCsvStatement(
    ["Ngay,Mo ta,So tien", "2026-10-05,Cafe,45000"].join("\n"),
    { fileName: "stmt.csv" },
  );
  assert.equal(base.ok, true);
  const bad = { ...base.rows[0]!, amount: 0 };
  const plan = planDirectCsvImport(
    [bad],
    [],
    baseMapping,
    demoAccounts,
    demoCategories,
  );
  assert.equal(plan.readyCount, 0);
  assert.equal(plan.invalidSkipped, 1);
  assert.equal(plan.rows[0]!.status, "skipped_invalid");
  assert.match(plan.rows[0]!.reason ?? "", /Số tiền không hợp lệ/);
});
