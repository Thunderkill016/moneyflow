import assert from "node:assert/strict";
import test from "node:test";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
  TransactionKind,
} from "./transactions/contracts.ts";
import {
  deriveFrequentLedgerPatterns,
  derivePayeeCategorySuggestion,
  deriveStableLedgerPreset,
} from "./quick-add-defaults.ts";

const accounts: AccountOption[] = [
  { id: "cash", name: "Tiền mặt" },
  { id: "bank", name: "Ngân hàng" },
  { id: "card", name: "Thẻ" },
];

const categories: CategoryOption[] = [
  { id: "food", name: "Ăn uống", kind: "expense", icon: null, color: null },
  { id: "travel", name: "Đi lại", kind: "expense", icon: null, color: null },
  { id: "salary", name: "Lương", kind: "income", icon: null, color: null },
];

function transaction({
  id,
  kind = "expense",
  accountId = "cash",
  categoryId = "food",
  occurredAt,
  occurredOn = occurredAt.slice(0, 10),
  reviewStatus = "reviewed",
  splits,
  payee,
}: {
  id: string;
  kind?: Transaction["kind"];
  accountId?: string;
  categoryId?: string;
  occurredAt: string;
  occurredOn?: string;
  reviewStatus?: Transaction["reviewStatus"];
  splits?: Transaction["splits"];
  payee?: string;
}): Transaction {
  return {
    id,
    kind,
    categoryId,
    category: categoryId,
    note: id,
    payee,
    accountId,
    account: accountId,
    amount: 100_000,
    occurredOn,
    occurredAt,
    relativeDate: "",
    reviewStatus,
    splits,
  };
}

function derive(
  transactions: Transaction[],
  kind: TransactionKind = "expense",
  accountOptions = accounts,
  categoryOptions = categories,
) {
  return deriveStableLedgerPreset({
    transactions,
    kind,
    accounts: accountOptions,
    categories: categoryOptions,
  });
}

