"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  attachTransactionFingerprint,
  computeAccountBalances,
  computeMonthlyCashflow,
  computeNetWorthSummary,
  createTransferTransaction,
  parseVietnameseAmount,
  type MonthlyCashflowSummary,
  type NetWorthSummary,
  type WhatIfSimulationResult,
} from "../../core/engine/index.ts";
import { type Account, type CurrencyCode } from "../../core/schema/account.schema.ts";
import { type BudgetConfig } from "../../core/schema/budget.schema.ts";
import {
  type Transaction,
  type TransactionSource,
  type TransactionType,
} from "../../core/schema/transaction.schema.ts";
import {
  buildAndroidWidgetSnapshot,
  createDefaultSnapshot,
  exportBackupJson,
  hydrateSnapshotAsync,
  importAnyLegacyOrBackup,
  loadSnapshotSync,
  markAllPendingSynced,
  saveSnapshot,
  summarizeSyncState,
  type AndroidWidgetSnapshot,
  type MigrationImportResult,
  type MoneyFlowSnapshot,
} from "../../core/storage/index.ts";
import {
  groupAccountsByType,
  useAccountsWealthActions,
  type GroupedAccounts,
} from "../accounts-wealth/index.ts";
import {
  deriveCashflowHighlights,
  useAnalyticsActions,
  type AnalyticsHighlight,
} from "../analytics/index.ts";
import {
  appendNumpadToken,
  parseNumpadAmount,
  useQuickCaptureActions,
  type BankSmsImportOutcome,
  type ParsedBankSmsResult,
  type ParsedQuickCommand,
} from "../quick-capture/index.ts";

export {
  appendNumpadToken,
  deriveCashflowHighlights,
  groupAccountsByType,
  parseNumpadAmount,
  type AnalyticsHighlight,
  type BankSmsImportOutcome,
  type GroupedAccounts,
  type ParsedBankSmsResult,
  type ParsedQuickCommand,
};

export type SpecialLedgerFilter = "ALL" | "REFUND" | "EXCLUDED" | "EVENT";

