"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import type { RecurringCommitment, SaveCommitmentInput } from "@/lib/commitments";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type { AccountOption, CategoryOption } from "@/lib/sample-data";

export function CommitmentDialog({ open, commitment, accounts, categories, onClose, onSave }: {
  open: boolean; commitment: RecurringCommitment | null; accounts: AccountOption[]; categories: CategoryOption[];
  onClose: () => void; onSave: (input: SaveCommitmentInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState(""); const [submitting, setSubmitting] = useState(false);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); }, [open]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const amount = parseMoneyInput(String(data.get("amount") ?? "")); const dueDay = Number(data.get("dueDay"));
    const input: SaveCommitmentInput = { id: commitment?.id, name: String(data.get("name") ?? "").trim(), amount, dueDay, accountId: String(data.get("accountId") ?? ""), categoryId: String(data.get("categoryId") ?? "") };
    if (!input.name) { setError("Nhập tên khoản định kỳ."); return; } if (!Number.isSafeInteger(amount) || amount <= 0) { setError("Số tiền cần lớn hơn 0."); return; } if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) { setError("Ngày đến hạn phải từ 1 đến 31."); return; }
    setSubmitting(true); let result: { ok: boolean; message?: string }; try { result = await onSave(input); } catch { result = { ok: false, message: "Mất kết nối khi lưu." }; } finally { setSubmitting(false); }
    if (!result.ok) { setError(result.message || "Không thể lưu khoản định kỳ."); return; } setError("");
  }
  return <dialog ref={ref} className="account-dialog commitment-dialog" onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }} aria-labelledby="commitment-dialog-title">
    <div className="dialog-heading"><div><p className="eyebrow">Dòng tiền bắt buộc</p><h2 id="commitment-dialog-title">{commitment ? "Sửa khoản định kỳ" : "Thêm khoản định kỳ"}</h2></div><button className="icon-button" type="button" onClick={onClose} disabled={submitting} aria-label="Đóng"><Icon name="close" /></button></div>
    <form className="account-form" onSubmit={submit}>
      <label><span>Tên khoản chi</span><input name="name" maxLength={80} defaultValue={commitment?.name ?? ""} placeholder="Ví dụ: Tiền thuê nhà" autoFocus /></label>
      <label><span>Số tiền mỗi tháng</span><div className="account-money-input"><input name="amount" inputMode="decimal" defaultValue={commitment ? formatMoneyInput(String(commitment.amount)) : ""} placeholder="0" onInput={(event) => { event.currentTarget.value = formatMoneyInput(event.currentTarget.value); setError(""); }} /><strong>₫</strong></div></label>
      <div className="commitment-form-row"><label><span>Ngày đến hạn</span><input name="dueDay" type="number" min="1" max="31" defaultValue={commitment?.dueDay ?? 15} /></label><label><span>Danh mục</span><select name="categoryId" defaultValue={commitment?.categoryId ?? categories[0]?.id}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      <label><span>Thanh toán từ</span><select name="accountId" defaultValue={commitment?.accountId ?? accounts[0]?.id}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <p className="account-form-hint">Khi xác nhận đã thanh toán, MoneyFlow sẽ tạo một giao dịch chi từ tài khoản này.</p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button className="primary-button account-submit" type="submit" disabled={submitting || !accounts.length || !categories.length}><Icon name="check" />{submitting ? "Đang lưu..." : "Lưu khoản định kỳ"}</button>
    </form>
  </dialog>;
}
