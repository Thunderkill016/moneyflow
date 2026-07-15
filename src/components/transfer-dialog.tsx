"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  canTransferSameCurrency,
  currencySymbolHint,
  normalizeCurrencyCode,
  transferCurrencyMismatchMessage,
} from "@/lib/currency";
import { formatMoneyInput, parseMoneyInputToMinor } from "@/lib/money";
import type { CreateTransferInput } from "@/lib/sample-data";
import { TRANSFER_LIST_HINT } from "@/lib/transfers";

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
  const ref = useRef<HTMLDialogElement>(null);
  const idempotencyRef = useRef<string | null>(null);
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? "");
  const [destinationId, setDestinationId] = useState(accounts[1]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

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

  const symbol = currencySymbolHint(sourceCurrency);
  const transferPairsExist = accounts.some((a) =>
    accounts.some((b) =>
      canTransferSameCurrency(
        { id: a.id, currencyCode: a.currencyCode ?? "VND", isArchived: a.isArchived ?? false },
        { id: b.id, currencyCode: b.currencyCode ?? "VND", isArchived: b.isArchived ?? false },
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
        { id: from.id, currencyCode: from.currencyCode ?? "VND", isArchived: from.isArchived ?? false },
        { id: to.id, currencyCode: to.currencyCode ?? "VND", isArchived: to.isArchived ?? false },
      )
    ) {
      setError(transferCurrencyMismatchMessage());
      return;
    }

    const idempotencyKey = idempotencyRef.current ?? crypto.randomUUID();
    idempotencyRef.current = idempotencyKey;
    const occurredOn = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onTransfer({
        sourceAccountId: source,
        destinationAccountId: destination,
        amount: parsedAmount,
        note: note.trim(),
        occurredOn,
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

  return (
    <dialog
      ref={ref}
      className="transaction-dialog transfer-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
      aria-labelledby="transfer-dialog-title"
    >
      <div className="dialog-handle" aria-hidden="true" />
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">Giữa các ví của bạn</p>
          <h2 id="transfer-dialog-title">Chuyển tiền</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} disabled={submitting} aria-label="Đóng">
          <Icon name="close" />
        </button>
      </div>
      <form onSubmit={submit}>
        <label className="amount-field">
          <span>Số tiền chuyển</span>
          <div>
            <input
              autoFocus
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(event) => {
                setAmount(formatMoneyInput(event.target.value));
                changed();
              }}
            />
            <strong>{symbol}</strong>
          </div>
        </label>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="transfer-accounts">
          <label>
            <span>Từ tài khoản</span>
            <select
              value={source}
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
            </select>
          </label>
          <button type="button" onClick={swap} className="transfer-swap" aria-label="Đổi chiều chuyển tiền" disabled={!destination}>
            <Icon name="arrows" />
          </button>
          <label>
            <span>Đến tài khoản</span>
            <select
              value={destination}
              onChange={(event) => {
                setDestinationId(event.target.value);
                changed();
              }}
              disabled={destinationOptions.length === 0}
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
            </select>
          </label>
        </div>
        <label className="transfer-note">
          <span>Ghi chú</span>
          <input
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              changed();
            }}
            placeholder="Ví dụ: Chuyển sang quỹ tiết kiệm"
            maxLength={500}
          />
        </label>
        <div className="transfer-explainer">
          <Icon name="check" />
          <p>
            <strong>Cùng loại tiền, tổng tài sản không đổi · {TRANSFER_LIST_HINT}.</strong>{" "}
            Chỉ chuyển giữa hai tài khoản cùng {sourceCurrency}.
            Chưa hỗ trợ đổi ngoại tệ hay chuyển chéo loại tiền.
          </p>
        </div>
        <div className="dialog-footer-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={submitting}>
            Hủy
          </button>
          <button
            className="primary-button"
            type="submit"
            disabled={submitting || !transferPairsExist || destinationOptions.length === 0}
          >
            <Icon name="arrows" />
            {submitting ? "Đang chuyển..." : "Xác nhận chuyển tiền"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
