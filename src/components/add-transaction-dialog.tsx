"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type TransactionKind,
} from "@/lib/sample-data";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";

export function AddTransactionDialog({
  open,
  onClose,
  onAdd,
  accounts,
  categories,
  disabled = false,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: CreateTransactionInput) => Promise<{ ok: boolean; message?: string }>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  disabled?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableCategories = useMemo(
    () => categories.filter((item) => item.kind === kind),
    [categories, kind],
  );
  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";
  const selectedCategoryId = availableCategories.some((item) => item.id === categoryId)
    ? categoryId
    : availableCategories[0]?.id ?? "";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function markInputChanged() {
    idempotencyKeyRef.current = null;
    setError("");
  }

  function changeKind(nextKind: TransactionKind) {
    setKind(nextKind);
    setCategoryId(categories.find((item) => item.kind === nextKind)?.id ?? "");
    markInputChanged();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Nhập số tiền lớn hơn 0.");
      return;
    }

    if (!selectedAccountId || !selectedCategoryId) {
      setError("Bạn cần có ít nhất một tài khoản và danh mục phù hợp.");
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;
    const occurredOn = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onAdd({
        kind,
        categoryId: selectedCategoryId,
        note: note.trim(),
        accountId: selectedAccountId,
        amount: parsedAmount,
        occurredOn,
        idempotencyKey,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu. Hãy thử lại." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setError(result.message || "Không thể lưu giao dịch. Hãy thử lại.");
      return;
    }

    idempotencyKeyRef.current = null;
    setAmount("");
    setNote("");
    setError("");
  }

  return (
    <dialog
      ref={dialogRef}
      className="transaction-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      aria-labelledby="transaction-dialog-title"
    >
      <div className="dialog-handle" aria-hidden="true" />
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">Giao dịch mới</p>
          <h2 id="transaction-dialog-title">Thêm vào MoneyFlow</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Đóng">
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="segmented-control" aria-label="Loại giao dịch">
          <button type="button" className={kind === "expense" ? "active" : ""} onClick={() => changeKind("expense")} aria-pressed={kind === "expense"}>
            Khoản chi
          </button>
          <button type="button" className={kind === "income" ? "active" : ""} onClick={() => changeKind("income")} aria-pressed={kind === "income"}>
            Khoản thu
          </button>
        </div>

        <label className="amount-field">
          <span>Số tiền</span>
          <div>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setAmount(formatMoneyInput(event.target.value));
                markInputChanged();
              }}
              aria-describedby={error ? "amount-error" : undefined}
            />
            <strong>₫</strong>
          </div>
        </label>
        {error && <p id="amount-error" className="field-error">{error}</p>}

        <fieldset className="category-fieldset">
          <legend>Danh mục</legend>
          <div className="category-grid">
            {availableCategories.map((item) => {
              const meta = categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
              return (
                <button type="button" key={item.id} className={selectedCategoryId === item.id ? "category-choice selected" : "category-choice"} onClick={() => { setCategoryId(item.id); markInputChanged(); }} aria-pressed={selectedCategoryId === item.id}>
                  <span className={`transaction-icon ${meta.color}`}><Icon name={meta.icon as IconName} /></span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="form-grid">
          <label>
            <span>Tài khoản</span>
            <select value={selectedAccountId} onChange={(event) => { setAccountId(event.target.value); markInputChanged(); }}>
              {accounts.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>Ghi chú</span>
            <input value={note} onChange={(event) => { setNote(event.target.value); markInputChanged(); }} placeholder="Ví dụ: Cơm trưa" maxLength={500} />
          </label>
        </div>

        <button className="primary-button dialog-submit" type="submit" disabled={disabled || submitting || !accounts.length || !availableCategories.length}>
          <Icon name="check" />{submitting ? "Đang lưu..." : "Lưu giao dịch"}
        </button>
      </form>
    </dialog>
  );
}
