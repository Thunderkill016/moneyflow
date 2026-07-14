import assert from "node:assert/strict";
import test from "node:test";
import {
  countPending,
  createCandidate,
  filterCandidates,
  isCandidate,
  removeCandidateFromList,
  sampleCandidates,
  sortCandidatesNewest,
  updateCandidateInList,
  upsertCandidate,
  type InboxCandidate,
} from "./candidate-store.ts";

const valid: InboxCandidate = {
  id: "cand-1",
  kind: "expense",
  amount: 45_000,
  merchant: "Highlands Coffee",
  note: "Cafe",
  occurredOn: "2026-07-12",
  source: "paste",
  confidence: "low",
  status: "pending",
  createdAt: "2026-07-12T02:10:00.000Z",
};

test("accepts a complete integer-money candidate", () => {
  assert.equal(isCandidate(valid), true);
  assert.equal(isCandidate({ ...valid, possibleDuplicate: true }), true);
  assert.equal(isCandidate({ ...valid, confidence: "high" }), true);
});

test("rejects unsafe or incomplete candidate data", () => {
  assert.equal(isCandidate({ ...valid, amount: 12.5 }), false);
  assert.equal(isCandidate({ ...valid, amount: 0 }), false);
  assert.equal(isCandidate({ ...valid, amount: -1000 }), false);
  assert.equal(isCandidate({ ...valid, merchant: undefined }), false);
  assert.equal(isCandidate({ ...valid, occurredOn: "12/07/2026" }), false);
  assert.equal(isCandidate({ ...valid, source: "bank" }), false);
  assert.equal(isCandidate({ ...valid, confidence: "sure" }), false);
  assert.equal(isCandidate({ ...valid, kind: "refund" }), false);
});

test("createCandidate enforces positive integer amount", () => {
  const created = createCandidate({
    kind: "expense",
    amount: 89_000,
    merchant: "Grab",
    occurredOn: "2026-07-11",
    source: "csv",
    confidence: "high",
  });
  assert.equal(created.amount, 89_000);
  assert.equal(created.status, "pending");
  assert.equal(created.merchant, "Grab");
  assert.throws(() =>
    createCandidate({
      kind: "expense",
      amount: 45.5,
      merchant: "X",
      occurredOn: "2026-07-11",
      source: "paste",
      confidence: "low",
    }),
  );
});

test("CRUD helpers upsert update remove", () => {
  let list: InboxCandidate[] = [];
  list = upsertCandidate(list, valid);
  assert.equal(list.length, 1);
  list = upsertCandidate(list, { ...valid, merchant: "Updated" });
  assert.equal(list.length, 1);
  assert.equal(list[0]?.merchant, "Updated");
  list = updateCandidateInList(list, { id: valid.id, confidence: "high" });
  assert.equal(list[0]?.confidence, "high");
  list = removeCandidateFromList(list, valid.id);
  assert.equal(list.length, 0);
});

test("filter and count pending", () => {
  const list = sampleCandidates;
  assert.ok(countPending(list) >= 1);
  const needsReview = filterCandidates(list, "needs_review");
  assert.ok(needsReview.every((item) => item.confidence === "low" && item.status === "pending"));
  const transfers = filterCandidates(
    [
      ...list,
      {
        ...valid,
        id: "t1",
        kind: "transfer",
        status: "pending",
      },
      {
        ...valid,
        id: "t2",
        kind: "expense",
        possibleTransfer: true,
        status: "pending",
      },
    ],
    "transfer",
  );
  assert.ok(
    transfers.every((item) => item.kind === "transfer" || item.possibleTransfer === true),
  );
  assert.ok(transfers.some((item) => item.id === "t1"));
  assert.ok(transfers.some((item) => item.id === "t2"));
  const duplicates = filterCandidates(
    [{ ...valid, id: "d1", possibleDuplicate: true, status: "pending" }],
    "duplicate",
  );
  assert.ok(duplicates.every((item) => item.possibleDuplicate === true));
});

test("sortCandidatesNewest orders by date then createdAt", () => {
  const sorted = sortCandidatesNewest([
    { ...valid, id: "a", occurredOn: "2026-07-10", createdAt: "2026-07-10T10:00:00.000Z" },
    { ...valid, id: "b", occurredOn: "2026-07-12", createdAt: "2026-07-12T01:00:00.000Z" },
    { ...valid, id: "c", occurredOn: "2026-07-12", createdAt: "2026-07-12T05:00:00.000Z" },
  ]);
  assert.deepEqual(
    sorted.map((item) => item.id),
    ["c", "b", "a"],
  );
});
