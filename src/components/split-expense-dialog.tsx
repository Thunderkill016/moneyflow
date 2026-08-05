"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type {
  AccountOption,
  CategoryOption,
  CreateSplitExpenseInput,
} from "@/lib/sample-data";
import {
  SPLIT_MAX_LINES,
  SPLIT_MIN_LINES,
  splitValidationMessage,
  sumSplitAmounts,
  validateSplitLines,
} from "@/lib/splits";
import { todayInVietnam } from "@/lib/vietnam-date";
import styles from "./transactions/transaction-form.module.css";

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
  const firstAmountRef = useRef<HTMLInputElement>(null);
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
    numericLines.filter((line) => Number.isSafeInteger(line.amount) && line.amount > 0),
  );

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
    const used = new Set(resolvedLines.map((line) => line.categoryId));
    const nextCategory =
      expenseCategories.find((category) => !used.has(category.id))?.id ??
      expenseCategories[0]?.id ??
      "";
    setLines((current) => [
      ...current,
      { key: newLineKey(), categoryId: nextCategory, amount: "" },
    ]);
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
      firstAmountRef.current?.focus();
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

    const expenseIds = new Set(expenseCategories.map((category) => category.id));
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
      {
        key: newLineKey(),
        categoryId: expenseCategories[0]?.id ?? "",
        amount: "",
      },
      {
        key: newLineKey(),
        categoryId:
          expenseCategories[1]?.id ?? expenseCategories[0]?.id ?? "",
        amount: "",
      },
    ]);
  }

  const canSubmit =
    !disabled &&
    accounts.length > 0 &&
    expenseCategories.length >= SPLIT_MIN_LINES;
  const formId = "split-expense-form";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title="Chia khoản chi"
      description="Một khoản · nhiều danh mục"
      dismissible={!submitting}
      initialFocusRef={firstAmountRef}
      className={styles.dialog}
      contentClassName={styles.dialogContent}
      footer={
        <div className={styles.footerActions}>
          <Button
            type="button"
            intent="secondary"
            targetSize="important"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            form={formId}
            type="submit"
            intent="primary"
            targetSize="important"
            pending={submitting}
            pendingLabel="Đang lưu..."
            disabled={!canSubmit}
          >
            <Icon name="plus" /> Lưu khoản chia
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <TextField
          label="Tổng chi (tự cộng các dòng)"
          readOnly
          tabIndex={-1}
          value={total ? formatMoney(total).replace(/\s*₫\s*$/, "").trim() : "0"}
          prefix="−"
          suffix="₫"
          targetSize="important"
          inputClassName={`${styles.amountInput} ${styles.readonlyAmount}`}
          aria-readonly="true"
        />

        {error ? (
          <Alert tone="error" live="assertive" className={styles.formAlert}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <fieldset className={styles.splitFieldset}>
          <legend>Dòng chia (tối thiểu {SPLIT_MIN_LINES})</legend>
          <ul className={styles.splitList}>
            {resolvedLines.map((line, index) => (
              <li key={line.key} className={styles.splitRow}>
                <SelectField
                  label={`Danh mục dòng ${index + 1}`}
                  value={line.categoryId}
                  targetSize="important"
                  disabled={submitting}
                  onChange={(event) =>
                    updateLine(line.key, { categoryId: event.target.value })
                  }
                >
                  {expenseCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  inputRef={index === 0 ? firstAmountRef : undefined}
                  label={`Số tiền dòng ${index + 1}`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={line.amount}
                  suffix="₫"
                  targetSize="important"
                  disabled={submitting}
                  onChange={(event) =>
                    updateLine(line.key, {
                      amount: formatMoneyInput(event.target.value),
                    })
                  }
                />
                <IconButton
                  type="button"
                  variant="ghost"
                  onClick={() => removeLine(line.key)}
                  disabled={submitting || lines.length <= SPLIT_MIN_LINES}
                  aria-label={`Xóa dòng ${index + 1}`}
                >
                  <Icon name="trash" />
                </IconButton>
              </li>
            ))}
          </ul>
          {lines.length < SPLIT_MAX_LINES ? (
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              className={styles.splitAddLine}
              onClick={addLine}
              disabled={submitting || expenseCategories.length <= lines.length}
            >
              <Icon name="plus" /> Thêm dòng
            </Button>
          ) : null}
        </fieldset>

        <div className={styles.formGrid}>
          <SelectField
            label="Tài khoản"
            value={selectedAccountId}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setAccountId(event.target.value);
              markChanged();
            }}
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Ngày"
            type="date"
            value={occurredOn}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setOccurredOn(event.target.value);
              markChanged();
            }}
          />
        </div>

        <TextField
          label="Ghi chú"
          value={note}
          targetSize="important"
          disabled={submitting}
          onChange={(event) => {
            setNote(event.target.value);
            markChanged();
          }}
          placeholder="Ví dụ: Hóa đơn siêu thị chia Ăn uống + Mua sắm"
          maxLength={500}
        />

        <div className={styles.explainer}>
          <Icon name="check" />
          <p>
            <strong>Một giao dịch · nhiều danh mục.</strong> Tổng tài khoản giảm đúng tổng các
            dòng; ngân sách theo từng danh mục vẫn đúng.
          </p>
        </div>
      </form>
    </Dialog>
  );
}
