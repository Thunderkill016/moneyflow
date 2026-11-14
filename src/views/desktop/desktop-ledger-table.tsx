"use client";

import {
  CheckCircle2,
  EyeOff,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  CORE_CATEGORIES,
  getCategoryById,
  type Transaction,
  type TransactionType,
} from "../../core/schema/transaction.schema.ts";
import type {
  SpecialLedgerFilter,
  TransactionController,
} from "../../features/transactions/use-transaction-controller.ts";
import {
  CATEGORY_EMOJI,
  TX_TYPE_META,
  formatDateTime,
  formatMoney,
} from "../../shared/format.ts";
import { Button, Card, cn } from "../../shared/ui.tsx";

const TYPE_TABS: ReadonlyArray<{ id: "ALL" | TransactionType; label: string }> = [
  { id: "ALL", label: "Tất cả" },
  { id: "EXPENSE", label: "Chi tiêu" },
  { id: "INCOME", label: "Thu nhập" },
  { id: "TRANSFER", label: "Chuyển ví" },
  { id: "RECONCILE", label: "Khớp dư" },
];

const SPECIAL_TABS: ReadonlyArray<{ id: SpecialLedgerFilter; label: string }> = [
  { id: "ALL", label: "Mọi nhãn" },
  { id: "REFUND", label: "↺ Hoàn tiền" },
  { id: "EXCLUDED", label: "Ngoài hạn mức" },
  { id: "EVENT", label: "# Sự kiện" },
];

const SOURCE_CHIP: Readonly<Record<string, string>> = {
  NLP: "NLP",
  SMS_NOTIFICATION: "SMS",
  CSV_IMPORT: "CSV",
  LEGACY_MIGRATION: "MIG",
};

