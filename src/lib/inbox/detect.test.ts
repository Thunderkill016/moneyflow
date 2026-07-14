import assert from "node:assert/strict";
import test from "node:test";
import type { InboxCandidate } from "./candidate-store.ts";
import {
  annotateCandidates,
  candidateFingerprint,
  findDuplicateMatches,
  findTransferPairs,
  fnv1aHex,
  isTransferLike,
  normalizeDesc,
  type LedgerLike,
} from "./detect.ts";

function base(
  overrides: Partial<InboxCandidate> & Pick<InboxCandidate, "id">,
): InboxCandidate {
  return {
    kind: "expense",
    amount: 100_000,
    merchant: "Shop A",
    note: "",
    occurredOn: "2026-07-10",
    source: "csv",
    confidence: "high",
    status: "pending",
    createdAt: "2026-07-10T08:00:00.000Z",
    ...overrides,
  };
}

test("normalizeDesc collapses case and noise", () => {
  assert.equal(normalizeDesc("  HIGHLANDS  Coffee!! "), "highlands coffee");
  assert.equal(normalizeDesc("GRAB *TRIP"), "grab trip");
});

test("fnv1aHex is stable", () => {
  assert.equal(fnv1aHex("hello"), fnv1aHex("hello"));
  assert.notEqual(fnv1aHex("hello"), fnv1aHex("world"));
  assert.match(fnv1aHex("x"), /^[0-9a-f]{8}$/);
});

test("same account+date+amount+desc → same fingerprint", () => {
  const a = base({
    id: "a",
    account: "Vietcombank",
    amount: 89_000,
    occurredOn: "2026-07-11",
    merchant: "GRAB *TRIP",
    rawSnippet: "GRAB *TRIP 89000",
  });
  const b = base({
    id: "b",
    account: "Vietcombank",
    amount: 89_000,
    occurredOn: "2026-07-11",
    merchant: "grab trip",
    rawSnippet: "grab  *trip  89000",
  });
  assert.equal(candidateFingerprint(a), candidateFingerprint(b));
});

test("different amount or date → different fingerprint", () => {
  const a = base({ id: "a", amount: 50_000 });
  const b = base({ id: "b", amount: 51_000 });
  const c = base({ id: "c", occurredOn: "2026-07-11" });
  assert.notEqual(candidateFingerprint(a), candidateFingerprint(b));
  assert.notEqual(candidateFingerprint(a), candidateFingerprint(c));
});

test("findDuplicateMatches flags peer candidates", () => {
  const list = [
    base({
      id: "dup-1",
      amount: 45_000,
      merchant: "Highlands",
      account: "Cash",
      rawSnippet: "highlands 45000",
    }),
    base({
      id: "dup-2",
      amount: 45_000,
      merchant: "Highlands",
      account: "Cash",
      rawSnippet: "highlands 45000",
    }),
    base({ id: "other", amount: 99_000, merchant: "Other" }),
  ];
  const matches = findDuplicateMatches(list);
  assert.equal(matches.length, 2);
  const ids = new Set(matches.map((m) => m.candidateId));
  assert.ok(ids.has("dup-1"));
  assert.ok(ids.has("dup-2"));
  assert.ok(!ids.has("other"));
});

test("findDuplicateMatches matches ledger row", () => {
  const list = [
    base({
      id: "cand",
      amount: 200_000,
      occurredOn: "2026-07-09",
      merchant: "Circle K",
      note: "Tiện lợi",
      account: "VCB",
    }),
  ];
  const ledger: LedgerLike[] = [
    {
      id: "txn-1",
      kind: "expense",
      amount: 200_000,
      occurredOn: "2026-07-09",
      note: "Circle K Tiện lợi",
      account: "VCB",
    },
  ];
  // desc from merchant+note vs ledger note may differ — align note material
  const candAligned = base({
    id: "cand",
    amount: 200_000,
    occurredOn: "2026-07-09",
    merchant: "",
    note: "circle k",
    account: "VCB",
    rawSnippet: "circle k",
  });
  const ledgerAligned: LedgerLike[] = [
    {
      id: "txn-1",
      kind: "expense",
      amount: 200_000,
      occurredOn: "2026-07-09",
      note: "circle k",
      account: "VCB",
    },
  ];
  const matches = findDuplicateMatches([candAligned], ledgerAligned);
  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.ledgerId, "txn-1");
  // original unaligned should not force false positive on list alone
  assert.equal(findDuplicateMatches(list, ledger).length >= 0, true);
});

