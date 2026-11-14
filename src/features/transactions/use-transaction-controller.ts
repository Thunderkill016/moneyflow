"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  computeAccountBalances,
  computeMonthlyCashflow,
  computeNetWorthSummary,
  computeQuickOnboardingPlan,
  createReconcileTransaction,
  createSmartSplitTransactions,
  createTransferTransaction,
  parseQuickInput,
  parseUniversalCsvImport,
  parseVietnameseAmount,
  settleSmartSplitTransaction,
  simulateWhatIfPurchase,
  type ParsedQuickCommand,
  type WhatIfSimulationResult,
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

  const pendingSplitTransactions = useMemo(
    () =>
      activeTransactions.filter(
        (tx) => tx.splitInfo !== undefined && !tx.splitInfo.isSettled,
      ),
    [activeTransactions],
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

  const addSplitBillTransaction = useCallback(
    (input: {
      totalBill: number;
      headcount: number;
      accountId: string;
      categoryId: string;
      note: string;
      occurredAt?: number;
    }) => {
      const totalBill = Math.round(Math.abs(input.totalBill));
      const headcount = Math.max(2, Math.min(100, Math.round(input.headcount)));
      if (!Number.isFinite(totalBill) || totalBill <= 0) return;

      const now = Date.now();
      const payerAccount =
        accounts.find((acc) => acc.id === input.accountId && acc.id !== "acc-receivable") ??
        defaultLiquidAccount;
      if (!payerAccount) return;

      commitSnapshot((prev) => {
        const hasReceivable = prev.accounts.some(
          (acc) => acc.id === "acc-receivable",
        );
        const receivableAccount: Account = prev.accounts.find(
          (acc) => acc.id === "acc-receivable",
        ) ?? {
          id: "acc-receivable",
          name: "Sổ ứng hộ (Phải thu)",
          group: "DEBT",
          currency: "VND",
          initialBalance: 0,
          currentBalance: 0,
          isArchived: false,
          updatedAt: now,
        };

        const { expenseTx, receivableTransferTx } =
          createSmartSplitTransactions({
            idPrefix: makeId("split"),
            payerAccount,
            receivableAccount,
            totalBill,
            headcount,
            categoryId: input.categoryId,
            note: input.note,
            occurredAt: input.occurredAt ?? now,
            now,
          });

        return {
          ...prev,
          accounts: hasReceivable
            ? prev.accounts
            : [...prev.accounts, receivableAccount],
          transactions: [
            expenseTx,
            receivableTransferTx,
            ...prev.transactions,
          ],
        };
      });

      const myShare = Math.round(totalBill / headcount);
      const receivableAmount = totalBill - myShare;
      setStatusMessage(
        `Đã chia bill ${headcount} người: phần mình ${myShare.toLocaleString("vi-VN")} ₫ · ứng hộ ${receivableAmount.toLocaleString("vi-VN")} ₫.`,
      );
    },
    [accounts, defaultLiquidAccount, commitSnapshot],
  );

  const settleSplitBill = useCallback(
    (expenseTxId: string, targetAccountId?: string) => {
      const targetTx = activeTransactions.find((tx) => tx.id === expenseTxId);
      if (!targetTx || !targetTx.splitInfo || targetTx.splitInfo.isSettled) {
        return;
      }

      const targetLiquidId =
        targetAccountId ??
        (targetTx.accountId !== "acc-receivable"
          ? targetTx.accountId
          : defaultLiquidAccount?.id) ??
        "acc-tcb";

      const { updatedExpenseTx, repaymentTransferTx } =
        settleSmartSplitTransaction({
          settleId: makeId("settle"),
          expenseTx: targetTx,
          receivableAccountId: "acc-receivable",
          targetLiquidAccountId: targetLiquidId,
        });

      commitSnapshot((prev) => ({
        ...prev,
        transactions: [
          ...(repaymentTransferTx ? [repaymentTransferTx] : []),
          ...prev.transactions.map((tx) =>
            tx.id === expenseTxId ? updatedExpenseTx : tx,
          ),
        ],
      }));

      setStatusMessage(
        `Đã thu hồi ${targetTx.splitInfo.receivableAmount.toLocaleString("vi-VN")} ₫ ứng hộ về ví mà không làm méo Thu/Chi.`,
      );
    },
    [activeTransactions, defaultLiquidAccount, commitSnapshot],
  );

  const updateTransaction = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Transaction,
          "amount" | "note" | "categoryId" | "accountId" | "occurredAt"
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
          return {
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
            syncStatus: "PENDING",
            updatedAt: now,
          };
        }),
      }));
      setStatusMessage("Đã cập nhật ô trực tiếp trên bảng.");
    },
    [commitSnapshot],
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
      return simulateWhatIfPurchase(cashflow, amount);
    },
    [cashflow],
  );

  const importCsvRows = useCallback(
    (rawCsv: string, accountId?: string): number => {
      const targetAccountId =
        accountId ?? defaultLiquidAccount?.id ?? accounts[0]?.id ?? "acc-tcb";
      const parsedRows = parseUniversalCsvImport(rawCsv, targetAccountId);
      if (parsedRows.length === 0) return 0;

      const now = Date.now();
      const created: Transaction[] = parsedRows.map((row) => ({
        id: makeId("csv"),
        type: row.type,
        amount: row.amount,
        accountId: row.accountId,
        categoryId: row.categoryId,
        note: row.note,
        occurredAt: row.occurredAt,
        syncStatus: "PENDING",
        updatedAt: now,
      }));

      commitSnapshot((prev) => ({
        ...prev,
        transactions: [...created, ...prev.transactions],
      }));
      setStatusMessage(
        `Đã import ${created.length} giao dịch từ file CSV/Bảng tính.`,
      );
      return created.length;
    },
    [accounts, defaultLiquidAccount, commitSnapshot],
  );

  const applyQuickOnboarding = useCallback(
    (input: {
      liquidBalanceVnd: number;
      fixedCommitmentsVnd: number;
      replaceSampleData?: boolean;
    }) => {
      const now = Date.now();
      const cleanLiquid = Math.max(0, Math.round(input.liquidBalanceVnd));
      const cleanFixed = Math.max(0, Math.round(input.fixedCommitmentsVnd));
      const plan = computeQuickOnboardingPlan({
        liquidBalanceVnd: cleanLiquid,
        fixedCommitmentsVnd: cleanFixed,
      });

      commitSnapshot((prev) => {
        const hasOnlySeed = prev.transactions.every((tx) =>
          tx.id.startsWith("seed-"),
        );
        const shouldResetTxs = input.replaceSampleData ?? hasOnlySeed;

        const nextTransactions = shouldResetTxs
          ? prev.transactions.filter((tx) => !tx.id.startsWith("seed-"))
          : prev.transactions;

        const targetAcc =
          prev.accounts.find((a) => !a.isArchived && a.group === "LIQUID") ??
          prev.accounts[0];

        let nextAccounts = prev.accounts;
        const extraTxs: Transaction[] = [];

        if (targetAcc) {
          if (shouldResetTxs && nextTransactions.length === 0) {
            nextAccounts = prev.accounts.map((acc) => {
              if (acc.id === targetAcc.id) {
                return {
                  ...acc,
                  initialBalance: cleanLiquid,
                  currentBalance: cleanLiquid,
                  updatedAt: now,
                };
              }
              if (acc.group === "LIQUID") {
                return {
                  ...acc,
                  initialBalance: 0,
                  currentBalance: 0,
                  updatedAt: now,
                };
              }
              return acc;
            });
          } else {
            const recomputed = computeAccountBalances(
              prev.accounts,
              nextTransactions,
            );
            const otherLiquid = recomputed
              .filter(
                (acc) =>
                  !acc.isArchived &&
                  acc.group === "LIQUID" &&
                  acc.id !== targetAcc.id,
              )
              .reduce((sum, acc) => sum + convertToVnd(acc.currentBalance, acc.currency), 0);
            const liveTarget =
              recomputed.find((acc) => acc.id === targetAcc.id) ?? targetAcc;
            const rec = createReconcileTransaction({
              id: makeId("onboard"),
              account: liveTarget,
              actualBalance: Math.max(0, cleanLiquid - otherLiquid),
              now,
              note: "Khởi tạo nhanh số dư Safe-to-Spend",
            });
            if (rec.transaction) {
              extraTxs.push(rec.transaction);
            }
          }
        }

        const existingMonthExpense = nextTransactions
          .filter((tx) => tx.syncStatus !== "DELETED" && tx.type === "EXPENSE")
          .reduce((sum, tx) => sum + tx.amount, 0);

        return {
          ...prev,
          accounts: nextAccounts,
          transactions: [...extraTxs, ...nextTransactions],
          budget: {
            ...prev.budget,
            fixedCommitments: cleanFixed,
            monthlySpendingCap: existingMonthExpense + plan.spendableMonthVnd,
            updatedAt: now,
          },
        };
      });

      setStatusMessage(plan.summaryMessage);
      return plan;
    },
    [commitSnapshot],
  );

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
    addSplitBillTransaction,
    settleSplitBill,
    updateTransaction,
    previewQuickCommand,
    submitQuickCommand,
    reconcileAccount,
    deleteTransaction,
    bulkDeleteSelected,
    bulkRecategorizeSelected,
    bulkChangeAccountSelected,
    addAccount,
    updateBudget,
    simulateWhatIf,
    importCsvRows,
    applyQuickOnboarding,
    syncNow,
    exportBackup,
    importBackup,
    resetDemoData,
  };
}

export type TransactionController = ReturnType<typeof useTransactionController>;
