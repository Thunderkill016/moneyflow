"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { InboxExplainPanel } from "@/components/inbox/inbox-explain-panel";
import {
  CONFIDENCE_LABELS,
  type InboxCandidate,
} from "@/lib/inbox/candidate-store";
import {
  buildLedgerPost,
  confidenceScoreLabel,
  draftFromCandidate,
  type CandidateReviewDraft,
  type LedgerPostResult,
} from "@/lib/inbox/review";
import { maskSnippetForDisplay } from "@/lib/mask-account";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type { AccountOption, CategoryOption } from "@/lib/sample-data";

function moneySign(kind: InboxCandidate["kind"]): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔ ";
  return "−";
}

function moneyClass(kind: InboxCandidate["kind"]): string {
  if (kind === "income") return "positive";
  if (kind === "transfer") return "transfer";
  return "negative";
}

function confidenceClass(confidence: InboxCandidate["confidence"]): string {
  if (confidence === "high") return "ok";
  if (confidence === "medium") return "warning";
  return "danger";
}

export type ReviewSubmitPayload = {
  candidateId: string;
  draft: CandidateReviewDraft;
  post: Extract<LedgerPostResult, { ok: true }>;
};

function initialDraft(
  candidate: InboxCandidate | null,
  accounts: AccountOption[],
  categories: CategoryOption[],
): CandidateReviewDraft | null {
  if (!candidate) return null;
  return draftFromCandidate(candidate, accounts, categories);
}

