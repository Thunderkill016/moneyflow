"use client";

import {
  CheckCircle2,
  Delete,
  Flame,
  Laptop,
  MessageSquareText,
  Mic,
  MicOff,
  PieChart,
  Undo2,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { QUICK_TAP_CATEGORIES } from "../../core/schema/transaction.schema.ts";
import {
  appendNumpadToken,
  parseNumpadAmount,
  type TransactionController,
} from "../../features/transactions/use-transaction-controller.ts";
import {
  CATEGORY_EMOJI,
  formatCompactVnd,
  formatMoney,
} from "../../shared/format.ts";
import {
  getSpeechRecognitionCtor,
  triggerHapticTap,
} from "../../shared/speech-recognition.ts";
import {
  Button,
  Card,
  MoneyFlowBrandMark,
  ThemeToggleControl,
  cn,
} from "../../shared/ui.tsx";
import {
  BankSmsDialog,
  BudgetEventDialog,
  ImportDialog,
  ReconcileDialog,
} from "../desktop/desktop-modals.tsx";
import { MobileLedgerTab, MobilePlanTab } from "./mobile-ledger-plan-tabs.tsx";

type MobileTab = "capture" | "ledger" | "plan";
type CaptureMode = "EXPENSE" | "SPLIT" | "REFUND" | "TRANSFER" | "INCOME";

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
  "000",
  "0",
  "BACK",
] as const;

const PRESET_CHIPS: ReadonlyArray<{ label: string; digits: string }> = [
  { label: "35k", digits: "35000" },
  { label: "50k", digits: "50000" },
  { label: "100k", digits: "100000" },
  { label: "200k", digits: "200000" },
  { label: "500k", digits: "500000" },
];

