"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { AccountOption } from "@/lib/transactions/contracts";
import { demoAccountRows } from "@/lib/demo/transaction-fixtures";
import {
  DEMO_ACCOUNT_CHANGE_EVENT,
  DEMO_ACCOUNT_STORAGE_KEY,
  parseDemoAccounts,
  type DemoAccountState,
} from "@/lib/demo-account-store";

const UNAVAILABLE = Symbol("unavailable demo account storage");
function snapshot() {
  try {
    return localStorage.getItem(DEMO_ACCOUNT_STORAGE_KEY);
  } catch {
    return UNAVAILABLE;
  }
}
function serverSnapshot() {
  return undefined;
}
function subscribe(callback: () => void) {
  function onStorage(event: StorageEvent) {
    if (event.key === null || event.key === DEMO_ACCOUNT_STORAGE_KEY)
      callback();
  }
  window.addEventListener("storage", onStorage);
  window.addEventListener(DEMO_ACCOUNT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DEMO_ACCOUNT_CHANGE_EVENT, callback);
  };
}
const noSubscribe = () => () => {};

export function useDemoAccountSummaries(
  isDemo: boolean,
): DemoAccountState & { ready: boolean } {
  const raw = useSyncExternalStore(
    isDemo ? subscribe : noSubscribe,
    isDemo ? snapshot : serverSnapshot,
    serverSnapshot,
  );
  return useMemo(
    () => ({
      ...(raw === undefined
        ? { accounts: demoAccountRows, error: null }
        : raw === UNAVAILABLE
          ? { accounts: [], error: "Không đọc được tài khoản demo." }
          : parseDemoAccounts(raw)),
      ready: raw !== undefined,
    }),
    [raw],
  );
}

export function useDemoAccountOptions(
  initial: AccountOption[],
  isDemo: boolean,
): AccountOption[] {
  const state = useDemoAccountSummaries(isDemo);
  return useMemo(
    () =>
      !isDemo
        ? initial
        : state.accounts
            .filter((account) => !account.isArchived)
            .map(({ id, name, currencyCode, balance }) => ({
              id,
              name,
              currencyCode,
              balance,
            })),
    [initial, isDemo, state.accounts],
  );
}

export function useDemoFinanceWorkspace<
  T extends {
    accounts: AccountOption[];
    dataError?: string | null;
    totalBalance?: number;
  },
>(initial: T, isDemo: boolean): T {
  const state = useDemoAccountSummaries(isDemo);
  const accounts = useDemoAccountOptions(initial.accounts, isDemo);
  return useMemo(
    () =>
      !isDemo
        ? initial
        : {
            ...initial,
            accounts,
            dataError: initial.dataError ?? state.error,
            ...(initial.totalBalance === undefined
              ? {}
              : {
                  totalBalance: accounts
                    .filter((account) => account.currencyCode === "VND")
                    .reduce((sum, account) => sum + (account.balance ?? 0), 0),
                }),
          },
    [initial, isDemo, accounts, state.error],
  );
}
