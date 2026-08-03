"use client";

import {
  emptyReconciliationState,
  sanitizeStoredDemoReconciliationState,
  type AccountReconciliationStateData,
} from "./reconciliation.ts";

const STORAGE_PREFIX = "moneyflow-account-reconciliation-v1:";

function key(accountId: string) {
  return `${STORAGE_PREFIX}${accountId}`;
}

export function readDemoReconciliationState(accountId: string) {
  if (typeof window === "undefined") return emptyReconciliationState();
  try {
    const raw = window.localStorage.getItem(key(accountId));
    return sanitizeStoredDemoReconciliationState(
      raw ? JSON.parse(raw) : null,
      accountId,
    );
  } catch {
    return emptyReconciliationState();
  }
}

export function writeDemoReconciliationState(
  accountId: string,
  stateData: AccountReconciliationStateData,
) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(accountId), JSON.stringify(stateData));
}