export function DesktopLedgerTable({
  controller,
}: {
  controller: TransactionController;
}) {
  const {
    accounts,
    filteredTransactions,
    selectedIds,
    lastDeletedIds,
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
  } = controller;

  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: "note" | "amount";
    draft: string;
  } | null>(null);

  const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));
  const allFilteredSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((tx) => selectedIds.has(tx.id));

  const commitInlineEdit = () => {
    if (!editingCell) return;
    if (editingCell.field === "note") {
      if (editingCell.draft.trim()) {
        controller.updateTransaction(editingCell.id, {
          note: editingCell.draft.trim(),
        });
      }
    } else {
      const numeric = Number(editingCell.draft.replace(/[^\d]/gu, ""));
      if (Number.isFinite(numeric) && numeric > 0) {
        controller.updateTransaction(editingCell.id, { amount: numeric });
      }
    }
    setEditingCell(null);
  };

  return (
    <Card className="flex flex-col gap-3 overflow-hidden">
      {/* Search & Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[var(--mf-text-subtle)]" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm ghi chú, danh mục, #sự-kiện..."
            aria-label="Tìm kiếm trong sổ giao dịch"
            className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] py-1.5 pr-3 pl-8 text-xs text-[var(--mf-text)] placeholder:text-[var(--mf-text-subtle)] focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            aria-label="Lọc theo ví"
            className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2.5 py-1.5 text-xs text-[var(--mf-text)] focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">Mọi ví ({accounts.length})</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Lọc theo danh mục"
            className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2.5 py-1.5 text-xs text-[var(--mf-text)] focus:border-emerald-500 focus:outline-none"
          >
            <option value="ALL">Mọi danh mục</option>
            {CORE_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Type + Special Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTypeFilter(tab.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                typeFilter === tab.id
                  ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-300 border border-emerald-500/40"
                  : "text-[var(--mf-text-muted)] hover:bg-[var(--mf-surface-2)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          {SPECIAL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSpecialFilter(tab.id)}
              className={cn(
                "rounded-lg px-2 py-1 text-[11px] font-medium transition",
                specialFilter === tab.id
                  ? "bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/35"
                  : "text-[var(--mf-text-subtle)] hover:bg-[var(--mf-surface-2)]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs">
          <span className="font-semibold text-emerald-500 dark:text-emerald-300">
            Đang chọn {selectedIds.size} giao dịch
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  controller.bulkRecategorizeSelected(e.target.value);
                  e.target.value = "";
                }
              }}
              aria-label="Đổi danh mục hàng loạt"
              className="rounded-lg border border-[var(--mf-border-strong)] bg-[var(--mf-surface)] px-2 py-1 text-xs text-[var(--mf-text)]"
            >
              <option value="" disabled>
                Đổi danh mục...
              </option>
              {CORE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.shortLabel}
                </option>
              ))}
            </select>

            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  controller.bulkChangeAccountSelected(e.target.value);
                  e.target.value = "";
                }
              }}
              aria-label="Đổi ví hàng loạt"
              className="rounded-lg border border-[var(--mf-border-strong)] bg-[var(--mf-surface)] px-2 py-1 text-xs text-[var(--mf-text)]"
            >
              <option value="" disabled>
                Chuyển ví...
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <Button
              variant="danger"
              size="sm"
              onClick={controller.bulkDeleteSelected}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa ({selectedIds.size})
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={controller.clearSelection}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      ) : null}

      {/* Ledger Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--mf-border)]">
        <table className="w-full min-w-[740px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[11px] uppercase tracking-wider text-[var(--mf-text-muted)]">
              <th className="w-9 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={controller.toggleSelectAllFiltered}
                  aria-label="Chọn tất cả giao dịch đang hiển thị"
                  className="h-3.5 w-3.5 rounded accent-emerald-500"
                />
              </th>
              <th className="px-2 py-2.5">Thời gian</th>
              <th className="px-2 py-2.5">Nội dung & Nhãn</th>
              <th className="px-2 py-2.5">Danh mục</th>
              <th className="px-2 py-2.5">Ví</th>
              <th className="px-3 py-2.5 text-right">Số tiền</th>
              <th className="w-24 px-2 py-2.5 text-right">Tác vụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--mf-border)]">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-[var(--mf-text-muted)]"
                >
                  Chưa có giao dịch nào khớp bộ lọc. Gõ nhanh vào thanh lệnh ở trên (VD:{" "}
                  <code className="font-mono text-emerald-400">cf 35k, hoàn tiền shopee 120k</code>) để thử ngay!
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx: Transaction) => {
                const fromAcc = accountMap.get(tx.accountId);
                const toAcc = tx.toAccountId
                  ? accountMap.get(tx.toAccountId)
                  : undefined;
                const cat = getCategoryById(tx.categoryId);
                const emoji = CATEGORY_EMOJI[tx.categoryId] ?? "💳";
                const srcChip = tx.source ? SOURCE_CHIP[tx.source] : undefined;
                const isEditingNote =
                  editingCell?.id === tx.id && editingCell.field === "note";
                const isEditingAmount =
                  editingCell?.id === tx.id && editingCell.field === "amount";

                const amountClass =
                  tx.type === "INCOME"
                    ? "text-emerald-400"
                    : tx.type === "TRANSFER"
                      ? "text-cyan-400"
                      : tx.type === "RECONCILE"
                        ? "text-slate-400"
                        : "text-rose-400";

                const signedDisplay =
                  tx.type === "RECONCILE"
                    ? `${(tx.reconcileDelta ?? 0) >= 0 ? "+" : "-"}${formatMoney(Math.abs(tx.reconcileDelta ?? tx.amount), fromAcc?.currency ?? "VND")}`
                    : `${tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}${formatMoney(tx.amount, fromAcc?.currency ?? "VND")}`;

                return (
                  <tr
                    key={tx.id}
                    className={cn(
                      "group transition hover:bg-[var(--mf-surface-2)]/65",
                      selectedIds.has(tx.id) && "bg-emerald-500/5",
                    )}
                  >
                    <td className="px-3 py-2.5 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(tx.id)}
                        onChange={() => controller.toggleSelect(tx.id)}
                        aria-label={`Chọn ${tx.note}`}
                        className="h-3.5 w-3.5 rounded accent-emerald-500"
                      />
                    </td>

                    <td className="px-2 py-2.5 align-middle whitespace-nowrap font-mono text-[11px] text-[var(--mf-text-muted)]">
                      <div>{formatDateTime(tx.occurredAt)}</div>
                      {srcChip ? (
                        <span className="mt-0.5 inline-block rounded bg-[var(--mf-surface-2)] px-1 py-0.5 text-[9px] font-semibold text-cyan-400">
                          {srcChip}
                        </span>
                      ) : null}
                    </td>

                    <td className="px-2 py-2.5 align-middle">
                      {isEditingNote ? (
                        <input
                          autoFocus
                          value={editingCell.draft}
                          onChange={(e) =>
                            setEditingCell({
                              ...editingCell,
                              draft: e.target.value,
                            })
                          }
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitInlineEdit();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="w-full rounded border border-emerald-500 bg-[var(--mf-surface)] px-2 py-1 text-xs text-[var(--mf-text)]"
                        />
                      ) : (
                        <button
                          type="button"
                          onDoubleClick={() =>
                            setEditingCell({
                              id: tx.id,
                              field: "note",
                              draft: tx.note,
                            })
                          }
                          title="Nhấp đúp để sửa ghi chú trực tiếp"
                          className="text-left font-medium text-[var(--mf-text)] hover:text-emerald-400"
                        >
                          {tx.note}
                        </button>
                      )}

                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            TX_TYPE_META[tx.type].badgeClass,
                          )}
                        >
                          {TX_TYPE_META[tx.type].label}
                        </span>
                        {tx.isRefund ? (
                          <span className="rounded border border-emerald-500/35 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                            ↺ Hoàn tiền
                          </span>
                        ) : null}
                        {tx.excludeFromReports ? (
                          <span className="rounded border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                            Ngoài hạn mức
                          </span>
                        ) : null}
                        {tx.eventTag ? (
                          <span className="rounded border border-indigo-500/35 bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400">
                            #{tx.eventTag}
                          </span>
                        ) : null}
                        {tx.splitInfo && !tx.splitInfo.isSettled ? (
                          <button
                            type="button"
                            onClick={() => controller.settleSplitBill(tx.id)}
                            className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/30"
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Thu hồi{" "}
                            {formatMoney(tx.splitInfo.receivableAmount)}
                          </button>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-2 py-2.5 align-middle">
                      <select
                        value={tx.categoryId}
                        onChange={(e) =>
                          controller.updateTransaction(tx.id, {
                            categoryId: e.target.value,
                          })
                        }
                        aria-label={`Đổi danh mục cho ${tx.note}`}
                        className="max-w-[140px] rounded-lg border border-transparent bg-transparent py-1 text-xs text-[var(--mf-text)] hover:border-[var(--mf-border-strong)] hover:bg-[var(--mf-surface)] focus:border-emerald-500 focus:outline-none"
                      >
                        {CORE_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {CATEGORY_EMOJI[c.id] ?? emoji} {c.shortLabel}
                          </option>
                        ))}
                        {!CORE_CATEGORIES.some((c) => c.id === tx.categoryId) ? (
                          <option value={tx.categoryId}>
                            {emoji} {cat.shortLabel}
                          </option>
                        ) : null}
                      </select>
                    </td>

                    <td className="px-2 py-2.5 align-middle text-[var(--mf-text-muted)]">
                      <span>{fromAcc?.name ?? tx.accountId}</span>
                      {toAcc ? (
                        <span className="text-cyan-400"> → {toAcc.name}</span>
                      ) : null}
                    </td>

                    <td className="px-3 py-2.5 align-middle text-right font-mono font-bold tabular-nums">
                      {isEditingAmount ? (
                        <input
                          autoFocus
                          value={editingCell.draft}
                          onChange={(e) =>
                            setEditingCell({
                              ...editingCell,
                              draft: e.target.value,
                            })
                          }
                          onBlur={commitInlineEdit}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitInlineEdit();
                            if (e.key === "Escape") setEditingCell(null);
                          }}
                          className="w-28 rounded border border-emerald-500 bg-[var(--mf-surface)] px-2 py-1 text-right font-mono text-xs text-[var(--mf-text)]"
                        />
                      ) : (
                        <button
                          type="button"
                          onDoubleClick={() =>
                            setEditingCell({
                              id: tx.id,
                              field: "amount",
                              draft: String(Math.round(tx.amount)),
                            })
                          }
                          title="Nhấp đúp để sửa số tiền trực tiếp"
                          className={cn(amountClass, "hover:underline")}
                        >
                          {signedDisplay}
                        </button>
                      )}
                    </td>

                    <td className="px-2 py-2.5 align-middle text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {tx.type === "INCOME" ? (
                          <button
                            type="button"
                            onClick={() =>
                              controller.updateTransaction(tx.id, {
                                isRefund: !tx.isRefund,
                              })
                            }
                            title="Cấn trừ hoàn tiền vào chi phí danh mục"
                            aria-label={`Bật/tắt hoàn tiền cho ${tx.note}`}
                            className={cn(
                              "rounded-lg p-1.5 transition",
                              tx.isRefund
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-[var(--mf-text-subtle)] hover:bg-[var(--mf-surface-2)] hover:text-[var(--mf-text)]",
                            )}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            controller.updateTransaction(tx.id, {
                              excludeFromReports: !tx.excludeFromReports,
                            })
                          }
                          title="Ẩn khỏi báo cáo / không tính hạn mức Safe-to-Spend"
                          aria-label={`Loại trừ khỏi hạn mức cho ${tx.note}`}
                          className={cn(
                            "rounded-lg p-1.5 transition",
                            tx.excludeFromReports
                              ? "bg-amber-500/20 text-amber-400"
                              : "text-[var(--mf-text-subtle)] hover:bg-[var(--mf-surface-2)] hover:text-[var(--mf-text)]",
                          )}
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => controller.deleteTransaction(tx.id)}
                          title="Xóa mềm (có thể Hoàn tác)"
                          aria-label={`Xóa ${tx.note}`}
                          className="rounded-lg p-1.5 text-[var(--mf-text-subtle)] transition hover:bg-rose-500/20 hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Undo Soft-Delete Toast */}
      {lastDeletedIds.length > 0 ? (
        <div className="fixed right-5 bottom-5 z-40 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-[var(--mf-surface)] px-4 py-3 text-xs shadow-2xl">
          <span className="font-medium text-[var(--mf-text)]">
            Đã xóa {lastDeletedIds.length} giao dịch
          </span>
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
            aria-label="Đóng thông báo hoàn tác"
            className="rounded-lg p-1 text-[var(--mf-text-muted)] hover:text-[var(--mf-text)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
    </Card>
  );
}
