"use client";

import {
  CheckCircle2,
  CheckSquare,
  Download,
  EyeOff,
  Flame,
  Plane,
  RefreshCw,
  Scale,
  ShieldCheck,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getCategoryById, type Transaction } from "../../core/schema/transaction.schema.ts";
import {
  groupAccountsByType,
  type TransactionController,
} from "../../features/transactions/use-transaction-controller.ts";
import {
  CATEGORY_EMOJI,
  formatCompactVnd,
  formatDateTime,
  formatMoney,
  formatShortDay,
} from "../../shared/format.ts";
import { triggerHapticTap } from "../../shared/speech-recognition.ts";
import { Button, Card, cn } from "../../shared/ui.tsx";

export function MobileLedgerTab({
  controller,
  onOpenReconcile,
}: {
  controller: TransactionController;
  onOpenReconcile: (accountId: string) => void;
}) {
  const { accounts, activeTransactions, pendingSplitTransactions } = controller;
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const grouped = useMemo(() => groupAccountsByType(accounts), [accounts]);

  return (
    <div className="space-y-4">
      {/* Pending Split Bills Alert */}
      {pendingSplitTransactions.length > 0 ? (
        <Card className="border-amber-500/35 bg-amber-500/10 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wide text-amber-400">
            Tiền bạn bè chưa trả ({pendingSplitTransactions.length})
          </div>
          <div className="space-y-2">
            {pendingSplitTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-[var(--mf-surface)] px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold text-[var(--mf-text)]">
                    {tx.note}
                  </div>
                  <div className="font-mono text-amber-400">
                    Ứng hộ: {formatMoney(tx.splitInfo?.receivableAmount ?? 0)}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    triggerHapticTap(15);
                    controller.settleSplitBill(tx.id);
                  }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Thu hồi
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Daily Timeline */}
      <Card className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--mf-text)]">
            Sổ dòng tiền gần đây
          </h2>
          <span className="font-mono text-xs text-[var(--mf-text-muted)]">
            {activeTransactions.length} mục
          </span>
        </div>

        <div className="space-y-2">
          {activeTransactions.slice(0, 35).map((tx: Transaction) => {
            const cat = getCategoryById(tx.categoryId);
            const acc = accountMap.get(tx.accountId);
            const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : null;
            const emoji = CATEGORY_EMOJI[tx.categoryId] ?? "💳";

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span>{emoji}</span>
                    <span className="truncate font-semibold text-[var(--mf-text)]">
                      {tx.note}
                    </span>
                    {tx.isRefund ? (
                      <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[10px] font-semibold text-emerald-400">
                        ↺ Hoàn
                      </span>
                    ) : null}
                    {tx.excludeFromReports ? (
                      <span className="rounded bg-amber-500/20 px-1 py-0.5 text-[10px] text-amber-400">
                        Ngoại lệ
                      </span>
                    ) : null}
                    {tx.eventTag ? (
                      <span className="rounded bg-indigo-500/20 px-1 py-0.5 text-[10px] text-indigo-400">
                        #{tx.eventTag}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--mf-text-muted)]">
                    <span>{cat.shortLabel}</span>
                    <span>
                      · {acc?.name ?? tx.accountId}
                      {toAcc ? ` → ${toAcc.name}` : ""}
                    </span>
                    <span className="font-mono">{formatDateTime(tx.occurredAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "font-mono font-bold tabular-nums",
                      tx.type === "INCOME"
                        ? "text-emerald-400"
                        : tx.type === "TRANSFER"
                          ? "text-cyan-400"
                          : tx.type === "RECONCILE"
                            ? "text-slate-400"
                            : "text-rose-400",
                    )}
                  >
                    {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                    {formatMoney(tx.amount, acc?.currency ?? "VND")}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      controller.updateTransaction(tx.id, {
                        excludeFromReports: !tx.excludeFromReports,
                      })
                    }
                    aria-label={`Ẩn/hiện ${tx.note} khỏi hạn mức`}
                    className={cn(
                      "rounded-lg p-1.5",
                      tx.excludeFromReports
                        ? "bg-amber-500/20 text-amber-400"
                        : "text-[var(--mf-text-subtle)]",
                    )}
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHapticTap(10);
                      controller.deleteTransaction(tx.id);
                    }}
                    aria-label={`Xóa ${tx.note}`}
                    className="rounded-lg p-1.5 text-[var(--mf-text-subtle)] hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3-Tier Wallets + 1-Tap Reconcile */}
      <Card className="space-y-3">
        <h2 className="text-sm font-bold text-[var(--mf-text)]">
          Ví & Khớp số dư thực tế
        </h2>
        <div className="space-y-2.5">
          {grouped.map((tier) => (
            <div key={tier.group} className="space-y-1.5">
              <div className="flex justify-between text-[11px] font-semibold text-[var(--mf-text-muted)]">
                <span>{tier.group}</span>
                <span className="font-mono tabular-nums text-[var(--mf-text)]">
                  {formatCompactVnd(tier.subtotalBalance)}
                </span>
              </div>
              {tier.accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-xs"
                >
                  <div>
                    <div className="font-semibold text-[var(--mf-text)]">
                      {acc.name}
                    </div>
                    <div className="text-[10px] text-[var(--mf-text-muted)]">
                      {acc.trustedThroughDate ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="h-3 w-3" />
                          Khớp {formatShortDay(acc.trustedThroughDate)}
                        </span>
                      ) : (
                        "Chưa kiểm chứng"
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold tabular-nums text-[var(--mf-text)]">
                      {formatMoney(acc.currentBalance, acc.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenReconcile(acc.id)}
                      aria-label={`Khớp số dư ${acc.name}`}
                      className="rounded-lg border border-[var(--mf-border-strong)] p-1.5 text-[var(--mf-text-muted)] hover:text-emerald-400"
                    >
                      <Scale className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function MobilePlanTab({
  controller,
  onOpenImport,
  onOpenBudgetEvent,
}: {
  controller: TransactionController;
  onOpenImport: () => void;
  onOpenBudgetEvent: () => void;
}) {
  const { cashflow, netWorth, snapshot, widgetSnapshot } = controller;
  const commitments = snapshot.budget.commitments ?? [];
  const [whatIfRaw, setWhatIfRaw] = useState("1tr5");
  const whatIf = useMemo(
    () => controller.simulateWhatIf(whatIfRaw),
    [controller, whatIfRaw],
  );

  const handleExport = () => {
    const json = controller.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `moneyflow-v3-mobile-${cashflow.monthKey}.json`;
    link.click();
    URL.revokeObjectURL(url);
    controller.setStatusMessage("Đã xuất file backup JSON MoneyFlow v3.0.");
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--mf-text)]">
            Sức khỏe Tài chính {cashflow.monthKey}
          </h2>
          <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-400">
            <Flame className="h-3.5 w-3.5" />
            {cashflow.noSpendStreakDays} ngày 0đ
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-[var(--mf-surface-2)] p-2.5">
            <div className="text-[var(--mf-text-muted)]">Tài sản ròng</div>
            <div className="mt-0.5 font-mono font-bold tabular-nums text-[var(--mf-text)]">
              {formatCompactVnd(netWorth.netWorthVnd)}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--mf-surface-2)] p-2.5">
            <div className="text-[var(--mf-text-muted)]">Tích lũy / Tháng</div>
            <div className="mt-0.5 font-mono font-bold tabular-nums text-emerald-400">
              {cashflow.savingsRatePct}% ({cashflow.runwayMonths}T runway)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onOpenBudgetEvent}>
            <Plane className="h-3.5 w-3.5 text-indigo-400" />
            {snapshot.budget.activeEventName
              ? `Sự kiện: ${snapshot.budget.activeEventName}`
              : "Cài hạn mức / Sự kiện"}
          </Button>
          <Button variant="secondary" size="sm" onClick={controller.syncNow}>
            <RefreshCw className="h-3.5 w-3.5 text-emerald-400" />
            Sync Widget ({widgetSnapshot.pendingReview})
          </Button>
        </div>
      </Card>

      {/* What-If Pocket Simulator */}
      <Card className="space-y-2 text-xs">
        <div className="font-bold text-cyan-400">
          Ướm mua món lớn (What-If)
        </div>
        <input
          value={whatIfRaw}
          onChange={(e) => setWhatIfRaw(e.target.value)}
          placeholder="Nhập giá món đồ (VD: 3tr, 850k)"
          className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-sm font-bold text-[var(--mf-text)]"
        />
        <p className="text-[var(--mf-text-muted)]">{whatIf.verdictMessage}</p>
      </Card>

      {/* Commitments Checklist */}
      <Card className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--mf-text)]">
            Hóa đơn cố định tháng
          </h2>
          <span className="font-mono text-xs font-semibold text-amber-400">
            Còn {formatCompactVnd(cashflow.unpaidCommitmentsVnd)}
          </span>
        </div>
        {commitments.length === 0 ? (
          <p className="text-xs text-[var(--mf-text-muted)]">
            Chưa có hóa đơn định kỳ nào.
          </p>
        ) : (
          <div className="space-y-1.5">
            {commitments.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHapticTap(10);
                  controller.toggleCommitmentPaid(item.id);
                }}
                className="flex w-full items-center justify-between rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2">
                  {item.isPaid ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Square className="h-4 w-4 text-[var(--mf-text-subtle)]" />
                  )}
                  <span className={cn(item.isPaid && "line-through opacity-60")}>
                    {item.name}
                  </span>
                </span>
                <span className="font-mono font-semibold">
                  {formatMoney(item.amountVnd)}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* 3-Source Data Portability */}
      <Card className="space-y-2.5">
        <h2 className="text-sm font-bold text-[var(--mf-text)]">
          Di cư dữ liệu cũ & Sao lưu Zero-Loss
        </h2>
        <p className="text-xs text-[var(--mf-text-muted)]">
          Hỗ trợ Neon Archive v1, Flutter mf_fintech_state_v1, Web v2/v3 & CSV.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" size="sm" onClick={onOpenImport}>
            <Upload className="h-3.5 w-3.5" />
            Import 3 Nguồn
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Xuất Backup JSON
          </Button>
        </div>
      </Card>
    </div>
  );
}
