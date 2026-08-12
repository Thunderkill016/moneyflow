"use client";

import { FormEvent, useId, useMemo, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  MONEY_FRACTION_ENTRY_MESSAGE,
  formatMoneyInput,
  isFractionAttempt,
  parseMoneyInput,
} from "@/lib/money";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type Transaction,
  type TransactionKind,
  type UpdateMoneyTransactionInput,
  type UpdateTransferInput,
} from "@/lib/sample-data";
import { TRANSFER_LIST_HINT } from "@/lib/transfers";
import styles from "./transactions/transaction-form.module.css";

type UpdateInput = UpdateMoneyTransactionInput | UpdateTransferInput;

export function EditTransactionDialog({
  transaction,
  accounts,
  categories,
  onClose,
  onSave,
  disabled = false,
}: {
  transaction: Transaction;
  accounts: AccountOption[];
  categories: CategoryOption[];
  onClose: () => void;
  onSave: (input: UpdateInput) => Promise<{ ok: boolean; message?: string }>;
  disabled?: boolean;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const isTransfer = transaction.kind === "transfer";
  const [kind, setKind] = useState<TransactionKind>(
    transaction.kind === "income" ? "income" : "expense",
  );
  const [amount, setAmount] = useState(
    formatMoneyInput(String(transaction.amount)),
  );
  const [categoryId, setCategoryId] = useState(transaction.categoryId);
  const [accountId, setAccountId] = useState(transaction.accountId);
  const [destinationId, setDestinationId] = useState(
    transaction.destinationAccountId ?? "",
  );
  const [occurredOn, setOccurredOn] = useState(transaction.occurredOn);
  const [note, setNote] = useState(transaction.note);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const availableCategories = useMemo(
    () => categories.filter((item) => item.kind === kind),
    [categories, kind],
  );
  const selectedAccount = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";
  const selectedCategory = availableCategories.some(
    (item) => item.id === categoryId,
  )
    ? categoryId
    : availableCategories[0]?.id ?? "";
  const destinationOptions = accounts.filter(
    (item) => item.id !== selectedAccount,
  );
  const selectedDestination = destinationOptions.some(
    (item) => item.id === destinationId,
  )
    ? destinationId
    : destinationOptions[0]?.id ?? "";

  function changed() {
    setError("");
  }

  function changeKind(next: TransactionKind) {
    setKind(next);
    setCategoryId(
      categories.find((item) => item.kind === next)?.id ?? "",
    );
    changed();
    window.requestAnimationFrame(() => amountRef.current?.focus());
  }

  function swapAccounts() {
    if (!selectedAccount || !selectedDestination) return;
    setAccountId(selectedDestination);
    setDestinationId(selectedAccount);
    changed();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInput(amount);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError(
        isFractionAttempt(amount)
          ? MONEY_FRACTION_ENTRY_MESSAGE
          : "Nhập số tiền lớn hơn 0.",
      );
      amountRef.current?.focus();
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) {
      setError("Chọn ngày giao dịch hợp lệ.");
      return;
    }

    let input: UpdateInput;
    if (isTransfer) {
      if (
        !selectedAccount ||
        !selectedDestination ||
        selectedAccount === selectedDestination
      ) {
        setError("Chọn hai tài khoản khác nhau.");
        return;
      }
      input = {
        id: transaction.id,
        kind: "transfer",
        sourceAccountId: selectedAccount,
        destinationAccountId: selectedDestination,
        amount: parsedAmount,
        occurredOn,
        note: note.trim(),
      };
    } else {
      if (!selectedAccount || !selectedCategory) {
        setError("Chọn tài khoản và danh mục.");
        return;
      }
      input = {
        id: transaction.id,
        kind,
        accountId: selectedAccount,
        categoryId: selectedCategory,
        amount: parsedAmount,
        occurredOn,
        note: note.trim(),
      };
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave(input);
    } catch {
      result = {
        ok: false,
        message: "Mất kết nối khi cập nhật. Hãy thử lại.",
      };
    } finally {
      setSubmitting(false);
    }
    if (!result.ok) {
      setError(result.message || "Không thể cập nhật giao dịch.");
    }
  }

  const submitDisabled =
    disabled ||
    accounts.length < (isTransfer ? 2 : 1) ||
    (!isTransfer && !availableCategories.length);

  return (
    <Dialog
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title="Sửa giao dịch"
      description="Điều chỉnh sổ tiền"
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
            pendingLabel="Đang cập nhật..."
            disabled={submitDisabled}
          >
            <Icon name="check" /> Lưu thay đổi
          </Button>
        </div>
      }
    >
      <form id={formId} className={styles.form} onSubmit={submit} noValidate>
        {!isTransfer ? (
          <div
            className={styles.segmented}
            role="group"
            aria-label="Loại giao dịch"
          >
            <Button
              type="button"
              unstyled
              targetSize="important"
              className={`${styles.segment}${
                kind === "expense" ? ` ${styles.segmentActive}` : ""
              }`}
              onClick={() => changeKind("expense")}
              aria-pressed={kind === "expense"}
            >
              Khoản chi
            </Button>
            <Button
              type="button"
              unstyled
              targetSize="important"
              className={`${styles.segment}${
                kind === "income" ? ` ${styles.segmentActive}` : ""
              }`}
              onClick={() => changeKind("income")}
              aria-pressed={kind === "income"}
            >
              Khoản thu
            </Button>
          </div>
        ) : null}

        <TextField
          inputRef={amountRef}
          label={isTransfer ? "Số tiền chuyển" : "Số tiền"}
          inputMode="numeric"
          autoComplete="off"
          value={amount}
          suffix="₫"
          targetSize="important"
          inputClassName={styles.amountInput}
          error={error.startsWith("Nhập số tiền") ? error : undefined}
          onChange={(event) => {
            setAmount(formatMoneyInput(event.target.value));
            changed();
          }}
        />

        {error && !error.startsWith("Nhập số tiền") ? (
          <Alert tone="error" live="assertive" className={styles.formAlert}>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {isTransfer ? (
          <div className={styles.transferAccounts}>
            <SelectField
              label="Từ tài khoản"
              value={selectedAccount}
              targetSize="important"
              disabled={submitting}
              onChange={(event) => {
                setAccountId(event.target.value);
                changed();
              }}
            >
              {accounts.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
            <IconButton
              type="button"
              variant="outline"
              className={styles.swapButton}
              onClick={swapAccounts}
              disabled={submitting || !selectedDestination}
              aria-label="Đổi chiều chuyển tiền"
            >
              <Icon name="arrows" />
            </IconButton>
            <SelectField
              label="Đến tài khoản"
              value={selectedDestination}
              targetSize="important"
              disabled={submitting}
              onChange={(event) => {
                setDestinationId(event.target.value);
                changed();
              }}
            >
              {destinationOptions.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
          </div>
        ) : (
          <fieldset className={styles.categoryFieldset}>
            <legend>Danh mục</legend>
            <div className={styles.categoryGrid}>
              {availableCategories.map((item) => {
                const meta =
                  categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
                return (
                  <Button
                    type="button"
                    unstyled
                    targetSize="important"
                    key={item.id}
                    className={`${styles.categoryChoice}${
                      selectedCategory === item.id
                        ? ` ${styles.categorySelected}`
                        : ""
                    }`}
                    onClick={() => {
                      setCategoryId(item.id);
                      changed();
                    }}
                    aria-pressed={selectedCategory === item.id}
                  >
                    <span className={styles.categoryIcon}>
                      <Icon name={meta.icon as IconName} />
                    </span>
                    <span className={styles.categoryLabel}>{item.name}</span>
                  </Button>
                );
              })}
            </div>
          </fieldset>
        )}

        <div className={styles.formGrid}>
          {!isTransfer ? (
            <SelectField
              label="Tài khoản"
              value={selectedAccount}
              targetSize="important"
              disabled={submitting}
              onChange={(event) => {
                setAccountId(event.target.value);
                changed();
              }}
            >
              {accounts.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
          ) : null}
          <TextField
            label="Ngày giao dịch"
            type="date"
            value={occurredOn}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setOccurredOn(event.target.value);
              changed();
            }}
          />
          <TextField
            label="Ghi chú"
            rootClassName={isTransfer ? styles.spanFull : undefined}
            value={note}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setNote(event.target.value);
              changed();
            }}
            maxLength={500}
            placeholder={
              isTransfer
                ? "Ví dụ: Chuyển sang quỹ tiết kiệm"
                : "Ví dụ: Cơm trưa"
            }
          />
        </div>

        <div className={styles.impact}>
          <Icon name={isTransfer ? "arrows" : "check"} />
          <p>
            <strong>
              {isTransfer
                ? `Tổng tài sản vẫn không đổi · ${TRANSFER_LIST_HINT}.`
                : "Số dư và ngân sách sẽ được tính lại."}
            </strong>{" "}
            Thay đổi chỉ được lưu khi toàn bộ bút toán cập nhật thành công.
          </p>
        </div>
      </form>
    </Dialog>
  );
}
