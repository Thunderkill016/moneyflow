import assert from "node:assert/strict";
import test from "node:test";
import type { Transaction } from "./transactions/contracts.ts";
import {
  accountTransactionImpact,
  buildAccountRegister,
  summarizeAccountRegister,
} from "./account-register.ts";

function transaction(
  overrides: Partial<Transaction> & Pick<Transaction, "id" | "kind" | "amount">,
): Transaction {
  return {
    id: overrides.id,
    kind: overrides.kind,
    amount: overrides.amount,
    categoryId: overrides.categoryId ?? "category",
    category:
      overrides.category ??
      (overrides.kind === "transfer" ? "Chuyển tiền" : "Danh mục"),
    note: overrides.note ?? "Giao dịch",
    accountId: overrides.accountId ?? "account-a",
    account: overrides.account ?? "Tài khoản A",
    destinationAccountId: overrides.destinationAccountId,
    destinationAccount: overrides.destinationAccount,
    occurredOn: overrides.occurredOn ?? "2026-08-02",
    occurredAt: overrides.occurredAt ?? "2026-08-02T10:00:00.000Z",
    relativeDate: overrides.relativeDate ?? "Hôm nay",
    splits: overrides.splits,
    isRecurringPayment: overrides.isRecurringPayment,
  };
}

test("income and expense affect only their source account", () => {
  const income = transaction({ id: "income", kind: "income", amount: 500_000 });
  const expense = transaction({ id: "expense", kind: "expense", amount: 120_000 });

  assert.deepEqual(accountTransactionImpact(income, "account-a")?.impact, 500_000);
  assert.deepEqual(accountTransactionImpact(expense, "account-a")?.impact, -120_000);
  assert.equal(accountTransactionImpact(income, "account-b"), null);
});

test("one transfer produces opposite account-leg impacts without becoming income or expense", () => {
  const transfer = transaction({
    id: "transfer",
    kind: "transfer",
    amount: 300_000,
    accountId: "account-a",
    account: "Tài khoản A",
    destinationAccountId: "account-b",
    destinationAccount: "Tài khoản B",
  });

  const source = accountTransactionImpact(transfer, "account-a");
  const destination = accountTransactionImpact(transfer, "account-b");

  assert.equal(source?.impact, -300_000);
  assert.equal(source?.direction, "out");
  assert.equal(source?.transferCounterparty, "Tài khoản B");
  assert.equal(destination?.impact, 300_000);
  assert.equal(destination?.direction, "in");
  assert.equal(destination?.transferCounterparty, "Tài khoản A");

  const sourceSummary = summarizeAccountRegister(source ? [source] : []);
  const destinationSummary = summarizeAccountRegister(destination ? [destination] : []);
  assert.deepEqual(
    { income: sourceSummary.income, expense: sourceSummary.expense },
    { income: 0, expense: 0 },
  );
  assert.deepEqual(
    { income: destinationSummary.income, expense: destinationSummary.expense },
    { income: 0, expense: 0 },
  );
  assert.equal(sourceSummary.transferOut, 300_000);
  assert.equal(destinationSummary.transferIn, 300_000);
});

test("register excludes unrelated transactions and orders newest first", () => {
  const register = buildAccountRegister(
    [
      transaction({
        id: "older",
        kind: "expense",
        amount: 50_000,
        occurredOn: "2026-07-31",
      }),
      transaction({
        id: "unrelated",
        kind: "income",
        amount: 1_000_000,
        accountId: "account-c",
      }),
      transaction({
        id: "newer-later",
        kind: "income",
        amount: 200_000,
        occurredAt: "2026-08-02T12:00:00.000Z",
      }),
      transaction({
        id: "newer-earlier",
        kind: "expense",
        amount: 20_000,
        occurredAt: "2026-08-02T08:00:00.000Z",
      }),
    ],
    "account-a",
  );

  assert.deepEqual(
    register.map((entry) => entry.transaction.id),
    ["newer-later", "newer-earlier", "older"],
  );
});

test("summary keeps transfers separate and preserves exact signed movement", () => {
  const entries = buildAccountRegister(
    [
      transaction({ id: "income", kind: "income", amount: 700_000 }),
      transaction({ id: "expense", kind: "expense", amount: 250_000 }),
      transaction({
        id: "transfer-out",
        kind: "transfer",
        amount: 100_000,
        destinationAccountId: "account-b",
        destinationAccount: "Tài khoản B",
      }),
      transaction({
        id: "transfer-in",
        kind: "transfer",
        amount: 80_000,
        accountId: "account-b",
        account: "Tài khoản B",
        destinationAccountId: "account-a",
        destinationAccount: "Tài khoản A",
      }),
    ],
    "account-a",
  );

  assert.deepEqual(summarizeAccountRegister(entries), {
    income: 700_000,
    expense: 250_000,
    transferIn: 80_000,
    transferOut: 100_000,
    netMovement: 430_000,
    transactionCount: 4,
  });
});

test("invalid amounts and structurally invalid same-account transfers are ignored", () => {
  assert.equal(
    accountTransactionImpact(
      transaction({ id: "float", kind: "income", amount: 1.5 }),
      "account-a",
    ),
    null,
  );
  assert.equal(
    accountTransactionImpact(
      transaction({
        id: "same",
        kind: "transfer",
        amount: 10_000,
        destinationAccountId: "account-a",
      }),
      "account-a",
    ),
    null,
  );
});
