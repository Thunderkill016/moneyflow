"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeAccountBalances,
  computeMonthlyCashflow,
  computeNetWorthSummary,
  createReconcileTransaction,
  createTransferTransaction,
  parseQuickInput,
  type ParsedQuickCommand,
} from "../../core/engine/index.ts";
import {
  convertToVnd,
  type Account,
  type AccountGroup,
  type BudgetConfig,
  type CurrencyCode,
  type Transaction,
  type TransactionType,
} from "../../core/schema/index.ts";
import {
  createDefaultSnapshot,
  exportBackupJson,
  hydrateSnapshotAsync,
  importBackupJson,
  loadSnapshotSync,
  markAllPendingSynced,
  saveSnapshot,
  summarizeSyncState,
  type MoneyFlowSnapshot,
} from "../../core/storage/index.ts";

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useTransactionController() {
  const [snapshot, setSnapshot] = useState<MoneyFlowSnapshot>(() =>
    createDefaultSnapshot(1_763_120_000_000),
  );
  const [hydrated, setHydrated] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");
  const [accountFilter, setAccountFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSnapshot(loadSnapshotSync());
      setHydrated(true);
    });

    void hydrateSnapshotAsync().then((idbSnap) => {
      if (active) setSnapshot(idbSnap);
    });
    return () => {
      active = false;
    };
  }, []);

  const commitSnapshot = useCallback(
    (updater: (prev: MoneyFlowSnapshot) => MoneyFlowSnapshot) => {
      setSnapshot((prev) => {
        const next = updater(prev);
        return saveSnapshot(next);
      });
    },
    [],
  );

  const accounts = useMemo(
    () => computeAccountBalances(snapshot.accounts, snapshot.transactions),
    [snapshot.accounts, snapshot.transactions],
  );

  const activeTransactions = useMemo(
    () =>
      snapshot.transactions
        .filter((tx) => tx.syncStatus !== "DELETED")
        .slice()
        .sort((a, b) => b.occurredAt - a.occurredAt || b.updatedAt - a.updatedAt),
    [snapshot.transactions],
  );

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeTransactions.filter((tx) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (
        accountFilter !== "ALL" &&
        tx.accountId !== accountFilter &&
        tx.toAccountId !== accountFilter
      ) {
        return false;
      }
      if (categoryFilter !== "ALL" && tx.categoryId !== categoryFilter) {
        return false;
      }
      if (query) {
        const matchesNote = tx.note.toLowerCase().includes(query);
        const matchesCat = tx.categoryId.toLowerCase().includes(query);
        if (!matchesNote && !matchesCat) return false;
      }
      return true;
    });
  }, [
    activeTransactions,
    typeFilter,
    accountFilter,
    categoryFilter,
    searchQuery,
  ]);

  const netWorth = useMemo(
    () => computeNetWorthSummary(accounts),
    [accounts],
  );

  const cashflow = useMemo(
    () =>
      computeMonthlyCashflow({
        accounts,
        transactions: snapshot.transactions,
        budget: snapshot.budget,
      }),
    [accounts, snapshot.transactions, snapshot.budget],
  );

  const syncSummary = useMemo(
    () => summarizeSyncState(snapshot.transactions),
    [snapshot.transactions],
  );

  const defaultLiquidAccount = useMemo(
    () =>
      accounts.find((acc) => !acc.isArchived && acc.group === "LIQUID") ??
      accounts[0],
    [accounts],
  );

  const addTransaction = useCallback(
    (input: {
      type: TransactionType;
      amount: number;
      accountId: string;
      toAccountId?: string;
      categoryId: string;
      note: string;
      occurredAt?: number;
    }) => {
      const now = Date.now();
      const cleanAmount = Math.round(Math.abs(input.amount));
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) return;

      if (input.type === "TRANSFER" && input.toAccountId) {
        const fromAcc = accounts.find((a) => a.id === input.accountId);
        const toAcc = accounts.find((a) => a.id === input.toAccountId);
        if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) return;

        const transferTx = createTransferTransaction({
          id: makeId("tx"),
          fromAccount: fromAcc,
          toAccount: toAcc,
          amount: cleanAmount,
          note: input.note,
          occurredAt: input.occurredAt ?? now,
          now,
        });
        commitSnapshot((prev) => ({
          ...prev,
          transactions: [transferTx, ...prev.transactions],
        }));
        setStatusMessage(`Đã ghi chuyển ví: ${transferTx.note}`);
        return;
      }

      const tx: Transaction = {
        id: makeId("tx"),
        type: input.type,
        amount: cleanAmount,
        accountId: input.accountId,
        categoryId: input.categoryId,
        note: input.note.trim() || "Giao dịch mới",
        occurredAt: input.occurredAt ?? now,
        syncStatus: "PENDING",
        updatedAt: now,
      };
      commitSnapshot((prev) => ({
        ...prev,
        transactions: [tx, ...prev.transactions],
      }));
      setStatusMessage(`Đã ghi: ${tx.note}`);
    },
    [accounts, commitSnapshot],
  );

  const previewQuickCommand = useCallback(
    (rawText: string, accountId?: string): ParsedQuickCommand[] => {
      const targetAccId = accountId ?? defaultLiquidAccount?.id ?? "";
      return parseQuickInput(rawText, accounts, targetAccId);
    },
    [accounts, defaultLiquidAccount],
  );

  const submitQuickCommand = useCallback(
    (rawText: string, accountId?: string): number => {
      const parsed = previewQuickCommand(rawText, accountId);
      if (parsed.length === 0) return 0;

      const now = Date.now();
      const created: Transaction[] = parsed.map((item, idx) => ({
        id: makeId("cmd"),
        type: item.type,
        amount: item.amount,
        accountId: item.accountId,
        toAccountId: item.toAccountId,
        categoryId: item.categoryId,
        note: item.note,
        occurredAt: now + idx,
        syncStatus: "PENDING",
        updatedAt: now,
      }));

      commitSnapshot((prev) => ({
        ...prev,
        transactions: [...created, ...prev.transactions],
      }));
      setStatusMessage(`Đã bóc tách & ghi ${created.length} giao dịch nhanh.`);
      return created.length;
    },
    [previewQuickCommand, commitSnapshot],
  );

  const reconcileAccount = useCallback(
    (accountId: string, actualBalance: number, note?: string): number => {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return 0;

      const { delta, transaction } = createReconcileTransaction({
        id: makeId("rec"),
        account,
        actualBalance,
        note,
      });
      if (!transaction) {
        setStatusMessage(`Số dư ${account.name} đã khớp chính xác.`);
        return 0;
      }

      commitSnapshot((prev) => ({
        ...prev,
        transactions: [transaction, ...prev.transactions],
      }));
      setStatusMessage(
        `Đã khớp ${account.name} (độ lệch ${delta > 0 ? "+" : ""}${convertToVnd(delta, account.currency).toLocaleString("vi-VN")} ₫).`,
      );
      return delta;
    },
    [accounts, commitSnapshot],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const now = Date.now();
      commitSnapshot((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, syncStatus: "DELETED", updatedAt: now } : tx,
        ),
      }));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [commitSnapshot],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllFiltered = useCallback(() => {
    setSelectedIds((prev) => {
      const allSelected =
        filteredTransactions.length > 0 &&
        filteredTransactions.every((tx) => prev.has(tx.id));
      if (allSelected) return new Set();
      return new Set(filteredTransactions.map((tx) => tx.id));
    });
  }, [filteredTransactions]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const bulkDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const now = Date.now();
    const count = selectedIds.size;
    commitSnapshot((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        selectedIds.has(tx.id)
          ? { ...tx, syncStatus: "DELETED", updatedAt: now }
          : tx,
      ),
    }));
    setSelectedIds(new Set());
    setStatusMessage(`Đã xóa ${count} giao dịch đã chọn.`);
  }, [selectedIds, commitSnapshot]);

  const bulkRecategorizeSelected = useCallback(
    (categoryId: string) => {
      if (selectedIds.size === 0) return;
      const now = Date.now();
      const count = selectedIds.size;
      commitSnapshot((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          selectedIds.has(tx.id)
            ? { ...tx, categoryId, syncStatus: "PENDING", updatedAt: now }
            : tx,
        ),
      }));
      setSelectedIds(new Set());
      setStatusMessage(`Đã đổi danh mục cho ${count} giao dịch.`);
    },
    [selectedIds, commitSnapshot],
  );

  const addAccount = useCallback(
    (input: {
      name: string;
      group: AccountGroup;
      currency: CurrencyCode;
      initialBalance: number;
    }) => {
      const cleanName = input.name.trim();
      if (!cleanName) return;
      const now = Date.now();
      const nextAccount: Account = {
        id: makeId("acc"),
        name: cleanName,
        group: input.group,
        currency: input.currency,
        initialBalance: input.initialBalance,
        currentBalance: input.initialBalance,
        isArchived: false,
        updatedAt: now,
      };
      commitSnapshot((prev) => ({
        ...prev,
        accounts: [...prev.accounts, nextAccount],
      }));
      setStatusMessage(`Đã tạo ví: ${cleanName}`);
    },
    [commitSnapshot],
  );

  const updateBudget = useCallback(
    (partial: Partial<BudgetConfig>) => {
      commitSnapshot((prev) => ({
        ...prev,
        budget: {
          ...prev.budget,
          ...partial,
          updatedAt: Date.now(),
        },
      }));
      setStatusMessage("Đã cập nhật cấu hình Safe-to-Spend & ngân sách.");
    },
    [commitSnapshot],
  );

  const syncNow = useCallback(() => {
    commitSnapshot((prev) => ({
      ...prev,
      transactions: markAllPendingSynced(prev.transactions),
    }));
    setStatusMessage("Đã đồng bộ dữ liệu local-first.");
  }, [commitSnapshot]);

  const exportBackup = useCallback(
    () => exportBackupJson(snapshot),
    [snapshot],
  );

  const importBackup = useCallback((rawJson: string) => {
    const imported = importBackupJson(rawJson);
    setSnapshot(imported);
    setSelectedIds(new Set());
    setStatusMessage("Đã khôi phục dữ liệu từ file JSON backup.");
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = saveSnapshot(createDefaultSnapshot());
    setSnapshot(fresh);
    setSelectedIds(new Set());
    setStatusMessage("Đã khôi phục bộ dữ liệu mẫu chuẩn.");
  }, []);

  return {
    hydrated,
    snapshot,
    accounts,
    activeTransactions,
    filteredTransactions,
    netWorth,
    cashflow,
    syncSummary,
    defaultLiquidAccount,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    accountFilter,
    setAccountFilter,
    categoryFilter,
    setCategoryFilter,
    selectedIds,
    toggleSelect,
    toggleSelectAllFiltered,
    clearSelection,
    statusMessage,
    setStatusMessage,
    addTransaction,
    previewQuickCommand,
    submitQuickCommand,
    reconcileAccount,
    deleteTransaction,
    bulkDeleteSelected,
    bulkRecategorizeSelected,
    addAccount,
    updateBudget,
    syncNow,
    exportBackup,
    importBackup,
    resetDemoData,
  };
}

export type TransactionController = ReturnType<typeof useTransactionController>;
