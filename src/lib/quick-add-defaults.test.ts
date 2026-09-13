import assert from "node:assert/strict";
import test from "node:test";
import type {
  AccountOption,
  CategoryOption,
  Transaction,
  TransactionKind,
} from "./transactions/contracts.ts";
import { deriveStableLedgerPreset } from "./quick-add-defaults.ts";

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
  reviewStatus = "reviewed",
  splits,
}: {
  id: string;
  kind?: Transaction["kind"];
  accountId?: string;
  categoryId?: string;
  occurredAt: string;
  reviewStatus?: Transaction["reviewStatus"];
  splits?: Transaction["splits"];
}): Transaction {
  return {
    id,
    kind,
    categoryId,
    category: categoryId,
    note: id,
    accountId,
    account: accountId,
    amount: 100_000,
    occurredOn: occurredAt.slice(0, 10),
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

test("orders by occurredAt instead of trusting incoming array order", () => {
  const result = derive([
    transaction({
      id: "old-bank",
      accountId: "bank",
      categoryId: "food",
      occurredAt: "2026-09-01T09:00:00.000Z",
    }),
    transaction({
      id: "new-card-1",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-14T09:00:00.000Z",
    }),
    transaction({
      id: "old-bank-2",
      accountId: "bank",
      categoryId: "food",
      occurredAt: "2026-08-31T09:00:00.000Z",
    }),
    transaction({
      id: "new-card-2",
      accountId: "card",
      categoryId: "travel",
      occurredAt: "2026-09-13T09:00:00.000Z",
    }),
    transaction({
      id: "new-bank-outlier",
      accountId: "bank",
      categoryId: "food",
      occurredAt: "2026-09-12T09:00:00.000Z",
    }),
  ]);

  assert.deepEqual(result, {
    kind: "expense",
    accountId: "card",
    categoryId: "travel",
  });
});

test("ignores transfers, opposite-kind, split and review-needed rows", () => {
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

test("legacy rows without reviewStatus remain eligible as reviewed", () => {
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

  assert.deepEqual(derive(rows), {
    kind: "expense",
    accountId: "cash",
    categoryId: "food",
  });
});
