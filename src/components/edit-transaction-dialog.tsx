"use client";

import { FormEvent, useMemo, useRef, useState, useEffect } from "react";
import { Icon, type IconName } from "@/components/icons";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import { categoryMeta, type AccountOption, type CategoryOption, type Transaction, type TransactionKind, type UpdateMoneyTransactionInput, type UpdateTransferInput } from "@/lib/sample-data";

type UpdateInput = UpdateMoneyTransactionInput | UpdateTransferInput;

export function EditTransactionDialog({ transaction, accounts, categories, onClose, onSave, disabled = false }: {
  transaction: Transaction;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onClose: () => void;
  onSave: (input: UpdateInput) => Promise<{ ok: boolean; message?: string }>;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const isTransfer = transaction.kind === "transfer";
  const [kind, setKind] = useState<TransactionKind>(transaction.kind === "income" ? "income" : "expense");
  const [amount, setAmount] = useState(formatMoneyInput(String(transaction.amount)));
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [destinationId, setDestinationId] = useState(transaction.destinationAccountId ?? "");
  const [occurredOn, setOccurredOn] = useState(transaction.occurredOn);
  const [note, setNote] = useState(transaction.note);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { ref.current?.showModal(); }, []);
  const availableCategories = useMemo(() => categories.filter((item) => item.kind === kind), [categories, kind]);
  const selectedAccount = accounts.some((item) => item.id === accountId) ? accountId : accounts[0]?.id ?? "";
  const selectedCategory = availableCategories.some((item) => item.id === categoryId) ? categoryId : availableCategories[0]?.id ?? "";
  const destinationOptions = accounts.filter((item) => item.id !== selectedAccount);
  const selectedDestination = destinationOptions.some((item) => item.id === destinationId) ? destinationId : destinationOptions[0]?.id ?? "";

  function changed() { setError(""); }
  function changeKind(next: TransactionKind) { setKind(next); setCategoryId(categories.find((item) => item.kind === next)?.id ?? ""); changed(); }
  function swapAccounts() { if (!selectedAccount || !selectedDestination) return; setAccountId(selectedDestination); setDestinationId(selectedAccount); changed(); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) { setError("Nhập số tiền lớn hơn 0."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) { setError("Chọn ngày giao dịch hợp lệ."); return; }
    let input: UpdateInput;
    if (isTransfer) {
      if (!selectedAccount || !selectedDestination || selectedAccount === selectedDestination) { setError("Chọn hai tài khoản khác nhau."); return; }
      input = { id: transaction.id, kind: "transfer", sourceAccountId: selectedAccount, destinationAccountId: selectedDestination, amount: parsedAmount, occurredOn, note: note.trim() };
    } else {
      if (!selectedAccount || !selectedCategory) { setError("Chọn tài khoản và danh mục."); return; }
      input = { id: transaction.id, kind, accountId: selectedAccount, categoryId: selectedCategory, amount: parsedAmount, occurredOn, note: note.trim() };
    }
    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try { result = await onSave(input); }
    catch { result = { ok: false, message: "Mất kết nối khi cập nhật. Hãy thử lại." }; }
    finally { setSubmitting(false); }
    if (!result.ok) setError(result.message || "Không thể cập nhật giao dịch.");
  }

  return <dialog ref={ref} className="transaction-dialog edit-transaction-dialog" onCancel={(event) => { event.preventDefault(); if (!submitting) onClose(); }} onClose={onClose} aria-labelledby="edit-transaction-title">
    <div className="dialog-handle" aria-hidden="true" />
    <div className="dialog-heading"><div><p className="eyebrow">Điều chỉnh sổ tiền</p><h2 id="edit-transaction-title">Sửa giao dịch</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={submitting} aria-label="Đóng"><Icon name="close" /></button></div>
    <form onSubmit={submit}>
      {!isTransfer && <div className="segmented-control" aria-label="Loại giao dịch"><button type="button" className={kind === "expense" ? "active" : ""} onClick={() => changeKind("expense")} aria-pressed={kind === "expense"}>Khoản chi</button><button type="button" className={kind === "income" ? "active" : ""} onClick={() => changeKind("income")} aria-pressed={kind === "income"}>Khoản thu</button></div>}
      <label className="amount-field"><span>{isTransfer ? "Số tiền chuyển" : "Số tiền"}</span><div><input autoFocus inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => { setAmount(formatMoneyInput(event.target.value)); changed(); }} /><strong>₫</strong></div></label>
      {error && <p className="field-error" role="alert">{error}</p>}
      {isTransfer ? <div className="transfer-accounts"><label><span>Từ tài khoản</span><select value={selectedAccount} onChange={(event) => { setAccountId(event.target.value); changed(); }}>{accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><button type="button" onClick={swapAccounts} className="transfer-swap" aria-label="Đổi chiều chuyển tiền"><Icon name="arrows" /></button><label><span>Đến tài khoản</span><select value={selectedDestination} onChange={(event) => { setDestinationId(event.target.value); changed(); }}>{destinationOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div> : <fieldset className="category-fieldset"><legend>Danh mục</legend><div className="category-grid">{availableCategories.map((item) => { const meta = categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"]; return <button type="button" key={item.id} className={selectedCategory === item.id ? "category-choice selected" : "category-choice"} onClick={() => { setCategoryId(item.id); changed(); }} aria-pressed={selectedCategory === item.id}><span className={`transaction-icon ${meta.color}`}><Icon name={meta.icon as IconName} /></span><span>{item.name}</span></button>; })}</div></fieldset>}
      <div className="form-grid">{!isTransfer && <label><span>Tài khoản</span><select value={selectedAccount} onChange={(event) => { setAccountId(event.target.value); changed(); }}>{accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>}<label><span>Ngày giao dịch</span><input type="date" value={occurredOn} onChange={(event) => { setOccurredOn(event.target.value); changed(); }} /></label><label className={isTransfer ? "form-span-full" : ""}><span>Ghi chú</span><input value={note} onChange={(event) => { setNote(event.target.value); changed(); }} maxLength={500} placeholder={isTransfer ? "Ví dụ: Chuyển sang quỹ tiết kiệm" : "Ví dụ: Cơm trưa"} /></label></div>
      <div className="edit-impact"><Icon name={isTransfer ? "arrows" : "check"} /><p><strong>{isTransfer ? "Tổng tài sản vẫn không đổi." : "Số dư và ngân sách sẽ được tính lại."}</strong> Thay đổi chỉ được lưu khi toàn bộ bút toán cập nhật thành công.</p></div>
      <div className="dialog-footer-actions">
        <button className="secondary-button" type="button" onClick={onClose} disabled={submitting}>Hủy</button>
        <button className="primary-button" type="submit" disabled={disabled || submitting || accounts.length < (isTransfer ? 2 : 1) || (!isTransfer && !availableCategories.length)}>
          <Icon name="check" />{submitting ? "Đang cập nhật..." : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  </dialog>;
}
