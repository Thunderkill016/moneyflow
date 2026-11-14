"use client";

import { useMemo, useState } from "react";
import { parseVietnameseAmount } from "../../core/engine/index.ts";
import type { AccountGroup, CurrencyCode } from "../../core/schema/account.schema.ts";
import {
  CORE_CATEGORIES,
  type TransactionType,
} from "../../core/schema/transaction.schema.ts";
import type { MigrationImportResult } from "../../core/storage/index.ts";
import type { TransactionController } from "../../features/transactions/use-transaction-controller.ts";
import { formatMoney } from "../../shared/format.ts";
import { Button, ModalShell, cn } from "../../shared/ui.tsx";

const SMS_PRESETS: ReadonlyArray<{ label: string; text: string }> = [
  {
    label: "Techcombank Chi",
    text: "TK 190368xxxx -185,000 VND luc 14/11 12:30. So du: 15,240,000 VND. ND: HIGHLANDS COFFEE Q1",
  },
  {
    label: "Vietcombank Thu",
    text: "SD TK 001100xxxx +12,500,000 VND. So du 28,900,000 VND. Ref: THANH TOAN LUONG THANG 11",
  },
  {
    label: "Hoàn tiền ShopeePay",
    text: "MoMo +149,000d hoan tien don hang Shopee #VN8821 luc 18:45. So du vi: 2,149,000d",
  },
];

function parseFlexAmount(raw: string): number {
  const parsed = parseVietnameseAmount(raw, {
    autoMultiplyThousandForBareSmallNumber: false,
  });
  return parsed?.amount ?? 0;
}

