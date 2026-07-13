"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { BudgetSummary, SaveBudgetInput } from "@/lib/budgets";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type { CategoryOption } from "@/lib/sample-data";

export function BudgetDialog({ open, budget, categories, monthStart, onClose, onSave }: {
  open: boolean;
  budget: BudgetSummary | null;
  categories: CategoryOption[];
  monthStart: string;
  onClose: () => void;
  onSave: (input: SaveBudgetInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const categoryId = String(data.get("categoryId") ?? "");
    const limit = parseMoneyInput(String(data.get("limit") ?? ""));
    if (!categoryId) { setError("Chọn một danh mục chi tiêu."); return; }
    if (!Number.isSafeInteger(limit) || limit <= 0) { setError("Hạn mức cần lớn hơn 0."); return; }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({ categoryId, monthStart, limit });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu ngân sách." };
    } finally {
      setSubmitting(false);
    }
    if (!result.ok) { setError(result.message || "Không thể lưu ngân sách."); return; }
    setError("");
  }

  return <dialog ref={dialogRef} className="account-dialog budget-dialog" onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }} onClose={onClose} aria-labelledby="budget-dialog-title">
    <div className="dialog-heading"><div><p className="eyebrow">Kế hoạch tháng</p><h2 id="budget-dialog-title">{budget ? "Sửa ngân sách" : "Thêm ngân sách"}</h2></div><button className="icon-button" type="button" onClick={onClose} disabled={submitting} aria-label="Đóng"><Icon name="close" /></button></div>
    <form className="account-form" onSubmit={handleSubmit}>
      <label><span>Danh mục</span>{budget && <input type="hidden" name="categoryId" value={budget.categoryId} />}<select name={budget ? undefined : "categoryId"} defaultValue={budget?.categoryId ?? categories[0]?.id ?? ""} disabled={Boolean(budget)}>{categories.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label><span>Hạn mức tháng</span><div className="account-money-input"><input name="limit" inputMode="decimal" defaultValue={budget ? formatMoneyInput(String(budget.limit)) : ""} placeholder="0" onInput={(event) => { event.currentTarget.value = formatMoneyInput(event.currentTarget.value); setError(""); }} autoFocus={Boolean(budget)} /><strong>₫</strong></div></label>
      <p className="account-form-hint">MoneyFlow sẽ so sánh hạn mức với các giao dịch trong danh mục này.</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary-button account-submit" type="submit" disabled={submitting || !categories.length}><Icon name="check" />{submitting ? "Đang lưu..." : budget ? "Lưu thay đổi" : "Thêm ngân sách"}</button>
    </form>
  </dialog>;
}
