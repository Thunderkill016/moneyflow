"use client";

import { useMemo, useState } from "react";
import {
  computeQuickOnboardingPlan,
  parseVietnameseAmount,
} from "../../core/engine/index.ts";
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
import { Button, ModalShell, cn } from "../../shared/ui.tsx";

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

  // Vũ khí 1: What-If Simulator toggle
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [whatIfInput, setWhatIfInput] = useState("1tr8");

  // Vũ khí 2: Smart Split & Debt toggle
  const [splitEnabled, setSplitEnabled] = useState(false);
  const [splitHeadcount, setSplitHeadcount] = useState(4);

  // Công thức 60 giây đầu tiên (3 câu hỏi 30s)
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [onboardLiquidInput, setOnboardLiquidInput] = useState("12tr");
  const [onboardFixedInput, setOnboardFixedInput] = useState("4tr");

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

  const whatIfResult = useMemo(
    () => controller.simulateWhatIf(whatIfInput),
    [controller, whatIfInput],
  );

  const onboardingPreview = useMemo(() => {
    const liquid =
      parseVietnameseAmount(onboardLiquidInput, {
        autoMultiplyThousandForBareSmallNumber: false,
      })?.amount ?? 0;
    const fixed =
      parseVietnameseAmount(onboardFixedInput, {
        autoMultiplyThousandForBareSmallNumber: false,
      })?.amount ?? 0;
    return computeQuickOnboardingPlan({
      liquidBalanceVnd: liquid,
      fixedCommitmentsVnd: fixed,
    });
  }, [onboardLiquidInput, onboardFixedInput]);

  const splitMyShare =
    splitEnabled && amount > 0 ? Math.round(amount / splitHeadcount) : amount;
  const splitReceivable =
    splitEnabled && amount > 0 ? Math.max(0, amount - splitMyShare) : 0;

  const commitCapture = (overrideCategoryId?: string, overrideMode?: TransactionType) => {
    if (!activeAccount) return;
    const effectiveMode = overrideMode ?? mode;
    const effectiveCategory = overrideCategoryId ?? selectedCategoryId;

    if (effectiveMode === "RECONCILE") {
      controller.reconcileAccount(activeAccount.id, amount, note || undefined);
      setDigits("");
      setNote("");
      return;
    }
    if (amount <= 0) return;

    if (effectiveMode === "EXPENSE" && splitEnabled) {
      controller.addSplitBillTransaction({
        totalBill: amount,
        headcount: splitHeadcount,
        accountId: activeAccount.id,
        categoryId: effectiveCategory,
        note: note.trim() || getCategoryById(effectiveCategory).shortLabel,
      });
      setDigits("");
      setNote("");
      setSplitEnabled(false);
      return;
    }

    controller.addTransaction({
      type: effectiveMode,
      amount,
      accountId: activeAccount.id,
      toAccountId: effectiveMode === "TRANSFER" ? toAccountId : undefined,
      categoryId:
        effectiveMode === "INCOME"
          ? "thu-nhap"
          : effectiveMode === "TRANSFER"
            ? controller.accounts.find((a) => a.id === toAccountId)?.group ===
              "INVESTMENT"
              ? "tich-luy"
              : "chuyen-vi"
            : effectiveCategory,
      note:
        note.trim() ||
        (effectiveMode === "INCOME"
          ? "Thu nhập"
          : effectiveMode === "TRANSFER"
            ? "Chuyển / Tích lũy"
            : getCategoryById(effectiveCategory).shortLabel),
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
      {/* Compact Compass Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Hôm nay được tiêu tối đa
            </p>
            <p className="tabular-nums text-xl font-extrabold text-[#5b4fe9]">
              {formatMoney(controller.cashflow.safeToSpendDaily)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-slate-500">
              Tài sản ròng
            </p>
            <p className="tabular-nums text-sm font-bold text-slate-900">
              {formatCompactVnd(controller.netWorth.netWorthVnd)}
            </p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWhatIfOpen((v) => !v)}
            className={cn(
              "rounded-lg border px-2 py-1 text-[11px] font-semibold transition",
              whatIfOpen
                ? "border-[#5b4fe9] bg-indigo-50 text-[#5b4fe9]"
                : "border-slate-200 bg-slate-50 text-slate-700",
            )}
          >
            🔮 Ướm thử mua sắm
          </button>
          <button
            type="button"
            onClick={() => setOnboardOpen(true)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700"
          >
            🚀 Thiết lập 30s
          </button>
          {controller.pendingSplitTransactions.length > 0 ? (
            <button
              type="button"
              onClick={() => setTab("ledger")}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"
            >
              ⏳ {controller.pendingSplitTransactions.length} khoản ứng hộ
            </button>
          ) : null}
        </div>

        {whatIfOpen ? (
          <div className="mt-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase text-indigo-800">
                Ướm thử trước khi rút ví
              </span>
              <input
                type="text"
                value={whatIfInput}
                onChange={(e) => setWhatIfInput(e.target.value)}
                placeholder="VD: 1tr8, 500k"
                className="w-28 rounded-lg border border-indigo-200 bg-white px-2 py-1 text-xs font-bold tabular-nums text-slate-900 focus:border-[#5b4fe9] focus:outline-none"
              />
            </div>
            <p
              className={cn(
                "mt-1.5 text-xs font-medium leading-relaxed",
                whatIfResult.severity === "danger"
                  ? "text-rose-700"
                  : whatIfResult.severity === "caution"
                    ? "text-amber-800"
                    : "text-indigo-900",
              )}
            >
              {whatIfResult.verdictMessage}
            </p>
          </div>
        ) : null}

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
              Ghi 2s (1 ngón)
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
        <main className="flex flex-1 flex-col justify-between gap-2.5 p-3">
          {/* Quick Multi-Command Bar (hỗ trợ cả cú pháp tắt: cf 35, phở 50, xăng 70, 2 củ, 5 lít) */}
          <form onSubmit={handleQuickCommandSubmit} className="flex gap-1.5">
            <input
              type="text"
              value={quickCommand}
              onChange={(e) => setQuickCommand(e.target.value)}
              placeholder="Gõ nhanh: cf 35, phở 50, xăng 70, 1tr35..."
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
          <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-2.5 text-right shadow-xs">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <select
                aria-label="Ví nguồn"
                value={activeAccount?.id ?? ""}
                onChange={(e) => setAccountId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-800"
              >
                {controller.accounts
                  .filter((a) => !a.isArchived && a.id !== "acc-receivable")
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

            <div className="mt-1.5 flex items-baseline justify-end gap-1.5">
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
              placeholder="Ghi chú (tùy chọn) · Chạm icon danh mục bên dưới để lưu liền..."
              className="mt-1.5 w-full border-t border-slate-100 pt-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Smart Split Toggle ("Chia tiền / Trả hộ") */}
          {mode === "EXPENSE" ? (
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setSplitEnabled((v) => !v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition",
                    splitEnabled
                      ? "bg-[#5b4fe9] text-white"
                      : "bg-slate-100 text-slate-700",
                  )}
                >
                  <span>🤝 Chia tiền / Trả hộ</span>
                </button>

                {splitEnabled ? (
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSplitHeadcount(n)}
                        className={cn(
                          "h-6 min-w-6 rounded-md px-1.5 text-[11px] font-bold",
                          splitHeadcount === n
                            ? "bg-indigo-100 text-[#5b4fe9]"
                            : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-400">
                    Bấm số → chạm icon = lưu 1 chạm
                  </span>
                )}
              </div>

              {splitEnabled && amount > 0 ? (
                <p className="mt-1.5 tabular-nums text-[11px] font-medium text-indigo-800">
                  Mình chịu: <strong>{formatMoney(splitMyShare)}</strong> · Ứng
                  hộ (Phải thu):{" "}
                  <strong>{formatMoney(splitReceivable)}</strong>
                </p>
              ) : null}
            </div>
          ) : null}

          {/* 8 Instant 1-Tap Category Buttons */}
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
                      if (category.id === "tich-luy") {
                        setMode("TRANSFER");
                        return;
                      }
                      const nextMode: TransactionType =
                        category.id === "thu-nhap" ? "INCOME" : "EXPENSE";
                      setMode(nextMode);
                      if (amount > 0) {
                        commitCapture(category.id, nextMode);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center transition active:scale-95",
                      selected
                        ? "border-[#5b4fe9] bg-indigo-50/90 text-[#5b4fe9]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200",
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
                    "tabular-nums flex h-11 items-center justify-center rounded-xl text-lg font-bold transition active:scale-95",
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
                className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-600 active:scale-95"
              >
                Xóa hết
              </button>
              <button
                type="button"
                onClick={() =>
                  setDigits((prev) => appendNumpadToken(prev, "BACK"))
                }
                className="flex h-11 items-center justify-center rounded-xl bg-slate-100 text-base font-bold text-slate-700 active:scale-95"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => commitCapture()}
                disabled={mode !== "RECONCILE" && amount <= 0}
                className="flex h-11 items-center justify-center rounded-xl bg-[#5b4fe9] text-xs font-bold text-white shadow-xs transition active:scale-95 disabled:opacity-45"
              >
                {mode === "RECONCILE"
                  ? "KHỚP SỐ DƯ"
                  : mode === "EXPENSE" && splitEnabled
                    ? `CHIA 1/${splitHeadcount}`
                    : "GHI NGAY"}
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 space-y-4 p-3">
          {/* Pending Receivables / Chia bill */}
          {controller.pendingSplitTransactions.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Đang ứng hộ (Chờ bạn trả)
              </p>
              <div className="mt-2 space-y-2">
                {controller.pendingSplitTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">
                        {tx.note}
                      </p>
                      <p className="tabular-nums text-[11px] text-amber-700">
                        Ứng hộ:{" "}
                        {formatMoney(tx.splitInfo?.receivableAmount ?? 0)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => controller.settleSplitBill(tx.id)}
                    >
                      Thu hồi
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

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
              <button
                type="button"
                onClick={controller.resetDemoData}
                className="text-[11px] font-semibold text-[#5b4fe9] underline"
              >
                Nạp dữ liệu mẫu
              </button>
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

      {/* 30s Onboarding Modal (Công thức 60 giây đầu tiên) */}
      <ModalShell
        open={onboardOpen}
        title="La bàn 30 giây đầu tiên"
        onClose={() => setOnboardOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const liquid =
              parseVietnameseAmount(onboardLiquidInput, {
                autoMultiplyThousandForBareSmallNumber: false,
              })?.amount ?? 0;
            const fixed =
              parseVietnameseAmount(onboardFixedInput, {
                autoMultiplyThousandForBareSmallNumber: false,
              })?.amount ?? 0;
            controller.applyQuickOnboarding({
              liquidBalanceVnd: liquid,
              fixedCommitmentsVnd: fixed,
            });
            setOnboardOpen(false);
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-semibold text-slate-700">
            1. Tổng tiền tiêu dùng hiện có trong thẻ/ví?
            <input
              type="text"
              value={onboardLiquidInput}
              onChange={(e) => setOnboardLiquidInput(e.target.value)}
              placeholder="VD: 12tr"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            2. Khoản cố định còn phải giữ tới cuối tháng (nhà, điện, tiết kiệm)?
            <input
              type="text"
              value={onboardFixedInput}
              onChange={(e) => setOnboardFixedInput(e.target.value)}
              placeholder="VD: 4tr"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
          </label>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs font-medium text-indigo-950">
            {onboardingPreview.summaryMessage}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOnboardOpen(false)}
            >
              Đóng
            </Button>
            <Button type="submit" variant="primary">
              Áp dụng ngay
            </Button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
