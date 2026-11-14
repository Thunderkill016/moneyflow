"use client";

import { useCallback } from "react";
import {
  attachTransactionFingerprint,
  createReconcileTransaction,
  createSmartSplitTransactions,
  settleSmartSplitTransaction,
} from "../../core/engine/index.ts";
import {
  convertToVnd,
  type Account,
  type AccountGroup,
  type CurrencyCode,
} from "../../core/schema/account.schema.ts";
import type { Transaction } from "../../core/schema/transaction.schema.ts";
import type { MoneyFlowSnapshot } from "../../core/storage/db.local.ts";

export interface GroupedAccounts {
  group: AccountGroup;
  accounts: Account[];
  subtotalBalance: number;
}

export function groupAccountsByType(
  accounts: readonly Account[],
): GroupedAccounts[] {
  const order: AccountGroup[] = ["LIQUID", "INVESTMENT", "DEBT"];
  return order.map((group) => {
    const items = accounts.filter(
      (acc) => !acc.isArchived && acc.group === group,
    );
    return {
      group,
      accounts: items,
      subtotalBalance: items.reduce(
        (sum, acc) => sum + convertToVnd(acc.currentBalance, acc.currency),
        0,
      ),
    };
  });
}

export function useAccountsWealthActions(params: {
  accounts: readonly Account[];
  defaultLiquidAccount: Account | undefined;
  activeTransactions: readonly Transaction[];
  makeId: (prefix: string) => string;
  commitSnapshot: (
    updater: (prev: MoneyFlowSnapshot) => MoneyFlowSnapshot,
  ) => void;
  setStatusMessage: (msg: string | null) => void;
}) {
  const {
    accounts,
    defaultLiquidAccount,
    activeTransactions,
    makeId,
    commitSnapshot,
    setStatusMessage,
  } = params;

  const reconcileAccount = useCallback(
    (accountId: string, actualBalance: number, note?: string): number => {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return 0;

      const now = Date.now();
      const { delta, transaction } = createReconcileTransaction({
        id: makeId("rec"),
        account,
        actualBalance,
        note,
        now,
      });

      if (!transaction) {
        commitSnapshot((prev) => ({
          ...prev,
          accounts: prev.accounts.map((a) =>
            a.id === accountId ? { ...a, trustedThroughDate: now, updatedAt: now } : a,
          ),
        }));
        setStatusMessage(
          `Số dư ${account.name} đã khớp chính xác (đã gắn dấu kiểm chứng).`,
        );
        return 0;
      }

      commitSnapshot((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.id === accountId ? { ...a, trustedThroughDate: now, updatedAt: now } : a,
        ),
        transactions: [attachTransactionFingerprint(transaction), ...prev.transactions],
      }));
      setStatusMessage(
        `Đã khớp ${account.name} (độ lệch ${delta > 0 ? "+" : ""}${convertToVnd(delta, account.currency).toLocaleString("vi-VN")} ₫).`,
      );
      return delta;
    },
    [accounts, makeId, commitSnapshot, setStatusMessage],
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
        trustedThroughDate: now,
        updatedAt: now,
      };
      commitSnapshot((prev) => ({
        ...prev,
        accounts: [...prev.accounts, nextAccount],
      }));
      setStatusMessage(`Đã tạo ví: ${cleanName}`);
    },
    [makeId, commitSnapshot, setStatusMessage],
  );

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
      const headcount = Math.max(2, Math.min(20, Math.round(input.headcount)));
      if (totalBill <= 0) return;

      const payerAccount =
        accounts.find((a) => a.id === input.accountId && !a.isArchived) ??
        defaultLiquidAccount ??
        accounts[0];
      if (!payerAccount) return;

      const existingReceivable = accounts.find(
        (a) =>
          !a.isArchived &&
          (a.id === "acc-receivable" ||
            (a.group === "DEBT" && a.name.toLowerCase().includes("thu hồi"))),
      );

      const now = Date.now();
      const receivableAccount: Account = existingReceivable ?? {
        id: "acc-receivable",
        name: "Tiền bạn bè nợ (Thu hồi)",
        group: "DEBT",
        currency: payerAccount.currency,
        initialBalance: 0,
        currentBalance: 0,
        isArchived: false,
        updatedAt: now,
      };

      const { expenseTx, receivableTransferTx } = createSmartSplitTransactions({
        idPrefix: makeId("split"),
        payerAccount,
        receivableAccount,
        totalBill,
        headcount,
        categoryId: input.categoryId,
        note: input.note,
        occurredAt: input.occurredAt,
        now,
      });

      commitSnapshot((prev) => {
        const hasReceivable = prev.accounts.some(
          (a) => a.id === receivableAccount.id,
        );
        return {
          ...prev,
          accounts: hasReceivable
            ? prev.accounts
            : [...prev.accounts, receivableAccount],
          transactions: [
            attachTransactionFingerprint(expenseTx),
            attachTransactionFingerprint(receivableTransferTx),
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
    [accounts, defaultLiquidAccount, makeId, commitSnapshot, setStatusMessage],
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
          ...(repaymentTransferTx
            ? [attachTransactionFingerprint(repaymentTransferTx)]
            : []),
          ...prev.transactions.map((tx) =>
            tx.id === expenseTxId ? updatedExpenseTx : tx,
          ),
        ],
      }));

      setStatusMessage(
        `Đã thu hồi ${targetTx.splitInfo.receivableAmount.toLocaleString("vi-VN")} ₫ tiền ứng hộ về ví.`,
      );
    },
    [
      activeTransactions,
      defaultLiquidAccount,
      makeId,
      commitSnapshot,
      setStatusMessage,
    ],
  );

  return {
    reconcileAccount,
    addAccount,
    addSplitBillTransaction,
    settleSplitBill,
  };
}
