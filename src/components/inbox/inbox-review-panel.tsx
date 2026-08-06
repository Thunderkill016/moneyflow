"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { InboxExplainPanel } from "@/components/inbox/inbox-explain-panel";
import { MoneyValue } from "@/components/money-value";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  CONFIDENCE_LABELS,
  type InboxCandidate,
} from "@/lib/inbox/candidate-store";
import { approvalIdempotencyKey } from "@/lib/inbox/approval-recovery";
import {
  buildLedgerPost,
  confidenceScoreLabel,
  draftFromCandidate,
  type CandidateReviewDraft,
  type LedgerPostResult,
} from "@/lib/inbox/review";
import { maskSnippetForDisplay } from "@/lib/mask-account";
import { formatMoneyInput, parseMoneyInput } from "@/lib/money";
import type { AccountOption, CategoryOption } from "@/lib/sample-data";
import styles from "./inbox-review-panel.module.css";

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

function confidenceTone(confidence: InboxCandidate["confidence"]) {
  if (confidence === "high") return styles.confidenceHigh;
  if (confidence === "medium") return styles.confidenceMedium;
  return styles.confidenceLow;
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
  const merchantRef = useRef<HTMLInputElement>(null);
  const seed = initialDraft(candidate, accounts, categories);
  const [draft, setDraft] = useState<CandidateReviewDraft | null>(seed);
  const [amountText, setAmountText] = useState(() =>
    seed ? formatMoneyInput(String(seed.amount)) : "",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const moneyKind = draft?.kind === "income" ? "income" : "expense";
  const availableCategories = useMemo(
    () => categories.filter((item) => item.kind === moneyKind),
    [categories, moneyKind],
  );
  const showDuplicateOverride =
    candidate?.possibleDuplicate === true ||
    error.includes("rất giống") ||
    draft?.allowHeuristicDuplicate === true;
  const isBusy = busy || submitting;

  if (!candidate || !draft) return null;

  function patchDraft(partial: Partial<CandidateReviewDraft>) {
    setDraft((current) => (current ? { ...current, ...partial } : current));
    setError("");
  }

  function changeKind(kind: InboxCandidate["kind"]) {
    const nextMoneyKind = kind === "income" ? "income" : "expense";
    const nextCategory =
      kind === "transfer"
        ? draft.categoryId
        : categories.find((item) => item.kind === nextMoneyKind)?.id ?? "";
    patchDraft({ kind, categoryId: nextCategory });
  }

  async function handleApprove(event: FormEvent) {
    event.preventDefault();
    const amount = parseMoneyInput(amountText);
    const nextDraft: CandidateReviewDraft = { ...draft, amount };
    const post = buildLedgerPost(
      nextDraft,
      accounts,
      categories,
      approvalIdempotencyKey(candidate.id),
    );
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

  const parsedAmount = parseMoneyInput(amountText);
  const displayAmount = Number.isSafeInteger(parsedAmount) && parsedAmount > 0
    ? parsedAmount
    : draft.amount;
  const formId = `inbox-review-form-${candidate.id}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isBusy) onClose();
      }}
      title="Duyệt giao dịch"
      description="Kiểm tra mọi trường trước khi tạo một giao dịch thật trong sổ."
      dismissible={!isBusy}
      initialFocusRef={merchantRef}
      className={styles.dialog}
      contentClassName={styles.content}
      footer={
        <div className={styles.footer}>
          <Button
            type="button"
            intent="secondary"
            targetSize="important"
            disabled={isBusy}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form={formId}
            intent="primary"
            targetSize="important"
            pending={isBusy}
            pendingLabel="Đang ghi sổ…"
          >
            Duyệt vào sổ
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        className={styles.form}
        onSubmit={handleApprove}
        data-slot="inbox-review"
        noValidate
      >
        <section className={styles.hero} aria-label="Tóm tắt ứng viên">
          <MoneyValue
            amount={displayAmount}
            mode="kind"
            kind={draft.kind}
            label="Số tiền ứng viên"
            emphasis="strong"
            align="start"
          />
          <span className={`${styles.confidence} ${confidenceTone(candidate.confidence)}`}>
            {CONFIDENCE_LABELS[candidate.confidence]} · {confidenceScoreLabel(candidate.confidence)}
          </span>
        </section>

        {candidate.confidence === "low" ? (
          <Alert tone="warning" live="polite">
            <AlertDescription>
              Độ tin thấp. MoneyFlow không tự ghi; giao dịch chỉ được tạo sau khi bạn
              kiểm tra và bấm “Duyệt vào sổ”.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className={styles.grid}>
          <SelectField
            label="Loại"
            value={draft.kind}
            onChange={(event) => changeKind(event.target.value as InboxCandidate["kind"])}
            disabled={isBusy}
            targetSize="important"
          >
            <option value="expense">Chi</option>
            <option value="income">Thu</option>
            <option value="transfer">Chuyển khoản</option>
          </SelectField>

          <TextField
            label="Ngày"
            type="date"
            value={draft.occurredOn}
            onChange={(event) => patchDraft({ occurredOn: event.target.value })}
            disabled={isBusy}
            required
            targetSize="important"
          />

          <TextField
            ref={merchantRef}
            label="Nơi giao dịch"
            value={draft.merchant}
            onChange={(event) => patchDraft({ merchant: event.target.value })}
            disabled={isBusy}
            placeholder="Tên cửa hàng hoặc đối tác"
            maxLength={200}
            description={
              candidate.rawSnippet
                ? `Nguồn đã che: “${maskSnippetForDisplay(candidate.rawSnippet)}”`
                : undefined
            }
            targetSize="important"
          />

          <TextField
            label="Số tiền (₫)"
            inputMode="numeric"
            value={amountText}
            onChange={(event) => {
              setAmountText(formatMoneyInput(event.target.value));
              setError("");
            }}
            disabled={isBusy}
            required
            targetSize="important"
          />

          {draft.kind !== "transfer" ? (
            <SelectField
              label="Danh mục"
              value={
                availableCategories.some((item) => item.id === draft.categoryId)
                  ? draft.categoryId
                  : availableCategories[0]?.id ?? ""
              }
              onChange={(event) => patchDraft({ categoryId: event.target.value })}
              disabled={isBusy || availableCategories.length === 0}
              required
              targetSize="important"
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
            </SelectField>
          ) : null}

          <SelectField
            label={draft.kind === "transfer" ? "Từ tài khoản" : "Tài khoản"}
            value={
              accounts.some((item) => item.id === draft.accountId)
                ? draft.accountId
                : accounts[0]?.id ?? ""
            }
            onChange={(event) => patchDraft({ accountId: event.target.value })}
            disabled={isBusy || accounts.length === 0}
            required
            targetSize="important"
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
          </SelectField>

          {draft.kind === "transfer" ? (
            <SelectField
              label="Đến tài khoản"
              value={
                accounts.some((item) => item.id === draft.destinationAccountId)
                  ? draft.destinationAccountId
                  : accounts.find((item) => item.id !== draft.accountId)?.id ??
                    accounts[0]?.id ??
                    ""
              }
              onChange={(event) => patchDraft({ destinationAccountId: event.target.value })}
              disabled={isBusy || accounts.length < 2}
              required
              targetSize="important"
            >
              {accounts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </SelectField>
          ) : null}

          <TextField
            label="Ghi chú"
            value={draft.note}
            onChange={(event) => patchDraft({ note: event.target.value })}
            disabled={isBusy}
            maxLength={500}
            placeholder="Tùy chọn"
            targetSize="important"
            rootClassName={styles.wide}
          />
        </div>

        {showDuplicateOverride ? (
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={draft.allowHeuristicDuplicate}
              onChange={(event) =>
                patchDraft({ allowHeuristicDuplicate: event.target.checked })
              }
              disabled={isBusy}
            />
            <span>
              <strong>Tôi đã kiểm tra giao dịch tương tự.</strong>
              <small>Vẫn ghi sổ dù MoneyFlow phát hiện khả năng trùng.</small>
            </span>
          </label>
        ) : null}

        <InboxExplainPanel candidate={candidate} />

        {error ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className={styles.secondaryActions}>
          <Button
            type="button"
            intent="destructive"
            targetSize="important"
            disabled={isBusy}
            onClick={() => onReject(candidate.id)}
          >
            Từ chối ứng viên
          </Button>
          <Button
            type="button"
            intent="quiet"
            targetSize="important"
            disabled={isBusy}
            onClick={() => onMarkDuplicate(candidate.id)}
          >
            Đánh dấu có thể trùng
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
