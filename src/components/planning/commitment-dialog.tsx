"use client";

import { FormEvent, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  MONEY_FRACTION_ENTRY_MESSAGE,
  formatMoneyInput,
  isFractionAttempt,
  parseMoneyInput,
} from "@/lib/money";
import type { RecurringCommitment, SaveCommitmentInput } from "@/lib/planning/commitments";
import type { AccountOption, CategoryOption } from "@/lib/sample-data";
import styles from "./planning-dialog.module.css";

export function CommitmentDialog({
  open,
  commitment,
  accounts,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  commitment: RecurringCommitment | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onClose: () => void;
  onSave: (input: SaveCommitmentInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dueDayRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(commitment?.name ?? "");
  const [amount, setAmount] = useState(
    commitment ? formatMoneyInput(String(commitment.amount)) : "",
  );
  const [dueDay, setDueDay] = useState(String(commitment?.dueDay ?? 15));
  const [categoryId, setCategoryId] = useState(commitment?.categoryId ?? categories[0]?.id ?? "");
  const [accountId, setAccountId] = useState(commitment?.accountId ?? accounts[0]?.id ?? "");
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [dueDayError, setDueDayError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [accountError, setAccountError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formId = "commitment-form";

  function clearErrors() {
    setNameError("");
    setAmountError("");
    setDueDayError("");
    setCategoryError("");
    setAccountError("");
    setFormError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedAmount = parseMoneyInput(amount);
    const parsedDueDay = Number(dueDay);
    clearErrors();

    if (!trimmedName || trimmedName.length > 80) {
      setNameError("Tên khoản định kỳ cần từ 1 đến 80 ký tự.");
      nameRef.current?.focus();
      return;
    }
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setAmountError(
        isFractionAttempt(amount)
          ? MONEY_FRACTION_ENTRY_MESSAGE
          : "Số tiền cần lớn hơn 0.",
      );
      amountRef.current?.focus();
      return;
    }
    if (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      setDueDayError("Ngày đến hạn phải từ 1 đến 31.");
      dueDayRef.current?.focus();
      return;
    }
    if (!categoryId) {
      setCategoryError("Chọn một danh mục chi.");
      return;
    }
    if (!accountId) {
      setAccountError("Chọn tài khoản sẽ dùng khi ghi thanh toán.");
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({
        id: commitment?.id,
        name: trimmedName,
        amount: parsedAmount,
        dueDay: parsedDueDay,
        accountId,
        categoryId,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu khoản định kỳ." };
    } finally {
      setSubmitting(false);
    }
    if (!result.ok) setFormError(result.message || "Không thể lưu khoản định kỳ.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title={commitment ? "Sửa khoản định kỳ" : "Thêm khoản định kỳ"}
      description="Mẫu này là một dự kiến. Giao dịch chi chỉ được tạo khi bạn xác nhận đã thanh toán."
      dismissible={!submitting}
      initialFocusRef={nameRef}
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
            disabled={!accounts.length || !categories.length}
          >
            <Icon name="check" /> Lưu khoản định kỳ
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          <TextField
            inputRef={nameRef}
            label="Tên khoản chi"
            value={name}
            maxLength={80}
            placeholder="Ví dụ: Tiền thuê nhà"
            error={nameError || undefined}
            targetSize="important"
            rootClassName={styles.spanFull}
            disabled={submitting}
            onChange={(event) => {
              setName(event.target.value);
              clearErrors();
            }}
          />
          <TextField
            inputRef={amountRef}
            label="Số tiền dự kiến"
            value={amount}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            suffix="₫"
            error={amountError || undefined}
            targetSize="important"
            inputClassName={styles.amountInput}
            disabled={submitting}
            onChange={(event) => {
              setAmount(formatMoneyInput(event.target.value));
              clearErrors();
            }}
          />
          <TextField
            inputRef={dueDayRef}
            label="Ngày đến hạn"
            value={dueDay}
            type="number"
            min={1}
            max={31}
            error={dueDayError || undefined}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setDueDay(event.target.value);
              clearErrors();
            }}
          />
          <SelectField
            label="Danh mục chi"
            value={categoryId}
            error={categoryError || undefined}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setCategoryId(event.target.value);
              clearErrors();
            }}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Tài khoản dùng khi thanh toán"
            description="Chỉ được sử dụng sau khi bạn xác nhận tạo giao dịch chi."
            value={accountId}
            error={accountError || undefined}
            targetSize="important"
            rootClassName={styles.spanFull}
            disabled={submitting}
            onChange={(event) => {
              setAccountId(event.target.value);
              clearErrors();
            }}
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </SelectField>
        </div>
        <Alert tone="info">
          <AlertDescription>
            Lưu mẫu không thay đổi số dư. Review “Ghi đã thanh toán” sẽ nêu rõ trước khi tạo giao dịch chi thật.
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