export function InboxReviewPanel({
  open,
  candidate,
  accounts,
  categories,
  busy = false,
  onClose,
  onApprove,
  onReject,
  onMarkDuplicate,
}: {
  open: boolean;
  candidate: InboxCandidate | null;
  accounts: AccountOption[];
  categories: CategoryOption[];
  busy?: boolean;
  onClose: () => void;
  onApprove: (payload: ReviewSubmitPayload) => Promise<{ ok: boolean; message?: string }>;
  onReject: (candidateId: string) => void;
  onMarkDuplicate: (candidateId: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const seed = initialDraft(candidate, accounts, categories);
  const [draft, setDraft] = useState<CandidateReviewDraft | null>(seed);
  const [amountText, setAmountText] = useState(() =>
    seed ? formatMoneyInput(String(seed.amount)) : "",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const moneyKind = draft?.kind === "income" ? "income" : "expense";
  const availableCategories = useMemo(
    () => categories.filter((item) => item.kind === moneyKind),
    [categories, moneyKind],
  );
  const showDuplicateOverride =
    candidate?.possibleDuplicate === true ||
    error.includes("rất giống") ||
    draft?.allowHeuristicDuplicate === true;

  if (!candidate) {
    return (
      <dialog
        ref={dialogRef}
        className="transaction-dialog inbox-review-dialog"
        onClose={onClose}
        aria-labelledby="inbox-review-title"
      />
    );
  }

  function patchDraft(partial: Partial<CandidateReviewDraft>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
    setError("");
    idempotencyKeyRef.current = null;
  }

  function changeKind(kind: InboxCandidate["kind"]) {
    if (!draft) return;
    const nextMoneyKind = kind === "income" ? "income" : "expense";
    const nextCategory =
      kind === "transfer"
        ? draft.categoryId
        : categories.find((item) => item.kind === nextMoneyKind)?.id ?? "";
    patchDraft({ kind, categoryId: nextCategory });
  }

  async function handleApprove(event: FormEvent) {
    event.preventDefault();
    if (!draft || !candidate) return;

    const amount = parseMoneyInput(amountText);
    const nextDraft: CandidateReviewDraft = { ...draft, amount };
    const key = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = key;

    const post = buildLedgerPost(nextDraft, accounts, categories, key);
    if (!post.ok) {
      setError(post.message);
      return;
    }

    setSubmitting(true);
    try {
      const result = await onApprove({
        candidateId: candidate.id,
        draft: nextDraft,
        post,
      });
      if (!result.ok) {
        setError(result.message || "Không duyệt được. Hãy thử lại.");
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const isBusy = busy || submitting;

  return (
    <dialog
      ref={dialogRef}
      className="transaction-dialog inbox-review-dialog"
      onClose={onClose}
      aria-labelledby="inbox-review-title"
    >
      <div className="dialog-handle" aria-hidden="true" />
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">← Inbox</p>
          <h2 id="inbox-review-title">Duyệt giao dịch</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="Đóng"
          disabled={isBusy}
        >
          <Icon name="close" />
        </button>
      </div>

      {draft ? (
        <form className="inbox-review-form" onSubmit={handleApprove}>
          <div className="inbox-review-hero">
            <strong className={`font-mono inbox-review-amount ${moneyClass(draft.kind)}`}>
              {moneySign(draft.kind)}
              {formatMoney(parseMoneyInput(amountText) || draft.amount)}
            </strong>
            <span
              className={`preview-chip sm confidence-badge ${confidenceClass(candidate.confidence)}`}
            >
              {CONFIDENCE_LABELS[candidate.confidence]} ·{" "}
              {confidenceScoreLabel(candidate.confidence)}
            </span>
          </div>

          {candidate.confidence === "low" && (
            <p className="inbox-review-low-warn" role="status">
              Độ tin thấp — chỉ ghi sổ khi bạn bấm Duyệt (không tự đăng).
            </p>
          )}

          <label className="field">
            <span>Loại</span>
            <select
              value={draft.kind}
              onChange={(event) =>
                changeKind(event.target.value as InboxCandidate["kind"])
              }
              disabled={isBusy}
            >
              <option value="expense">Chi</option>
              <option value="income">Thu</option>
              <option value="transfer">Chuyển khoản</option>
            </select>
          </label>

          <label className="field">
            <span>Ngày</span>
            <input
              type="date"
              value={draft.occurredOn}
              onChange={(event) => patchDraft({ occurredOn: event.target.value })}
              disabled={isBusy}
              required
            />
          </label>

          <label className="field">
            <span>Merchant</span>
            <input
              type="text"
              value={draft.merchant}
              onChange={(event) => patchDraft({ merchant: event.target.value })}
              disabled={isBusy}
              placeholder="Tên cửa hàng / đối tác"
              maxLength={200}
            />
            {candidate.rawSnippet ? (
              <small className="field-hint">
                raw: “{maskSnippetForDisplay(candidate.rawSnippet)}”
              </small>
            ) : null}
          </label>

          <label className="field">
            <span>Số tiền (₫)</span>
            <input
              className="font-mono"
              inputMode="numeric"
              value={amountText}
              onChange={(event) => {
                setAmountText(formatMoneyInput(event.target.value));
                setError("");
                idempotencyKeyRef.current = null;
              }}
              disabled={isBusy}
              required
            />
          </label>

          {draft.kind !== "transfer" ? (
            <label className="field">
              <span>Danh mục</span>
              <select
                value={
                  availableCategories.some((item) => item.id === draft.categoryId)
                    ? draft.categoryId
                    : availableCategories[0]?.id ?? ""
                }
                onChange={(event) => patchDraft({ categoryId: event.target.value })}
                disabled={isBusy || availableCategories.length === 0}
                required
              >
                {availableCategories.length === 0 ? (
                  <option value="">Chưa có danh mục</option>
                ) : (
                  availableCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                )}
              </select>
            </label>
          ) : null}

          <label className="field">
            <span>{draft.kind === "transfer" ? "Từ tài khoản" : "Tài khoản"}</span>
            <select
              value={
                accounts.some((item) => item.id === draft.accountId)
                  ? draft.accountId
                  : accounts[0]?.id ?? ""
              }
              onChange={(event) => patchDraft({ accountId: event.target.value })}
              disabled={isBusy || accounts.length === 0}
              required
            >
              {accounts.length === 0 ? (
                <option value="">Chưa có tài khoản</option>
              ) : (
                accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))
              )}
            </select>
          </label>

          {draft.kind === "transfer" ? (
            <label className="field">
              <span>Đến tài khoản</span>
              <select
                value={
                  accounts.some((item) => item.id === draft.destinationAccountId)
                    ? draft.destinationAccountId
                    : accounts.find((item) => item.id !== draft.accountId)?.id ??
                      accounts[0]?.id ??
                      ""
                }
                onChange={(event) =>
                  patchDraft({ destinationAccountId: event.target.value })
                }
                disabled={isBusy || accounts.length < 2}
                required
              >
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            <span>Ghi chú</span>
            <input
              type="text"
              value={draft.note}
              onChange={(event) => patchDraft({ note: event.target.value })}
              disabled={isBusy}
              maxLength={500}
              placeholder="Tuỳ chọn"
            />
          </label>

          {showDuplicateOverride ? (
            <label className="field">
              <span>Kiểm tra trùng</span>
              <span>
                <input
                  type="checkbox"
                  checked={draft.allowHeuristicDuplicate}
                  onChange={(event) =>
                    patchDraft({ allowHeuristicDuplicate: event.target.checked })
                  }
                  disabled={isBusy}
                />{" "}
                Tôi đã kiểm tra giao dịch tương tự và vẫn muốn ghi sổ.
              </span>
            </label>
          ) : null}

          <InboxExplainPanel candidate={candidate} />

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="inbox-review-actions">
            <button type="submit" className="primary-button" disabled={isBusy}>
              {isBusy ? "Đang lưu…" : "Duyệt vào sổ"}
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={isBusy}
              onClick={() => onReject(candidate.id)}
            >
              Từ chối
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={isBusy}
              onClick={() => onMarkDuplicate(candidate.id)}
            >
              Đánh dấu trùng
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  );
}