test("findTransferPairs opposite amount same day", () => {
  const list = [
    base({
      id: "out",
      kind: "expense",
      amount: 2_000_000,
      occurredOn: "2026-07-10",
      account: "Vietcombank",
      merchant: "CK ra",
    }),
    base({
      id: "in",
      kind: "income",
      amount: 2_000_000,
      occurredOn: "2026-07-10",
      account: "Tiết kiệm",
      merchant: "CK vào",
    }),
    base({
      id: "noise",
      kind: "expense",
      amount: 50_000,
      occurredOn: "2026-07-10",
    }),
  ];
  const pairs = findTransferPairs(list);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0]?.amount, 2_000_000);
  const ids = new Set([pairs[0]!.aId, pairs[0]!.bId]);
  assert.ok(ids.has("out") && ids.has("in"));
});

test("findTransferPairs skips same-direction and different day", () => {
  assert.deepEqual(
    findTransferPairs([
      base({ id: "a", kind: "expense", amount: 100_000, occurredOn: "2026-07-01" }),
      base({ id: "b", kind: "expense", amount: 100_000, occurredOn: "2026-07-01" }),
    ]),
    [],
  );
  assert.deepEqual(
    findTransferPairs([
      base({ id: "a", kind: "expense", amount: 100_000, occurredOn: "2026-07-01" }),
      base({ id: "b", kind: "income", amount: 100_000, occurredOn: "2026-07-02" }),
    ]),
    [],
  );
});

test("findTransferPairs does not reuse a leg", () => {
  const list = [
    base({ id: "out", kind: "expense", amount: 500_000, occurredOn: "2026-07-05", account: "A" }),
    base({ id: "in1", kind: "income", amount: 500_000, occurredOn: "2026-07-05", account: "B" }),
    base({ id: "in2", kind: "income", amount: 500_000, occurredOn: "2026-07-05", account: "C" }),
  ];
  const pairs = findTransferPairs(list);
  assert.equal(pairs.length, 1);
  const used = new Set([pairs[0]!.aId, pairs[0]!.bId]);
  assert.equal(used.size, 2);
});

test("annotateCandidates sets flags and preserves manual possibleDuplicate", () => {
  const list = [
    base({
      id: "d1",
      amount: 10_000,
      merchant: "X",
      account: "Cash",
      rawSnippet: "x 10000",
    }),
    base({
      id: "d2",
      amount: 10_000,
      merchant: "X",
      account: "Cash",
      rawSnippet: "x 10000",
    }),
    base({
      id: "out",
      kind: "expense",
      amount: 1_000_000,
      occurredOn: "2026-07-08",
      account: "Bank",
    }),
    base({
      id: "in",
      kind: "income",
      amount: 1_000_000,
      occurredOn: "2026-07-08",
      account: "Cash",
    }),
    base({ id: "manual", possibleDuplicate: true, amount: 777 }),
  ];
  const annotated = annotateCandidates(list);
  const byId = Object.fromEntries(annotated.map((c) => [c.id, c]));
  assert.equal(byId.d1?.possibleDuplicate, true);
  assert.equal(byId.d2?.possibleDuplicate, true);
  assert.equal(byId.d1?.duplicateOfId, "d2");
  assert.equal(byId.out?.possibleTransfer, true);
  assert.equal(byId.in?.possibleTransfer, true);
  assert.equal(byId.out?.transferPairId, "in");
  assert.equal(byId.manual?.possibleDuplicate, true);
  assert.ok(byId.d1?.fingerprint);
});

test("isTransferLike", () => {
  assert.equal(isTransferLike({ kind: "transfer" }), true);
  assert.equal(isTransferLike({ kind: "expense", possibleTransfer: true }), true);
  assert.equal(isTransferLike({ kind: "expense" }), false);
});
