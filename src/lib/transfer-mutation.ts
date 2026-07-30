import { normalizeCurrencyCode, transferCurrencyMismatchMessage } from "./currency.ts";
import type { CreateTransferInput, Transaction } from "./sample-data.ts";

export type TransferAccount = {
  id: string;
  name: string;
  currencyCode?: string;
  isArchived?: boolean;
};

export type PreparedTransfer = {
  input: CreateTransferInput;
  source: TransferAccount;
  destination: TransferAccount;
};

export type PrepareTransferResult =
  | { ok: true; value: PreparedTransfer }
  | { ok: false; message: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function prepareTransferMutation(
  accounts: readonly TransferAccount[],
  input: CreateTransferInput,
): PrepareTransferResult {
  const note = input.note.trim();
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    note.length > 500 ||
    !DATE_PATTERN.test(input.occurredOn) ||
    !UUID_PATTERN.test(input.idempotencyKey)
  ) {
    return { ok: false, message: "Thông tin chuyển tiền chưa hợp lệ." };
  }

  const source = accounts.find((item) => item.id === input.sourceAccountId);
  const destination = accounts.find((item) => item.id === input.destinationAccountId);
  if (
    !source ||
    !destination ||
    source.id === destination.id ||
    source.isArchived === true ||
    destination.isArchived === true
  ) {
    return { ok: false, message: "Chọn hai tài khoản hoạt động khác nhau." };
  }

  if (
    normalizeCurrencyCode(source.currencyCode) !==
    normalizeCurrencyCode(destination.currencyCode)
  ) {
    return { ok: false, message: transferCurrencyMismatchMessage() };
  }

  return {
    ok: true,
    value: {
      source,
      destination,
      input: {
        ...input,
        note,
      },
    },
  };
}

export function buildDemoTransferTransaction(
  prepared: PreparedTransfer,
  options: { id: string; occurredAt: string },
): Transaction {
  return {
    id: options.id,
    kind: "transfer",
    categoryId: "",
    category: "Chuyển tiền",
    note: prepared.input.note || "Chuyển tiền",
    accountId: prepared.source.id,
    account: prepared.source.name,
    destinationAccountId: prepared.destination.id,
    destinationAccount: prepared.destination.name,
    amount: prepared.input.amount,
    occurredOn: prepared.input.occurredOn,
    occurredAt: options.occurredAt,
    relativeDate: "Vừa xong",
  };
}
