"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type {
  AccountOption,
  CategoryOption,
  TransactionKind,
} from "@/lib/sample-data";
import type { VoiceParsedResult } from "@/hooks/use-voice-capture";
import styles from "./voice-confirm-card.module.css";

export type VoiceConfirmInput = {
  kind: TransactionKind;
  amount: number;
  categoryId: string;
  accountId: string;
  note: string;
};

function matchCategoryId(
  categories: CategoryOption[],
  suggestedName: string | null,
): string {
  if (!suggestedName) return "";
  const found = categories.find(
    (category) =>
      category.name.toLowerCase() === suggestedName.toLowerCase(),
  );
  return found?.id ?? "";
}

/**
 * Mandatory confirmation step for voice capture. Nothing is saved until the
 * user explicitly taps "Lưu vào sổ" — the parser only proposes.
 */
export function VoiceConfirmCard({
  parsed,
  accounts,
  categories,
  disabled = false,
  onConfirm,
  onRetry,
  onCancel,
}: {
  parsed: VoiceParsedResult;
  accounts: AccountOption[];
  categories: CategoryOption[];
  disabled?: boolean;
  onConfirm: (input: VoiceConfirmInput) => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<TransactionKind>(parsed.kind);
  const [amountText, setAmountText] = useState(
    parsed.amount !== null ? formatMoneyInput(String(parsed.amount)) : "",
  );
  const [categoryId, setCategoryId] = useState(() =>
    matchCategoryId(categories, parsed.suggestedCategoryName),
  );
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [note, setNote] = useState(parsed.rest || parsed.transcript);
  const [amountError, setAmountError] = useState<string | null>(null);

  const kindCategories = useMemo(
    () => categories.filter((category) => category.kind === kind),
    [categories, kind],
  );

  function handleKindChange(value: TransactionKind) {
    setKind(value);
    const stillValid = categories.some(
      (category) => category.id === categoryId && category.kind === value,
    );
    if (!stillValid) setCategoryId("");
  }

  function handleAmountChange(value: string) {
    setAmountText(formatMoneyInput(value));
    setAmountError(null);
  }

  function handleConfirm() {
    const amount = parseMoneyInput(amountText);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      setAmountError("Nhập số tiền lớn hơn 0 nhé.");
      return;
    }
    if (!categoryId) {
      setAmountError("Chọn danh mục nhé.");
      return;
    }
    if (!accountId) {
      setAmountError("Chọn tài khoản nhé.");
      return;
    }
    onConfirm({ kind, amount, categoryId, accountId, note: note.trim() });
  }

  return (
    <section
      className={styles.card}
      aria-labelledby="voice-confirm-title"
      data-slot="voice-confirm-card"
    >
      <div className={styles.hearing}>
        <Icon name="mic" />
        <p>
          Nghe được: <q>{parsed.transcript}</q>
        </p>
      </div>
      <h2 id="voice-confirm-title" className={styles.title}>
        Xác nhận trước khi lưu
      </h2>
      {parsed.shorthand && parsed.amount !== null ? (
        <Alert tone="info" className={styles.note}>
          <AlertDescription>
            Hiểu &ldquo;{parsed.transcript}&rdquo; là{" "}
            {formatMoneyInput(String(parsed.amount))}đ — sửa lại nếu sai nhé.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className={styles.kindRow} role="group" aria-label="Loại giao dịch">
        {(["expense", "income"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            intent={kind === value ? "primary" : "secondary"}
            targetSize="important"
            onClick={() => handleKindChange(value)}
            disabled={disabled}
            className={styles.kindButton}
          >
            {value === "expense" ? "Chi" : "Thu"}
          </Button>
        ))}
      </div>

      <TextField
        label="Số tiền (đ)"
        inputMode="numeric"
        autoComplete="off"
        value={amountText}
        onChange={(event) => handleAmountChange(event.target.value)}
        error={amountError ?? undefined}
        targetSize="important"
        disabled={disabled}
      />

      <SelectField
        label="Danh mục"
        value={categoryId}
        onChange={(event) => setCategoryId(event.target.value)}
        targetSize="important"
        disabled={disabled}
      >
        <option value="">— Chọn danh mục —</option>
        {kindCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Tài khoản"
        value={accountId}
        onChange={(event) => setAccountId(event.target.value)}
        targetSize="important"
        disabled={disabled}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </SelectField>

      <TextField
        label="Ghi chú"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        targetSize="important"
        disabled={disabled}
      />

      <div className={styles.actions}>
        <Button
          type="button"
          intent="primary"
          targetSize="important"
          onClick={handleConfirm}
          disabled={disabled}
          className={styles.primary}
        >
          <Icon name="check" /> Lưu vào sổ
        </Button>
        <Button
          type="button"
          intent="secondary"
          targetSize="important"
          onClick={onRetry}
          disabled={disabled}
        >
          Nói lại
        </Button>
        <Button
          type="button"
          intent="quiet"
          targetSize="important"
          onClick={onCancel}
          disabled={disabled}
        >
          Hủy
        </Button>
      </div>
    </section>
  );
}
