import assert from "node:assert/strict";
import test from "node:test";
import type { AccountOption, CategoryOption } from "../sample-data.ts";
import type { InboxCandidate } from "./candidate-store.ts";
import {
  classifyCandidateReadiness,
  partitionPendingCandidates,
} from "./readiness.ts";

const accounts: AccountOption[] = [
  { id: "acc-cash", name: "Tiền mặt" },
  { id: "acc-bank", name: "Vietcombank" },
];

const categories: CategoryOption[] = [
  {
    id: "cat-food",
    name: "Ăn uống",
    kind: "expense",
    icon: null,
    color: null,
  },
  {
    id: "cat-salary",
    name: "Lương",
    kind: "income",
    icon: null,
    color: null,
  },
];

const readyExpense: InboxCandidate = {
  id: "cand-ready",
  kind: "expense",
  amount: 45_000,
  merchant: "Highlands Coffee",
  note: "Cafe",
  occurredOn: "2026-08-28",
  source: "csv",
  confidence: "high",
  status: "pending",
  accountId: "acc-bank",
  account: "Vietcombank",
  categoryId: "cat-food",
  category: "Ăn uống",
  createdAt: "2026-08-28T02:10:00.000Z",
};

function reasonsFor(patch: Partial<InboxCandidate>) {
  const result = classifyCandidateReadiness(
    { ...readyExpense, ...patch },
    accounts,
    categories,
  );
  assert.equal(result.state, "needs_attention");
  return result.reasons;
}

test("well-formed high/medium money candidates are ready", () => {
  assert.deepEqual(
    classifyCandidateReadiness(readyExpense, accounts, categories),
    { state: "ready", reasons: [] },
  );
  assert.equal(
    classifyCandidateReadiness(
      { ...readyExpense, id: "cand-medium", confidence: "medium" },
      accounts,
      categories,
    ).state,
    "ready",
  );
});

test("readiness blocks low confidence, duplicate and transfer states", () => {
  assert.ok(reasonsFor({ confidence: "low" }).includes("low_confidence"));
  assert.ok(reasonsFor({ possibleDuplicate: true }).includes("possible_duplicate"));
  assert.ok(reasonsFor({ possibleTransfer: true }).includes("possible_transfer"));
  assert.ok(reasonsFor({ kind: "transfer" }).includes("transfer_kind"));
});

test("readiness enforces existing amount/date posting constraints", () => {
  assert.ok(reasonsFor({ amount: 0 }).includes("invalid_amount"));
  assert.ok(reasonsFor({ amount: Number.MAX_SAFE_INTEGER + 1 }).includes("invalid_amount"));
  assert.ok(reasonsFor({ occurredOn: "28/08/2026" }).includes("invalid_date"));
});

test("readiness never uses first account/category fallback", () => {
  const noAccount = { ...readyExpense, accountId: undefined, account: undefined };
  assert.ok(
    reasonsFor(noAccount).includes("account_missing_or_unresolved"),
  );

  const unknownAccount = {
    ...readyExpense,
    accountId: "missing-account",
    account: "Vietcombank",
  };
  assert.ok(
    reasonsFor(unknownAccount).includes("account_missing_or_unresolved"),
  );

  const noCategory = { ...readyExpense, categoryId: undefined, category: undefined };
  assert.ok(
    reasonsFor(noCategory).includes("category_missing_or_unresolved"),
  );

  const unknownCategory = {
    ...readyExpense,
    categoryId: "missing-category",
    category: "Ăn uống",
  };
  assert.ok(
    reasonsFor(unknownCategory).includes("category_missing_or_unresolved"),
  );
});

test("explicit names can resolve exactly but category kind must match", () => {
  const byName: InboxCandidate = {
    ...readyExpense,
    id: "cand-by-name",
    accountId: undefined,
    categoryId: undefined,
  };
  assert.equal(
    classifyCandidateReadiness(byName, accounts, categories).state,
    "ready",
  );

  assert.ok(
    reasonsFor({ categoryId: "cat-salary", category: "Lương" }).includes(
      "category_kind_mismatch",
    ),
  );
});

test("partition contains only pending candidates and preserves attention reasons", () => {
  const low = { ...readyExpense, id: "cand-low", confidence: "low" as const };
  const duplicate = {
    ...readyExpense,
    id: "cand-duplicate",
    possibleDuplicate: true,
  };
  const approved = {
    ...readyExpense,
    id: "cand-approved",
    status: "approved" as const,
  };

  const partition = partitionPendingCandidates(
    [readyExpense, low, duplicate, approved],
    accounts,
    categories,
  );

  assert.deepEqual(partition.ready.map((item) => item.id), ["cand-ready"]);
  assert.deepEqual(
    partition.needsAttention.map((item) => item.candidate.id),
    ["cand-low", "cand-duplicate"],
  );
  assert.ok(partition.needsAttention[0]!.reasons.includes("low_confidence"));
  assert.ok(
    partition.needsAttention[1]!.reasons.includes("possible_duplicate"),
  );
});
