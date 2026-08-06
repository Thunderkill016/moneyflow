"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  canTransferSameCurrency,
  currencySymbolHint,
  normalizeCurrencyCode,
  transferCurrencyMismatchMessage,
} from "@/lib/currency";
import { formatMoneyInput, parseMoneyInputToMinor } from "@/lib/money";
import type { CreateTransferInput } from "@/lib/sample-data";
import { TRANSFER_LIST_HINT } from "@/lib/transfers";
import { todayInVietnam } from "@/lib/vietnam-date";
import styles from "./transfers/transfer-dialog.module.css";

export type TransferAccountOption = {
  id: string;
  name: string;
  currencyCode?: string;
  isArchived?: boolean;
};

export function TransferDialog({
  open,
  accounts,
  onClose,
  onTransfer,
}: {
  open: boolean;
  accounts: TransferAccountOption[];
  onClose: () => void;
  onTransfer: (input: CreateTransferInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const amountRef = useRef<HTMLInputElement>(null);
  const idempotencyRef = useRef<string | null>(null);
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const sourceAccount = accounts.find((item) => item.id === sourceId) ?? accounts[0];
  const source = sourceAccount?.id ?? "";
  const sourceCurrency = normalizeCurrencyCode(sourceAccount?.currencyCode ?? "VND");

  const destinationOptions = useMemo(() => {
    if (!sourceAccount) return [];
    return accounts.filter((item) =>
      canTransferSameCurrency(
        {
          id: sourceAccount.id,
          currencyCode: sourceAccount.currencyCode ?? "VND",
          isArchived: sourceAccount.isArchived ?? false,
        },
        {
          id: item.id,
          currencyCode: item.currencyCode ?? "VND",
          isArchived: item.isArchived ?? false,
        },
      ),
    );
  }, [accounts, sourceAccount]);

  const destination = destinationOptions.some((item) => item.id === destinationId)
    ? destinationId
    : destinationOptions[0]?.id ?? "";
  const destinationAccount = destinationOptions.find((item) => item.id === destination);
  const symbol = currencySymbolHint(sourceCurrency);
  const parsedReviewAmount = parseMoneyInputToMinor(amount, sourceCurrency);
  const reviewAmount =
    Number.isSafeInteger(parsedReviewAmount) && parsedReviewAmount > 0
      ? parsedReviewAmount
      : 0;
  const transferPairsExist = accounts.some((a) =>
    accounts.some((b) =>
      canTransferSameCurrency(
        {
          id: a.id,
          currencyCode: a.currencyCode ?? "VND",
          isArchived: a.isArchived ?? false,
        },
        {
          id: b.id,
          currencyCode: b.currencyCode ?? "VND",
          isArchived: b.isArchived ?? false,
        },
      ),
    ),
  );

  function changed() {
    idempotencyRef.current = null;
    setError("");
  }

  function swap() {
    if (!source || !destination) return;
    setSourceId(destination);
    setDestinationId(source);
    changed();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = parseMoneyInputToMinor(amount, sourceCurrency);
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Nhập số tiền lớn hơn 0.");
      amountRef.current?.focus();
      return;
    }
    if (!source || !destination || source === destination) {
      setError("Chọn hai tài khoản khác nhau.");
      return;
    }
    const from = accounts.find((item) => item.id === source);
    const to = accounts.find((item) => item.id === destination);
    if (
      !from ||
      !to ||
      !canTransferSameCurrency(
        {
          id: from.id,
          currencyCode: from.currencyCode ?? "VND",
          isArchived: from.isArchived ?? false,
        },
        {
          id: to.id,
          currencyCode: to.currencyCode ?? "VND",
          isArchived: to.isArchived ?? false,
        },
      )
    ) {
      setError(transferCurrencyMismatchMessage());
      return;
    }

    const idempotencyKey = idempotencyRef.current ?? crypto.randomUUID();
    idempotencyRef.current = idempotencyKey;

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onTransfer({
        sourceAccountId: source,
        destinationAccountId: destination,
        amount: parsedAmount,
        note: note.trim(),
        occurredOn: todayInVietnam(),
        idempotencyKey,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi chuyển tiền." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setError(result.message || "Không thể chuyển tiền.");
      return;
    }
    idempotencyRef.current = null;
    setAmount("");
    setNote("");
    setError("");
  }

  function accountLabel(item: TransferAccountOption) {
    const code = normalizeCurrencyCode(item.currencyCode ?? "VND");
    return code === "VND" ? item.name : `${item.name} (${code})`;
  }

  const formId = "transfer-transaction-form";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title="Chuyển tiền"
      description="Giữa các tài khoản cùng loại tiền"
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
            pendingLabel="Đang chuyển..."
            disabled={!transferPairsExist || destinationOptions.length === 0}
          >
            <Icon name="arrows" /> Xác nhận chuyển tiền
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        data-slot="transfer-form"
        className={styles.form}
        onSubmit={submit}
        noValidate
      >
        <TextField
          inputRef={amountRef}
          label="Số tiền chuyển"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          suffix={symbol}
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

        <div className={styles.transferAccounts}>
          <SelectField
            label="Từ tài khoản"
            value={source}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setSourceId(event.target.value);
              changed();
            }}
          >
            {accounts.map((item) => (
              <option value={item.id} key={item.id}>
                {accountLabel(item)}
              </option>
            ))}
          </SelectField>

          <IconButton
            type="button"
            variant="outline"
            className={styles.swapButton}
            onClick={swap}
            aria-label="Đổi chiều chuyển tiền"
            disabled={!destination || submitting}
          >
            <Icon name="arrows" />
          </IconButton>

          <SelectField
            label="Đến tài khoản"
            value={destination}
            targetSize="important"
            disabled={destinationOptions.length === 0 || submitting}
            onChange={(event) => {
              setDestinationId(event.target.value);
              changed();
            }}
          >
            {destinationOptions.length === 0 ? (
              <option value="">Không có tài khoản cùng loại tiền</option>
            ) : (
              destinationOptions.map((item) => (
                <option value={item.id} key={item.id}>
                  {accountLabel(item)}
                </option>
              ))
            )}
          </SelectField>
        </div>

        <TextField
          label="Ghi chú"
          value={note}
          targetSize="important"
          onChange={(event) => {
            setNote(event.target.value);
            changed();
          }}
          placeholder="Ví dụ: Chuyển sang quỹ tiết kiệm"
          maxLength={500}
          disabled={submitting}
        />

        <div data-slot="transfer-review" className={styles.review}>
          <div className={styles.reviewRow}>
            <span>Từ</span>
            <strong>{sourceAccount ? accountLabel(sourceAccount) : "Chưa chọn"}</strong>
          </div>
          <div className={styles.reviewRow}>
            <span>Đến</span>
            <strong>
              {destinationAccount ? accountLabel(destinationAccount) : "Chưa chọn"}
            </strong>
          </div>
          <div className={styles.reviewRow}>
            <span>Số tiền</span>
            <MoneyValue
              amount={reviewAmount}
              mode="kind"
              kind="transfer"
              currencyCode={sourceCurrency}
              emphasis="strong"
              align="start"
              label="Số tiền chuyển"
            />
          </div>
        </div>

        <div className={styles.explainer}>
          <Icon name="check" />
          <p>
            <strong>Cùng loại tiền, tổng tài sản không đổi · {TRANSFER_LIST_HINT}.</strong>{" "}
            Chỉ chuyển giữa hai tài khoản cùng {sourceCurrency}. Chưa hỗ trợ đổi ngoại tệ,
            phí chuyển tiền hay chuyển chéo loại tiền.
          </p>
        </div>
      </form>
    </Dialog>
  );
}
