import assert from "node:assert/strict";
import test from "node:test";

import {
  findLedgerDuplicateGroups,
  type LedgerDupeRow,
} from "./ledger-duplicates.ts";

function tx(id: string, occurredOn: string, overrides: Partial<LedgerDupeRow> = {}) {
  return {
    id,
    kind: "expense" as const,
    amount: 30_000,
    occurredOn,
    note: "Cà phê",
    accountId: "acct-1",
    account: "Tiền mặt",
    ...overrides,
  };
}

test("same account + amount + description on one day flags a group", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10"),
    tx("b", "2026-09-10"),
    tx("c", "2026-09-20"),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.hasSameDayPair, true);
  assert.deepEqual(
    groups[0]!.rows.map((row) => row.id),
    ["a", "b"],
  );
});

test("same account + amount + description one day apart flags", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10"),
    tx("b", "2026-09-11"),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.hasSameDayPair, false);
  assert.equal(groups[0]!.spanDays, 1);
});

test("a lone pair exactly at the window edge does not flag", () => {
  // Two days apart is the weakest signal — it needs a third row in the window.
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10"),
    tx("b", "2026-09-12"),
  ]);
  assert.deepEqual(groups, []);
});

test("a three-row cluster chained by two-day gaps flags", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10"),
    tx("b", "2026-09-12"),
    tx("c", "2026-09-14"),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.rows.length, 3);
  assert.equal(groups[0]!.spanDays, 4);
});

test("different accounts never flag", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10"),
    tx("b", "2026-09-10", { accountId: "acct-2", account: "Ngân hàng" }),
  ]);
  assert.deepEqual(groups, []);
});

test("different amounts or kinds never flag", () => {
  assert.deepEqual(
    findLedgerDuplicateGroups([
      tx("a", "2026-09-10"),
      tx("b", "2026-09-10", { amount: 35_000 }),
    ]),
    [],
  );
  // An expense and an income sharing amount + note are a reversal, not a dupe.
  assert.deepEqual(
    findLedgerDuplicateGroups([
      tx("a", "2026-09-10"),
      tx("b", "2026-09-10", { kind: "income" }),
    ]),
    [],
  );
});

test("transfer rows never flag — the two legs are one movement", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10", { kind: "transfer" }),
    tx("b", "2026-09-10", { kind: "transfer" }),
  ]);
  assert.deepEqual(groups, []);
});

test("normalized descriptions match through case, marks, punctuation and đ", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10", { note: "Điện thoại!" }),
    tx("b", "2026-09-10", { note: "  DIEN   THOAI  " }),
  ]);
  assert.equal(groups.length, 1);
});

test("different descriptions never flag", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10", { note: "Cà phê" }),
    tx("b", "2026-09-10", { note: "Cà phê sáng" }),
  ]);
  assert.deepEqual(groups, []);
});

test("daily-identical cash does not flag when spacing is wide", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-01"),
    tx("b", "2026-09-06"),
    tx("c", "2026-09-11"),
    tx("d", "2026-09-16"),
    tx("e", "2026-09-21"),
  ]);
  assert.deepEqual(groups, []);
});

test("an established daily cadence suppresses near-day flags", () => {
  // "Cà phê 30k" every day is a habit: ≥4 occurrences at a ≤2-day median gap
  // means 1-day proximity is the norm, not an anomaly.
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-01"),
    tx("b", "2026-09-02"),
    tx("c", "2026-09-03"),
    tx("d", "2026-09-04"),
  ]);
  assert.deepEqual(groups, []);
});

test("a same-day double inside a habit still flags — tightly", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-01"),
    tx("b", "2026-09-02"),
    tx("c", "2026-09-03"),
    tx("d", "2026-09-03"),
    tx("e", "2026-09-04"),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0]!.rows.map((row) => row.id),
    ["c", "d"],
    "only the colliding rows surface, not the whole cadence",
  );
});

test("a tight pair inside a monthly-cadence bucket still flags", () => {
  // Median gap stays wide (≈monthly), so the {30,31} burst reads as a dupe.
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-07-01", { amount: 350_000, note: "Tiền điện" }),
    tx("b", "2026-08-01", { amount: 350_000, note: "Tiền điện" }),
    tx("c", "2026-09-01", { amount: 350_000, note: "Tiền điện" }),
    tx("d", "2026-09-02", { amount: 350_000, note: "Tiền điện" }),
    tx("e", "2026-10-01", { amount: 350_000, note: "Tiền điện" }),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0]!.rows.map((row) => row.id),
    ["c", "d"],
  );
});

test("recurring-payment and optimistic pending rows are excluded", () => {
  assert.deepEqual(
    findLedgerDuplicateGroups([
      tx("a", "2026-09-10", { isRecurringPayment: true }),
      tx("b", "2026-09-10", { isRecurringPayment: true }),
    ]),
    [],
  );
  assert.deepEqual(
    findLedgerDuplicateGroups([
      tx("pending:abc", "2026-09-10"),
      tx("a", "2026-09-10"),
    ]),
    [],
  );
});

test("empty notes flag on a same-day collision but not a near-day pair", () => {
  const sameDay = findLedgerDuplicateGroups([
    tx("a", "2026-09-10", { note: "" }),
    tx("b", "2026-09-10", { note: "   " }),
  ]);
  assert.equal(sameDay.length, 1);

  const nearDay = findLedgerDuplicateGroups([
    tx("a", "2026-09-10", { note: "" }),
    tx("b", "2026-09-11", { note: "" }),
  ]);
  assert.deepEqual(nearDay, []);
});

test("invalid rows are skipped without throwing", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-10"),
    tx("b", "not-a-date"),
    tx("c", "2026-09-10"),
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(
    groups[0]!.rows.map((row) => row.id),
    ["a", "c"],
  );
});

test("two separate clusters in one bucket produce two groups, newest first", () => {
  const groups = findLedgerDuplicateGroups([
    tx("a", "2026-09-01"),
    tx("b", "2026-09-01"),
    tx("c", "2026-09-20"),
    tx("d", "2026-09-20"),
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0]!.rows.map((row) => row.id), ["c", "d"]);
  assert.deepEqual(groups[1]!.rows.map((row) => row.id), ["a", "b"]);
  // Same bucket → same dismissal key for both clusters.
  assert.equal(groups[0]!.key, groups[1]!.key);
});
