import assert from "node:assert/strict";
import test from "node:test";
import type { RecurringCommitment } from "./commitments.ts";
import {
  buildCommitmentSuggestions,
  commitmentSuggestionEditBlocked,
  commitmentSuggestionId,
  parseCommitmentSuggestionId,
} from "./commitment-suggestions.ts";
import { draftFromCandidate } from "../inbox/review.ts";
import type { AccountOption, CategoryOption } from "../transactions/contracts.ts";

const MONTH = "2026-09-01";

function commitment(
  overrides: Partial<RecurringCommitment> & Pick<RecurringCommitment, "id">,
): RecurringCommitment {
  return {
    name: "Tiền điện",
    amount: 650_000,
    dueDay: 25,
    dueDate: "2026-09-25",
    accountId: "acc-1",
    accountName: "MB Bank",
    categoryId: "cat-1",
    categoryName: "Hóa đơn",
    categoryIcon: "receipt",
    categoryColor: "cyan",
    isArchived: false,
    isPaid: false,
    transactionId: null,
    ...overrides,
  };
}

const accounts: AccountOption[] = [
  { id: "acc-1", name: "MB Bank", currencyCode: "VND" },
];
const categories: CategoryOption[] = [
  { id: "cat-1", name: "Hóa đơn", kind: "expense", icon: null, color: null },
];

test("suggestion id round-trips and rejects foreign ids", () => {
  const id = commitmentSuggestionId("abc-123", MONTH);
  assert.equal(id, "commitment:abc-123:2026-09-01");
  assert.deepEqual(parseCommitmentSuggestionId(id), {
    commitmentId: "abc-123",
    monthStart: MONTH,
  });
  // UUID-shaped commitment ids still split on the last colon only.
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  assert.deepEqual(
    parseCommitmentSuggestionId(commitmentSuggestionId(uuid, MONTH)),
    { commitmentId: uuid, monthStart: MONTH },
  );
  assert.equal(parseCommitmentSuggestionId("cand-demo-1"), null);
  assert.equal(parseCommitmentSuggestionId("commitment:only"), null);
  assert.equal(parseCommitmentSuggestionId("commitment:x:2026-09-15"), null);
});

test("only unpaid, active, due commitments become suggestions", () => {
  const list = [
    commitment({ id: "due" }),
    commitment({ id: "paid", isPaid: true, transactionId: "tx-1" }),
    commitment({ id: "archived", isArchived: true }),
    commitment({ id: "future", dueDate: "2026-09-30" }),
    commitment({ id: "overdue", dueDate: "2026-09-01" }),
  ];
  const suggestions = buildCommitmentSuggestions(list, MONTH, "2026-09-26");
  const ids = suggestions.map((item) => item.id);
  assert.deepEqual(
    ids,
    [
      commitmentSuggestionId("overdue", MONTH),
      commitmentSuggestionId("due", MONTH),
    ],
  );
});

test("suggestions carry declared values and pending review shape", () => {
  const [suggestion] = buildCommitmentSuggestions(
    [commitment({ id: "c1" })],
    MONTH,
    "2026-09-26",
  );
  assert.ok(suggestion);
  assert.equal(suggestion.kind, "expense");
  assert.equal(suggestion.amount, 650_000);
  assert.equal(suggestion.merchant, "Tiền điện");
  assert.equal(suggestion.source, "commitment");
  assert.equal(suggestion.confidence, "high");
  assert.equal(suggestion.status, "pending");
  assert.equal(suggestion.accountId, "acc-1");
  assert.equal(suggestion.categoryId, "cat-1");
  // The shown date is pay-now (today); the schedule date stays in the note.
  assert.equal(suggestion.occurredOn, "2026-09-26");
  assert.match(suggestion.note, /đến hạn 2026-09-25/);
});

test("ordering is deterministic by due date then id", () => {
  const a = commitment({ id: "b", dueDate: "2026-09-05" });
  const b = commitment({ id: "a", dueDate: "2026-09-05" });
  const c = commitment({ id: "c", dueDate: "2026-09-03" });
  const first = buildCommitmentSuggestions([a, b, c], MONTH, "2026-09-10");
  const second = buildCommitmentSuggestions([c, b, a], MONTH, "2026-09-10");
  assert.deepEqual(
    first.map((item) => item.id),
    second.map((item) => item.id),
  );
  assert.deepEqual(
    first.map((item) => item.id),
    [
      commitmentSuggestionId("c", MONTH),
      commitmentSuggestionId("a", MONTH),
      commitmentSuggestionId("b", MONTH),
    ],
  );
});

test("edit guard allows changing only the paid-on date", () => {
  const [suggestion] = buildCommitmentSuggestions(
    [commitment({ id: "c1" })],
    MONTH,
    "2026-09-26",
  );
  assert.ok(suggestion);
  const draft = draftFromCandidate(suggestion, accounts, categories);
  assert.equal(
    commitmentSuggestionEditBlocked(suggestion, draft, accounts, categories),
    false,
  );
  assert.equal(
    commitmentSuggestionEditBlocked(
      suggestion,
      { ...draft, occurredOn: "2026-09-24" },
      accounts,
      categories,
    ),
    false,
  );
  assert.equal(
    commitmentSuggestionEditBlocked(
      suggestion,
      { ...draft, amount: 1 },
      accounts,
      categories,
    ),
    true,
  );
  assert.equal(
    commitmentSuggestionEditBlocked(
      suggestion,
      { ...draft, kind: "transfer" },
      accounts,
      categories,
    ),
    true,
  );
});
