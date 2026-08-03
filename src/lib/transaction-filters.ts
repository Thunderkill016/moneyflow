import type { Transaction } from "./transactions/contracts.ts";
import { getTransactionReviewStatus } from "./transaction-review.ts";

export type TransactionFilterKind = "all" | Transaction["kind"];
export type TransactionReviewFilter = "all" | "needs_review" | "reviewed";

export type TransactionFilterValues = {
  query: string;
  kind: TransactionFilterKind;
  account: string;
  category: string;
  review: TransactionReviewFilter;
  fromDate: string;
  toDate: string;
  minAmountInput: string;
  maxAmountInput: string;
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeTransactionDateParam(value?: string) {
  if (!value || !ISO_DATE_PATTERN.test(value)) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? ""
    : value;
}

export function normalizeTransactionAmountInput(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) return "";
  const amount = Number(digits);
  return Number.isSafeInteger(amount)
    ? new Intl.NumberFormat("vi-VN").format(amount)
    : "";
}

export function normalizeTransactionReviewParam(
  value?: string,
): TransactionReviewFilter {
  return value === "needs_review" || value === "reviewed" ? value : "all";
}

export function parseTransactionAmountFilter(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

export function transactionFilterError(values: TransactionFilterValues) {
  if (values.fromDate && values.toDate && values.fromDate > values.toDate) {
    return "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.";
  }

  const minAmount = parseTransactionAmountFilter(values.minAmountInput);
  const maxAmount = parseTransactionAmountFilter(values.maxAmountInput);
  if (
    (values.minAmountInput.trim() && minAmount == null) ||
    (values.maxAmountInput.trim() && maxAmount == null)
  ) {
    return "Số tiền lọc vượt quá giới hạn được hỗ trợ.";
  }
  if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
    return "Số tiền tối thiểu phải nhỏ hơn hoặc bằng số tiền tối đa.";
  }

  return null;
}

export function filterTransactions(
  transactions: Transaction[],
  values: TransactionFilterValues,
) {
  if (transactionFilterError(values)) return [];

  const normalizedQuery = values.query.trim().toLocaleLowerCase("vi");
  const minAmount = parseTransactionAmountFilter(values.minAmountInput);
  const maxAmount = parseTransactionAmountFilter(values.maxAmountInput);

  return transactions.filter((transaction) => {
    const matchesQuery =
      !normalizedQuery ||
      `${transaction.note} ${transaction.category} ${transaction.account} ${transaction.destinationAccount ?? ""}`
        .toLocaleLowerCase("vi")
        .includes(normalizedQuery);
    const matchesKind =
      values.kind === "all" || transaction.kind === values.kind;
    const matchesAccount =
      values.account === "all" ||
      transaction.account === values.account ||
      transaction.destinationAccount === values.account;
    const matchesCategory =
      values.category === "all" ||
      transaction.category === values.category ||
      transaction.splits?.some((line) => line.category === values.category);
    const matchesReview =
      values.review === "all" ||
      getTransactionReviewStatus(transaction) === values.review;
    const matchesDate =
      (!values.fromDate || transaction.occurredOn >= values.fromDate) &&
      (!values.toDate || transaction.occurredOn <= values.toDate);
    const matchesAmount =
      (minAmount == null || transaction.amount >= minAmount) &&
      (maxAmount == null || transaction.amount <= maxAmount);

    return (
      matchesQuery &&
      matchesKind &&
      matchesAccount &&
      matchesCategory &&
      matchesReview &&
      matchesDate &&
      matchesAmount
    );
  });
}

export function transactionFilterSearch(values: TransactionFilterValues) {
  const params = new URLSearchParams();
  const query = values.query.trim();
  const minAmount = parseTransactionAmountFilter(values.minAmountInput);
  const maxAmount = parseTransactionAmountFilter(values.maxAmountInput);

  if (query) params.set("q", query);
  if (values.kind !== "all") params.set("kind", values.kind);
  if (values.account !== "all") params.set("account", values.account);
  if (values.category !== "all") params.set("category", values.category);
  if (values.review !== "all") params.set("review", values.review);
  if (values.fromDate) params.set("from", values.fromDate);
  if (values.toDate) params.set("to", values.toDate);
  if (minAmount != null) params.set("min", String(minAmount));
  if (maxAmount != null) params.set("max", String(maxAmount));

  return params;
}
