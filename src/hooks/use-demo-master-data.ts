"use client";

import { useEffect, useMemo, useState } from "react";
import {
  activeDemoAccountOptions,
  activeDemoCategoryOptions,
  demoAccountRecords,
  demoCategorySummaries,
  readStoredDemoAccounts,
  readStoredDemoCategories,
  type DemoAccountRecord,
} from "@/lib/demo-master-data-store";
import type {
  AccountOption,
  CategoryOption,
  TransactionKind,
} from "@/lib/sample-data";

type DemoMasterDataOptions = {
  isDemo: boolean;
  accounts: AccountOption[];
  categories: CategoryOption[];
};

export function useDemoMasterData({
  isDemo,
  accounts: initialAccounts,
  categories: initialCategories,
}: DemoMasterDataOptions): {
  accounts: AccountOption[];
  categories: CategoryOption[];
  accountRecords: DemoAccountRecord[];
} {
  const [accountRecords, setAccountRecords] =
    useState<DemoAccountRecord[]>(demoAccountRecords);
  const [categoryRecords, setCategoryRecords] = useState(demoCategorySummaries);

  useEffect(() => {
    if (!isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      setAccountRecords(readStoredDemoAccounts());
      setCategoryRecords(readStoredDemoCategories());
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isDemo]);

  const requestedCategoryKinds = useMemo(
    () =>
      new Set<TransactionKind>(
        initialCategories.map((category) => category.kind),
      ),
    [initialCategories],
  );

  const accounts = useMemo(
    () =>
      isDemo ? activeDemoAccountOptions(accountRecords) : initialAccounts,
    [accountRecords, initialAccounts, isDemo],
  );
  const categories = useMemo(() => {
    if (!isDemo) return initialCategories;
    return activeDemoCategoryOptions(categoryRecords).filter((category) =>
      requestedCategoryKinds.has(category.kind),
    );
  }, [
    categoryRecords,
    initialCategories,
    isDemo,
    requestedCategoryKinds,
  ]);

  return { accounts, categories, accountRecords };
}
