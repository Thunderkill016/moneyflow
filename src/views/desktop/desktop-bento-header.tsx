"use client";

import {
  Download,
  Flame,
  MessageSquareText,
  Mic,
  MicOff,
  MonitorSmartphone,
  Plane,
  Plus,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { useMemo, useState, type RefObject } from "react";
import { getCategoryById } from "../../core/schema/transaction.schema.ts";
import {
  deriveCashflowHighlights,
  type ParsedQuickCommand,
  type TransactionController,
} from "../../features/transactions/use-transaction-controller.ts";
import { formatCompactVnd, formatMoney } from "../../shared/format.ts";
import { getSpeechRecognitionCtor } from "../../shared/speech-recognition.ts";
import {
  Button,
  Card,
  MoneyFlowBrandMark,
  ThemeToggleControl,
  cn,
} from "../../shared/ui.tsx";

const PACE_BADGE: Record<
  "under" | "on-track" | "ahead",
  { label: string; className: string }
> = {
  under: {
    label: "Nhịp đẹp · Tiết kiệm tốt",
    className:
      "border-emerald-500/35 bg-emerald-500/15 text-emerald-500 dark:text-emerald-300",
  },
  "on-track": {
    label: "Đúng nhịp tháng",
    className:
      "border-cyan-500/35 bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
  },
  ahead: {
    label: "Chi nhanh hơn tốc độ ngày",
    className:
      "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-300",
  },
};

export function DesktopBentoHeader({
  controller,
  quickInputRef,
  onOpenBankSms,
  onOpenTransaction,
  onOpenImport,
  onOpenOnboarding,
  onOpenBudgetEvent,
  onSwitchToMobile,
}: {
  controller: TransactionController;
  quickInputRef: RefObject<HTMLInputElement | null>;
  onOpenBankSms: () => void;
  onOpenTransaction: () => void;
  onOpenImport: () => void;
  onOpenOnboarding: () => void;
  onOpenBudgetEvent: () => void;
  onSwitchToMobile: () => void;
}) {
  const [quickText, setQuickText] = useState("");
  const [excludeQuick, setExcludeQuick] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [whatIfInput, setWhatIfInput] = useState("1tr8");

  const {
    accounts,
    cashflow,
    netWorth,
    syncSummary,
    pendingSplitTransactions,
    snapshot,
  } = controller;

  const quickPreview: ParsedQuickCommand[] = useMemo(
    () =>
      quickText.trim() ? controller.previewQuickCommand(quickText) : [],
    [quickText, controller],
  );

  const whatIfResult = useMemo(
    () => controller.simulateWhatIf(whatIfInput),
    [controller, whatIfInput],
  );

  const highlights = useMemo(
    () => deriveCashflowHighlights(cashflow),
    [cashflow],
  );

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickText.trim()) return;
    const count = controller.submitQuickCommand(quickText, {
      excludeFromReports: excludeQuick || undefined,
    });
    if (count > 0) {
      setQuickText("");
      setExcludeQuick(false);
    }
  };

  const handleVoiceInput = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      controller.setStatusMessage(
        "Trình duyệt này chưa bật Web Speech API — hãy gõ trực tiếp vào thanh lệnh.",
      );
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "vi-VN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      if (transcript.trim()) {
        setQuickText((prev) => (prev ? `${prev}, ${transcript}` : transcript));
      }
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      controller.setStatusMessage("Không thu được giọng nói — kiểm tra quyền mic.");
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleExportJson = () => {
    const json = controller.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `moneyflow-v3-backup-${cashflow.monthKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
    controller.setStatusMessage("Đã xuất file backup JSON MoneyFlow v3.0.");
  };

  const liquidPositive = Math.max(0, netWorth.liquidVnd);
  const investPositive = Math.max(0, netWorth.investmentVnd);
  const debtMag = Math.max(0, netWorth.debtLiabilityVnd);
  const totalAssetsDenominator = Math.max(
    1,
    liquidPositive + investPositive + debtMag,
  );
  const liquidShare = Math.round(
    (liquidPositive / totalAssetsDenominator) * 100,
  );
  const investShare = Math.round(
    (investPositive / totalAssetsDenominator) * 100,
  );
  const debtShare = Math.max(0, 100 - liquidShare - investShare);

  const pendingReceivableTotal = pendingSplitTransactions.reduce(
    (sum, tx) => sum + (tx.splitInfo?.receivableAmount ?? 0),
    0,
  );

  const pace = PACE_BADGE[cashflow.spendingPaceStatus];
  const activeEventName = snapshot.budget.activeEventName ?? null;
  const activeEventBudget = snapshot.budget.activeEventBudgetVnd ?? 0;

  return (
    <header className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--mf-border)] bg-[var(--mf-surface)] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <MoneyFlowBrandMark className="h-9 w-9 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-[var(--mf-text)]">
                MoneyFlow
              </h1>
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-500 dark:text-emerald-300">
                v3.0 TERMINAL
              </span>
            </div>
            <p className="text-xs text-[var(--mf-text-muted)]">
              Local-First Pure Core ·{" "}
              <span className="font-mono">
                {syncSummary.pendingCount > 0
                  ? `${syncSummary.pendingCount} chờ đồng bộ`
                  : "Đồng bộ sạch"}
              </span>
            </p>
          </div>
        </div>

        {/* Omni-Capture Command Bar */}
        <form
          onSubmit={handleQuickSubmit}
          className="relative flex min-w-[300px] flex-1 max-w-2xl items-center gap-2 rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-1.5 focus-within:border-emerald-500"
        >
          <Zap className="h-4 w-4 shrink-0 text-emerald-400" />
          <input
            ref={quickInputRef}
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            placeholder='Ghi siêu tốc (Ctrl+K): "cf 35k, xăng 70k, hoàn tiền shopee 120k, ck 5tr sang invest"'
            aria-label="Thanh nhập nhanh giao dịch"
            className="w-full bg-transparent text-sm text-[var(--mf-text)] placeholder:text-[var(--mf-text-subtle)] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setExcludeQuick((v) => !v)}
            title="Đánh dấu khoản đột xuất / không tính hạn mức Safe-to-Spend"
            className={cn(
              "shrink-0 rounded-lg px-2 py-1 text-[11px] font-medium transition",
              excludeQuick
                ? "bg-amber-500/20 text-amber-500 dark:text-amber-300"
                : "text-[var(--mf-text-subtle)] hover:text-[var(--mf-text)]",
            )}
          >
            Ngoại lệ
          </button>
          <button
            type="button"
            onClick={handleVoiceInput}
            title="Nhập bằng giọng nói tiếng Việt"
            aria-label="Nhập giao dịch bằng giọng nói"
            className={cn(
              "rounded-lg p-1.5 transition",
              isListening
                ? "bg-rose-500/20 text-rose-400 animate-pulse"
                : "text-[var(--mf-text-muted)] hover:bg-[var(--mf-surface)] hover:text-[var(--mf-text)]",
            )}
          >
            {isListening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
          <Button type="submit" variant="primary" size="sm">
            Ghi lệnh
          </Button>

          {quickPreview.length > 0 ? (
            <div className="absolute top-full left-0 right-0 z-30 mt-2 rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface)] p-2.5 shadow-xl">
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--mf-text-muted)]">
                <span>Xem trước bóc tách ({quickPreview.length} giao dịch)</span>
                <span className="font-mono">Nhấn Enter để ghi</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {quickPreview.map((item, idx) => {
                  const cat = getCategoryById(item.categoryId);
                  const acc = accounts.find((a) => a.id === item.accountId);
                  return (
                    <span
                      key={`${item.note}-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2.5 py-1 text-xs"
                    >
                      <span className="font-semibold text-[var(--mf-text)]">
                        {item.note}
                      </span>
                      <span
                        className={cn(
                          "font-mono tabular-nums font-bold",
                          item.type === "INCOME"
                            ? "text-emerald-400"
                            : item.type === "TRANSFER"
                              ? "text-cyan-400"
                              : "text-rose-400",
                        )}
                      >
                        {formatMoney(item.amount)}
                      </span>
                      <span className="text-[11px] text-[var(--mf-text-muted)]">
                        · {cat.shortLabel}
                        {acc ? ` (${acc.name})` : ""}
                      </span>
                      {item.isRefund ? (
                        <span className="rounded bg-emerald-500/20 px-1 text-[10px] font-semibold text-emerald-400">
                          ↺ Hoàn tiền
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </form>

        {/* Action Strip */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={onOpenBankSms}>
            <MessageSquareText className="h-3.5 w-3.5 text-cyan-400" />
            Dán SMS
          </Button>
          <Button variant="primary" size="sm" onClick={onOpenTransaction}>
            <Plus className="h-3.5 w-3.5" />
            Giao dịch
          </Button>
          <Button variant="secondary" size="sm" onClick={onOpenImport}>
            <Upload className="h-3.5 w-3.5 text-indigo-400" />
            Import 3 nguồn
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportJson}
            title="Xuất file backup JSON MoneyFlow v3"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenOnboarding}
            title="Khởi tạo nhanh 15 giây"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={controller.syncNow}
            title="Đồng bộ Local-First & cập nhật Widget Android"
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
          </Button>
          <ThemeToggleControl compact />
          <Button
            variant="ghost"
            size="sm"
            onClick={onSwitchToMobile}
            title="Chuyển sang giao diện 1-Thumb Mobile"
          >
            <MonitorSmartphone className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Decision Compass Bento Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Card 1: Safe-to-Spend & Spending Pace + Inline What-If */}
        <Card className="lg:col-span-5 flex flex-col justify-between gap-3 border-emerald-500/20">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--mf-text-muted)]">
                  Safe-to-Spend hôm nay
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                    pace.className,
                  )}
                >
                  {pace.label}
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-2.5">
                <span className="font-mono text-3xl font-bold tracking-tight tabular-nums text-emerald-400">
                  {formatMoney(cashflow.safeToSpendDaily)}
                </span>
                <span className="text-xs text-[var(--mf-text-muted)]">
                  / ngày ({cashflow.remainingDaysInMonth} ngày còn lại)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenBudgetEvent}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2.5 py-1.5 text-xs font-medium text-[var(--mf-text-muted)] hover:border-emerald-500/40 hover:text-[var(--mf-text)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Hạn mức
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--mf-text-muted)]">
                Nhịp chi: <strong className="font-mono text-[var(--mf-text)]">{cashflow.spendingPacePct}%</strong>{" "}
                hạn mức ({cashflow.elapsedMonthPct}% tháng đã qua)
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-amber-400">
                <Flame className="h-3.5 w-3.5" />
                {cashflow.noSpendStreakDays} ngày 0đ
              </span>
            </div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--mf-surface-2)]">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  cashflow.spendingPaceStatus === "ahead"
                    ? "bg-amber-500"
                    : "bg-emerald-500",
                )}
                style={{ width: `${Math.min(100, cashflow.spendingPacePct)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400"
                style={{ left: `${Math.min(99, cashflow.elapsedMonthPct)}%` }}
                title={`Mốc thời gian tháng: ${cashflow.elapsedMonthPct}%`}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--mf-text-muted)]">
              <span>
                Quỹ tháng còn:{" "}
                <strong className="font-mono tabular-nums text-[var(--mf-text)]">
                  {formatCompactVnd(cashflow.safeToSpendMonth)}
                </strong>
              </span>
              {cashflow.refundNetOffTotal > 0 ? (
                <span className="text-emerald-400">
                  ↺ Đã cấn trừ hoàn tiền: {formatCompactVnd(cashflow.refundNetOffTotal)}
                </span>
              ) : null}
              {cashflow.excludedExpenseTotal > 0 ? (
                <span className="text-amber-400">
                  Khoản ngoại lệ tách riêng: {formatCompactVnd(cashflow.excludedExpenseTotal)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Inline What-If Simulator */}
          <div className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-400">
                Ướm mua What-If
              </span>
              <input
                value={whatIfInput}
                onChange={(e) => setWhatIfInput(e.target.value)}
                aria-label="Số tiền ướm mua What-If"
                placeholder="VD: 2tr5"
                className="w-24 rounded-lg border border-[var(--mf-border-strong)] bg-[var(--mf-surface)] px-2 py-1 font-mono text-xs font-semibold text-[var(--mf-text)] focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-xs text-[var(--mf-text-muted)]">
                → còn{" "}
                <strong
                  className={cn(
                    "font-mono tabular-nums",
                    whatIfResult.severity === "danger"
                      ? "text-rose-400"
                      : whatIfResult.severity === "caution"
                        ? "text-amber-400"
                        : "text-emerald-400",
                  )}
                >
                  {formatMoney(whatIfResult.newDailySafeToSpend)}/ngày
                </strong>
                {whatIfResult.savingsDelayDays > 0
                  ? ` (trễ mục tiêu ${whatIfResult.savingsDelayDays} ngày)`
                  : ""}
              </span>
            </div>
          </div>
        </Card>

        {/* Card 2: 3-Tier Net Worth + Receivable Alert + Active Event Mode */}
        <Card className="lg:col-span-4 flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--mf-text-muted)]">
                Tài sản ròng (3 Tầng)
              </span>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-[var(--mf-text)]">
                {formatMoney(netWorth.netWorthVnd)}
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenBudgetEvent}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition",
                activeEventName
                  ? "border-indigo-500/45 bg-indigo-500/15 text-indigo-400"
                  : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text-muted)] hover:text-[var(--mf-text)]",
              )}
            >
              <Plane className="h-3.5 w-3.5" />
              {activeEventName ? activeEventName : "Bật Chuyến đi"}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--mf-surface-2)]">
              <div
                className="bg-indigo-500"
                style={{ width: `${liquidShare}%` }}
                title="Thanh khoản"
              />
              <div
                className="bg-emerald-500"
                style={{ width: `${investShare}%` }}
                title="Tích lũy & Đầu tư"
              />
              <div
                className="bg-rose-500"
                style={{ width: `${debtShare}%` }}
                title="Công nợ"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-[var(--mf-surface-2)] p-2">
                <div className="text-[11px] text-[var(--mf-text-muted)]">
                  Thanh khoản
                </div>
                <div className="font-mono font-semibold tabular-nums text-indigo-400">
                  {formatCompactVnd(netWorth.liquidVnd)}
                </div>
              </div>
              <div className="rounded-lg bg-[var(--mf-surface-2)] p-2">
                <div className="text-[11px] text-[var(--mf-text-muted)]">
                  Đầu tư
                </div>
                <div className="font-mono font-semibold tabular-nums text-emerald-400">
                  {formatCompactVnd(netWorth.investmentVnd)}
                </div>
              </div>
              <div className="rounded-lg bg-[var(--mf-surface-2)] p-2">
                <div className="text-[11px] text-[var(--mf-text-muted)]">
                  Nợ / Thẻ
                </div>
                <div className="font-mono font-semibold tabular-nums text-rose-400">
                  {formatCompactVnd(netWorth.debtVnd)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {activeEventName ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-500/10 px-2 py-1 text-indigo-400">
                <Plane className="h-3 w-3" />
                Sự kiện: <strong className="font-mono">{formatCompactVnd(cashflow.activeEventSpentVnd)}</strong>
                {activeEventBudget > 0
                  ? ` / ${formatCompactVnd(activeEventBudget)}`
                  : ""}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--mf-text-muted)]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Runway dự phòng:{" "}
                <strong className="font-mono text-[var(--mf-text)]">
                  {cashflow.runwayMonths} tháng
                </strong>
              </span>
            )}

            {pendingReceivableTotal > 0 ? (
              <span className="font-mono font-semibold text-amber-400">
                Ứng hộ chờ thu: {formatCompactVnd(pendingReceivableTotal)}
              </span>
            ) : null}
          </div>
        </Card>

        {/* Card 3: Monthly Cashflow & 31-day Spending Heatmap */}
        <Card className="lg:col-span-3 flex flex-col justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--mf-text-muted)]">
              Dòng tiền {cashflow.monthKey}
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-[11px] text-[var(--mf-text-muted)]">
                  Thu ròng
                </div>
                <div className="font-mono font-bold tabular-nums text-emerald-400">
                  +{formatCompactVnd(cashflow.totalIncome)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--mf-text-muted)]">
                  Chi sinh hoạt ròng
                </div>
                <div className="font-mono font-bold tabular-nums text-rose-400">
                  -{formatCompactVnd(cashflow.totalExpense)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--mf-text-muted)]">
                  Chuyển đầu tư
                </div>
                <div className="font-mono font-semibold tabular-nums text-indigo-400">
                  {formatCompactVnd(cashflow.investmentTransfers)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-[var(--mf-text-muted)]">
                  Tỷ lệ tích lũy
                </div>
                <div className="font-mono font-semibold tabular-nums text-cyan-400">
                  {cashflow.savingsRatePct}%
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[var(--mf-text-muted)]">
              <span>Nhịp chi tiêu trong tháng</span>
              <span>{cashflow.daysInMonth} ngày</span>
            </div>
            <div className="grid grid-cols-16 gap-1">
              {cashflow.dailyHeatmap.map((cell) => (
                <div
                  key={cell.day}
                  title={`Ngày ${cell.day}: ${formatMoney(cell.amount)}`}
                  className={cn(
                    "h-2.5 rounded-sm transition",
                    cell.intensity === 0 && "bg-[var(--mf-surface-2)]",
                    cell.intensity === 1 && "bg-emerald-500/35",
                    cell.intensity === 2 && "bg-cyan-500/55",
                    cell.intensity === 3 && "bg-amber-500/75",
                    cell.intensity === 4 && "bg-rose-500",
                  )}
                />
              ))}
            </div>
            {highlights[0] ? (
              <p className="truncate text-[11px] text-[var(--mf-text-muted)]">
                {highlights[0].title}: {highlights[0].detail}
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </header>
  );
}
