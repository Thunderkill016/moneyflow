"use client";

import { FormEvent, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type { BudgetSummary, SaveBudgetInput } from "@/lib/planning/budgets";
import type { CategoryOption } from "@/lib/sample-data";
import styles from "./planning-dialog.module.css";

export function BudgetDialog({
  open,
  budget,
  categories,
  monthStart,
  onClose,
  onSave,
}: {
  open: boolean;
  budget: BudgetSummary | null;
  categories: CategoryOption[];
  monthStart: string;
  onClose: () => void;
  onSave: (input: SaveBudgetInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const limitRef = useRef<HTMLInputElement>(null);
  const [categoryId, setCategoryId] = useState(budget?.categoryId ?? categories[0]?.id ?? "");
  const [limit, setLimit] = useState(budget ? formatMoneyInput(String(budget.limit)) : "");
  const [categoryError, setCategoryError] = useState("");
  const [limitError, setLimitError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formId = "budget-form";

  function clearErrors() {
    setCategoryError("");
    setLimitError("");
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedLimit = parseMoneyInput(limit);
    clearErrors();

    if (!categoryId) {
      setCategoryError("Chọn một danh mục chi tiêu.");
      return;
    }
    if (!Number.isSafeInteger(parsedLimit) || parsedLimit <= 0) {
      setLimitError("Hạn mức cần lớn hơn 0.");
      limitRef.current?.focus();
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({ categoryId, monthStart, limit: parsedLimit });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu ngân sách." };
    } finally {
      setSubmitting(false);
    }
    if (!result.ok) setFormError(result.message || "Không thể lưu ngân sách.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title={budget ? "Sửa ngân sách" : "Thêm ngân sách"}
      description="Hạn mức áp dụng cho một danh mục trong đúng tháng đang xem."
      dismissible={!submitting}
      initialFocusRef={limitRef}
      className={styles.dialog}
      contentClassName={styles.dialogContent}
      footer={
        <div className={styles.footerActions}>
          <Button
            type="button"
            intent="secondary"
            targetSize="important"
            disabled={submitting}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            form={formId}
            type="submit"
            intent="primary"
            targetSize="important"
            pending={submitting}
            pendingLabel="Đang lưu…"
            disabled={!categories.length}
          >
            <Icon name="check" /> {budget ? "Lưu thay đổi" : "Thêm ngân sách"}
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          <SelectField
            label="Danh mục"
            value={categoryId}
            error={categoryError || undefined}
            targetSize="important"
            disabled={Boolean(budget) || submitting}
            onChange={(event) => {
              setCategoryId(event.target.value);
              clearErrors();
            }}
          >
            {categories.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
          <TextField
            inputRef={limitRef}
            label="Hạn mức tháng"
            description="MoneyFlow so sánh hạn mức này với các giao dịch chi thuộc danh mục."
            value={limit}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            suffix="₫"
            error={limitError || undefined}
            targetSize="important"
            inputClassName={styles.amountInput}
            disabled={submitting}
            onChange={(event) => {
              setLimit(formatMoneyInput(event.target.value));
              clearErrors();
            }}
          />
        </div>
        <Alert tone="info">
          <AlertDescription>
            Hạn mức không giữ hoặc chuyển tiền. Xóa hạn mức cũng không xóa giao dịch.
          </AlertDescription>
        </Alert>
        {formError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}
