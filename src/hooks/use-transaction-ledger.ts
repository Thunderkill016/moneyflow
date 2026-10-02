"use client";

import { useEffect, useState } from "react";
import type { Transaction } from "@/lib/sample-data";
import { readStoredTransactions } from "@/lib/transaction-store";
import { getTransactionReviewStatus } from "@/lib/transaction-review";

function withReviewStatus(transaction: Transaction): Transaction {
  return {
    ...transaction,
    reviewStatus: getTransactionReviewStatus(transaction),
  };
}

/**
 * Read-only ledger projection for surfaces such as Timeline.
 *
 * Production uses the server-provided snapshot. Demo mode hydrates the same
 * local ledger used by `useTransactions` without importing mutation actions or
 * exposing write methods to a read-only route.
 */
export function useTransactionLedgerState({
  initialTransactions,
  isDemo,
}: {
  initialTransactions: Transaction[];
  isDemo: boolean;
}) {
  const [transactions, setTransactions] = useState(() =>
    initialTransactions.map(withReviewStatus),
  );
  const [isHydrated, setIsHydrated] = useState(!isDemo);

  useEffect(() => {
    if (!isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      setTransactions(readStoredTransactions().map(withReviewStatus));
      setIsHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isDemo]);

  return { transactions, isHydrated };
}

export function useTransactionLedger(options: {
  initialTransactions: Transaction[];
  isDemo: boolean;
}) {
  return useTransactionLedgerState(options).transactions;
}