export function BankSmsDialog({
  open,
  onClose,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  controller: TransactionController;
}) {
  const [rawSms, setRawSms] = useState(SMS_PRESETS[0].text);
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [accountId, setAccountId] = useState(
    controller.defaultLiquidAccount?.id ?? "acc-tcb",
  );

  const preview = useMemo(
    () => controller.previewBankSms(rawSms, accountId),
    [controller, rawSms, accountId],
  );

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    const outcome = controller.importBankSms(rawSms, {
      defaultAccountId: accountId,
      autoReconcileBalance: autoReconcile,
    });
    if (outcome.imported || outcome.skippedDuplicate) {
      onClose();
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Bóc tách SMS / Thông báo Ngân hàng"
    >
      <form onSubmit={handleImport} className="space-y-4 text-xs">
        <div className="flex flex-wrap gap-1.5">
          {SMS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setRawSms(preset.text)}
              className="rounded-lg border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-2.5 py-1 font-medium text-[var(--mf-text-muted)] hover:border-cyan-500/40 hover:text-[var(--mf-text)]"
            >
              Mẫu: {preset.label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="block font-medium text-[var(--mf-text-muted)]">
            Nội dung tin nhắn biến động số dư
          </label>
          <textarea
            rows={4}
            value={rawSms}
            onChange={(e) => setRawSms(e.target.value)}
            placeholder="Dán nguyên văn tin nhắn SMS từ Techcombank, Vietcombank, ACB, TPBank, MoMo..."
            className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] p-3 font-mono text-xs text-[var(--mf-text)] focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-[var(--mf-text-muted)]">
              Ví mặc định nếu SMS không nêu tên bank
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-xs text-[var(--mf-text)]"
            >
              {controller.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatMoney(a.currentBalance, a.currency)})
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2">
            <input
              type="checkbox"
              checked={autoReconcile}
              onChange={(e) => setAutoReconcile(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            <span className="text-[var(--mf-text)]">
              Tự động tạo bút toán Khớp số dư nếu SMS có số dư cuối
            </span>
          </label>
        </div>

        <div className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] p-3">
          {preview ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-cyan-400">
                  Nhận diện: {preview.bankLabel} ·{" "}
                  {preview.type === "INCOME" ? "Thu tiền" : "Chi tiền"}
                  {preview.isRefund ? " (↺ Hoàn tiền)" : ""}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-bold tabular-nums",
                    preview.type === "INCOME"
                      ? "text-emerald-400"
                      : "text-rose-400",
                  )}
                >
                  {formatMoney(preview.amount)}
                </span>
              </div>
              <div className="text-[var(--mf-text-muted)]">
                Ghi chú: <strong className="text-[var(--mf-text)]">{preview.note}</strong>
              </div>
              {preview.detectedBalance !== undefined ? (
                <div className="font-mono text-emerald-400">
                  Phát hiện số dư cuối SMS: {formatMoney(preview.detectedBalance)}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-amber-400">
              Chưa bóc tách được số tiền biến động — thử dán đủ dấu +/- và số tiền.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" variant="primary" disabled={!preview}>
            Ghi từ SMS & Chống trùng
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ImportDialog({
  open,
  onClose,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  controller: TransactionController;
}) {
  const [tab, setTab] = useState<"json" | "csv">("json");
  const [rawJson, setRawJson] = useState("");
  const [mergeMode, setMergeMode] = useState<"merge" | "replace">("merge");
  const [migrationReport, setMigrationReport] =
    useState<MigrationImportResult | null>(null);

  const [rawCsv, setRawCsv] = useState("");
  const [csvAccountId, setCsvAccountId] = useState(
    controller.defaultLiquidAccount?.id ?? "acc-tcb",
  );

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawJson(await file.text());
  };

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawCsv(await file.text());
  };

  const handleRunJsonMigration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawJson.trim()) return;
    const res = controller.importAnyJson(rawJson, mergeMode);
    if (res) {
      setMigrationReport(res);
    }
  };

  const handleRunCsvImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawCsv.trim()) return;
    const stats = controller.importCsvRows(rawCsv, csvAccountId);
    if (stats.importedCount > 0) {
      onClose();
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Di cư Zero-Loss (3 Nguồn) & Import CSV"
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        <div className="flex gap-2">
          <Button
            variant={tab === "json" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("json")}
          >
            JSON 3 Nguồn (Neon / Flutter / Web)
          </Button>
          <Button
            variant={tab === "csv" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("csv")}
          >
            Sao kê CSV Ngân hàng
          </Button>
        </div>

        {tab === "json" ? (
          <form onSubmit={handleRunJsonMigration} className="space-y-3">
            <p className="text-[var(--mf-text-muted)]">
              Hỗ trợ tự động nhận dạng và nâng cấp không mất 1 xu từ:{" "}
              <strong className="text-[var(--mf-text)]">Neon/Supabase Archive v1</strong>,{" "}
              <strong className="text-[var(--mf-text)]">Flutter SharedPreferences (mf_fintech_state_v1)</strong>, và{" "}
              <strong className="text-[var(--mf-text)]">Web Backup v2/v3</strong>.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-1.5 font-medium text-[var(--mf-text)] hover:border-emerald-500/40">
                <span>Chọn file .json từ máy</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleJsonFile}
                  className="sr-only"
                />
              </label>

              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="mig-mode"
                    checked={mergeMode === "merge"}
                    onChange={() => setMergeMode("merge")}
                    className="accent-emerald-500"
                  />
                  <span>Gộp chống trùng (Khuyên dùng)</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="mig-mode"
                    checked={mergeMode === "replace"}
                    onChange={() => setMergeMode("replace")}
                    className="accent-emerald-500"
                  />
                  <span>Thay thế toàn bộ</span>
                </label>
              </div>
            </div>

            <textarea
              rows={6}
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              placeholder='Dán nội dung JSON Archive v1, mf_fintech_state_v1 hoặc backup MoneyFlow v2/v3...'
              className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] p-3 font-mono text-[11px] text-[var(--mf-text)] focus:border-emerald-500 focus:outline-none"
            />

            {migrationReport ? (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-emerald-400">
                <div className="font-semibold">
                  Nguồn: {migrationReport.sourceLabel} ({migrationReport.sourceFormat})
                </div>
                <div className="mt-1 font-mono">
                  +{migrationReport.importedAccounts} ví · +{migrationReport.importedTransactions} giao dịch · bỏ qua {migrationReport.skippedDuplicates} bản ghi trùng.
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--mf-border)] pt-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  controller.resetDemoData();
                  onClose();
                }}
              >
                Khôi phục bộ mẫu v3.0
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Đóng
                </Button>
                <Button type="submit" variant="primary" disabled={!rawJson.trim()}>
                  Chạy Migrator 3 Nguồn
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRunCsvImport} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <select
                value={csvAccountId}
                onChange={(e) => setCsvAccountId(e.target.value)}
                aria-label="Chọn ví đích để import CSV"
                className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-1.5 text-xs text-[var(--mf-text)]"
              >
                {controller.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Ví đích: {a.name}
                  </option>
                ))}
              </select>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-1.5 font-medium text-[var(--mf-text)]">
                <span>Chọn file .csv sao kê</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFile}
                  className="sr-only"
                />
              </label>
            </div>

            <textarea
              rows={6}
              value={rawCsv}
              onChange={(e) => setRawCsv(e.target.value)}
              placeholder={"Ngay,Noi dung,So tien\n14/11/2026,HIGHLANDS COFFEE,-45000\n14/11/2026,HOAN TIEN SHOPEE,120000"}
              className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] p-3 font-mono text-[11px] text-[var(--mf-text)]"
            />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                Đóng
              </Button>
              <Button type="submit" variant="primary" disabled={!rawCsv.trim()}>
                Import CSV & Chống trùng
              </Button>
            </div>
          </form>
        )}
      </div>
    </ModalShell>
  );
}

