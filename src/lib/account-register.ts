import type { Transaction } from "./transactions/contracts.ts";

export type AccountRegisterEntry = {
  transaction: Transaction;
  impact: number;
  direction: "in" | "out";
  transferCounterparty: string | null;
};

export type AccountRegisterSummary = {
  income: number;
  expense: number;
  transferIn: number;
  transferOut: number;
  netMovement: number;
  transactionCount: number;
};

function safePositiveAmount(amount: number) {
  return Number.isSafeInteger(amount) && amount > 0;
}

export function accountTransactionImpact(
  transaction: Transaction,
  accountId: string,
): AccountRegisterEntry | null {
  if (!safePositiveAmount(transaction.amount)) return null;

  if (transaction.kind === "transfer") {
    const isSource = transaction.accountId === accountId;
    const isDestination = transaction.destinationAccountId === accountId;

    // Ignore unrelated or structurally invalid same-account transfers rather than
    // inventing an account movement in the presentation layer.
    if (isSource === isDestination) return null;

    return isSource
      ? {
          transaction,
          impact: -transaction.amount,
          direction: "out",
          transferCounterparty: transaction.destinationAccount ?? null,
        }
      : {
          transaction,
          impact: transaction.amount,
          direction: "in",
          transferCounterparty: transaction.account,
        };
  }

  if (transaction.accountId !== accountId) return null;

  return {
    transaction,
    impact:
      transaction.kind === "income" ? transaction.amount : -transaction.amount,
    direction: transaction.kind === "income" ? "in" : "out",
    transferCounterparty: null,
  };
}

function newestFirst(left: AccountRegisterEntry, right: AccountRegisterEntry) {
  return (
    right.transaction.occurredOn.localeCompare(left.transaction.occurredOn) ||
    right.transaction.occurredAt.localeCompare(left.transaction.occurredAt)
  );
}

export function buildAccountRegister(
  transactions: Transaction[],
  accountId: string,
): AccountRegisterEntry[] {
  return transactions
    .map((transaction) => accountTransactionImpact(transaction, accountId))
    .filter((entry): entry is AccountRegisterEntry => entry !== null)
    .sort(newestFirst);
}

export function summarizeAccountRegister(
  entries: AccountRegisterEntry[],
): AccountRegisterSummary {
  const summary: AccountRegisterSummary = {
    income: 0,
    expense: 0,
    transferIn: 0,
    transferOut: 0,
    netMovement: 0,
    transactionCount: entries.length,
  };

  for (const entry of entries) {
    const { transaction } = entry;
    summary.netMovement += entry.impact;

    if (transaction.kind === "income") {
      summary.income += transaction.amount;
    } else if (transaction.kind === "expense") {
      summary.expense += transaction.amount;
    } else if (entry.direction === "in") {
      summary.transferIn += transaction.amount;
    } else {
      summary.transferOut += transaction.amount;
    }
  }

  return summary;
}
