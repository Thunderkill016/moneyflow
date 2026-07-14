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
import { formatMoneyInput, moneyKindPrefix, parseMoneyInput } from "@/lib/money";
import {
  readQuickAddPrefs,
  todayInVietnam,
  writeQuickAddPrefs,
} from "@/lib/quick-add-prefs";

export function AddTransactionDialog({
  open,
  onClose,
  onAdd,
  accounts,
  categories,
  disabled = false,
  embedded = false,
  title = "Thêm vào MoneyFlow",
  eyebrow = "Giao dịch mới",
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (input: CreateTransactionInput) => Promise<{ ok: boolean; message?: string }>;
  accounts: AccountOption[];
  categories: CategoryOption[];
  disabled?: boolean;
  /** Render as page panel (no modal) for `/capture/quick`. */
  embedded?: boolean;
  title?: string;
  eyebrow?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const prefsHydratedRef = useRef(false);

  const [kind, setKind] = useState<TransactionKind>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => todayInVietnam());
  const [keepOpen, setKeepOpen] = useState(false);
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

  const kindSign = moneyKindPrefix(kind);
  const amountLabel =
    kind === "expense" ? "Số tiền chi (₫)" : "Số tiền thu (₫)";

  useEffect(() => {
    if (prefsHydratedRef.current) return;
    prefsHydratedRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const prefs = readQuickAddPrefs();
      setKind(prefs.kind);
      setKeepOpen(prefs.keepOpen);
      if (prefs.accountId) setAccountId(prefs.accountId);
      if (prefs.categoryId) setCategoryId(prefs.categoryId);
      setOccurredOn(todayInVietnam());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (embedded) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // Native <dialog showModal> traps focus; remember opener to restore on close.
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, embedded]);

  useEffect(() => {
    if (!open && !embedded) return;
    const frame = window.requestAnimationFrame(() => {
      amountInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, embedded]);

  function restoreFocus() {
    const prev = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (prev && typeof prev.focus === "function") {
      window.requestAnimationFrame(() => prev.focus());
    }
  }

  /** Parent sets `open=false`; effect closes the dialog; `onClose` restores focus. */
  function handleRequestClose() {
    onClose();
  }

  function markInputChanged() {
    idempotencyKeyRef.current = null;
    setError("");
  }

  function changeKind(nextKind: TransactionKind) {
    setKind(nextKind);
    const nextCategory = categories.find((item) => item.kind === nextKind)?.id ?? "";
    setCategoryId(nextCategory);
    markInputChanged();
  }

  function persistPrefs(next: {
    kind: TransactionKind;
    accountId: string;
    categoryId: string;
    keepOpen: boolean;
  }) {
    writeQuickAddPrefs(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Nhập số tiền lớn hơn 0.");
      amountInputRef.current?.focus();
      return;
    }

    if (!selectedAccountId || !selectedCategoryId) {
      setError("Bạn cần có ít nhất một tài khoản và danh mục phù hợp.");
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError("Chọn ngày giao dịch hợp lệ.");
      return;
    }

    const idempotencyKey = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = idempotencyKey;

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

    persistPrefs({
      kind,
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      keepOpen,
    });

    idempotencyKeyRef.current = null;
    setAmount("");
    setNote("");
    setError("");

    if (keepOpen) {
      window.requestAnimationFrame(() => amountInputRef.current?.focus());
      return;
    }

    handleRequestClose();
  }

  const formBody = (
    <form onSubmit={handleSubmit} noValidate>
      <div className="segmented-control" role="group" aria-label="Loại giao dịch">
        <button
          type="button"
          className={kind === "expense" ? "active" : ""}
          onClick={() => changeKind("expense")}
          aria-pressed={kind === "expense"}
        >
          Khoản chi (−)
        </button>
        <button
          type="button"
          className={kind === "income" ? "active" : ""}
          onClick={() => changeKind("income")}
          aria-pressed={kind === "income"}
        >
          Khoản thu (+)
        </button>
      </div>

      <label className="amount-field" htmlFor="add-tx-amount">
        <span>{amountLabel}</span>
        <div>
          <span className="amount-kind-sign" aria-hidden="true">
            {kindSign}
          </span>
          <input
            id="add-tx-amount"
            ref={amountInputRef}
            name="amount"
            autoFocus
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            required
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "amount-error" : "amount-hint"}
            onChange={(event) => {
              setAmount(formatMoneyInput(event.target.value));
              markInputChanged();
            }}
          />
          <strong aria-hidden="true">₫</strong>
        </div>
      </label>
      <p id="amount-hint" className="sr-only">
        {kind === "expense"
          ? "Số tiền khoản chi, đơn vị đồng Việt Nam."
          : "Số tiền khoản thu, đơn vị đồng Việt Nam."}
      </p>
      {error && (
        <p id="amount-error" className="field-error" role="alert">
          {error}
        </p>
      )}

      <fieldset className="category-fieldset">
        <legend>Danh mục</legend>
        <div className="category-grid">
          {availableCategories.map((item) => {
            const meta = categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
            return (
              <button
                type="button"
                key={item.id}
                className={
                  selectedCategoryId === item.id ? "category-choice selected" : "category-choice"
                }
                onClick={() => {
                  setCategoryId(item.id);
                  markInputChanged();
                }}
                aria-pressed={selectedCategoryId === item.id}
              >
                <span className={`transaction-icon ${meta.color}`}>
                  <Icon name={meta.icon as IconName} />
                </span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="form-grid">
        <label htmlFor="add-tx-account">
          <span>Tài khoản</span>
          <select
            id="add-tx-account"
            name="accountId"
            value={selectedAccountId}
            onChange={(event) => {
              setAccountId(event.target.value);
              markInputChanged();
            }}
          >
            {accounts.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="add-tx-date">
          <span>Ngày</span>
          <input
            id="add-tx-date"
            name="occurredOn"
            type="date"
            value={occurredOn}
            onChange={(event) => {
              setOccurredOn(event.target.value);
              markInputChanged();
            }}
          />
        </label>
        <label className="form-span-full" htmlFor="add-tx-note">
          <span>Ghi chú</span>
          <input
            id="add-tx-note"
            name="note"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              markInputChanged();
            }}
            placeholder="Ví dụ: Cơm trưa"
            maxLength={500}
          />
        </label>
      </div>

      <label className="keep-open-row" htmlFor="add-tx-keep-open">
        <input
          id="add-tx-keep-open"
          type="checkbox"
          checked={keepOpen}
          onChange={(event) => {
            const next = event.target.checked;
            setKeepOpen(next);
            persistPrefs({
              kind,
              accountId: selectedAccountId,
              categoryId: selectedCategoryId,
              keepOpen: next,
            });
          }}
        />
        <span>Lưu xong thêm tiếp</span>
      </label>

      <div className="dialog-footer-actions">
        <button
          className="secondary-button"
          type="button"
          onClick={handleRequestClose}
          disabled={submitting}
        >
          Hủy
        </button>
        <button
          className="primary-button"
          type="submit"
          disabled={disabled || submitting || !accounts.length || !availableCategories.length}
        >
          <Icon name="check" />
          {submitting ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );

  if (embedded) {
    if (!open) return null;
    return (
      <section
        className="transaction-dialog transaction-dialog-embedded capture-quick-form"
        aria-labelledby="transaction-dialog-title"
      >
        <div className="dialog-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="transaction-dialog-title">{title}</h2>
          </div>
        </div>
        {formBody}
      </section>
    );
  }

  return (
    <dialog
      ref={dialogRef}
      className="transaction-dialog"
      onCancel={(event) => {
        // Keep trap until parent closes via open=false + dialog.close().
        event.preventDefault();
        handleRequestClose();
      }}
      onClose={() => {
        // Fires after native close (focus trap ends). Restore opener focus.
        restoreFocus();
      }}
      aria-labelledby="transaction-dialog-title"
      aria-modal="true"
    >
      <div className="dialog-handle" aria-hidden="true" />
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id="transaction-dialog-title">{title}</h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={handleRequestClose}
          aria-label="Đóng"
        >
          <Icon name="close" />
        </button>
      </div>
      {formBody}
    </dialog>
  );
}
