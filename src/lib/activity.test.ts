import assert from "node:assert/strict";
import test from "node:test";
import {
  buildActivityItems,
  countActivityAttention,
  countIncomingActivity,
  filterActivityItems,
} from "./activity.ts";
import type { InboxCandidate } from "./inbox/candidate-store.ts";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
} from "./transactions/contracts.ts";

const accounts: AccountOption[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Vietcombank" },
  { id: "22222222-2222-4222-8222-222222222222", name: "Tiết kiệm" },
];

const categories: CategoryOption[] = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Ăn uống",
    kind: "expense",
    icon: null,
    color: null,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Lương",
    kind: "income",
    icon: null,
    color: null,
  },
];

function transaction(patch: Partial<Transaction> = {}): Transaction {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    kind: "expense",
    categoryId: categories[0]!.id,
    category: categories[0]!.name,
    note: "Bữa trưa",
    accountId: accounts[0]!.id,
    account: accounts[0]!.name,
    amount: 85_000,
    occurredOn: "2026-09-13",
    occurredAt: "2026-09-13T05:00:00.000Z",
    relativeDate: "Hôm nay",
    reviewStatus: "reviewed",
    ...patch,
  };
}

function candidate(patch: Partial<InboxCandidate> = {}): InboxCandidate {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    kind: "expense",
    amount: 45_000,
    merchant: "Highlands Coffee",
    note: "Cafe sáng",
    occurredOn: "2026-09-13",
    source: "csv",
    confidence: "high",
    status: "pending",
    categoryId: categories[0]!.id,
    category: categories[0]!.name,
    accountId: accounts[0]!.id,
    account: accounts[0]!.name,
    createdAt: "2026-09-13T06:00:00.000Z",
    ...patch,
  };
}

