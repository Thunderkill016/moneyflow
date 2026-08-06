import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { netTransactionEffect } from "./finance.ts";
import type { CreateTransferInput } from "./sample-data.ts";
import {
  buildDemoTransferTransaction,
  prepareTransferMutation,
  type TransferAccount,
} from "./transfer-mutation.ts";

const accounts: TransferAccount[] = [
  { id: "cash", name: "Tiền mặt", currencyCode: "VND" },
  { id: "bank", name: "Ngân hàng", currencyCode: "VND" },
  { id: "usd", name: "USD", currencyCode: "USD" },
  { id: "archived", name: "Đã lưu", currencyCode: "VND", isArchived: true },
];

const validInput: CreateTransferInput = {
  sourceAccountId: "cash",
  destinationAccountId: "bank",
  amount: 250_000,
  note: "  Chuyển sang ngân hàng  ",
  occurredOn: "2026-07-30",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
};

test("prepareTransferMutation resolves active same-currency accounts and normalizes note", () => {
  const result = prepareTransferMutation(accounts, validInput);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.source.id, "cash");
  assert.equal(result.value.destination.id, "bank");
  assert.equal(result.value.input.note, "Chuyển sang ngân hàng");
});

test("prepareTransferMutation rejects invalid account and currency combinations", () => {
  assert.deepEqual(
    prepareTransferMutation(accounts, {
      ...validInput,
      destinationAccountId: "cash",
    }),
    { ok: false, message: "Chọn hai tài khoản hoạt động khác nhau." },
  );
  assert.deepEqual(
    prepareTransferMutation(accounts, {
      ...validInput,
      destinationAccountId: "archived",
    }),
    { ok: false, message: "Chọn hai tài khoản hoạt động khác nhau." },
  );
  assert.deepEqual(
    prepareTransferMutation(accounts, {
      ...validInput,
      destinationAccountId: "usd",
    }),
    {
      ok: false,
      message: "Chỉ chuyển được giữa hai tài khoản cùng loại tiền. Chưa hỗ trợ đổi ngoại tệ.",
    },
  );
});

test("prepareTransferMutation validates integer money, date and idempotency key", () => {
  for (const input of [
    { ...validInput, amount: 0 },
    { ...validInput, amount: 1.5 },
    { ...validInput, occurredOn: "30-07-2026" },
    { ...validInput, idempotencyKey: "not-a-uuid" },
  ]) {
    assert.deepEqual(prepareTransferMutation(accounts, input), {
      ok: false,
      message: "Thông tin chuyển tiền chưa hợp lệ.",
    });
  }
});

test("buildDemoTransferTransaction creates one neutral ledger transfer", () => {
  const prepared = prepareTransferMutation(accounts, validInput);
  assert.equal(prepared.ok, true);
  if (!prepared.ok) return;

  const transaction = buildDemoTransferTransaction(prepared.value, {
    id: validInput.idempotencyKey,
    occurredAt: "2026-07-30T04:55:00.000Z",
  });

  assert.deepEqual(transaction, {
    id: validInput.idempotencyKey,
    kind: "transfer",
    categoryId: "",
    category: "Chuyển tiền",
    note: "Chuyển sang ngân hàng",
    accountId: "cash",
    account: "Tiền mặt",
    destinationAccountId: "bank",
    destinationAccount: "Ngân hàng",
    amount: 250_000,
    occurredOn: "2026-07-30",
    occurredAt: "2026-07-30T04:55:00.000Z",
    relativeDate: "Vừa xong",
  });
  assert.equal(netTransactionEffect([transaction]), 0);
});

test("account and ledger surfaces delegate creation to one transfer mutation owner", () => {
  const useTransactionsSource = readFileSync(
    new URL("../hooks/use-transactions.ts", import.meta.url),
    "utf8",
  );
  const accountsPageSource = readFileSync(
    new URL("../components/accounts/accounts-workspace.tsx", import.meta.url),
    "utf8",
  );
  const ownerSource = readFileSync(
    new URL("../hooks/transfer-mutation.ts", import.meta.url),
    "utf8",
  );

  assert.match(useTransactionsSource, /executeTransferMutation/);
  assert.match(accountsPageSource, /executeTransferMutation/);
  assert.doesNotMatch(useTransactionsSource, /createTransferAction/);
  assert.doesNotMatch(accountsPageSource, /createTransferAction/);
  assert.match(ownerSource, /createTransferAction/);
});
