import type { Transaction } from "../../lib/transactions/contracts.ts";
import type { LedgerTrustSummary } from "../../lib/ledger-trust.ts";
import type { Basis, ExplainedAmount } from "./types.ts";

export type CapabilityRange = {
  from: string;
  to: string;
};

type BasisOptions = {
  formula: string;
  range: CapabilityRange | null;
  included: Transaction[];
  allTransactions: Transaction[];
  computedAt: string;
  capabilityVersion: string;
  trust?: LedgerTrustSummary | null;
  targetKind?: "income" | "expense";
};

function inRange(transaction: Transaction, range: CapabilityRange | null) {
  return !range || (transaction.occurredOn >= range.from && transaction.occurredOn <= range.to);
}

function addCount(
  counts: Map<Basis["excluded"][number]["reason"], number>,
  reason: Basis["excluded"][number]["reason"],
) {
  counts.set(reason, (counts.get(reason) ?? 0) + 1);
}

export function buildBasis({
  formula,
  range,
  included,
  allTransactions,
  computedAt,
  capabilityVersion,
  trust = null,
  targetKind,
}: BasisOptions): Basis {
  const includedIds = new Set(included.map((transaction) => transaction.id));
  const excluded = new Map<Basis["excluded"][number]["reason"], number>();

  for (const transaction of allTransactions) {
    if (includedIds.has(transaction.id)) continue;
    if (!inRange(transaction, range)) {
      addCount(excluded, "outside_range");
    } else if (transaction.kind === "transfer") {
      addCount(excluded, "transfer");
    } else if (transaction.reviewStatus === "needs_review") {
      addCount(excluded, "needs_review");
    } else if (targetKind && transaction.kind !== targetKind) {
      addCount(excluded, "other_kind");
    } else {
      addCount(excluded, "other_kind");
    }
  }

  return {
    formula,
    range: range
      ? { ...range, timeZone: "Asia/Ho_Chi_Minh" }
      : null,
    included: {
      count: included.length,
      transactionIds: included.map((transaction) => transaction.id),
    },
    excluded: [...excluded.entries()].map(([reason, count]) => ({ reason, count })),
    trust,
    computedAt,
    capabilityVersion,
  };
}

export function explainedAmount(
  amount: number,
  basis: Basis,
): ExplainedAmount {
  if (!Number.isSafeInteger(amount)) throw new Error("unsafe_capability_amount");
  return { amount, currency: "VND", basis };
}

export function transactionRange(
  transactions: Transaction[],
  range: CapabilityRange,
): Transaction[] {
  return transactions.filter((transaction) => inRange(transaction, range));
}

export function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
