"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOUNT_GROUPS,
  CORE_CATEGORIES,
  CURRENCY_CODES,
  getCategoryById,
  type AccountGroup,
  type CurrencyCode,
  type TransactionType,
} from "../../core/schema/index.ts";
import { groupAccountsByType } from "../../features/accounts-wealth/index.ts";
import { deriveCashflowHighlights } from "../../features/analytics/index.ts";
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
import { Button, Card, ModalShell, cn } from "../../shared/ui.tsx";

export function DesktopTerminalView({
  controller,
  layoutMode,
  onChangeLayoutMode,
}: {
  controller: TransactionController;
  layoutMode: "auto" | "desktop" | "mobile";
  onChangeLayoutMode: (mode: "auto" | "desktop" | "mobile") => void;
}) {
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandText, setCommandText] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reconcileAccountId, setReconcileAccountId] = useState<string | null>(
    null,
  );
  const [reconcileInput, setReconcileInput] = useState("");
  const [newAccountOpen, setNewAccountOpen] = useState(false);

  // Add / Transfer modal state
  const [formType, setFormType] = useState<TransactionType>("EXPENSE");
  const [formAmount, setFormAmount] = useState("");
  const [formAccountId, setFormAccountId] = useState(
    controller.defaultLiquidAccount?.id ?? "acc-tcb",
  );
  const [formToAccountId, setFormToAccountId] = useState(
    controller.accounts.find((a) => a.group === "INVESTMENT")?.id ?? "acc-invest",
  );
  const [formCategoryId, setFormCategoryId] = useState("an-uong");
  const [formNote, setFormNote] = useState("");

  // Add Account modal state
  const [newAccName, setNewAccName] = useState("");
  const [newAccGroup, setNewAccGroup] = useState<AccountGroup>("LIQUID");
  const [newAccCurrency, setNewAccCurrency] = useState<CurrencyCode>("VND");
  const [newAccInitial, setNewAccInitial] = useState("0");

  // Budget cap quick input
  const [editingCap, setEditingCap] = useState(false);
  const [capDraft, setCapDraft] = useState(
    String(controller.snapshot.budget.monthlySpendingCap),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      } else if (event.key === "Escape") {
        setCommandOpen(false);
        setAddModalOpen(false);
        setReconcileAccountId(null);
        setNewAccountOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const commandPreview = useMemo(
    () => controller.previewQuickCommand(commandText),
    [controller, commandText],
  );

  const groupedAccounts = useMemo(
    () => groupAccountsByType(controller.accounts),
    [controller.accounts],
  );

  const accountNameMap = useMemo(
    () => new Map(controller.accounts.map((a) => [a.id, a.name])),
    [controller.accounts],
  );

  const highlights = useMemo(
    () => deriveCashflowHighlights(controller.cashflow),
    [controller.cashflow],
  );

  const reconcileAccount = reconcileAccountId
    ? controller.accounts.find((a) => a.id === reconcileAccountId) ?? null
    : null;
  const reconcileActualNum = Number.parseFloat(
    reconcileInput.replace(/[^\d.-]/gu, ""),
  );
  const reconcilePreviewDelta =
    reconcileAccount && Number.isFinite(reconcileActualNum)
      ? reconcileActualNum - reconcileAccount.currentBalance
      : 0;

  const selectedCount = controller.selectedIds.size;
  const allFilteredSelected =
    controller.filteredTransactions.length > 0 &&
    controller.filteredTransactions.every((tx) =>
      controller.selectedIds.has(tx.id),
    );

  const handleDownloadBackup = () => {
    const json = controller.exportBackup();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `moneyflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    controller.setStatusMessage("Đã xuất file backup JSON.");
  };

  const handleUploadBackup = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      controller.importBackup(text);
    } catch (error) {
      controller.setStatusMessage(
        error instanceof Error ? error.message : "Không đọc được file backup.",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      {/* Sticky Top Command Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#5b4fe9] text-sm font-black text-white shadow-xs">
              MF
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-950">
                  MoneyFlow Terminal
                </h1>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {controller.syncSummary.statusLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pure Core Engine · Local-First · Tách biệt Thu / Chi / Tích lũy / Khớp số dư
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCommandOpen(true)}
            >
              ⚡ Nhập nhanh (Ctrl/Cmd + K)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormType("EXPENSE");
                setAddModalOpen(true);
              }}
            >
              + Thêm giao dịch
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const target = controller.accounts[0];
                if (target) {
                  setReconcileAccountId(target.id);
                  setReconcileInput(String(target.currentBalance));
                }
              }}
            >
              ⚖️ Khớp số dư
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDownloadBackup}>
              Xuất .json
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Nhập .json
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleUploadBackup}
            />
            {controller.syncSummary.isDirty ? (
              <Button variant="secondary" size="sm" onClick={controller.syncNow}>
                Đồng bộ ({controller.syncSummary.pendingCount})
              </Button>
            ) : null}
            <div className="ml-1 flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(["auto", "desktop", "mobile"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeLayoutMode(m)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold capitalize",
                    layoutMode === m
                      ? "bg-white text-[#5b4fe9] shadow-xs"
                      : "text-slate-500",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-5 px-6 py-5">
        {controller.statusMessage ? (
          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-900">
            <span>{controller.statusMessage}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={controller.resetDemoData}
                className="text-xs font-semibold text-indigo-700 underline"
              >
                Khôi phục dữ liệu mẫu
              </button>
              <button
                type="button"
                onClick={() => controller.setStatusMessage(null)}
                className="text-indigo-500 hover:text-indigo-900"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}

        {/* 3-COLUMN BENTO GRID */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* BENTO COL 1: Net Worth & 3 Account Groups */}
          <Card className="flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tài sản ròng (Net Worth)
                  </p>
                  <p className="tabular-nums mt-1 text-3xl font-extrabold tracking-tight text-slate-950">
                    {formatMoney(controller.netWorth.netWorthVnd)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNewAccountOpen(true)}
                >
                  + Thêm ví
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl bg-indigo-50/70 p-2.5">
                  <p className="text-[11px] font-medium text-indigo-700">
                    Thanh khoản
                  </p>
                  <p className="tabular-nums mt-0.5 font-bold text-indigo-950">
                    {formatCompactVnd(controller.netWorth.liquidVnd)}
                  </p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 p-2.5">
                  <p className="text-[11px] font-medium text-emerald-700">
                    Đầu tư
                  </p>
                  <p className="tabular-nums mt-0.5 font-bold text-emerald-950">
                    {formatCompactVnd(controller.netWorth.investmentVnd)}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50/70 p-2.5">
                  <p className="text-[11px] font-medium text-amber-700">
                    Công nợ
                  </p>
                  <p className="tabular-nums mt-0.5 font-bold text-amber-950">
                    {formatCompactVnd(controller.netWorth.debtVnd)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {groupedAccounts.map(({ group, accounts }) => (
                <div key={group}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {ACCOUNT_GROUP_META[group].label}
                  </p>
                  <div className="space-y-1.5">
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                      >
                        <span className="text-sm font-semibold text-slate-800">
                          {acc.name}
                        </span>
                        <div className="flex items-center gap-2.5">
                          <span className="tabular-nums text-sm font-bold text-slate-900">
                            {formatMoney(acc.currentBalance, acc.currency)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setReconcileAccountId(acc.id);
                              setReconcileInput(String(acc.currentBalance));
                            }}
                            className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-[#5b4fe9] hover:bg-indigo-50"
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
          </Card>

          {/* BENTO COL 2: Safe-to-Spend, Savings Rate & Runway */}
          <Card className="flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Safe-to-Spend hôm nay
                  </p>
                  <p className="tabular-nums mt-1 text-3xl font-extrabold tracking-tight text-[#5b4fe9]">
                    {formatMoney(controller.cashflow.safeToSpendDaily)}
                  </p>
                  <p className="tabular-nums mt-0.5 text-xs text-slate-500">
                    Còn lại tháng ({controller.cashflow.remainingDaysInMonth} ngày):{" "}
                    <strong className="text-slate-800">
                      {formatMoney(controller.cashflow.safeToSpendMonth)}
                    </strong>
                  </p>
                </div>

                {editingCap ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const val = Number.parseInt(
                        capDraft.replace(/[^\d]/gu, ""),
                        10,
                      );
                      if (Number.isFinite(val) && val >= 0) {
                        controller.updateBudget({ monthlySpendingCap: val });
                      }
                      setEditingCap(false);
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      type="text"
                      value={capDraft}
                      onChange={(e) => setCapDraft(e.target.value)}
                      className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-xs tabular-nums"
                    />
                    <Button type="submit" size="sm" variant="primary">
                      Lưu
                    </Button>
                  </form>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCapDraft(
                        String(controller.snapshot.budget.monthlySpendingCap),
                      );
                      setEditingCap(true);
                    }}
                  >
                    Sửa hạn mức
                  </Button>
                )}
              </div>

              {/* 4 KPI Summary */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    Thu nhập tháng
                  </p>
                  <p className="tabular-nums mt-0.5 text-base font-bold text-emerald-600">
                    {formatMoney(controller.cashflow.totalIncome)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    Chi tiêu thực tế (EXPENSE)
                  </p>
                  <p className="tabular-nums mt-0.5 text-base font-bold text-rose-600">
                    {formatMoney(controller.cashflow.totalExpense)}
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
                  <p className="text-[11px] font-semibold text-indigo-700">
                    Tích lũy / Đầu tư (TRANSFER)
                  </p>
                  <p className="tabular-nums mt-0.5 text-base font-extrabold text-indigo-900">
                    {formatMoney(controller.cashflow.investmentTransfers)}
                  </p>
                  <p className="tabular-nums text-[11px] text-indigo-700">
                    Savings Rate: {controller.cashflow.savingsRatePct}%
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    Runway dự phòng
                  </p>
                  <p className="tabular-nums mt-0.5 text-base font-bold text-slate-900">
                    {controller.cashflow.runwayMonths} tháng
                  </p>
                  <p className="tabular-nums text-[11px] text-slate-500">
                    Khớp lệch: {formatSignedMoney(controller.cashflow.reconcileNet)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs",
                    item.tone === "positive"
                      ? "bg-emerald-50 text-emerald-900"
                      : item.tone === "warning"
                        ? "bg-amber-50 text-amber-900"
                        : "bg-slate-100 text-slate-800",
                  )}
                >
                  <span className="font-bold">{item.title}: </span>
                  <span>{item.detail}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* BENTO COL 3: Category Breakdown & Daily Heatmap */}
          <Card className="flex flex-col justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cơ cấu chi tiêu tháng {controller.cashflow.monthKey}
              </p>
              <div className="mt-3 space-y-2.5">
                {controller.cashflow.categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Chưa có khoản chi nào trong tháng này.
                  </p>
                ) : (
                  controller.cashflow.categoryBreakdown.map((item) => (
                    <div key={item.categoryId} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          {CATEGORY_EMOJI[item.categoryId] ?? "🏷️"}{" "}
                          {item.shortLabel}
                        </span>
                        <span className="tabular-nums font-bold text-slate-900">
                          {formatMoney(item.amount)} ({item.sharePct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(4, item.sharePct))}%`,
                            backgroundColor: item.isOverBudget
                              ? "#dc2626"
                              : item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Heatmap chi tiêu theo ngày
              </p>
              <div className="grid grid-cols-11 gap-1.5">
                {controller.cashflow.dailyHeatmap.map((cell) => {
                  const bg = [
                    "bg-slate-100 text-slate-400",
                    "bg-indigo-100 text-indigo-700",
                    "bg-indigo-300 text-indigo-950",
                    "bg-indigo-500 text-white",
                    "bg-rose-500 text-white",
                  ][cell.intensity];
                  return (
                    <div
                      key={cell.day}
                      title={`Ngày ${cell.day}: ${formatMoney(cell.amount)}`}
                      className={cn(
                        "tabular-nums flex h-7 items-center justify-center rounded-md text-[10px] font-bold",
                        bg,
                      )}
                    >
                      {cell.day}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* TRANSACTION DATA TABLE + BULK EDIT */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-2">
              {(["ALL", "EXPENSE", "INCOME", "TRANSFER", "RECONCILE"] as const).map(
                (kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => controller.setTypeFilter(kind)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                      controller.typeFilter === kind
                        ? "bg-[#5b4fe9] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                    )}
                  >
                    {kind === "ALL" ? "Tất cả" : TX_TYPE_META[kind].label}
                  </button>
                ),
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="search"
                value={controller.searchQuery}
                onChange={(e) => controller.setSearchQuery(e.target.value)}
                placeholder="Tìm ghi chú, danh mục..."
                className="h-9 w-56 rounded-lg border border-slate-200 px-3 text-xs focus:border-[#5b4fe9] focus:outline-none"
              />
              <select
                value={controller.accountFilter}
                onChange={(e) => controller.setAccountFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium"
              >
                <option value="ALL">Mọi tài khoản</option>
                {controller.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
              <select
                value={controller.categoryFilter}
                onChange={(e) => controller.setCategoryFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium"
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

          {selectedCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-200 bg-indigo-50 px-5 py-2.5">
              <span className="text-xs font-bold text-indigo-900">
                Đang chọn {selectedCount} giao dịch (Bulk Edit)
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
                  className="h-8 rounded-lg border border-indigo-200 bg-white px-2 text-xs font-semibold text-indigo-900"
                >
                  <option value="" disabled>
                    Đổi danh mục hàng loạt...
                  </option>
                  {CORE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={controller.bulkDeleteSelected}
                >
                  Xóa {selectedCount} mục
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

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={allFilteredSelected}
                      onChange={controller.toggleSelectAllFiltered}
                    />
                  </th>
                  <th className="px-3 py-3">Thời gian</th>
                  <th className="px-3 py-3">Loại</th>
                  <th className="px-3 py-3">Danh mục & Ghi chú</th>
                  <th className="px-3 py-3">Ví nguồn / Đích</th>
                  <th className="px-4 py-3 text-right">Số tiền</th>
                  <th className="w-14 px-3 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {controller.filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      Không tìm thấy giao dịch phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  controller.filteredTransactions.map((tx) => {
                    const checked = controller.selectedIds.has(tx.id);
                    const cat = getCategoryById(tx.categoryId);
                    const fromName =
                      accountNameMap.get(tx.accountId) ?? tx.accountId;
                    const toName = tx.toAccountId
                      ? accountNameMap.get(tx.toAccountId) ?? tx.toAccountId
                      : null;
                    const signed =
                      tx.type === "EXPENSE"
                        ? -tx.amount
                        : tx.type === "INCOME"
                          ? tx.amount
                          : tx.type === "RECONCILE"
                            ? (tx.reconcileDelta ?? tx.amount)
                            : tx.amount;

                    return (
                      <tr
                        key={tx.id}
                        className={cn(
                          "transition hover:bg-slate-50/80",
                          checked && "bg-indigo-50/40",
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Chọn ${tx.note}`}
                            checked={checked}
                            onChange={() => controller.toggleSelect(tx.id)}
                          />
                        </td>
                        <td className="tabular-nums whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                          {formatDateTime(tx.occurredAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              TX_TYPE_META[tx.type].badgeClass,
                            )}
                          >
                            {TX_TYPE_META[tx.type].label}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <span>{CATEGORY_EMOJI[tx.categoryId] ?? "🏷️"}</span>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {tx.note}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {cat.label}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs font-medium text-slate-700">
                          {toName ? `${fromName} → ${toName}` : fromName}
                        </td>
                        <td
                          className={cn(
                            "tabular-nums whitespace-nowrap px-4 py-3 text-right font-bold",
                            tx.type === "INCOME"
                              ? "text-emerald-600"
                              : tx.type === "EXPENSE"
                                ? "text-rose-600"
                                : "text-indigo-700",
                          )}
                        >
                          {tx.type === "TRANSFER"
                            ? formatMoney(tx.amount)
                            : formatSignedMoney(signed)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => controller.deleteTransaction(tx.id)}
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            Xóa
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      {/* MODAL 1: CMD/CTRL + K QUICK COMMAND PALETTE */}
      <ModalShell
        open={commandOpen}
        title="Thanh lệnh nhập nhanh đa giao dịch (Ctrl/Cmd + K)"
        onClose={() => setCommandOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const count = controller.submitQuickCommand(commandText);
            if (count > 0) {
              setCommandText("");
              setCommandOpen(false);
            }
          }}
          className="space-y-3"
        >
          <input
            autoFocus
            type="text"
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            placeholder="VD: ăn sáng 40k, đổ xăng 70k, lương +15tr, mua vàng 5tr"
            className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-[#5b4fe9] focus:outline-none"
          />

          <div className="space-y-1.5 rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase text-slate-500">
              Xem trước kết quả bóc tách ({commandPreview.length})
            </p>
            {commandPreview.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nhập số tiền kèm đơn vị (`k`, `tr`, `m`) cách nhau bằng dấu phẩy.
              </p>
            ) : (
              commandPreview.map((item, idx) => (
                <div
                  key={`${item.note}-${idx}`}
                  className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-xs shadow-2xs"
                >
                  <span className="font-semibold text-slate-800">
                    {CATEGORY_EMOJI[item.categoryId] ?? "🏷️"} {item.note} (
                    {TX_TYPE_META[item.type].label})
                  </span>
                  <span className="tabular-nums font-bold text-[#5b4fe9]">
                    {formatMoney(item.amount)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCommandOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={commandPreview.length === 0}
            >
              Ghi {commandPreview.length} giao dịch
            </Button>
          </div>
        </form>
      </ModalShell>

      {/* MODAL 2: ADD / TRANSFER TRANSACTION */}
      <ModalShell
        open={addModalOpen}
        title="Ghi giao dịch mới"
        onClose={() => setAddModalOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = Number.parseFloat(
              formAmount.replace(/[^\d.]/gu, ""),
            );
            if (!Number.isFinite(parsed) || parsed <= 0) return;

            controller.addTransaction({
              type: formType,
              amount: Math.round(parsed),
              accountId: formAccountId,
              toAccountId:
                formType === "TRANSFER" ? formToAccountId : undefined,
              categoryId:
                formType === "INCOME"
                  ? "thu-nhap"
                  : formType === "TRANSFER"
                    ? "tich-luy"
                    : formCategoryId,
              note: formNote,
            });
            setFormAmount("");
            setFormNote("");
            setAddModalOpen(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
            {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormType(t)}
                className={cn(
                  "rounded-lg py-1.5 text-xs font-bold",
                  formType === t
                    ? "bg-white text-[#5b4fe9] shadow-xs"
                    : "text-slate-600",
                )}
              >
                {TX_TYPE_META[t].label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            Số tiền (VND)
            <input
              autoFocus
              type="number"
              min="1"
              step="1000"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="VD: 500000"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              {formType === "TRANSFER" ? "Từ ví" : "Tài khoản"}
              <select
                value={formAccountId}
                onChange={(e) => setFormAccountId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
              >
                {controller.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </label>

            {formType === "TRANSFER" ? (
              <label className="block text-xs font-semibold text-slate-700">
                Đến ví
                <select
                  value={formToAccountId}
                  onChange={(e) => setFormToAccountId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  {controller.accounts
                    .filter((acc) => acc.id !== formAccountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.group})
                      </option>
                    ))}
                </select>
              </label>
            ) : (
              <label className="block text-xs font-semibold text-slate-700">
                Danh mục
                <select
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
                >
                  {CORE_CATEGORIES.filter((c) => c.isQuickTap).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            Ghi chú
            <input
              type="text"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder="VD: Trích mua BTC, Ăn trưa..."
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddModalOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Lưu giao dịch
            </Button>
          </div>
        </form>
      </ModalShell>

      {/* MODAL 3: 1-TAP KHỚP SỐ DƯ THỰC TẾ (RECONCILE) */}
      <ModalShell
        open={reconcileAccount !== null}
        title="Khớp số dư thực tế (Auto Reconcile)"
        onClose={() => setReconcileAccountId(null)}
      >
        {reconcileAccount ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!Number.isFinite(reconcileActualNum)) return;
              controller.reconcileAccount(
                reconcileAccount.id,
                reconcileActualNum,
              );
              setReconcileAccountId(null);
            }}
            className="space-y-3"
          >
            <label className="block text-xs font-semibold text-slate-700">
              Chọn ví đối soát
              <select
                value={reconcileAccount.id}
                onChange={(e) => {
                  const next = controller.accounts.find(
                    (a) => a.id === e.target.value,
                  );
                  if (next) {
                    setReconcileAccountId(next.id);
                    setReconcileInput(String(next.currentBalance));
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {controller.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <p className="text-slate-500">Số dư đang tính trên app:</p>
              <p className="tabular-nums mt-0.5 text-base font-bold text-slate-900">
                {formatMoney(
                  reconcileAccount.currentBalance,
                  reconcileAccount.currency,
                )}
              </p>
            </div>

            <label className="block text-xs font-semibold text-slate-700">
              Số dư thực tế hiện có ({reconcileAccount.currency})
              <input
                autoFocus
                type="number"
                value={reconcileInput}
                onChange={(e) => setReconcileInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </label>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs">
              <p className="text-indigo-700">
                Độ lệch sẽ sinh giao dịch <code>RECONCILE</code>:
              </p>
              <p
                className={cn(
                  "tabular-nums mt-0.5 text-base font-extrabold",
                  reconcilePreviewDelta >= 0
                    ? "text-emerald-700"
                    : "text-rose-700",
                )}
              >
                {formatSignedMoney(
                  reconcilePreviewDelta,
                  reconcileAccount.currency,
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setReconcileAccountId(null)}
              >
                Hủy
              </Button>
              <Button type="submit" variant="primary">
                Xác nhận khớp số dư
              </Button>
            </div>
          </form>
        ) : null}
      </ModalShell>

      {/* MODAL 4: ADD ACCOUNT */}
      <ModalShell
        open={newAccountOpen}
        title="Tạo ví / tài khoản mới"
        onClose={() => setNewAccountOpen(false)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const initial = Number.parseFloat(
              newAccInitial.replace(/[^\d.-]/gu, ""),
            );
            controller.addAccount({
              name: newAccName,
              group: newAccGroup,
              currency: newAccCurrency,
              initialBalance: Number.isFinite(initial) ? initial : 0,
            });
            setNewAccName("");
            setNewAccInitial("0");
            setNewAccountOpen(false);
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-semibold text-slate-700">
            Tên ví / tài sản
            <input
              autoFocus
              type="text"
              value={newAccName}
              onChange={(e) => setNewAccName(e.target.value)}
              placeholder="VD: Binance USDT, SJC Vàng, VPBank"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              Nhóm tài khoản
              <select
                value={newAccGroup}
                onChange={(e) =>
                  setNewAccGroup(e.target.value as AccountGroup)
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
              >
                {ACCOUNT_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {ACCOUNT_GROUP_META[g].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              Đơn vị tiền tệ
              <select
                value={newAccCurrency}
                onChange={(e) =>
                  setNewAccCurrency(e.target.value as CurrencyCode)
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs"
              >
                {CURRENCY_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-700">
            Số dư ban đầu
            <input
              type="number"
              step="any"
              value={newAccInitial}
              onChange={(e) => setNewAccInitial(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm tabular-nums"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setNewAccountOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Tạo tài khoản
            </Button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
