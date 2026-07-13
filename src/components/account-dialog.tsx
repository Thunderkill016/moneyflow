"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { accountKindLabels, type AccountKind, type AccountSummary, type SaveAccountInput } from "@/lib/accounts";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";

export function AccountDialog({
  open,
  account,
  onClose,
  onSave,
}: {
  open: boolean;
  account: AccountSummary | null;
  onClose: () => void;
  onSave: (input: SaveAccountInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "cash");
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
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const amount = parseMoneyInput(String(formData.get("initialBalance") ?? ""));
    if (!name || name.length > 80) {
      setError("Tên tài khoản cần từ 1 đến 80 ký tự.");
      return;
    }
    if (!Number.isSafeInteger(amount) || amount < 0) {
      setError("Số dư phải là số nguyên không âm.");
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({
        id: account?.id,
        name,
        kind,
        initialBalance: kind === "credit_card" ? -amount : amount,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu tài khoản." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setError(result.message || "Không thể lưu tài khoản.");
      return;
    }
    setError("");
    formRef.current?.reset();
  }

  return (
    <dialog
      ref={dialogRef}
      className="account-dialog"
      onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }}
      onClose={onClose}
      aria-labelledby="account-dialog-title"
    >
      <div className="dialog-heading">
        <div><p className="eyebrow">Sổ tài chính</p><h2 id="account-dialog-title">{account ? "Sửa tài khoản" : "Thêm tài khoản"}</h2></div>
        <button className="icon-button" type="button" onClick={onClose} disabled={submitting} aria-label="Đóng"><Icon name="close" /></button>
      </div>

      <form ref={formRef} className="account-form" onSubmit={handleSubmit}>
        <label><span>Tên tài khoản</span><input name="name" defaultValue={account?.name ?? ""} placeholder="Ví dụ: Vietcombank" maxLength={80} autoFocus required /></label>
        <label><span>Loại tài khoản</span><select value={kind} onChange={(event) => { setKind(event.target.value as AccountKind); setError(""); }}>
          {(Object.entries(accountKindLabels) as [AccountKind, string][]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select></label>
        <label><span>{kind === "credit_card" ? "Dư nợ hiện tại" : "Số dư ban đầu"}</span><div className="account-money-input"><input name="initialBalance" inputMode="decimal" defaultValue={formatMoneyInput(String(Math.abs(account?.initialBalance ?? 0)))} placeholder="0" onInput={(event) => { event.currentTarget.value = formatMoneyInput(event.currentTarget.value); setError(""); }} /><strong>₫</strong></div></label>
        <p className="account-form-hint">{kind === "credit_card" ? "Dư nợ được ghi âm vào tổng tài sản của bạn." : "Dùng số dư tại thời điểm bắt đầu sử dụng MoneyFlow."}</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="dialog-footer-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={submitting}>Hủy</button>
          <button className="primary-button account-submit" type="submit" disabled={submitting}><Icon name="check" />{submitting ? "Đang lưu..." : account ? "Lưu thay đổi" : "Thêm tài khoản"}</button>
        </div>
      </form>
    </dialog>
  );
}