test("needs-review transaction is one Activity item, not a duplicate review row", () => {
  const items = buildActivityItems({
    transactions: [transaction({ reviewStatus: "needs_review" })],
    candidates: [],
    accounts,
    categories,
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.type, "ledger_transaction");
  assert.equal(items[0]?.attention, true);
  assert.equal(items[0]?.stateLabel, "Cần xem lại");
  assert.equal(items[0]?.key, "transaction:55555555-5555-4555-8555-555555555555");
});

test("pending candidate uses existing readiness and source evidence", () => {
  const items = buildActivityItems({
    transactions: [],
    candidates: [candidate()],
    accounts,
    categories,
  });

  assert.equal(items.length, 1);
  const item = items[0];
  assert.equal(item?.type, "inbox_candidate");
  if (!item || item.type !== "inbox_candidate") return;
  assert.equal(item.attention, false);
  assert.equal(item.readinessKnown, true);
  assert.equal(item.stateLabel, "Chờ vào sổ");
  assert.equal(item.sourceLabel, "CSV");
  assert.equal(item.provenanceLabel, null);
});

test("candidate attention reuses Inbox readiness reasons", () => {
  const items = buildActivityItems({
    transactions: [],
    candidates: [
      candidate({
        confidence: "low",
        categoryId: undefined,
        category: undefined,
      }),
    ],
    accounts,
    categories,
  });

  const item = items[0];
  assert.equal(item?.type, "inbox_candidate");
  if (!item || item.type !== "inbox_candidate") return;
  assert.equal(item.attention, true);
  assert.equal(item.stateLabel, "Cần xử lý");
  assert.ok(item.attentionLabels.includes("Độ tin thấp"));
  assert.ok(item.attentionLabels.includes("Danh mục chưa xác định"));
});

test("finance read failure does not turn missing lookup context into fake candidate attention", () => {
  const items = buildActivityItems({
    transactions: [],
    candidates: [
      candidate({
        accountId: undefined,
        account: undefined,
        categoryId: undefined,
        category: undefined,
      }),
    ],
    accounts: [],
    categories: [],
    candidateReadinessAvailable: false,
  });

  const item = items[0];
  assert.equal(item?.type, "inbox_candidate");
  if (!item || item.type !== "inbox_candidate") return;
  assert.equal(item.readinessKnown, false);
  assert.equal(item.attention, false);
  assert.equal(item.stateLabel, "Chờ vào sổ");
  assert.deepEqual(item.attentionLabels, []);
});

test("finance read failure excludes non-authoritative fallback ledger rows", () => {
  const items = buildActivityItems({
    transactions: [transaction()],
    candidates: [candidate()],
    accounts: [],
    categories: [],
    ledgerAvailable: false,
    candidateReadinessAvailable: false,
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.type, "inbox_candidate");
  assert.equal(filterActivityItems(items, "posted").length, 0);
  assert.equal(countIncomingActivity(items), 1);
});

test("approved and rejected candidates are not duplicated into the R1 Activity workstream", () => {
  const items = buildActivityItems({
    transactions: [transaction()],
    candidates: [
      candidate({ status: "approved" }),
      candidate({
        id: "77777777-7777-4777-8777-777777777777",
        status: "rejected",
      }),
    ],
    accounts,
    categories,
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.type, "ledger_transaction");
});

test("mixed workstream has deterministic chronological ordering", () => {
  const items = buildActivityItems({
    transactions: [
      transaction({ occurredAt: "2026-09-13T05:00:00.000Z" }),
      transaction({
        id: "88888888-8888-4888-8888-888888888888",
        occurredOn: "2026-09-12",
        occurredAt: "2026-09-12T23:00:00.000Z",
      }),
    ],
    candidates: [candidate({ createdAt: "2026-09-13T06:00:00.000Z" })],
    accounts,
    categories,
  });

  assert.deepEqual(
    items.map((item) => item.key),
    [
      "candidate:66666666-6666-4666-8666-666666666666",
      "transaction:55555555-5555-4555-8555-555555555555",
      "transaction:88888888-8888-4888-8888-888888888888",
    ],
  );
});

test("job filters combine candidate attention and posted review without duplicating items", () => {
  const items = buildActivityItems({
    transactions: [
      transaction({ reviewStatus: "needs_review" }),
      transaction({
        id: "99999999-9999-4999-8999-999999999999",
        reviewStatus: "reviewed",
      }),
    ],
    candidates: [
      candidate({ confidence: "low" }),
      candidate({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        merchant: "Circle K",
      }),
    ],
    accounts,
    categories,
  });

  const attention = filterActivityItems(items, "attention");
  assert.equal(attention.length, 2);
  assert.deepEqual(
    new Set(attention.map((item) => item.key)).size,
    attention.length,
  );
  assert.equal(filterActivityItems(items, "incoming").length, 2);
  assert.equal(filterActivityItems(items, "posted").length, 2);
  assert.equal(countActivityAttention(items), 2);
  assert.equal(countIncomingActivity(items), 2);
});

test("search only uses visible user-facing fields", () => {
  const items = buildActivityItems({
    transactions: [transaction()],
    candidates: [
      candidate({
        merchant: "GRAB *TRIP",
        rawSnippet: "secret-raw-value",
      }),
    ],
    accounts,
    categories,
  });

  assert.equal(filterActivityItems(items, "all", "grab").length, 1);
  assert.equal(filterActivityItems(items, "all", "vietcombank").length, 2);
  assert.equal(filterActivityItems(items, "all", "csv").length, 1);
  assert.equal(filterActivityItems(items, "all", "secret-raw-value").length, 0);
});

test("candidate provenance label stays bounded to known lifecycle evidence", () => {
  const items = buildActivityItems({
    transactions: [],
    candidates: [
      {
        ...candidate(),
        sourceLifecycleState: "removed",
        sourceExternalId: "do-not-render-this-id",
      },
    ],
    accounts,
    categories,
  });

  const item = items[0];
  assert.equal(item?.type, "inbox_candidate");
  if (!item || item.type !== "inbox_candidate") return;
  assert.equal(item.provenanceLabel, "Nguồn báo mục này đã được gỡ");
  assert.doesNotMatch(item.searchText, /do-not-render-this-id/u);
});

test("activity actions deep-link to the exact transaction or pending candidate", () => {
  const posted = transaction({ id: "tx-posted" });
  const needsReview = transaction({ id: "tx-review", reviewStatus: "needs_review" });
  const pending = candidate({ id: "cand-9" });
  const approved = candidate({ id: "cand-done", status: "approved" });

  const items = buildActivityItems({
    transactions: [posted, needsReview],
    candidates: [pending, approved],
    accounts,
    categories,
  });

  const postedItem = items.find(
    (item) => item.type === "ledger_transaction" && item.transaction.id === "tx-posted",
  );
  assert.equal(postedItem?.href, "/transactions?open=tx-posted");

  const reviewItem = items.find(
    (item) => item.type === "ledger_transaction" && item.transaction.id === "tx-review",
  );
  assert.equal(
    reviewItem?.href,
    "/transactions?review=needs_review&open=tx-review",
  );

  const candidateItem = items.find((item) => item.type === "inbox_candidate");
  assert.equal(candidateItem?.href, "/inbox?candidate=cand-9");

  // Approved candidates never appear in the workstream at all.
  assert.ok(
    !items.some(
      (item) =>
        item.type === "inbox_candidate" && item.candidate.id === "cand-done",
    ),
  );
});
