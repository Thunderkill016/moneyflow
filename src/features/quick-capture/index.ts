"use client";

import { useCallback } from "react";
import {
  attachTransactionFingerprint,
  deduplicateTransactions,
  parseBankNotificationSms,
  parseQuickInput,
  parseUniversalCsvImportWithStats,
  type ParsedBankSmsResult,
  type ParsedQuickCommand,
} from "../../core/engine/index.ts";
import { convertToVnd, type Account } from "../../core/schema/account.schema.ts";
import type { Transaction } from "../../core/schema/transaction.schema.ts";
import type { MoneyFlowSnapshot } from "../../core/storage/db.local.ts";

export {
  computeMonthlyCashflow,
  computeAccountBalances,
  computeNetWorthSummary,
  createReconcileTransaction,
  createTransferTransaction,
  parseBankNotificationSms,
  parseQuickInput,
  parseVietnameseAmount,
  type ParsedBankSmsResult,
  type ParsedQuickCommand,
} from "../../core/engine/index.ts";

export function appendNumpadToken(currentDigits: string, token: string): string {
  if (token === "C") return "";
  if (token === "BACK") return currentDigits.slice(0, -1);

  if (currentDigits.length >= 12) return currentDigits;

  if (token === "00" || token === "000") {
    if (!currentDigits || currentDigits === "0") return "";
    return `${currentDigits}${token}`.slice(0, 12);
  }

  if (/^\d$/u.test(token)) {
    if (currentDigits === "0") return token;
    return `${currentDigits}${token}`;
  }

  return currentDigits;
}