export function TransactionDialog({
  open,
  onClose,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  controller: TransactionController;
}) {
  const [mode, setMode] = useState<"single" | "split">("single");
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amountInput, setAmountInput] = useState("");
  const [accountId, setAccountId] = useState(
    controller.defaultLiquidAccount?.id ?? "acc-tcb",
  );
  const [toAccountId, setToAccountId] = useState(
    controller.accounts.find((a) => a.id !== accountId)?.id ?? "acc-invest",
  );
  const [categoryId, setCategoryId] = useState("an-uong");
  const [note, setNote] = useState("");
  const [isRefund, setIsRefund] = useState(false);
  const [excludeFromReports, setExcludeFromReports] = useState(false);
  const [eventTag, setEventTag] = useState(
    controller.snapshot.budget.activeEventName ?? "",
  );
  const [headcount, setHeadcount] = useState("4");

  const numericAmount = parseFlexAmount(amountInput);
  const cleanHeadcount = Math.max(2, Math.min(20, Number(headcount) || 2));
  const myShare = Math.round(numericAmount / cleanHeadcount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericAmount <= 0) return;

    if (mode === "split") {
      controller.addSplitBillTransaction({
        totalBill: numericAmount,
        headcount: cleanHeadcount,
        accountId,
        categoryId,
        note: note.trim() || "Chia bill ăn uống",
      });
      onClose();
      return;
    }

    controller.addTransaction({
      type: isRefund ? "INCOME" : type,
      amount: numericAmount,
      accountId,
      toAccountId: type === "TRANSFER" ? toAccountId : undefined,
      categoryId,
      note: note.trim() || (isRefund ? "Hoàn tiền" : "Giao dịch mới"),
      isRefund,
      excludeFromReports,
      eventTag: eventTag.trim() || undefined,
    });
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Ghi Giao Dịch / Chia Bill Ứng Hộ"
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="flex gap-2">
          <Button
            variant={mode === "single" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("single")}
          >
            Giao dịch chuẩn
          </Button>
          <Button
            variant={mode === "split" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setMode("split")}
          >
            Chia bill Smart Split
          </Button>
        </div>

        {mode === "single" ? (
          <div className="flex flex-wrap gap-1.5">
            {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  if (t !== "INCOME") setIsRefund(false);
                }}
                className={cn(
                  "rounded-lg border px-2.5 py-1 font-medium",
                  type === t && !isRefund
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                    : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text-muted)]",
                )}
              >
                {t === "EXPENSE"
                  ? "Chi tiêu"
                  : t === "INCOME"
                    ? "Thu nhập"
                    : "Chuyển ví / Đầu tư"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setType("INCOME");
                setIsRefund((v) => !v);
              }}
              className={cn(
                "rounded-lg border px-2.5 py-1 font-medium",
                isRefund
                  ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                  : "border-[var(--mf-border)] bg-[var(--mf-surface-2)] text-[var(--mf-text-muted)]",
              )}
            >
              ↺ Hoàn tiền (Cấn trừ chi)
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[var(--mf-text-muted)]">
              Số tiền (VD: 150k, 1tr5, 2 củ 3)
            </label>
            <input
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="250k"
              required
              className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-sm font-bold text-[var(--mf-text)]"
            />
            {numericAmount > 0 ? (
              <span className="mt-1 inline-block font-mono text-[11px] text-emerald-400">
                = {formatMoney(numericAmount)}
              </span>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-[var(--mf-text-muted)]">
              Danh mục
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
            >
              {CORE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[var(--mf-text-muted)]">
              {type === "TRANSFER" ? "Từ ví" : "Ví nguồn"}
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
            >
              {controller.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {mode === "single" && type === "TRANSFER" ? (
            <div>
              <label className="mb-1 block text-[var(--mf-text-muted)]">
                Đến ví
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
              >
                {controller.accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          ) : mode === "split" ? (
            <div>
              <label className="mb-1 block text-[var(--mf-text-muted)]">
                Tổng số người chia (gồm mình)
              </label>
              <input
                type="number"
                min={2}
                max={20}
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value)}
                className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-[var(--mf-text)]"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-[var(--mf-text-muted)]">
                Nhãn Sự kiện / Chuyến đi (tùy chọn)
              </label>
              <input
                value={eventTag}
                onChange={(e) => setEventTag(e.target.value)}
                placeholder="VD: Du lịch Đà Lạt"
                className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
              />
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[var(--mf-text-muted)]">
            Ghi chú
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Ăn lẩu tối thứ 6 cùng team"
            className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
          />
        </div>

        {mode === "single" ? (
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2">
            <input
              type="checkbox"
              checked={excludeFromReports}
              onChange={(e) => setExcludeFromReports(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            <span>
              Không tính vào hạn mức Safe-to-Spend tháng (vẫn trừ đúng số dư ví)
            </span>
          </label>
        ) : numericAmount > 0 ? (
          <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-2.5 font-mono text-amber-400">
            Phần mình: {formatMoney(myShare)} · Ứng hộ bạn bè:{" "}
            {formatMoney(Math.max(0, numericAmount - myShare))}
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={numericAmount <= 0}>
            {mode === "split" ? "Lưu Chia Bill" : "Ghi Giao Dịch"}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function ReconcileDialog({
  accountId,
  onClose,
  controller,
}: {
  accountId: string | null;
  onClose: () => void;
  controller: TransactionController;
}) {
  const account = controller.accounts.find((a) => a.id === accountId);
  const [actualInput, setActualInput] = useState(
    account ? String(Math.round(account.currentBalance)) : "",
  );
  const [note, setNote] = useState("");

  if (!account) return null;
  const parsed = parseFlexAmount(actualInput);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    controller.reconcileAccount(account.id, parsed, note || undefined);
    onClose();
  };

  return (
    <ModalShell
      open={Boolean(accountId)}
      onClose={onClose}
      title={`Khớp số dư thực tế · ${account.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] p-3">
          <div className="text-[var(--mf-text-muted)]">Số dư trên sổ hiện tại:</div>
          <div className="mt-1 font-mono text-lg font-bold text-[var(--mf-text)]">
            {formatMoney(account.currentBalance, account.currency)}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[var(--mf-text-muted)]">
            Số dư thực tế đang có trong App Bank / Ví (VD: 15tr8)
          </label>
          <input
            value={actualInput}
            onChange={(e) => setActualInput(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-sm font-bold text-[var(--mf-text)]"
          />
          <div className="mt-1 font-mono text-[11px] text-cyan-400">
            Chênh lệch tự ghi nhận:{" "}
            {formatMoney(parsed - account.currentBalance, account.currency)}
          </div>
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú kiểm quỹ (VD: Chốt sao kê cuối tuần)"
          className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
        />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" variant="primary">
            Xác nhận Khớp & Đóng dấu
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function AddAccountDialog({
  open,
  onClose,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  controller: TransactionController;
}) {
  const [name, setName] = useState("");
  const [group, setGroup] = useState<AccountGroup>("LIQUID");
  const [currency, setCurrency] = useState<CurrencyCode>("VND");
  const [balanceInput, setBalanceInput] = useState("0");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    controller.addAccount({
      name,
      group,
      currency,
      initialBalance: parseFlexAmount(balanceInput),
    });
    onClose();
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Thêm Ví / Quỹ Mới">
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên ví (VD: TPBank, Két SJC, Binance BTC)"
          required
          className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={group}
            onChange={(e) => setGroup(e.target.value as AccountGroup)}
            className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
          >
            <option value="LIQUID">Thanh khoản (Safe-to-Spend)</option>
            <option value="INVESTMENT">Tích lũy & Đầu tư</option>
            <option value="DEBT">Công nợ & Thẻ tín dụng</option>
          </select>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
            className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 text-[var(--mf-text)]"
          >
            <option value="VND">VND (₫)</option>
            <option value="USD">USD ($)</option>
            <option value="BTC">BTC</option>
            <option value="XAU">Vàng (Chỉ)</option>
          </select>
        </div>
        <input
          value={balanceInput}
          onChange={(e) => setBalanceInput(e.target.value)}
          placeholder="Số dư ban đầu (VD: 10tr)"
          className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-[var(--mf-text)]"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Tạo ví mới
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function BudgetEventDialog({
  open,
  onClose,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  controller: TransactionController;
}) {
  const b = controller.snapshot.budget;
  const [incomeTarget, setIncomeTarget] = useState(String(b.monthlyIncomeTarget));
  const [spendingCap, setSpendingCap] = useState(String(b.monthlySpendingCap));
  const [fixed, setFixed] = useState(String(b.fixedCommitments));
  const [eventName, setEventName] = useState(b.activeEventName ?? "");
  const [eventBudget, setEventBudget] = useState(
    String(b.activeEventBudgetVnd ?? 0),
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    controller.updateBudget({
      monthlyIncomeTarget: parseFlexAmount(incomeTarget) || b.monthlyIncomeTarget,
      monthlySpendingCap: parseFlexAmount(spendingCap) || b.monthlySpendingCap,
      fixedCommitments: parseFlexAmount(fixed),
    });
    controller.setActiveEventMode(
      eventName.trim() || null,
      parseFlexAmount(eventBudget),
    );
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Hạn mức Safe-to-Spend & Chế độ Sự kiện"
    >
      <form onSubmit={handleSave} className="space-y-3 text-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[var(--mf-text-muted)]">
              Thu nhập mục tiêu / tháng
            </label>
            <input
              value={incomeTarget}
              onChange={(e) => setIncomeTarget(e.target.value)}
              className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-[var(--mf-text)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[var(--mf-text-muted)]">
              Trần chi sinh hoạt tháng
            </label>
            <input
              value={spendingCap}
              onChange={(e) => setSpendingCap(e.target.value)}
              className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-[var(--mf-text)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[var(--mf-text-muted)]">
              Khoản cố định tối thiểu
            </label>
            <input
              value={fixed}
              onChange={(e) => setFixed(e.target.value)}
              className="w-full rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-[var(--mf-text)]"
            />
          </div>
        </div>

        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 space-y-2">
          <div className="font-semibold text-indigo-400">
            Chế độ Sự kiện / Chuyến đi (Trip Isolation)
          </div>
          <p className="text-[var(--mf-text-muted)]">
            Khi bật, mọi giao dịch gắn thẻ sự kiện vẫn trừ ví thật nhưng không làm méo chi tiêu sinh hoạt hằng ngày. Để trống tên để tắt.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Tên chuyến đi (VD: Du lịch Đà Lạt)"
              className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface)] px-3 py-2 text-[var(--mf-text)]"
            />
            <input
              value={eventBudget}
              onChange={(e) => setEventBudget(e.target.value)}
              placeholder="Ngân sách chuyến đi (VD: 8tr)"
              className="rounded-xl border border-[var(--mf-border)] bg-[var(--mf-surface)] px-3 py-2 font-mono text-[var(--mf-text)]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" variant="primary">
            Lưu cấu hình
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export function OnboardingDialog({
  open,
  onClose,
  controller,
}: {
  open: boolean;
  onClose: () => void;
  controller: TransactionController;
}) {
  const [liquid, setLiquid] = useState("18tr");
  const [fixed, setFixed] = useState("6tr");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    controller.applyQuickOnboarding({
      liquidBalanceVnd: parseFlexAmount(liquid),
      fixedCommitmentsVnd: parseFlexAmount(fixed),
      primaryAccountId: controller.defaultLiquidAccount?.id,
      resetWalletBalanceToLiquid: true,
    });
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Khởi tạo La bàn Safe-to-Spend (15 giây)"
    >
      <form onSubmit={handleApply} className="space-y-3 text-xs">
        <p className="text-[var(--mf-text-muted)]">
          Chỉ cần 2 con số để MoneyFlow tính ngay số tiền an toàn bạn được phép tiêu mỗi ngày từ hôm nay đến cuối tháng.
        </p>
        <div>
          <label className="mb-1 block text-[var(--mf-text-muted)]">
            1. Tổng tiền thanh khoản hiện có (Bank + Ví tiền mặt)
          </label>
          <input
            value={liquid}
            onChange={(e) => setLiquid(e.target.value)}
            className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-sm font-bold text-[var(--mf-text)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[var(--mf-text-muted)]">
            2. Hóa đơn cố định & tiết kiệm phải chừa lại trong tháng
          </label>
          <input
            value={fixed}
            onChange={(e) => setFixed(e.target.value)}
            className="w-full rounded-xl border border-[var(--mf-border-strong)] bg-[var(--mf-surface-2)] px-3 py-2 font-mono text-sm font-bold text-[var(--mf-text)]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button type="submit" variant="primary">
            Thiết lập ngay
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}
