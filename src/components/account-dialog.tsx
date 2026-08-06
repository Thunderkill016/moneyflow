"use client";

import { FormEvent, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  accountKindLabels,
  type AccountKind,
  type AccountSummary,
  type SaveAccountInput,
} from "@/lib/accounts";
import {
  SUPPORTED_CURRENCY_CODES,
  currencySelectLabel,
  currencySymbolHint,
  normalizeCurrencyCode,
} from "@/lib/currency";
import {
  formatMoneyInput,
  formatMoneyInputFromMinor,
  parseMoneyInputToMinor,
} from "@/lib/money";
import styles from "./accounts/account-dialog.module.css";

export function AccountDialog({
  open,
  account,
  onClose,
  onSave,
}: {
  open: boolean;
  account: AccountSummary | null;
  onClose: () => void;
  onSave: (input: SaveAccountInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "cash");
  const [currencyCode, setCurrencyCode] = useState(
    normalizeCurrencyCode(account?.currencyCode ?? "VND"),
  );
  const [amount, setAmount] = useState(
    formatMoneyInputFromMinor(Math.abs(account?.initialBalance ?? 0), account?.currencyCode ?? "VND"),
  );
  const [nameError, setNameError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(account);
  const symbol = currencySymbolHint(currencyCode);
  const formId = "account-form";

  function clearErrors() {
    setNameError("");
    setAmountError("");
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const parsedAmount = parseMoneyInputToMinor(amount, currencyCode);

    clearErrors();
    if (!trimmedName || trimmedName.length > 80) {
      setNameError("Tên tài khoản cần từ 1 đến 80 ký tự.");
      nameRef.current?.focus();
      return;
    }
    if (!Number.isSafeInteger(parsedAmount) || parsedAmount < 0) {
      setAmountError("Số dư phải là số nguyên không âm.");
      amountRef.current?.focus();
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({
        id: account?.id,
        name: trimmedName,
        kind,
        currencyCode: isEdit ? account?.currencyCode : currencyCode,
        initialBalance: kind === "credit_card" ? -parsedAmount : parsedAmount,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu tài khoản." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setFormError(result.message || "Không thể lưu tài khoản.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title={account ? "Sửa tài khoản" : "Thêm tài khoản"}
      description={
        account
          ? "Cập nhật tên, loại tài khoản hoặc số dư ban đầu."
          : "Tạo nơi giữ tiền để bắt đầu ghi giao dịch."
      }
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
          >
            <Icon name="check" /> {account ? "Lưu thay đổi" : "Thêm tài khoản"}
          </Button>
        </div>
      }
    >
      <form id={formId} data-slot="account-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.formGrid}>
          <TextField
            inputRef={nameRef}
            label="Tên tài khoản"
            value={name}
            placeholder="Ví dụ: Vietcombank"
            maxLength={80}
            targetSize="important"
            error={nameError || undefined}
            rootClassName={styles.spanFull}
            disabled={submitting}
            onChange={(event) => {
              setName(event.target.value);
              clearErrors();
            }}
          />

          <SelectField
            label="Loại tài khoản"
            value={kind}
            targetSize="important"
            disabled={submitting}
            onChange={(event) => {
              setKind(event.target.value as AccountKind);
              clearErrors();
            }}
          >
            {(Object.entries(accountKindLabels) as [AccountKind, string][]).map(
              ([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ),
            )}
          </SelectField>

          {isEdit ? (
            <TextField
              label="Loại tiền"
              value={currencySelectLabel(currencyCode)}
              description="Không thể đổi loại tiền sau khi tạo tài khoản."
              readOnly
              disabled
              targetSize="important"
            />
          ) : (
            <SelectField
              label="Loại tiền"
              value={currencyCode}
              description="Chỉ chuyển tiền giữa hai tài khoản cùng loại tiền."
              targetSize="important"
              disabled={submitting}
              onChange={(event) => {
                setCurrencyCode(normalizeCurrencyCode(event.target.value));
                clearErrors();
              }}
            >
              {SUPPORTED_CURRENCY_CODES.map((code) => (
                <option value={code} key={code}>
                  {currencySelectLabel(code)}
                </option>
              ))}
            </SelectField>
          )}

          <TextField
            inputRef={amountRef}
            label={kind === "credit_card" ? "Dư nợ hiện tại" : "Số dư ban đầu"}
            value={amount}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            suffix={symbol}
            targetSize="important"
            error={amountError || undefined}
            inputClassName={styles.amountInput}
            rootClassName={styles.spanFull}
            disabled={submitting}
            onChange={(event) => {
              setAmount(formatMoneyInput(event.target.value));
              clearErrors();
            }}
          />
        </div>

        <p className={styles.formHint}>
          {kind === "credit_card"
            ? "Nhập số dư nợ dưới dạng số dương. MoneyFlow lưu khoản nợ này như một giá trị âm trong tổng tài sản."
            : isEdit
              ? "Thay đổi số dư ban đầu sẽ thay đổi số dư hiện tại theo cùng mức chênh lệch; hãy đối chiếu trước khi lưu."
              : currencyCode === "VND"
                ? "Dùng số dư tại thời điểm bắt đầu sử dụng MoneyFlow."
                : "Nhập số nguyên theo đơn vị chính; MoneyFlow lưu theo đơn vị nhỏ nhất của loại tiền."}
        </p>

        {formError ? (
          <Alert tone="error" live="assertive" className={styles.formAlert}>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}
