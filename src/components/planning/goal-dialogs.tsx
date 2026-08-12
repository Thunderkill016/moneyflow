"use client";

import { FormEvent, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/text-field";
import {
  MONEY_FRACTION_ENTRY_MESSAGE,
  formatMoney,
  formatMoneyInput,
  isFractionAttempt,
  parseMoneyInput,
} from "@/lib/money";
import type { SaveGoalInput, SavingsGoal } from "@/lib/planning/goals";
import styles from "./planning-dialog.module.css";

export function GoalDialog({
  open,
  goal,
  today,
  onClose,
  onSave,
}: {
  open: boolean;
  goal: SavingsGoal | null;
  today: string;
  onClose: () => void;
  onSave: (input: SaveGoalInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(goal ? formatMoneyInput(String(goal.target)) : "");
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [nameError, setNameError] = useState("");
  const [targetError, setTargetError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const formId = "goal-form";

  function clearErrors() {
    setNameError("");
    setTargetError("");
    setFormError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedTarget = parseMoneyInput(target);

    clearErrors();
    if (!trimmedName || trimmedName.length > 80) {
      setNameError("Tên mục tiêu cần từ 1 đến 80 ký tự.");
      nameRef.current?.focus();
      return;
    }
    if (!Number.isSafeInteger(parsedTarget) || parsedTarget <= 0) {
      setTargetError(
        isFractionAttempt(target)
          ? MONEY_FRACTION_ENTRY_MESSAGE
          : "Số tiền mục tiêu cần lớn hơn 0.",
      );
      targetRef.current?.focus();
      return;
    }
    if (parsedTarget < (goal?.allocated ?? 0)) {
      setTargetError("Mức đích không thể thấp hơn số đã đánh dấu dành cho mục tiêu.");
      targetRef.current?.focus();
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({
        id: goal?.id,
        name: trimmedName,
        target: parsedTarget,
        deadline: deadline || null,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu mục tiêu." };
    } finally {
      setSubmitting(false);
    }
    if (!result.ok) setFormError(result.message || "Không thể lưu mục tiêu.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title={goal ? "Sửa mục tiêu" : "Thêm mục tiêu"}
      description="Mục tiêu là một dấu mốc kế hoạch; MoneyFlow không tự chuyển hoặc khóa tiền trong tài khoản."
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
          >
            <Icon name="check" /> Lưu mục tiêu
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.formGrid}>
          <TextField
            inputRef={nameRef}
            label="Tên mục tiêu"
            value={name}
            maxLength={80}
            placeholder="Ví dụ: Quỹ khẩn cấp"
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
            inputRef={targetRef}
            label="Số tiền muốn đạt"
            value={target}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            suffix="₫"
            error={targetError || undefined}
            targetSize="important"
            inputClassName={styles.amountInput}
            disabled={submitting}
            onChange={(event) => {
              setTarget(formatMoneyInput(event.target.value));
              clearErrors();
            }}
          />
          <TextField
            label="Ngày muốn hoàn thành"
            description="Không bắt buộc. MoneyFlow chỉ dùng ngày này để tính nhịp kế hoạch."
            value={deadline}
            type="date"
            min={goal?.deadline && goal.deadline < today ? goal.deadline : today}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setDeadline(event.target.value);
              clearErrors();
            }}
          />
        </div>
        {formError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}

export function GoalAllocationDialog({
  open,
  goal,
  mode,
  onClose,
  onSubmit,
}: {
  open: boolean;
  goal: SavingsGoal | null;
  mode: "allocate" | "release";
  onClose: () => void;
  onSubmit: (amount: number) => Promise<{ ok: boolean; message?: string }>;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const max =
    mode === "allocate"
      ? Math.max(0, (goal?.target ?? 0) - (goal?.allocated ?? 0))
      : goal?.allocated ?? 0;
  const formId = "goal-allocation-form";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    setError("");
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError(
        isFractionAttempt(amount)
          ? MONEY_FRACTION_ENTRY_MESSAGE
          : "Số tiền cần lớn hơn 0.",
      );
      amountRef.current?.focus();
      return;
    }
    if (parsedAmount > max) {
      setError(
        mode === "allocate"
          ? "Số tiền vượt phần còn thiếu của mục tiêu."
          : "Không thể giảm quá số đang được đánh dấu cho mục tiêu.",
      );
      amountRef.current?.focus();
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSubmit(parsedAmount);
    } catch {
      result = { ok: false, message: "Mất kết nối khi điều chỉnh mục tiêu." };
    } finally {
      setSubmitting(false);
    }
    if (!result.ok) setError(result.message || "Không thể điều chỉnh mục tiêu.");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title={mode === "allocate" ? "Đánh dấu thêm cho mục tiêu" : "Giảm số đã đánh dấu"}
      description="Thao tác này chỉ cập nhật kế hoạch mục tiêu; số dư tài khoản và tổng tài sản không đổi."
      dismissible={!submitting}
      initialFocusRef={amountRef}
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
            pendingLabel="Đang cập nhật…"
            disabled={max === 0}
          >
            <Icon name={mode === "allocate" ? "flag" : "restore"} />
            {mode === "allocate" ? "Đánh dấu" : "Giảm số đánh dấu"}
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.context}>
          <span className={styles.contextIcon}>
            <Icon name={mode === "allocate" ? "flag" : "restore"} />
          </span>
          <div className={styles.contextCopy}>
            <strong>{goal?.name}</strong>
            <p>
              {mode === "allocate"
                ? `Còn thiếu ${formatMoney(max)}`
                : `Đang đánh dấu ${formatMoney(max)}`}
            </p>
          </div>
        </div>
        <TextField
          inputRef={amountRef}
          label="Số tiền kế hoạch"
          value={amount}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          suffix="₫"
          targetSize="important"
          inputClassName={styles.amountInput}
          error={error || undefined}
          disabled={submitting || max === 0}
          onChange={(event) => {
            setAmount(formatMoneyInput(event.target.value));
            setError("");
          }}
        />
        <Alert tone="info">
          <AlertDescription>
            Không có giao dịch, chuyển tiền hoặc thay đổi số dư nào được tạo từ thao tác này.
          </AlertDescription>
        </Alert>
      </form>
    </Dialog>
  );
}
