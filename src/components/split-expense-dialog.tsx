"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type {
  AccountOption,
  CategoryOption,
  CreateSplitExpenseInput,
} from "@/lib/sample-data";
import {
  SPLIT_MAX_LINES,
  SPLIT_MIN_LINES,
  sumSplitAmounts,
  validateSplitLines,
  splitValidationMessage,
} from "@/lib/splits";
import { todayInVietnam } from "@/lib/vietnam-date";

type LineDraft = {
  key: string;
  categoryId: string;
  amount: string;
};

function newLineKey() {
  return crypto.randomUUID();
}

export function SplitExpenseDialog({
  open,
  accounts,
  categories,
  onClose,
  onSplit,
  disabled = false,
}: {
  open: boolean;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onClose: () => void;
  onSplit: (input: CreateSplitExpenseInput) => Promise<{ ok: boolean; message?: string }>;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const idempotencyRef = useRef<string | null>(null);

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === "expense"),
    [categories],
  );

  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [occurredOn, setOccurredOn] = useState(() => todayInVietnam());
  const [lines, setLines] = useState<LineDraft[]>(() => [
    { key: newLineKey(), categoryId: "", amount: "" },
    { key: newLineKey(), categoryId: "", amount: "" },
  ]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";

  const resolvedLines = lines.map((line, index) => {
    const categoryId = expenseCategories.some((c) => c.id === line.categoryId)
      ? line.categoryId
      : expenseCategories[index]?.id ?? expenseCategories[0]?.id ?? "";
    return { ...line, categoryId };
  });

  const numericLines = resolvedLines.map((line) => ({
    categoryId: line.categoryId,
    amount: parseMoneyInput(line.amount),
  }));
  const total = sumSplitAmounts(
    numericLines.filter((l) => Number.isSafeInteger(l.amount) && l.amount > 0),
  );

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      previouslyFocusedRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function restoreFocus() {
    const prev = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (prev && typeof prev.focus === "function") {
      window.requestAnimationFrame(() => prev.focus());
    }
  }

  function markChanged() {
    idempotencyRef.current = null;
    setError("");
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
    markChanged();
  }

  function addLine() {
    if (lines.length >= SPLIT_MAX_LINES) return;
    const used = new Set(resolvedLines.map((l) => l.categoryId));
    const nextCat = expenseCategories.find((c) => !used.has(c.id))?.id ?? expenseCategories[0]?.id ?? "";
    setLines((current) => [...current, { key: newLineKey(), categoryId: nextCat, amount: "" }]);
    markChanged();
  }

  function removeLine(key: string) {
    if (lines.length <= SPLIT_MIN_LINES) return;
    setLines((current) => current.filter((line) => line.key !== key));
    markChanged();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;

    const payloadLines = resolvedLines.map((line) => ({
      categoryId: line.categoryId,
      amount: parseMoneyInput(line.amount),
    }));
    const validated = validateSplitLines(payloadLines);
    if (!validated.ok) {
      setError(splitValidationMessage(validated.error));
      return;
    }
    if (!selectedAccountId) {
      setError("Bạn cần có ít nhất một tài khoản.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError("Chọn ngày giao dịch hợp lệ.");
      return;
    }

    const expenseIds = new Set(expenseCategories.map((c) => c.id));
    if (payloadLines.some((line) => !expenseIds.has(line.categoryId))) {
      setError("Chỉ chia sang danh mục chi tiêu.");
      return;
    }

    const idempotencyKey = idempotencyRef.current ?? crypto.randomUUID();
    idempotencyRef.current = idempotencyKey;

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSplit({
        accountId: selectedAccountId,
        note: note.trim(),
        occurredOn,
        idempotencyKey,
        lines: validated.lines,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu. Hãy thử lại." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setError(result.message || "Không thể chia khoản chi.");
      return;
    }

    idempotencyRef.current = null;
    setNote("");
    setError("");
    setLines([
      { key: newLineKey(), categoryId: expenseCategories[0]?.id ?? "", amount: "" },
      { key: newLineKey(), categoryId: expenseCategories[1]?.id ?? expenseCategories[0]?.id ?? "", amount: "" },
    ]);
    onClose();
    restoreFocus();
  }

  function handleClose() {
    if (submitting) return;
    onClose();
    restoreFocus();
  }

  const canSubmit =
    !disabled &&
    !submitting &&
    accounts.length > 0 &&
    expenseCategories.length >= SPLIT_MIN_LINES;

  return (
    <dialog
      ref={ref}
      className="transaction-dialog split-expense-dialog"
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      aria-labelledby="split-expense-dialog-title"
    >
      <div className="dialog-handle" aria-hidden="true" />
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">Một khoản · nhiều danh mục</p>
          <h2 id="split-expense-dialog-title">Chia khoản chi</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={handleClose}
          disabled={submitting}
          aria-label="Đóng"
        >
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={submit} noValidate>
        <label className="amount-field" htmlFor="split-total-display">
          <span>Tổng chi (tự cộng các dòng)</span>
          <div>
            <span className="amount-kind-sign" aria-hidden="true">
              −
            </span>
            <input
              id="split-total-display"
              readOnly
              value={total ? formatMoney(total).replace(/\s*₫\s*$/, "").trim() : "0"}
              aria-readonly="true"
              tabIndex={-1}
            />
            <strong aria-hidden="true">₫</strong>
          </div>
        </label>

        {error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : null}

        <fieldset className="split-lines-fieldset">
          <legend>Dòng chia (tối thiểu {SPLIT_MIN_LINES})</legend>
          <ul className="split-lines-list">
            {resolvedLines.map((line, index) => (
              <li key={line.key} className="split-line-row">
                <label className="split-line-category">
                  <span className="sr-only">Danh mục dòng {index + 1}</span>
                  <select
                    value={line.categoryId}
                    onChange={(event) =>
                      updateLine(line.key, { categoryId: event.target.value })
                    }
                    disabled={submitting}
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="split-line-amount">
                  <span className="sr-only">Số tiền dòng {index + 1}</span>
                  <input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    value={line.amount}
                    onChange={(event) =>
                      updateLine(line.key, {
                        amount: formatMoneyInput(event.target.value),
                      })
                    }
                    disabled={submitting}
                    aria-label={`Số tiền dòng ${index + 1}`}
                  />
                  <span aria-hidden="true">₫</span>
                </label>
                <button
                  type="button"
                  className="icon-button split-line-remove"
                  onClick={() => removeLine(line.key)}
                  disabled={submitting || lines.length <= SPLIT_MIN_LINES}
                  aria-label={`Xóa dòng ${index + 1}`}
                >
                  <Icon name="trash" />
                </button>
              </li>
            ))}
          </ul>
          {lines.length < SPLIT_MAX_LINES ? (
            <button
              type="button"
              className="secondary-button split-add-line"
              onClick={addLine}
              disabled={submitting || expenseCategories.length <= lines.length}
            >
              <Icon name="plus" /> Thêm dòng
            </button>
          ) : null}
        </fieldset>

        <div className="form-grid">
          <label htmlFor="split-account">
            <span>Tài khoản</span>
            <select
              id="split-account"
              value={selectedAccountId}
              onChange={(event) => {
                setAccountId(event.target.value);
                markChanged();
              }}
              disabled={submitting}
            >
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="split-date">
            <span>Ngày</span>
            <input
              id="split-date"
              type="date"
              value={occurredOn}
              onChange={(event) => {
                setOccurredOn(event.target.value);
                markChanged();
              }}
              disabled={submitting}
            />
          </label>
        </div>

        <label className="transfer-note" htmlFor="split-note">
          <span>Ghi chú</span>
          <input
            id="split-note"
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              markChanged();
            }}
            placeholder="Ví dụ: Hóa đơn siêu thị chia Ăn uống + Mua sắm"
            maxLength={500}
            disabled={submitting}
          />
        </label>

        <div className="transfer-explainer">
          <Icon name="check" />
          <p>
            <strong>Một giao dịch · nhiều danh mục.</strong> Tổng tài khoản giảm đúng tổng các
            dòng; ngân sách theo từng danh mục vẫn đúng.
          </p>
        </div>

        <div className="dialog-footer-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button className="primary-button" type="submit" disabled={!canSubmit}>
            <Icon name="plus" />
            {submitting ? "Đang lưu..." : "Lưu khoản chia"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