export function parseNumpadAmount(digits: string): number {
  if (!digits) return 0;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export interface BankSmsImportOutcome {
  parsed: ParsedBankSmsResult | null;
  imported: boolean;
  skippedDuplicate: boolean;
  detectedBalanceDeltaVnd: number | null;
  targetAccountName: string | null;
}

export function useQuickCaptureActions(params: {
  accounts: readonly Account[];
  defaultLiquidAccount: Account | undefined;
  existingTransactions: readonly Transaction[];
  activeEventName?: string | null;
  makeId: (prefix: string) => string;
  commitSnapshot: (
    updater: (prev: MoneyFlowSnapshot) => MoneyFlowSnapshot,
  ) => void;
  setStatusMessage: (msg: string | null) => void;
}) {
  const {
    accounts,
    defaultLiquidAccount,
    existingTransactions,
    activeEventName,
    makeId,
    commitSnapshot,
    setStatusMessage,
  } = params;

  const previewQuickCommand = useCallback(
    (rawCommand: string, defaultAccountId?: string): ParsedQuickCommand[] => {
      const fallbackId = defaultAccountId ?? defaultLiquidAccount?.id ?? "acc-tcb";
      return parseQuickInput(rawCommand, accounts, fallbackId);
    },
    [accounts, defaultLiquidAccount],
  );

  const submitQuickCommand = useCallback(
    (
      rawCommand: string,
      options?: {
        defaultAccountId?: string;
        excludeFromReports?: boolean;
        eventTag?: string;
      },
    ): number => {
      const parsed = previewQuickCommand(rawCommand, options?.defaultAccountId);
      if (parsed.length === 0) {
        setStatusMessage(
          'Chưa nhận diện được số tiền — thử "cf 35k, xăng 70k" hoặc "hoàn tiền shopee 120k".',
        );
        return 0;
      }

      const now = Date.now();
      const created: Transaction[] = parsed.map((cmd, idx) =>
        attachTransactionFingerprint({
          id: makeId("cmd"),
          type: cmd.type,
          amount: cmd.amount,
          accountId: cmd.accountId,
          toAccountId: cmd.toAccountId,
          categoryId: cmd.categoryId,
          note: cmd.note,
          occurredAt: now + idx,
          syncStatus: "PENDING",
          updatedAt: now,
          source: "NLP",
          ...(cmd.isRefund ? { isRefund: true } : {}),
          ...(options?.excludeFromReports ? { excludeFromReports: true } : {}),
          ...(options?.eventTag ?? activeEventName
            ? { eventTag: options?.eventTag ?? activeEventName ?? undefined }
            : {}),
        }),
      );

      commitSnapshot((prev) => ({
        ...prev,
        transactions: [...created, ...prev.transactions],
      }));

      setStatusMessage(
        `Đã ghi ${created.length} giao dịch tức thì (${created
          .map((t) => `${t.note}: ${t.amount.toLocaleString("vi-VN")} ₫`)
          .join(" · ")}).`,
      );
      return created.length;
    },
    [previewQuickCommand, activeEventName, makeId, commitSnapshot, setStatusMessage],
  );

  const previewBankSms = useCallback(
    (rawSms: string, defaultAccountId?: string): ParsedBankSmsResult | null => {
      const fallbackId = defaultAccountId ?? defaultLiquidAccount?.id ?? "acc-tcb";
      return parseBankNotificationSms(rawSms, accounts, fallbackId);
    },
    [accounts, defaultLiquidAccount],
  );

  const importBankSms = useCallback(
    (
      rawSms: string,
      options?: { defaultAccountId?: string; autoReconcileBalance?: boolean },
    ): BankSmsImportOutcome => {
      const fallbackId =
        options?.defaultAccountId ?? defaultLiquidAccount?.id ?? "acc-tcb";
      const parsed = parseBankNotificationSms(rawSms, accounts, fallbackId);
      if (!parsed) {
        setStatusMessage(
          "Chưa nhận diện được biến động số dư — hãy dán nguyên tin nhắn từ ngân hàng/MoMo.",
        );
        return {
          parsed: null,
          imported: false,
          skippedDuplicate: false,
          detectedBalanceDeltaVnd: null,
          targetAccountName: null,
        };
      }

      const now = Date.now();
      const targetAccount = accounts.find((a) => a.id === parsed.accountId);
      const candidateTx = attachTransactionFingerprint({
        id: makeId("sms"),
        type: parsed.type,
        amount: parsed.amount,
        accountId: parsed.accountId,
        categoryId: parsed.categoryId,
        note: parsed.note,
        occurredAt: parsed.occurredAt,
        syncStatus: "PENDING",
        updatedAt: now,
        source: "SMS_NOTIFICATION",
        ...(parsed.isRefund ? { isRefund: true } : {}),
      });

      const deduped = deduplicateTransactions([candidateTx], existingTransactions);
      if (deduped.unique.length === 0) {
        setStatusMessage(
          `SMS trùng fingerprint (${parsed.note} ${parsed.amount.toLocaleString("vi-VN")} ₫) — đã bỏ qua để tránh nhân đôi.`,
        );
        return {
          parsed,
          imported: false,
          skippedDuplicate: true,
          detectedBalanceDeltaVnd: null,
          targetAccountName: targetAccount?.name ?? null,
        };
      }

      const signedEffect =
        parsed.type === "INCOME" ? parsed.amount : -parsed.amount;
      const estimatedAfter = (targetAccount?.currentBalance ?? 0) + signedEffect;
      const detectedDelta =
        parsed.detectedBalance !== undefined
          ? parsed.detectedBalance - estimatedAfter
          : null;

      const extraReconcileTx: Transaction[] = [];
      if (
        options?.autoReconcileBalance &&
        detectedDelta !== null &&
        detectedDelta !== 0
      ) {
        extraReconcileTx.push({
          id: makeId("rec"),
          type: "RECONCILE",
          amount: Math.abs(detectedDelta),
          reconcileDelta: detectedDelta,
          accountId: parsed.accountId,
          categoryId: "khop-so-du",
          note: `Khớp theo SD SMS ${parsed.bankLabel}`,
          occurredAt: now + 1,
          syncStatus: "PENDING",
          updatedAt: now,
          source: "SMS_NOTIFICATION",
        });
      }

      commitSnapshot((prev) => ({
        ...prev,
        accounts:
          extraReconcileTx.length > 0
            ? prev.accounts.map((acc) =>
                acc.id === parsed.accountId
                  ? { ...acc, trustedThroughDate: now, updatedAt: now }
                  : acc,
              )
            : prev.accounts,
        transactions: [...extraReconcileTx, ...deduped.unique, ...prev.transactions],
      }));

      setStatusMessage(
        extraReconcileTx.length > 0
          ? `Đã ghi SMS ${parsed.bankLabel} (${parsed.amount.toLocaleString("vi-VN")} ₫) & khớp số dư thực tế.`
          : `Đã ghi từ SMS ${parsed.bankLabel}: ${parsed.note} (${parsed.amount.toLocaleString("vi-VN")} ₫).`,
      );

      return {
        parsed,
        imported: true,
        skippedDuplicate: false,
        detectedBalanceDeltaVnd: detectedDelta,
        targetAccountName: targetAccount?.name ?? null,
      };
    },
    [
      accounts,
      defaultLiquidAccount,
      existingTransactions,
      makeId,
      commitSnapshot,
      setStatusMessage,
    ],
  );

  const importCsvRows = useCallback(
    (
      rawCsv: string,
      accountId: string,
    ): { importedCount: number; skippedDuplicatesCount: number } => {
      const existingFingerprints = new Set(
        existingTransactions
          .map((tx) => attachTransactionFingerprint(tx).fingerprint)
          .filter((fp): fp is string => Boolean(fp)),
      );
      const { rows, skippedDuplicatesCount } = parseUniversalCsvImportWithStats(
        rawCsv,
        accountId,
        Date.now(),
        existingFingerprints,
      );
      if (rows.length === 0) {
        setStatusMessage(
          skippedDuplicatesCount > 0
            ? `Tất cả ${skippedDuplicatesCount} dòng CSV đều trùng với dữ liệu hiện tại.`
            : "Không tìm thấy dòng CSV hợp lệ — kiểm tra cột Ngày, Số tiền, Ghi chú.",
        );
        return { importedCount: 0, skippedDuplicatesCount };
      }

      const targetAcc = accounts.find((a) => a.id === accountId);
      const now = Date.now();
      const created: Transaction[] = rows.map((row) => ({
        id: makeId("csv"),
        type: row.type,
        amount: row.amount,
        accountId: row.accountId,
        categoryId: row.categoryId,
        note: row.note,
        occurredAt: row.occurredAt,
        fingerprint: row.fingerprint,
        syncStatus: "PENDING",
        updatedAt: now,
        source: "CSV_IMPORT",
      }));

      commitSnapshot((prev) => ({
        ...prev,
        transactions: [...created, ...prev.transactions],
      }));

      const totalVnd = created.reduce(
        (sum, tx) => sum + convertToVnd(tx.amount, targetAcc?.currency ?? "VND"),
        0,
      );
      setStatusMessage(
        `Đã import ${created.length} dòng từ CSV (${totalVnd.toLocaleString("vi-VN")} ₫)${
          skippedDuplicatesCount > 0
            ? ` · bỏ qua ${skippedDuplicatesCount} dòng trùng lặp`
            : ""
        }.`,
      );
      return { importedCount: created.length, skippedDuplicatesCount };
    },
    [accounts, existingTransactions, makeId, commitSnapshot, setStatusMessage],
  );

  return {
    previewQuickCommand,
    submitQuickCommand,
    previewBankSms,
    importBankSms,
    importCsvRows,
  };
}