test("requires a 2-of-3 exact account/category majority", () => {
  const result = derive([
    transaction({
      id: "new-outlier",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
    transaction({
      id: "stable-2",
      accountId: "bank",
      categoryId: "food",
      occurredAt: "2026-09-13T09:00:00.000Z",
    }),
    transaction({
      id: "stable-1",
      accountId: "bank",
      categoryId: "food",
      occurredAt: "2026-09-12T09:00:00.000Z",
    }),
  ]);

  assert.deepEqual(result, {
    kind: "expense",
    accountId: "bank",
    categoryId: "food",
  });
});

test("does not guess from fewer than three eligible rows or a 1/1/1 split", () => {
  assert.equal(
    derive([
      transaction({ id: "a", occurredAt: "2026-09-14T09:00:00.000Z" }),
      transaction({ id: "b", occurredAt: "2026-09-13T09:00:00.000Z" }),
    ]),
    null,
  );

  assert.equal(
    derive([
      transaction({
        id: "a",
        accountId: "cash",
        categoryId: "food",
        occurredAt: "2026-09-14T09:00:00.000Z",
      }),
      transaction({
        id: "b",
        accountId: "bank",
        categoryId: "food",
        occurredAt: "2026-09-13T09:00:00.000Z",
      }),
      transaction({
        id: "c",
        accountId: "card",
        categoryId: "travel",
        occurredAt: "2026-09-12T09:00:00.000Z",
      }),
    ]),
    null,
  );
});

test("follows canonical ledger date ordering before creation time", () => {
  const result = derive([
    transaction({
      id: "backdated-created-latest-1",
      accountId: "bank",
      categoryId: "food",
      occurredOn: "2026-09-01",
      occurredAt: "2026-09-20T09:00:00.000Z",
    }),
    transaction({
      id: "today-card-1",
      accountId: "card",
      categoryId: "travel",
      occurredOn: "2026-09-14",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
    transaction({
      id: "backdated-created-latest-2",
      accountId: "bank",
      categoryId: "food",
      occurredOn: "2026-08-31",
      occurredAt: "2026-09-21T09:00:00.000Z",
    }),
    transaction({
      id: "yesterday-card-2",
      accountId: "card",
      categoryId: "travel",
      occurredOn: "2026-09-13",
      occurredAt: "2026-09-13T09:00:00.000Z",
    }),
    transaction({
      id: "recent-bank-outlier",
      accountId: "bank",
      categoryId: "food",
      occurredOn: "2026-09-12",
      occurredAt: "2026-09-12T09:00:00.000Z",
    }),
  ]);

  assert.deepEqual(result, {
    kind: "expense",
    accountId: "card",
    categoryId: "travel",
  });
});

test("uses creation time and id only as deterministic tie-breakers within a date", () => {
  const result = derive([
    transaction({
      id: "same-day-old",
      accountId: "bank",
      categoryId: "food",
      occurredOn: "2026-09-14",
      occurredAt: "2026-09-14T07:00:00.000Z",
    }),
    transaction({
      id: "same-day-new-1",
      accountId: "card",
      categoryId: "travel",
      occurredOn: "2026-09-14",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
    transaction({
      id: "previous-day-card",
      accountId: "card",
      categoryId: "travel",
      occurredOn: "2026-09-13",
      occurredAt: "2026-09-15T12:00:00.000Z",
    }),
    transaction({
      id: "same-day-new-2",
      accountId: "card",
      categoryId: "travel",
      occurredOn: "2026-09-14",
      occurredAt: "2026-09-14T08:00:00.000Z",
    }),
  ]);

  assert.deepEqual(result, {
    kind: "expense",
    accountId: "card",
    categoryId: "travel",
  });
});

test("ignores transfers, opposite-kind, split and non-reviewed rows", () => {
  const ignoredNewest = [
    transaction({
      id: "transfer",
      kind: "transfer",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-18T09:00:00.000Z",
    }),
    transaction({
      id: "income",
      kind: "income",
      accountId: "card",
      categoryId: "salary",
      occurredAt: "2026-09-17T09:00:00.000Z",
    }),
    transaction({
      id: "split",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-16T09:00:00.000Z",
      splits: [
        { categoryId: "travel", category: "Đi lại", amount: 50_000 },
        { categoryId: "food", category: "Ăn uống", amount: 50_000 },
      ],
    }),
    transaction({
      id: "uncertain",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-15T09:00:00.000Z",
      reviewStatus: "needs_review",
    }),
  ];
  const trusted = [
    transaction({
      id: "stable-1",
      accountId: "bank",
      categoryId: "food",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
    transaction({
      id: "stable-2",
      accountId: "bank",
      categoryId: "food",
      occurredAt: "2026-09-13T09:00:00.000Z",
    }),
    transaction({
      id: "outlier",
      accountId: "cash",
      categoryId: "travel",
      occurredAt: "2026-09-12T09:00:00.000Z",
    }),
  ];

  assert.deepEqual(derive([...ignoredNewest, ...trusted]), {
    kind: "expense",
    accountId: "bank",
    categoryId: "food",
  });
});

test("ignores rows whose current account or category reference is invalid", () => {
  const result = derive([
    transaction({
      id: "deleted-account-1",
      accountId: "gone",
      categoryId: "food",
      occurredAt: "2026-09-16T09:00:00.000Z",
    }),
    transaction({
      id: "deleted-account-2",
      accountId: "gone",
      categoryId: "food",
      occurredAt: "2026-09-15T09:00:00.000Z",
    }),
    transaction({
      id: "wrong-kind-category",
      accountId: "bank",
      categoryId: "salary",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
    transaction({
      id: "stable-1",
      accountId: "cash",
      categoryId: "food",
      occurredAt: "2026-09-13T09:00:00.000Z",
    }),
    transaction({
      id: "stable-2",
      accountId: "cash",
      categoryId: "food",
      occurredAt: "2026-09-12T09:00:00.000Z",
    }),
    transaction({
      id: "outlier",
      accountId: "bank",
      categoryId: "travel",
      occurredAt: "2026-09-11T09:00:00.000Z",
    }),
  ]);

  assert.deepEqual(result, {
    kind: "expense",
    accountId: "cash",
    categoryId: "food",
  });
});

test("requires explicit reviewed metadata instead of assuming legacy rows are trusted", () => {
  const rows = [
    transaction({ id: "a", occurredAt: "2026-09-14T09:00:00.000Z" }),
    transaction({ id: "b", occurredAt: "2026-09-13T09:00:00.000Z" }),
    transaction({
      id: "c",
      accountId: "bank",
      categoryId: "travel",
      occurredAt: "2026-09-12T09:00:00.000Z",
    }),
  ].map(({ reviewStatus: _reviewStatus, ...row }) => row as Transaction);

  assert.equal(derive(rows), null);
});

test("ranks up to two repeated exact capture patterns by frequency then recency", () => {
  const rows = [
    transaction({
      id: "cash-food-new",
      accountId: "cash",
      categoryId: "food",
      occurredAt: "2026-09-20T09:00:00.000Z",
    }),
    transaction({
      id: "salary-new",
      kind: "income",
      accountId: "bank",
      categoryId: "salary",
      occurredAt: "2026-09-19T09:00:00.000Z",
    }),
    transaction({
      id: "bank-travel-new",
      accountId: "bank",
      categoryId: "travel",
      occurredAt: "2026-09-18T09:00:00.000Z",
    }),
    transaction({
      id: "cash-food-old",
      accountId: "cash",
      categoryId: "food",
      occurredAt: "2026-09-17T09:00:00.000Z",
    }),
    transaction({
      id: "salary-old",
      kind: "income",
      accountId: "bank",
      categoryId: "salary",
      occurredAt: "2026-09-16T09:00:00.000Z",
    }),
    transaction({
      id: "bank-travel-middle",
      accountId: "bank",
      categoryId: "travel",
      occurredAt: "2026-09-15T09:00:00.000Z",
    }),
    transaction({
      id: "bank-travel-old",
      accountId: "bank",
      categoryId: "travel",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    deriveFrequentLedgerPatterns({ transactions: rows, accounts, categories }),
    [
      {
        kind: "expense",
        accountId: "bank",
        categoryId: "travel",
        count: 3,
      },
      {
        kind: "expense",
        accountId: "cash",
        categoryId: "food",
        count: 2,
      },
    ],
  );
});

test("frequent patterns reject unsupported, uncertain and invalid references", () => {
  const rows = [
    transaction({ id: "supported-1", occurredAt: "2026-09-20T09:00:00.000Z" }),
    transaction({ id: "supported-2", occurredAt: "2026-09-19T09:00:00.000Z" }),
    transaction({
      id: "uncertain-1",
      accountId: "bank",
      categoryId: "travel",
      occurredAt: "2026-09-18T09:00:00.000Z",
      reviewStatus: "needs_review",
    }),
    transaction({
      id: "uncertain-2",
      accountId: "bank",
      categoryId: "travel",
      occurredAt: "2026-09-17T09:00:00.000Z",
      reviewStatus: "needs_review",
    }),
    transaction({
      id: "split-1",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-16T09:00:00.000Z",
      splits: [
        { categoryId: "travel", category: "Đi lại", amount: 50_000 },
        { categoryId: "food", category: "Ăn uống", amount: 50_000 },
      ],
    }),
    transaction({
      id: "split-2",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-15T09:00:00.000Z",
      splits: [
        { categoryId: "travel", category: "Đi lại", amount: 50_000 },
        { categoryId: "food", category: "Ăn uống", amount: 50_000 },
      ],
    }),
    transaction({
      id: "gone-1",
      accountId: "gone",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
    transaction({
      id: "gone-2",
      accountId: "gone",
      occurredAt: "2026-09-13T09:00:00.000Z",
    }),
    transaction({
      id: "single",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-12T09:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    deriveFrequentLedgerPatterns({ transactions: rows, accounts, categories }),
    [
      {
        kind: "expense",
        accountId: "cash",
        categoryId: "food",
        count: 2,
      },
    ],
  );
});

test("frequent patterns use only the twelve most recent eligible rows", () => {
  const rows = Array.from({ length: 12 }, (_, index) =>
    transaction({
      id: `recent-${index}`,
      accountId: index === 0 ? "cash" : "bank",
      categoryId: index === 0 ? "food" : "travel",
      occurredAt: `2026-09-${String(20 - index).padStart(2, "0")}T09:00:00.000Z`,
    }),
  );
  rows.push(
    transaction({
      id: "old-cash-food",
      accountId: "cash",
      categoryId: "food",
      occurredAt: "2026-09-01T09:00:00.000Z",
    }),
  );

  assert.deepEqual(
    deriveFrequentLedgerPatterns({ transactions: rows, accounts, categories }),
    [
      {
        kind: "expense",
        accountId: "bank",
        categoryId: "travel",
        count: 11,
      },
    ],
  );
});

/*
 * Payee → category suggestion. An offer, never a default: the deriver returns
 * the category the MOST RECENT reviewed row carried for that exact (folded)
 * payee, and the dialog applies it only through an explicit chip tap.
 */
function suggest(
  transactions: Transaction[],
  payee: string,
  kind: TransactionKind = "expense",
  accountOptions = accounts,
  categoryOptions = categories,
) {
  return derivePayeeCategorySuggestion({
    transactions,
    payee,
    kind,
    accounts: accountOptions,
    categories: categoryOptions,
  });
}

test("a typed payee suggests the category of its most recent reviewed row", () => {
  const rows = [
    transaction({
      id: "older-food",
      categoryId: "food",
      occurredAt: "2026-09-10T09:00:00.000Z",
      payee: "Grab",
    }),
    transaction({
      id: "newer-travel",
      categoryId: "travel",
      occurredAt: "2026-09-12T09:00:00.000Z",
      payee: "Grab",
    }),
  ];

  // Recency is the honest tie-break: how the user files the payee TODAY, not
  // a frequency vote that would resurrect a category they moved away from.
  assert.deepEqual(suggest(rows, "Grab"), {
    categoryId: "travel",
    categoryName: "Đi lại",
    matchedPayee: "Grab",
  });
});

test("payee matching folds diacritics and case but requires the whole name", () => {
  const rows = [
    transaction({
      id: "phuc-long",
      categoryId: "food",
      occurredAt: "2026-09-12T09:00:00.000Z",
      payee: "Phúc Long",
    }),
  ];

  // Typed without Telex marks or case — the same fold search uses.
  assert.equal(suggest(rows, "phuc long")?.categoryId, "food");
  assert.equal(suggest(rows, "  PHUC LONG  ")?.categoryId, "food");

  // A partial name is not a match: "phuc" must not pre-empt the choice.
  assert.equal(suggest(rows, "phuc"), null);
  assert.equal(suggest(rows, "phuc long cafe"), null);
  assert.equal(suggest(rows, "Circle K"), null);
  assert.equal(suggest(rows, "   "), null);
  assert.equal(suggest(rows, ""), null);
});

test("unreviewed, split and stale-reference payee rows cannot suggest", () => {
  const rows = [
    // Newest matching row is unreviewed — it cannot teach anything.
    transaction({
      id: "unreviewed-newest",
      categoryId: "travel",
      occurredAt: "2026-09-14T09:00:00.000Z",
      payee: "Grab",
      reviewStatus: "needs_review",
    }),
    // A split expense names several categories; it cannot nominate one.
    transaction({
      id: "split-row",
      categoryId: "travel",
      occurredAt: "2026-09-13T09:00:00.000Z",
      payee: "Grab",
      splits: [
        { categoryId: "travel", category: "Đi lại", amount: 50_000 },
        { categoryId: "food", category: "Ăn uống", amount: 50_000 },
      ],
    }),
    // The category it points at no longer exists.
    transaction({
      id: "stale-category",
      categoryId: "gone",
      occurredAt: "2026-09-12T09:00:00.000Z",
      payee: "Grab",
    }),
    transaction({
      id: "reviewed-oldest",
      categoryId: "food",
      occurredAt: "2026-09-10T09:00:00.000Z",
      payee: "Grab",
    }),
  ];

  assert.deepEqual(suggest(rows, "Grab"), {
    categoryId: "food",
    categoryName: "Ăn uống",
    matchedPayee: "Grab",
  });
});

test("the suggestion is scoped to the kind being captured", () => {
  const rows = [
    transaction({
      id: "expense-row",
      categoryId: "food",
      occurredAt: "2026-09-12T09:00:00.000Z",
      payee: "Grab",
    }),
    transaction({
      id: "income-row",
      kind: "income",
      accountId: "bank",
      categoryId: "salary",
      occurredAt: "2026-09-13T09:00:00.000Z",
      payee: "Grab",
    }),
  ];

  assert.equal(suggest(rows, "Grab", "expense")?.categoryId, "food");
  // The income form sees only the income row — an expense category can never
  // be suggested into a kind it does not belong to.
  assert.equal(suggest(rows, "Grab", "income")?.categoryId, "salary");
});
