import assert from "node:assert/strict";
import test from "node:test";
import type { AccountOption, CategoryOption } from "../sample-data.ts";
import type { InboxCandidate } from "./candidate-store.ts";
import {
  applyBulkCategory,
  buildExplainLines,
  buildLedgerPost,
  draftFromCandidate,
  markCandidatesStatus,
  meetsBulkApproveThreshold,
  partitionBulkApprove,
  resolveAccountId,
  resolveCategoryId,
} from "./review.ts";

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

const expense: InboxCandidate = {
  id: "cand-1",
  kind: "expense",
  amount: 45_000,
  merchant: "Highlands Coffee",
  note: "Cafe",
  occurredOn: "2026-07-12",
  source: "paste",
  confidence: "low",
  status: "pending",
  category: "Ăn uống",
  account: "Tiền mặt",
  rawSnippet: "HIGHLANDS COFFEE Q1 45.000đ",
  createdAt: "2026-07-12T02:10:00.000Z",
};

const high: InboxCandidate = {
  ...expense,
  id: "cand-2",
  confidence: "high",
  merchant: "Grab",
  amount: 89_000,
  rawSnippet: "GRAB 89k",
};

test("meetsBulkApproveThreshold never auto-includes low without opt-in", () => {
  assert.equal(meetsBulkApproveThreshold("high", false), true);
  assert.equal(meetsBulkApproveThreshold("medium", false), true);
  assert.equal(meetsBulkApproveThreshold("low", false), false);
  assert.equal(meetsBulkApproveThreshold("low", true), true);
});

test("partitionBulkApprove separates low-confidence when not included", () => {
  const { eligible, skippedLow } = partitionBulkApprove(
    [expense, high],
    ["cand-1", "cand-2"],
    false,
  );
  assert.deepEqual(
    eligible.map((item) => item.id),
    ["cand-2"],
  );
  assert.deepEqual(
    skippedLow.map((item) => item.id),
    ["cand-1"],
  );

  const withLow = partitionBulkApprove([expense, high], ["cand-1", "cand-2"], true);
  assert.equal(withLow.eligible.length, 2);
  assert.equal(withLow.skippedLow.length, 0);
});

test("buildExplainLines covers parser, rule, source, raw", () => {
  const lines = buildExplainLines(expense);
  const kinds = new Set(lines.map((line) => line.kind));
  assert.ok(kinds.has("parser"));
  assert.ok(kinds.has("rule"));
  assert.ok(kinds.has("source"));
  assert.ok(kinds.has("raw"));
  assert.ok(lines.some((line) => line.text.includes("paste_text")));
  assert.ok(lines.some((line) => line.kind === "raw" && line.text.includes("HIGHLANDS")));
  assert.ok(lines.some((line) => /45\.000/.test(line.text)));
});

test("resolve account and category by name", () => {
  assert.equal(resolveAccountId(expense, accounts), "acc-cash");
  assert.equal(resolveCategoryId(expense, categories, "expense"), "cat-food");
  assert.equal(
    resolveCategoryId({ category: "Lương" }, categories, "income"),
    "cat-salary",
  );
});

test("buildLedgerPost creates money input with integer amount", () => {
  const draft = draftFromCandidate(expense, accounts, categories);
  const result = buildLedgerPost(draft, accounts, categories, "idem-1");
  assert.equal(result.ok, true);
  if (!result.ok || result.mode !== "money") {
    assert.fail("expected money post");
  }
  assert.equal(result.input.amount, 45_000);
  assert.equal(result.input.kind, "expense");
  assert.equal(result.input.accountId, "acc-cash");
  assert.equal(result.input.categoryId, "cat-food");
  assert.equal(Number.isSafeInteger(result.input.amount), true);
});

test("buildLedgerPost transfer needs two accounts", () => {
  const draft = draftFromCandidate(
    { ...expense, kind: "transfer", category: undefined },
    accounts,
    categories,
  );
  draft.accountId = "acc-cash";
  draft.destinationAccountId = "acc-bank";
  const ok = buildLedgerPost(draft, accounts, categories, "idem-t");
  assert.equal(ok.ok, true);
  if (!ok.ok || ok.mode !== "transfer") assert.fail("expected transfer");
  assert.equal(ok.input.sourceAccountId, "acc-cash");
  assert.equal(ok.input.destinationAccountId, "acc-bank");

  draft.destinationAccountId = "acc-cash";
  const bad = buildLedgerPost(draft, accounts, categories, "idem-t2");
  assert.equal(bad.ok, false);
});

test("applyBulkCategory and markCandidatesStatus", () => {
  const withCat = applyBulkCategory([expense, high], ["cand-1"], {
    id: "cat-food",
    name: "Ăn uống",
    kind: "expense",
    icon: null,
    color: null,
  });
  assert.equal(withCat[0]?.categoryId, "cat-food");

  const rejected = markCandidatesStatus([expense, high], ["cand-1"], "rejected");
  assert.equal(rejected[0]?.status, "rejected");
  assert.equal(rejected[1]?.status, "pending");
});
