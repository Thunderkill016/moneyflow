"use client";

import { useMemo, useState } from "react";
import { SecondaryReviewDialog } from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import { partitionPendingCandidates } from "@/lib/inbox/readiness";
import type { BulkReviewAction } from "@/lib/inbox/review";
import type { AccountOption, CategoryOption } from "@/lib/sample-data";
import styles from "./inbox-bulk-bar.module.css";

export type BulkApplyPayload = {
  action: BulkReviewAction;
  selectedIds: string[];
  includeLowConfidence: boolean;
  categoryId: string;
  accountId: string;
};

const ACTION_LABELS: Record<BulkReviewAction, string> = {
  approve: "Duyệt vào sổ",
  reject: "Từ chối ứng viên",
  category: "Gán danh mục",
  account: "Gán tài khoản",
};

export function InboxBulkBar({
  candidates,
  selectedIds,
  accounts,
  categories,
  busy = false,
  onClear,
  onApply,
}: {
  candidates: InboxCandidate[];
  selectedIds: string[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  busy?: boolean;
  onClear: () => void;
  onApply: (payload: BulkApplyPayload) => Promise<void> | void;
}) {
  const [action, setAction] = useState<BulkReviewAction>("approve");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [applying, setApplying] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const count = selectedIds.length;
  const selectedCandidates = useMemo(() => {
    const selected = new Set(selectedIds);
    return candidates.filter((item) => selected.has(item.id));
  }, [candidates, selectedIds]);
  const readiness = useMemo(
    () => partitionPendingCandidates(selectedCandidates, accounts, categories),
    [selectedCandidates, accounts, categories],
  );
  const readyIds = useMemo(
    () => readiness.ready.map((item) => item.id),
    [readiness.ready],
  );
  const attentionCount = readiness.needsAttention.length;

  const allCategories = useMemo(
    () => [
      ...categories.filter((item) => item.kind === "expense"),
      ...categories.filter((item) => item.kind === "income"),
    ],
    [categories],
  );
  const selectedCategoryId = allCategories.some((item) => item.id === categoryId)
    ? categoryId
    : allCategories[0]?.id ?? "";
  const selectedCategory = allCategories.find((item) => item.id === selectedCategoryId);
  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : accounts[0]?.id ?? "";
  const selectedAccount = accounts.find((item) => item.id === selectedAccountId);
  const isBusy = busy || applying;

  if (count === 0) return null;

  const canReview =
    !isBusy &&
    (action !== "approve" || readyIds.length > 0) &&
    (action !== "category" || Boolean(selectedCategoryId)) &&
    (action !== "account" || Boolean(selectedAccountId));

  async function handleConfirm() {
    setApplying(true);
    try {
      await onApply({
        action,
        selectedIds: action === "approve" ? readyIds : [...selectedIds],
        includeLowConfidence: false,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
      });
      setReviewOpen(false);
    } finally {
      setApplying(false);
    }
  }

  const consequence =
    action === "approve"
      ? `${readyIds.length} ứng viên Sẵn sàng sẽ tạo giao dịch thật sau xác nhận này. ${attentionCount ? `${attentionCount} ứng viên Cần xem lại sẽ giữ nguyên trạng thái chờ duyệt.` : "Không có ứng viên Cần xem lại trong lựa chọn."}`
      : action === "reject"
        ? "Các ứng viên được chọn sẽ rời hàng chờ. Không có giao dịch nào được tạo hoặc xóa."
        : action === "account"
          ? "Mọi ứng viên đang chờ trong lựa chọn sẽ mang tài khoản được chọn — với ứng viên chuyển khoản đó là tài khoản chi ra; chưa có giao dịch nào được tạo."
          : "Chỉ ứng viên cùng loại thu hoặc chi với danh mục được chọn mới được cập nhật; chưa có giao dịch nào được tạo.";

  return (
    <>
      <aside
        className={styles.bar}
        role="region"
        aria-label="Hành động hàng loạt"
        data-slot="inbox-bulk-review"
      >
        <div className={styles.inner}>
          <p className={styles.count}>
            Đã chọn <strong>{count}</strong> ứng viên
          </p>

          <fieldset className={styles.actions} disabled={isBusy}>
            <legend>Hành động</legend>
            {(
              [
                ["approve", "Duyệt vào sổ"],
                ["reject", "Từ chối"],
                ["category", "Gán danh mục"],
                ["account", "Gán tài khoản"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className={styles.radio}>
                <input
                  type="radio"
                  name="bulk-action"
                  checked={action === value}
                  onChange={() => setAction(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          {action === "approve" ? (
            <div className={styles.approvalOptions}>
              <Alert tone={attentionCount > 0 ? "warning" : "info"} live="polite">
                <AlertDescription>
                  <strong>{readyIds.length} Sẵn sàng</strong>
                  {attentionCount > 0
                    ? ` · ${attentionCount} Cần xem lại sẽ không được ghi sổ.`
                    : " · tất cả mục đã chọn đạt điều kiện nhóm."}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {action === "category" ? (
            <SelectField
              label="Danh mục"
              value={selectedCategoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={isBusy || allCategories.length === 0}
              targetSize="important"
              rootClassName={styles.category}
            >
              {allCategories.length === 0 ? (
                <option value="">Chưa có danh mục</option>
              ) : (
                allCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.kind === "income" ? "Thu · " : "Chi · "}
                    {item.name}
                  </option>
                ))
              )}
            </SelectField>
          ) : null}

          {action === "account" ? (
            <SelectField
              label="Tài khoản"
              value={selectedAccountId}
              onChange={(event) => setAccountId(event.target.value)}
              disabled={isBusy || accounts.length === 0}
              targetSize="important"
              rootClassName={styles.category}
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
          ) : null}

          <div className={styles.buttons}>
            <Button
              type="button"
              intent="primary"
              targetSize="important"
              onClick={() => setReviewOpen(true)}
              disabled={!canReview}
            >
              Xem lại
            </Button>
            <Button
              type="button"
              intent="secondary"
              targetSize="important"
              onClick={onClear}
              disabled={isBusy}
            >
              Bỏ chọn
            </Button>
          </div>
        </div>
      </aside>

      <SecondaryReviewDialog
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open && !isBusy) setReviewOpen(false);
        }}
        title="Xác nhận hành động hàng loạt"
        description="Kiểm tra số lượng và hậu quả trước khi áp dụng."
        details={[
          { label: "Hành động", value: ACTION_LABELS[action] },
          { label: "Đã chọn", value: `${count} ứng viên` },
          ...(action === "approve"
            ? [
                { label: "Sẵn sàng ghi sổ", value: `${readyIds.length} giao dịch` },
                { label: "Cần xem lại", value: `${attentionCount} ứng viên` },
              ]
            : []),
          ...(action === "category"
            ? [{ label: "Danh mục", value: selectedCategory?.name ?? "Chưa chọn" }]
            : []),
          ...(action === "account"
            ? [{ label: "Tài khoản", value: selectedAccount?.name ?? "Chưa chọn" }]
            : []),
        ]}
        consequence={consequence}
        confirmLabel={ACTION_LABELS[action]}
        confirmIntent={action === "reject" ? "destructive" : "primary"}
        pending={isBusy}
        onConfirm={handleConfirm}
        slot="inbox-bulk-confirmation"
      />
    </>
  );
}