export function useTransactionController() {
  const [snapshot, setSnapshot] = useState<MoneyFlowSnapshot>(() =>
    createDefaultSnapshot(1_763_120_000_000),
  );
  const [hydrated, setHydrated] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | TransactionType>("ALL");
  const [specialFilter, setSpecialFilter] = useState<SpecialLedgerFilter>("ALL");
  const [accountFilter, setAccountFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [lastDeletedIds, setLastDeletedIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const idCounterRef = useRef(0);
  const makeId = useCallback((prefix: string): string => {
    idCounterRef.current += 1;
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return `${prefix}-${crypto.randomUUID().slice(0, 8)}-${idCounterRef.current}`;
    }
    return `${prefix}-${Date.now()}-${idCounterRef.current}`;
  }, []);

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
      setSnapshot((prev) => saveSnapshot(updater(prev)));
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
        .filter((tx) => tx.syncStatus !== "DELETED" && !tx.deletedAt)
        .slice()
        .sort(
          (a, b) => b.occurredAt - a.occurredAt || b.updatedAt - a.updatedAt,
        ),
    [snapshot.transactions],
  );

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeTransactions.filter((tx) => {
      if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
      if (specialFilter === "REFUND" && !tx.isRefund) return false;
      if (specialFilter === "EXCLUDED" && !tx.excludeFromReports) return false;
      if (specialFilter === "EVENT" && !tx.eventTag) return false;
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
        const matchesEvent = (tx.eventTag ?? "").toLowerCase().includes(query);
        if (!matchesNote && !matchesCat && !matchesEvent) return false;
      }
      return true;
    });
  }, [
    activeTransactions,
    typeFilter,
    specialFilter,
    accountFilter,
    categoryFilter,
    searchQuery,
  ]);

  const netWorth: NetWorthSummary = useMemo(
    () => computeNetWorthSummary(accounts),
    [accounts],
  );

  const cashflow: MonthlyCashflowSummary = useMemo(
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

  const widgetSnapshot: AndroidWidgetSnapshot = useMemo(
    () =>
      buildAndroidWidgetSnapshot(
        snapshot,
        cashflow.safeToSpendDaily,
        snapshot.updatedAt,
      ),
    [snapshot, cashflow.safeToSpendDaily],
  );

  const defaultLiquidAccount = useMemo(
    () =>
      accounts.find((acc) => !acc.isArchived && acc.group === "LIQUID") ??
      accounts[0],
    [accounts],
  );

  const pendingSplitTransactions = useMemo(
    () =>
      activeTransactions.filter(
        (tx) => tx.splitInfo !== undefined && !tx.splitInfo.isSettled,
      ),
    [activeTransactions],
  );

  const quickCapture = useQuickCaptureActions({
    accounts,
    defaultLiquidAccount,
    existingTransactions: activeTransactions,
    activeEventName: snapshot.budget.activeEventName,
    makeId,
    commitSnapshot,
    setStatusMessage,
  });

  const wealth = useAccountsWealthActions({
    accounts,
    defaultLiquidAccount,
    activeTransactions,
    makeId,
    commitSnapshot,
    setStatusMessage,
  });

  const analytics = useAnalyticsActions({
    cashflow,
    makeId,
    commitSnapshot,
    setStatusMessage,
  });

  const addTransaction = useCallback(
    (input: {
      type: TransactionType;
      amount: number;
      accountId: string;
      toAccountId?: string;
      categoryId: string;
      note: string;
      occurredAt?: number;
      isRefund?: boolean;
      excludeFromReports?: boolean;
      eventTag?: string;
      source?: TransactionSource;
    }) => {
      const now = Date.now();
      const cleanAmount = Math.round(Math.abs(input.amount));
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) return;

      if (input.type === "TRANSFER" && input.toAccountId) {
        const fromAcc = accounts.find((a) => a.id === input.accountId);
        const toAcc = accounts.find((a) => a.id === input.toAccountId);
        if (!fromAcc || !toAcc || fromAcc.id === toAcc.id) return;

        const transferTx = attachTransactionFingerprint(
          createTransferTransaction({
            id: makeId("tx"),
            fromAccount: fromAcc,
            toAccount: toAcc,
            amount: cleanAmount,
            note: input.note,
            occurredAt: input.occurredAt ?? now,
            now,
          }),
        );
        commitSnapshot((prev) => ({
          ...prev,
          transactions: [transferTx, ...prev.transactions],
        }));
        setStatusMessage(`Đã ghi chuyển ví: ${transferTx.note}`);
        return;
      }

      const resolvedEventTag =
        input.eventTag?.trim() ||
        snapshot.budget.activeEventName?.trim() ||
        undefined;

      const tx: Transaction = attachTransactionFingerprint({
        id: makeId("tx"),
        type: input.isRefund ? "INCOME" : input.type,
        amount: cleanAmount,
        accountId: input.accountId,
        categoryId: input.categoryId,
        note:
          input.note.trim() ||
          (input.isRefund ? "Hoàn tiền giao dịch" : "Giao dịch mới"),
        occurredAt: input.occurredAt ?? now,
        syncStatus: "PENDING",
        updatedAt: now,
        source: input.source ?? "MANUAL",
        ...(input.isRefund ? { isRefund: true } : {}),
        ...(input.excludeFromReports ? { excludeFromReports: true } : {}),
        ...(resolvedEventTag ? { eventTag: resolvedEventTag } : {}),
      });

      commitSnapshot((prev) => ({
        ...prev,
        transactions: [tx, ...prev.transactions],
      }));
      setStatusMessage(
        input.isRefund
          ? `Đã ghi hoàn tiền (${tx.categoryId}): ${tx.note}`
          : `Đã ghi: ${tx.note}`,
      );
    },
    [accounts, snapshot.budget.activeEventName, makeId, commitSnapshot],
  );

  const submitQuickCommand = useCallback(
    (
      rawCommand: string,
      optionsOrAccountId?:
        | string
        | {
            defaultAccountId?: string;
            excludeFromReports?: boolean;
            eventTag?: string;
          },
    ): number => {
      const resolvedOptions =
        typeof optionsOrAccountId === "string"
          ? { defaultAccountId: optionsOrAccountId }
          : optionsOrAccountId;
      return quickCapture.submitQuickCommand(rawCommand, resolvedOptions);
    },
    [quickCapture],
  );

  const importCsvRows = useCallback(
    (rawCsv: string, accountId?: string) => {
      const targetId =
        accountId ?? defaultLiquidAccount?.id ?? accounts[0]?.id ?? "acc-tcb";
      return quickCapture.importCsvRows(rawCsv, targetId);
    },
    [accounts, defaultLiquidAccount, quickCapture],
  );

  const updateTransaction = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Transaction,
          | "amount"
          | "note"
          | "categoryId"
          | "accountId"
          | "occurredAt"
          | "isRefund"
          | "excludeFromReports"
          | "eventTag"
        >
      >,
    ) => {
      const now = Date.now();
      commitSnapshot((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) => {
          if (tx.id !== id) return tx;
          const nextAmount =
            patch.amount !== undefined &&
            Number.isFinite(patch.amount) &&
            patch.amount > 0
              ? Math.round(patch.amount)
              : tx.amount;
          return attachTransactionFingerprint({
            ...tx,
            amount: nextAmount,
            note:
              patch.note !== undefined
                ? patch.note.trim() || tx.note
                : tx.note,
            categoryId: patch.categoryId ?? tx.categoryId,
            accountId:
              patch.accountId && patch.accountId !== tx.toAccountId
                ? patch.accountId
                : tx.accountId,
            occurredAt: patch.occurredAt ?? tx.occurredAt,
            ...(patch.isRefund !== undefined
              ? { isRefund: patch.isRefund }
              : {}),
            ...(patch.excludeFromReports !== undefined
              ? { excludeFromReports: patch.excludeFromReports }
              : {}),
            ...(patch.eventTag !== undefined
              ? { eventTag: patch.eventTag || undefined }
              : {}),
            syncStatus: "PENDING",
            updatedAt: now,
          });
        }),
      }));
      setStatusMessage("Đã cập nhật giao dịch trực tiếp.");
    },
    [commitSnapshot],
  );

  const deleteTransaction = useCallback(
    (id: string) => {
      const now = Date.now();
      commitSnapshot((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id
            ? { ...tx, syncStatus: "DELETED", deletedAt: now, updatedAt: now }
            : tx,
        ),
      }));
      setLastDeletedIds([id]);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setStatusMessage("Đã chuyển 1 giao dịch vào thùng rác (bấm Hoàn tác nếu nhầm).");
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
    const idsToDelete = Array.from(selectedIds);
    commitSnapshot((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        selectedIds.has(tx.id)
          ? { ...tx, syncStatus: "DELETED", deletedAt: now, updatedAt: now }
          : tx,
      ),
    }));
    setLastDeletedIds(idsToDelete);
    setSelectedIds(new Set());
    setStatusMessage(`Đã xóa ${idsToDelete.length} giao dịch đã chọn.`);
  }, [selectedIds, commitSnapshot]);

  const undoLastDelete = useCallback(() => {
    if (lastDeletedIds.length === 0) return;
    const restoreSet = new Set(lastDeletedIds);
    const now = Date.now();
    commitSnapshot((prev) => ({
      ...prev,
      transactions: prev.transactions.map((tx) =>
        restoreSet.has(tx.id)
          ? {
              ...tx,
              syncStatus: "PENDING",
              deletedAt: undefined,
              updatedAt: now,
            }
          : tx,
      ),
    }));
    setStatusMessage(`Đã khôi phục ${lastDeletedIds.length} giao dịch vừa xóa.`);
    setLastDeletedIds([]);
  }, [lastDeletedIds, commitSnapshot]);

  const dismissUndoDelete = useCallback(() => {
    setLastDeletedIds([]);
  }, []);

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

  const bulkChangeAccountSelected = useCallback(
    (accountId: string) => {
      if (selectedIds.size === 0 || !accountId) return;
      const now = Date.now();
      const count = selectedIds.size;
      commitSnapshot((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          selectedIds.has(tx.id) && tx.toAccountId !== accountId
            ? { ...tx, accountId, syncStatus: "PENDING", updatedAt: now }
            : tx,
        ),
      }));
      setSelectedIds(new Set());
      setStatusMessage(`Đã chuyển ví cho ${count} giao dịch.`);
    },
    [selectedIds, commitSnapshot],
  );

  const simulateWhatIf = useCallback(
    (rawAmountOrNumber: string | number): WhatIfSimulationResult => {
      const amount =
        typeof rawAmountOrNumber === "number"
          ? rawAmountOrNumber
          : (parseVietnameseAmount(rawAmountOrNumber, {
              autoMultiplyThousandForBareSmallNumber: false,
            })?.amount ?? 0);
      return analytics.simulateWhatIf(amount);
    },
    [analytics],
  );

  const syncNow = useCallback(() => {
    commitSnapshot((prev) => ({
      ...prev,
      transactions: markAllPendingSynced(prev.transactions),
    }));
    setStatusMessage("Đã đồng bộ dữ liệu local-first & cập nhật Android Widget.");
  }, [commitSnapshot]);

  const exportBackup = useCallback(
    () => exportBackupJson(snapshot),
    [snapshot],
  );

  const importAnyJson = useCallback(
    (
      rawJson: string,
      mode: "merge" | "replace" = "merge",
    ): MigrationImportResult | null => {
      try {
        const result = importAnyLegacyOrBackup(
          rawJson,
          mode === "merge" ? { mergeInto: snapshot } : undefined,
        );
        setSnapshot(result.snapshot);
        setSelectedIds(new Set());
        setLastDeletedIds([]);
        setStatusMessage(
          `[${result.sourceLabel}] Đã nạp ${result.importedTransactions} giao dịch, ${result.importedAccounts} ví` +
            (result.skippedDuplicates > 0
              ? ` · bỏ qua ${result.skippedDuplicates} bản ghi trùng`
              : "") +
            ".",
        );
        return result;
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Không đọc được file JSON migration.";
        setStatusMessage(msg);
        return null;
      }
    },
    [snapshot],
  );

  const importBackup = useCallback(
    (rawJson: string): boolean => importAnyJson(rawJson, "replace") !== null,
    [importAnyJson],
  );

  const resetDemoData = useCallback(() => {
    const fresh = saveSnapshot(createDefaultSnapshot());
    setSnapshot(fresh);
    setSelectedIds(new Set());
    setLastDeletedIds([]);
    setStatusMessage("Đã khôi phục bộ dữ liệu mẫu v3.0 chuẩn.");
  }, []);

  // Re-export imported schema helpers cleanly via usage checks
  const _checkAccountCurrency = useCallback(
    (acc: Account): CurrencyCode => acc.currency,
    [],
  );
  const _checkBudgetCap = useCallback(
    (b: BudgetConfig): number => b.monthlySpendingCap,
    [],
  );
  void _checkAccountCurrency;
  void _checkBudgetCap;

  return {
    hydrated,
    snapshot,
    accounts,
    activeTransactions,
    filteredTransactions,
    pendingSplitTransactions,
    netWorth,
    cashflow,
    syncSummary,
    widgetSnapshot,
    defaultLiquidAccount,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    specialFilter,
    setSpecialFilter,
    accountFilter,
    setAccountFilter,
    categoryFilter,
    setCategoryFilter,
    selectedIds,
    toggleSelect,
    toggleSelectAllFiltered,
    clearSelection,
    lastDeletedIds,
    undoLastDelete,
    dismissUndoDelete,
    statusMessage,
    setStatusMessage,
    addTransaction,
    addSplitBillTransaction: wealth.addSplitBillTransaction,
    settleSplitBill: wealth.settleSplitBill,
    updateTransaction,
    previewQuickCommand: quickCapture.previewQuickCommand,
    submitQuickCommand,
    previewBankSms: quickCapture.previewBankSms,
    importBankSms: quickCapture.importBankSms,
    reconcileAccount: wealth.reconcileAccount,
    deleteTransaction,
    bulkDeleteSelected,
    bulkRecategorizeSelected,
    bulkChangeAccountSelected,
    addAccount: wealth.addAccount,
    updateBudget: analytics.updateBudget,
    toggleCommitmentPaid: analytics.toggleCommitmentPaid,
    addCommitment: analytics.addCommitment,
    setActiveEventMode: analytics.setActiveEventMode,
    simulateWhatIf,
    importCsvRows,
    applyQuickOnboarding: analytics.applyQuickOnboarding,
    syncNow,
    exportBackup,
    importAnyJson,
    importBackup,
    resetDemoData,
  };
}

export type TransactionController = ReturnType<typeof useTransactionController>;
