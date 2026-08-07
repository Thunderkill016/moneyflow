import type { Transaction } from "@/lib/sample-data";

/**
 * Candidate approval owns one stable idempotency identity. Authenticated candidates
 * are UUIDs accepted by the atomic approval RPC; demo candidates may use readable
 * IDs because the browser store does not impose a UUID schema.
 */
export function approvalIdempotencyKey(candidateId: string): string {
  return candidateId;
}

export function findDemoApprovalTransaction(
  transactions: readonly Transaction[],
  candidateId: string,
): Transaction | null {
  return transactions.find((transaction) => transaction.id === candidateId) ?? null;
}

/**
 * The generic demo transaction hook historically created a random transaction ID.
 * Re-key the successful row to the candidate identity so a failed candidate-status
 * write can be retried without creating a second ledger row.
 */
export function reconcileDemoApprovalTransaction(
  transactions: readonly Transaction[],
  candidateId: string,
  createdTransactionId: string,
): Transaction[] {
  const alreadyLinked = findDemoApprovalTransaction(transactions, candidateId);
  if (alreadyLinked) return [...transactions];

  let replaced = false;
  const next = transactions.map((transaction) => {
    if (transaction.id !== createdTransactionId) return transaction;
    replaced = true;
    return { ...transaction, id: candidateId };
  });
  return replaced ? next : [...transactions];
}
