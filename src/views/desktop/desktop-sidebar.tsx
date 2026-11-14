"use client";

import {
  CheckSquare,
  Plus,
  Scale,
  ShieldCheck,
  Smartphone,
  Square,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Account } from "../../core/schema/account.schema.ts";
import {
  groupAccountsByType,
  type TransactionController,
} from "../../features/transactions/use-transaction-controller.ts";
import {
  ACCOUNT_GROUP_META,
  CATEGORY_EMOJI,
  formatCompactVnd,
  formatMoney,
  formatShortDay,
} from "../../shared/format.ts";
import { Button, Card, cn } from "../../shared/ui.tsx";

export function DesktopSidebar({
  controller,
  onOpenReconcile,
  onOpenAddAccount,
}: {
  controller: TransactionController;
  onOpenReconcile: (accountId: string) => void;
  onOpenAddAccount: () => void;
}) {
  const { accounts, cashflow, snapshot, widgetSnapshot } = controller;
  const grouped = useMemo(() => groupAccountsByType(accounts), [accounts]);
  const commitments = snapshot.budget.commitments ?? [];

  const [newCommitmentName, setNewCommitmentName] = useState("");
  const [newCommitmentAmount, setNewCommitmentAmount] = useState("");
  const [newCommitmentDay, setNewCommitmentDay] = useState("5");

  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(newCommitmentAmount.replace(/[^\d]/gu, ""));
    if (!newCommitmentName.trim() || !Number.isFinite(numeric) || numeric <= 0) {
      return;
    }
    const day = Number.parseInt(newCommitmentDay, 10) || 1;
    controller.addCommitment(newCommitmentName.trim(), numeric, day);
    setNewCommitmentName("");
    setNewCommitmentAmount("");
  };

  return (
    <aside className="flex flex-col gap-4">
      {/* 3-Tier Wallets + Reconcile */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-[var(--mf-text)]">
              Hệ thống Ví 3 Tầng
            </h2>
          </div>
          <Button variant="secondary" size="sm" onClick={onOpenAddAccount}>
            <Plus className="h-3.5 w-3.5" />
            Thêm ví
          </Button>
        </div>

        <div className="space-y-3">
          {grouped.map((tier) => (
            <div key={tier.group} className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span
                  className={cn(
                    "rounded-md border px-1.5 py-0.5 font-semibold",
                    ACCOUNT_GROUP_META[tier.group].badgeClass,
                  )}
                >
                  {ACCOUNT_GROUP_META[tier.group].label}
                </span>
                <span className="font-mono font-bold tabular-nums text-[var(--mf-text)]">
                  {formatCompactVnd(tier.subtotalBalance)}
                </span>
              </div>

              <div className="space-y-1">
                {tier.accounts.map((acc: Account) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2.5 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--mf-text)]">
                        {acc.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--mf-text-muted)]">
                        {acc.trustedThroughDate ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-400">
                            <ShieldCheck className="h-3 w-3" />
                            Đã khớp {formatShortDay(acc.trustedThroughDate)}
                          </span>
                        ) : (
                          <span>Chưa kiểm chứng số dư</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "font-mono font-bold tabular-nums",
                          acc.currentBalance < 0
                            ? "text-rose-400"
                            : "text-[var(--mf-text)]",
                        )}
                      >
                        {formatMoney(acc.currentBalance, acc.currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenReconcile(acc.id)}
                        title={`Khớp số dư thực tế cho ${acc.name}`}
                        aria-label={`Khớp số dư ${acc.name}`}
                        className="rounded-lg border border-[var(--mf-border-strong)] p-1 text-[var(--mf-text-muted)] hover:border-emerald-500/40 hover:text-emerald-400"
                      >
                        <Scale className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Native Android Widget Contract Preview */}
        <div className="flex items-center justify-between rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[11px] text-[var(--mf-text-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
            Android Widget Sync
          </span>
          <span className="font-mono tabular-nums text-[var(--mf-text)]">
            Safe/ngày: {formatCompactVnd(widgetSnapshot.safeSpend)} ·{" "}
            {widgetSnapshot.pendingReview} chờ duyệt
          </span>
        </div>
      </Card>

      {/* Commitments Checklist */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[var(--mf-text)]">
            Nghĩa vụ cố định tháng
          </h2>
          <span className="font-mono text-xs font-semibold tabular-nums text-amber-400">
            Còn {formatCompactVnd(cashflow.unpaidCommitmentsVnd)}
          </span>
        </div>

        {commitments.length === 0 ? (
          <p className="text-xs text-[var(--mf-text-muted)]">
            Chưa có hóa đơn định kỳ. Thêm tiền nhà, điện nước hoặc trả góp để Safe-to-Spend tự trừ trước.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {commitments.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => controller.toggleCommitmentPaid(item.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-left text-xs transition",
                    item.isPaid
                      ? "border-emerald-500/25 bg-emerald-500/5 text-[var(--mf-text-muted)]"
                      : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text)] hover:border-emerald-500/40",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {item.isPaid ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-[var(--mf-text-subtle)]" />
                    )}
                    <span
                      className={cn(
                        "truncate font-medium",
                        item.isPaid && "line-through",
                      )}
                    >
                      {item.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--mf-text-subtle)]">
                      N{item.dueDay}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono font-semibold tabular-nums">
                    {formatMoney(item.amountVnd)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAddCommitment} className="grid grid-cols-12 gap-1.5">
          <input
            value={newCommitmentName}
            onChange={(e) => setNewCommitmentName(e.target.value)}
            placeholder="Tên (VD: Thuê nhà)"
            aria-label="Tên khoản cố định"
            className="col-span-5 rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2 py-1.5 text-xs text-[var(--mf-text)]"
          />
          <input
            value={newCommitmentAmount}
            onChange={(e) => setNewCommitmentAmount(e.target.value)}
            placeholder="Số tiền"
            aria-label="Số tiền khoản cố định"
            className="col-span-4 rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2 py-1.5 font-mono text-xs text-[var(--mf-text)]"
          />
          <input
            value={newCommitmentDay}
            onChange={(e) => setNewCommitmentDay(e.target.value)}
            placeholder="Ngày"
            aria-label="Ngày đến hạn hàng tháng"
            className="col-span-1 rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-1 py-1.5 text-center font-mono text-xs text-[var(--mf-text)]"
          />
          <Button type="submit" variant="secondary" size="sm" className="col-span-2">
            +
          </Button>
        </form>
      </Card>

      {/* Category Net-Spend Bars */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--mf-text)]">
            Phân bổ chi ròng (Sau hoàn tiền)
          </h2>
          <span className="font-mono text-xs text-[var(--mf-text-muted)]">
            {cashflow.monthKey}
          </span>
        </div>

        {cashflow.categoryBreakdown.length === 0 ? (
          <p className="text-xs text-[var(--mf-text-muted)]">
            Chưa có chi tiêu ròng trong tháng này.
          </p>
        ) : (
          <div className="space-y-2.5">
            {cashflow.categoryBreakdown.map((item) => {
              const emoji = CATEGORY_EMOJI[item.categoryId] ?? "💳";
              const barPct = item.usagePct ?? item.sharePct;
              return (
                <div key={item.categoryId} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-[var(--mf-text)]">
                      {emoji} {item.shortLabel}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums">
                      <span
                        className={cn(
                          "font-semibold",
                          item.isOverBudget
                            ? "text-rose-400"
                            : "text-[var(--mf-text)]",
                        )}
                      >
                        {formatCompactVnd(item.amount)}
                      </span>
                      {item.budgetLimit ? (
                        <span className="text-[10px] text-[var(--mf-text-subtle)]">
                          / {formatCompactVnd(item.budgetLimit)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[var(--mf-text-subtle)]">
                          ({item.sharePct}%)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--mf-surface-2)]">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(4, barPct))}%`,
                        backgroundColor: item.isOverBudget
                          ? "#F43F5E"
                          : item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </aside>
  );
}
