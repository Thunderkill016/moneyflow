"use client";

import { useMemo, useState } from "react";
import {
  QUICK_TAP_CATEGORIES,
  getCategoryById,
  type TransactionType,
} from "../../core/schema/index.ts";
import {
  appendNumpadToken,
  parseNumpadAmount,
} from "../../features/quick-capture/index.ts";
import { groupAccountsByType } from "../../features/accounts-wealth/index.ts";
import type { TransactionController } from "../../features/transactions/use-transaction-controller.ts";
import {
  ACCOUNT_GROUP_META,
  CATEGORY_EMOJI,
  TX_TYPE_META,
  formatCompactVnd,
  formatDateTime,
  formatMoney,
  formatSignedMoney,
} from "../../shared/format.ts";
import { Button, cn } from "../../shared/ui.tsx";

const NUMPAD_KEYS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "00",
  "0",
  "000",
] as const;

export function MobileCaptureView({
  controller,
  onSwitchToDesktop,
}: {
  controller: TransactionController;
  onSwitchToDesktop?: () => void;
}) {
  const [tab, setTab] = useState<"capture" | "ledger">("capture");
  const [mode, setMode] = useState<TransactionType>("EXPENSE");
  const [digits, setDigits] = useState("45000");
  const [selectedCategoryId, setSelectedCategoryId] = useState("an-uong");
  const [accountId, setAccountId] = useState(
    controller.defaultLiquidAccount?.id ?? "acc-tcb",
  );
  const [toAccountId, setToAccountId] = useState(
    controller.accounts.find((a) => a.group === "INVESTMENT")?.id ?? "acc-invest",
  );
  const [note, setNote] = useState("");
  const [quickCommand, setQuickCommand] = useState("");

  const activeAccount =
    controller.accounts.find((a) => a.id === accountId) ??
    controller.accounts[0];
  const amount = parseNumpadAmount(digits);

  const reconcileDelta =
    mode === "RECONCILE" && activeAccount
      ? amount - activeAccount.currentBalance
      : 0;

  const groupedAccounts = useMemo(
    () => groupAccountsByType(controller.accounts),
    [controller.accounts],
  );

  const handleSubmitNumpad = () => {
    if (!activeAccount) return;
    if (mode === "RECONCILE") {
      controller.reconcileAccount(activeAccount.id, amount, note || undefined);
      setDigits("");
      setNote("");
      return;
    }
    if (amount <= 0) return;

    controller.addTransaction({
      type: mode,
      amount,
      accountId: activeAccount.id,
      toAccountId: mode === "TRANSFER" ? toAccountId : undefined,
      categoryId:
        mode === "INCOME"
          ? "thu-nhap"
          : mode === "TRANSFER"
            ? controller.accounts.find((a) => a.id === toAccountId)?.group ===
              "INVESTMENT"
              ? "tich-luy"
              : "chuyen-vi"
            : selectedCategoryId,
      note:
        note.trim() ||
        (mode === "INCOME"
          ? "Thu nhập"
          : mode === "TRANSFER"
            ? "Chuyển / Tích lũy"
            : getCategoryById(selectedCategoryId).shortLabel),
    });
    setDigits("");
    setNote("");
  };

  const handleQuickCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCommand.trim()) return;
    const count = controller.submitQuickCommand(
      quickCommand,
      activeAccount?.id,
    );
    if (count > 0) setQuickCommand("");
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-[#f8f9fc] text-slate-900">
      {/* Compact Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Safe-to-Spend hôm nay
            </p>
            <p className="tabular-nums text-lg font-extrabold text-[#5b4fe9]">
              {formatMoney(controller.cashflow.safeToSpendDaily)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-500">Tài sản ròng</p>
            <p className="tabular-nums text-sm font-bold text-slate-900">
              {formatCompactVnd(controller.netWorth.netWorthVnd)}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("capture")}
              className={cn(
                "rounded-lg py-1.5 text-xs font-semibold transition",
                tab === "capture"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600",
              )}
            >
              Ghi nhanh (Numpad)
            </button>
            <button
              type="button"
              onClick={() => setTab("ledger")}
              className={cn(
                "rounded-lg py-1.5 text-xs font-semibold transition",
                tab === "ledger"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600",
              )}
            >
              Sổ & Ví ({controller.activeTransactions.length})
            </button>
          </div>

          {onSwitchToDesktop ? (
            <button
              type="button"
              onClick={onSwitchToDesktop}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600"
            >
              Desktop
            </button>
          ) : null}
        </div>

        {controller.statusMessage ? (
          <div className="mt-2 flex items-center justify-between rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-800">
            <span>{controller.statusMessage}</span>
            <button
              type="button"
              onClick={() => controller.setStatusMessage(null)}
              className="ml-2 text-indigo-500"
            >
              ✕
            </button>
          </div>
        ) : null}
      </header>

      {tab === "capture" ? (
        <main className="flex flex-1 flex-col justify-between gap-3 p-3">
          {/* Quick Multi-Command Bar */}
          <form onSubmit={handleQuickCommandSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={quickCommand}
              onChange={(e) => setQuickCommand(e.target.value)}
              placeholder="Lệnh nhanh: cf 35k, xăng 70k, mua vàng 5tr"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#5b4fe9] focus:outline-none"
            />
            <Button type="submit" variant="primary" size="sm">
              Ghi
            </Button>
          </form>

          {/* Transaction Type Mode Selector */}
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-200/70 p-1">
            {(
              [
                ["EXPENSE", "Chi tiêu"],
                ["INCOME", "Thu nhập"],
                ["TRANSFER", "Chuyển ví"],
                ["RECONCILE", "Khớp dư"],
              ] as const
            ).map(([txMode, label]) => (
              <button
                key={txMode}
                type="button"
                onClick={() => setMode(txMode)}
                className={cn(
                  "rounded-lg py-1.5 text-[11px] font-semibold transition",
                  mode === txMode
                    ? "bg-white text-[#5b4fe9] shadow-xs"
                    : "text-slate-600",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Numeric Display */}
          <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-right shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <select
                aria-label="Ví nguồn"
                value={activeAccount?.id ?? ""}
                onChange={(e) => setAccountId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800"
              >
                {controller.accounts
                  .filter((a) => !a.isArchived)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCompactVnd(acc.currentBalance)})
                    </option>
                  ))}
              </select>

              {mode === "TRANSFER" ? (
                <select
                  aria-label="Ví đích"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800"
                >
                  {controller.accounts
                    .filter((a) => !a.isArchived && a.id !== activeAccount?.id)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        → {acc.name}
                      </option>
                    ))}
                </select>
              ) : (
                <span className="font-medium text-slate-400">
                  {mode === "RECONCILE"
                    ? "Nhập số dư thực tế"
                    : TX_TYPE_META[mode].label}
                </span>
              )}
            </div>

            <div className="mt-2 flex items-baseline justify-end gap-1.5">
              <span
                className={cn(
                  "tabular-nums text-3xl font-extrabold tracking-tight",
                  mode === "INCOME"
                    ? "text-emerald-600"
                    : mode === "TRANSFER"
                      ? "text-[#5b4fe9]"
                      : mode === "RECONCILE"
                        ? "text-slate-900"
                        : "text-rose-600",
                )}
              >
                {amount > 0 ? formatMoney(amount) : "0 ₫"}
              </span>
            </div>

            {mode === "RECONCILE" && activeAccount ? (
              <p className="mt-1 tabular-nums text-xs text-slate-500">
                Trên app: {formatMoney(activeAccount.currentBalance)} · Độ lệch:{" "}
                <strong
                  className={
                    reconcileDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {formatSignedMoney(reconcileDelta)}
                </strong>
              </p>
            ) : null}

            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (không bắt buộc)..."
              className="mt-2 w-full border-t border-slate-100 pt-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* 8 1-Tap Category Buttons */}
          {mode === "EXPENSE" || mode === "INCOME" ? (
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_TAP_CATEGORIES.map((category) => {
                const selected = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      if (category.id === "thu-nhap") setMode("INCOME");
                      else if (category.id === "tich-luy") setMode("TRANSFER");
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center transition",
                      selected
                        ? "border-[#5b4fe9] bg-indigo-50/90 text-[#5b4fe9]"
                        : "border-slate-200 bg-white text-slate-700",
                    )}
                  >
                    <span className="text-base leading-none">
                      {CATEGORY_EMOJI[category.id] ?? "🏷️"}
                    </span>
                    <span className="line-clamp-1 text-[10px] font-semibold">
                      {category.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Fixed Numpad with 000 & 00 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-3 gap-1.5">
              {NUMPAD_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDigits((prev) => appendNumpadToken(prev, key))}
                  className={cn(
                    "tabular-nums flex h-12 items-center justify-center rounded-xl text-lg font-bold transition active:scale-95",
                    key === "000"
                      ? "bg-indigo-50 text-[#5b4fe9]"
                      : "bg-slate-50 text-slate-900 hover:bg-slate-100",
                  )}
                >
                  {key}
                </button>
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setDigits((prev) => appendNumpadToken(prev, "C"))}
                className="flex h-12 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 active:scale-95"
              >
                Xóa hết
              </button>
              <button
                type="button"
                onClick={() =>
                  setDigits((prev) => appendNumpadToken(prev, "BACK"))
                }
                className="flex h-12 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-700 active:scale-95"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={handleSubmitNumpad}
                disabled={mode !== "RECONCILE" && amount <= 0}
                className="flex h-12 items-center justify-center rounded-xl bg-[#5b4fe9] text-sm font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-45"
              >
                {mode === "RECONCILE" ? "KHỚP SỐ DƯ" : "GHI NGAY"}
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 space-y-4 p-3">
          {/* Compact Account Groups */}
          <div className="space-y-2">
            {groupedAccounts.map(({ group, accounts }) => (
              <div
                key={group}
                className="rounded-2xl border border-slate-200 bg-white p-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {ACCOUNT_GROUP_META[group].label}
                </p>
                <div className="mt-2 divide-y divide-slate-100">
                  {accounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {acc.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {acc.currency}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-sm font-bold text-slate-900">
                          {formatMoney(acc.currentBalance, acc.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setAccountId(acc.id);
                            setMode("RECONCILE");
                            setDigits(String(Math.max(0, acc.currentBalance)));
                            setTab("capture");
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-[#5b4fe9]"
                        >
                          Khớp
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Compact Transaction List */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Giao dịch gần đây
              </h2>
              <span className="text-xs text-slate-500">
                Tích lũy: {controller.cashflow.savingsRatePct}%
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {controller.activeTransactions.slice(0, 25).map((tx) => {
                const signed =
                  tx.type === "EXPENSE"
                    ? -tx.amount
                    : tx.type === "INCOME"
                      ? tx.amount
                      : tx.type === "RECONCILE"
                        ? (tx.reconcileDelta ?? tx.amount)
                        : tx.amount;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm">
                        {CATEGORY_EMOJI[tx.categoryId] ?? "💳"}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {tx.note}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {TX_TYPE_META[tx.type].label} ·{" "}
                          {formatDateTime(tx.occurredAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          "tabular-nums text-sm font-bold",
                          tx.type === "INCOME"
                            ? "text-emerald-600"
                            : tx.type === "EXPENSE"
                              ? "text-rose-600"
                              : "text-indigo-600",
                        )}
                      >
                        {tx.type === "TRANSFER"
                          ? formatMoney(tx.amount)
                          : formatSignedMoney(signed)}
                      </span>
                      <button
                        type="button"
                        aria-label="Xóa giao dịch"
                        onClick={() => controller.deleteTransaction(tx.id)}
                        className="rounded-md px-1.5 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