export function MobileCaptureView({
  controller,
  onSwitchToDesktop,
}: {
  controller: TransactionController;
  onSwitchToDesktop: () => void;
}) {
  const [activeTab, setActiveTab] = useState<MobileTab>("capture");
  const [digits, setDigits] = useState("");
  const [mode, setMode] = useState<CaptureMode>("EXPENSE");
  const [selectedAccountId, setSelectedAccountId] = useState(
    controller.defaultLiquidAccount?.id ?? "acc-tcb",
  );
  const [toAccountId, setToAccountId] = useState(
    controller.accounts.find((a) => a.group === "INVESTMENT")?.id ?? "acc-invest",
  );
  const [categoryId, setCategoryId] = useState("an-uong");
  const [note, setNote] = useState("");
  const [excludeFromReports, setExcludeFromReports] = useState(false);
  const [headcount, setHeadcount] = useState(2);
  const [quickCmd, setQuickCmd] = useState("");
  const [isListening, setIsListening] = useState(false);

  const [showSms, setShowSms] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showBudgetEvent, setShowBudgetEvent] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState<string | null>(
    null,
  );

  const { accounts, cashflow, pendingSplitTransactions, lastDeletedIds } =
    controller;
  const amount = parseNumpadAmount(digits);

  const handleVoice = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      controller.setStatusMessage(
        "Trình duyệt chưa hỗ trợ Web Speech — hãy gõ lệnh vào ô trên.",
      );
      return;
    }
    const rec = new Ctor();
    rec.lang = "vi-VN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setIsListening(true);
    rec.onresult = (ev) => {
      const spoken = ev.results[0]?.[0]?.transcript ?? "";
      if (spoken.trim()) {
        setQuickCmd((prev) => (prev ? `${prev}, ${spoken}` : spoken));
      }
      setIsListening(false);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    rec.start();
  };

  const handleQuickCmdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCmd.trim()) return;
    triggerHapticTap(15);
    const n = controller.submitQuickCommand(quickCmd, {
      defaultAccountId: selectedAccountId,
      excludeFromReports: excludeFromReports || undefined,
    });
    if (n > 0) setQuickCmd("");
  };

  const handleCaptureSubmit = () => {
    if (amount <= 0) return;
    triggerHapticTap(18);

    if (mode === "SPLIT") {
      controller.addSplitBillTransaction({
        totalBill: amount,
        headcount,
        accountId: selectedAccountId,
        categoryId,
        note: note.trim() || "Chia bill nhanh",
      });
    } else if (mode === "TRANSFER") {
      controller.addTransaction({
        type: "TRANSFER",
        amount,
        accountId: selectedAccountId,
        toAccountId,
        categoryId: "tich-luy",
        note: note.trim() || "Chuyển ví / Tích lũy",
      });
    } else {
      controller.addTransaction({
        type: mode === "INCOME" || mode === "REFUND" ? "INCOME" : "EXPENSE",
        amount,
        accountId: selectedAccountId,
        categoryId: mode === "INCOME" ? "thu-nhap" : categoryId,
        note:
          note.trim() ||
          (mode === "REFUND" ? "Hoàn tiền giao dịch" : "Ghi nhanh 1-chạm"),
        isRefund: mode === "REFUND" ? true : undefined,
        excludeFromReports: excludeFromReports || undefined,
      });
    }

    setDigits("");
    setNote("");
    setExcludeFromReports(false);
  };

  return (
    <div className="min-h-screen bg-[var(--mf-bg)] pb-24 text-[var(--mf-text)]">
      {/* Mobile Header */}
      <header className="sticky top-0 z-20 border-b border-[var(--mf-border)] bg-[var(--mf-bg)]/95 px-3.5 py-2.5 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <MoneyFlowBrandMark className="h-8 w-8 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--mf-text-muted)]">
                <span>Safe/ngày</span>
                <span className="inline-flex items-center gap-0.5 font-mono text-amber-400">
                  <Flame className="h-3 w-3" />
                  {cashflow.noSpendStreakDays}N
                </span>
              </div>
              <div className="font-mono text-base font-bold tabular-nums text-emerald-400">
                {formatMoney(cashflow.safeToSpendDaily)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowSms(true)}
            >
              <MessageSquareText className="h-3.5 w-3.5 text-cyan-400" />
              SMS
            </Button>
            <ThemeToggleControl compact />
            <Button
              variant="ghost"
              size="sm"
              onClick={onSwitchToDesktop}
              aria-label="Mở giao diện Desktop Terminal"
            >
              <Laptop className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3.5 pt-3">
        {controller.statusMessage ? (
          <div
            role="status"
            className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400"
          >
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              {controller.statusMessage}
            </span>
            <button
              type="button"
              onClick={() => controller.setStatusMessage(null)}
              aria-label="Ẩn thông báo"
              className="p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {activeTab === "capture" ? (
          <div className="space-y-3">
            {/* NLP + Voice Command Bar */}
            <form
              onSubmit={handleQuickCmdSubmit}
              className="flex items-center gap-1.5 rounded-2xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface)] px-3 py-2"
            >
              <Zap className="h-4 w-4 shrink-0 text-emerald-400" />
              <input
                value={quickCmd}
                onChange={(e) => setQuickCmd(e.target.value)}
                placeholder='Gõ nhanh: "cf 35k, hoàn tiền shopee 90k"'
                className="w-full bg-transparent text-xs text-[var(--mf-text)] placeholder:text-[var(--mf-text-subtle)] focus:outline-none"
              />
              <button
                type="button"
                onClick={handleVoice}
                aria-label="Nói lệnh giao dịch"
                className={cn(
                  "rounded-lg p-1.5",
                  isListening
                    ? "bg-rose-500/20 text-rose-400 animate-pulse"
                    : "text-[var(--mf-text-muted)]",
                )}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
              <Button type="submit" variant="primary" size="sm">
                Ghi
              </Button>
            </form>

            {/* Amount Display + Mode Switcher */}
            <Card className="space-y-3 p-3.5">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: "EXPENSE", label: "Chi tiêu" },
                    { id: "SPLIT", label: "Chia bill" },
                    { id: "REFUND", label: "↺ Hoàn tiền" },
                    { id: "TRANSFER", label: "Chuyển ví" },
                    { id: "INCOME", label: "Thu nhập" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      triggerHapticTap(8);
                      setMode(item.id);
                    }}
                    className={cn(
                      "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
                      mode === item.id
                        ? "border-emerald-500/45 bg-emerald-500/20 text-emerald-400"
                        : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text-muted)]",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-baseline justify-between gap-2 rounded-xl bg-[var(--mf-surface-2)] px-3.5 py-3">
                <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-[var(--mf-text)]">
                  {amount > 0 ? formatMoney(amount) : "0 ₫"}
                </span>
                <button
                  type="button"
                  onClick={() => setExcludeFromReports((v) => !v)}
                  className={cn(
                    "rounded-lg border px-2 py-1 text-[10px] font-semibold",
                    excludeFromReports
                      ? "border-amber-500/45 bg-amber-500/20 text-amber-400"
                      : "border-[var(--mf-border)] text-[var(--mf-text-muted)]",
                  )}
                >
                  {excludeFromReports ? "Ngoài hạn mức" : "Tính hạn mức"}
                </button>
              </div>

              {/* Preset Amount Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {PRESET_CHIPS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      triggerHapticTap(8);
                      setDigits(preset.digits);
                    }}
                    className="shrink-0 rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-1 font-mono text-xs font-semibold text-cyan-400"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setDigits("")}
                  className="ml-auto shrink-0 rounded-lg px-2.5 py-1 text-xs text-rose-400"
                >
                  Xóa số
                </button>
              </div>

              {/* Accounts Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {accounts
                  .filter((a) => !a.isArchived)
                  .map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={cn(
                        "shrink-0 rounded-xl border px-2.5 py-1.5 text-left text-[11px]",
                        selectedAccountId === acc.id
                          ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-400"
                          : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text-muted)]",
                      )}
                    >
                      <div className="font-semibold">{acc.name}</div>
                      <div className="font-mono text-[10px]">
                        {formatCompactVnd(acc.currentBalance)}
                      </div>
                    </button>
                  ))}
              </div>

              {mode === "TRANSFER" ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px]">
                  <span className="shrink-0 text-[var(--mf-text-muted)]">
                    Đến:
                  </span>
                  {accounts
                    .filter((a) => a.id !== selectedAccountId)
                    .map((acc) => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setToAccountId(acc.id)}
                        className={cn(
                          "shrink-0 rounded-lg border px-2.5 py-1 font-semibold",
                          toAccountId === acc.id
                            ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-400"
                            : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text-muted)]",
                        )}
                      >
                        {acc.name}
                      </button>
                    ))}
                </div>
              ) : mode === "SPLIT" ? (
                <div className="flex items-center justify-between rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs">
                  <span className="text-amber-400 font-semibold">
                    Chia đều {headcount} người (mình{" "}
                    {formatMoney(Math.round(amount / headcount))})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setHeadcount((n) => Math.max(2, n - 1))}
                    >
                      -
                    </Button>
                    <span className="font-mono font-bold">{headcount}</span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setHeadcount((n) => Math.min(20, n + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {QUICK_TAP_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={cn(
                        "shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-medium",
                        categoryId === cat.id
                          ? "border-emerald-500/45 bg-emerald-500/15 text-emerald-400"
                          : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text-muted)]",
                      )}
                    >
                      {CATEGORY_EMOJI[cat.id] ?? "💳"} {cat.shortLabel}
                    </button>
                  ))}
                </div>
              )}

              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú ngắn (VD: Phở bò, Grab sân bay)..."
                className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-xs text-[var(--mf-text)]"
              />

              {/* 1-Thumb Tactile Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {NUMPAD_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      triggerHapticTap(8);
                      setDigits((prev) => appendNumpadToken(prev, key));
                    }}
                    className="flex h-12 items-center justify-center rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] font-mono text-lg font-bold text-[var(--mf-text)] active:scale-95"
                  >
                    {key === "BACK" ? <Delete className="h-5 w-5" /> : key}
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                className="w-full py-3 text-sm font-bold"
                disabled={amount <= 0}
                onClick={handleCaptureSubmit}
              >
                Ghi ngay · {amount > 0 ? formatMoney(amount) : "Nhập số tiền"}
              </Button>
            </Card>
          </div>
        ) : activeTab === "ledger" ? (
          <MobileLedgerTab
            controller={controller}
            onOpenReconcile={(id) => setReconcileAccountId(id)}
          />
        ) : (
          <MobilePlanTab
            controller={controller}
            onOpenImport={() => setShowImport(true)}
            onOpenBudgetEvent={() => setShowBudgetEvent(true)}
          />
        )}
      </main>

      {/* Undo Delete Toast */}
      {lastDeletedIds.length > 0 ? (
        <div className="fixed right-4 bottom-20 left-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-[var(--mf-surface)] px-4 py-3 text-xs shadow-2xl">
          <span>Đã xóa {lastDeletedIds.length} giao dịch</span>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={controller.undoLastDelete}
            >
              <Undo2 className="h-3.5 w-3.5" />
              Hoàn tác
            </Button>
            <button
              type="button"
              onClick={controller.dismissUndoDelete}
              aria-label="Đóng hoàn tác"
              className="p-1 text-[var(--mf-text-muted)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Bottom Sticky Navigation */}
      <nav
        aria-label="Điều hướng di động"
        className="fixed right-0 bottom-0 left-0 z-30 border-t border-[var(--mf-border)] bg-[var(--mf-surface)]/95 px-4 py-2 backdrop-blur"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("capture")}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold",
              activeTab === "capture"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-[var(--mf-text-muted)]",
            )}
          >
            <Zap className="h-4 w-4" />
            Ghi nhanh
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold",
              activeTab === "ledger"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-[var(--mf-text-muted)]",
            )}
          >
            <WalletCards className="h-4 w-4" />
            <span>
              Sổ & Ví
              {pendingSplitTransactions.length > 0
                ? ` (${pendingSplitTransactions.length})`
                : ""}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("plan")}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold",
              activeTab === "plan"
                ? "bg-emerald-500/15 text-emerald-400"
                : "text-[var(--mf-text-muted)]",
            )}
          >
            <PieChart className="h-4 w-4" />
            Kế hoạch
          </button>
        </div>
      </nav>

      {showSms ? (
        <BankSmsDialog
          open
          onClose={() => setShowSms(false)}
          controller={controller}
        />
      ) : null}
      {showImport ? (
        <ImportDialog
          open
          onClose={() => setShowImport(false)}
          controller={controller}
        />
      ) : null}
      {showBudgetEvent ? (
        <BudgetEventDialog
          open
          onClose={() => setShowBudgetEvent(false)}
          controller={controller}
        />
      ) : null}
      {reconcileAccountId ? (
        <ReconcileDialog
          key={reconcileAccountId}
          accountId={reconcileAccountId}
          onClose={() => setReconcileAccountId(null)}
          controller={controller}
        />
      ) : null}
    </div>
  );
}
