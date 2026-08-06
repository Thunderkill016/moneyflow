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
export function useTransactionLedger({
  initialTransactions,
  isDemo,
}: {
  initialTransactions: Transaction[];
  isDemo: boolean;
}) {
  const [transactions, setTransactions] = useState(() =>
    initialTransactions.map(withReviewStatus),
  );

  useEffect(() => {
    if (!isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      setTransactions(readStoredTransactions().map(withReviewStatus));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isDemo]);

  return transactions;
}
