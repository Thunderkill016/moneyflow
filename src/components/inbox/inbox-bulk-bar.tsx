"use client";

import { useMemo, useState } from "react";
import { SecondaryReviewDialog } from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import {
  partitionBulkApprove,
  type BulkReviewAction,
} from "@/lib/inbox/review";
import type { CategoryOption } from "@/lib/sample-data";
import styles from "./inbox-bulk-bar.module.css";

export type BulkApplyPayload = {
  action: BulkReviewAction;
  selectedIds: string[];
  includeLowConfidence: boolean;
  categoryId: string;
};

const ACTION_LABELS: Record<BulkReviewAction, string> = {
  approve: "Duyệt vào sổ",
  reject: "Từ chối ứng viên",
  category: "Gán danh mục",
};

export function InboxBulkBar({
  candidates,
  selectedIds,
  categories,
  busy = false,
  onClear,
  onApply,
}: {
  candidates: InboxCandidate[];
  selectedIds: string[];
  categories: CategoryOption[];
  busy?: boolean;
  onClear: () => void;
  onApply: (payload: BulkApplyPayload) => Promise<void> | void;
}) {
  const [action, setAction] = useState<BulkReviewAction>("approve");
  const [includeLow, setIncludeLow] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [applying, setApplying] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const count = selectedIds.length;
  const { eligible, skippedLow } = useMemo(
    () => partitionBulkApprove(candidates, selectedIds, includeLow),
    [candidates, selectedIds, includeLow],
  );

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
  const isBusy = busy || applying;

  if (count === 0) return null;

  const canReview =
    !isBusy &&
    (action !== "approve" || eligible.length > 0) &&
    (action !== "category" || Boolean(selectedCategoryId));

  async function handleConfirm() {
    setApplying(true);
    try {
      await onApply({
        action,
        selectedIds: [...selectedIds],
        includeLowConfidence: includeLow,
        categoryId: selectedCategoryId,
      });
      setReviewOpen(false);
    } finally {
      setApplying(false);
    }
  }

  const consequence =
    action === "approve"
      ? `${eligible.length} ứng viên đủ điều kiện sẽ tạo giao dịch thật. ${skippedLow.length ? `${skippedLow.length} ứng viên độ tin thấp sẽ bị bỏ qua.` : "Không có ứng viên nào bị bỏ qua theo ngưỡng hiện tại."}`
      : action === "reject"
        ? "Các ứng viên được chọn sẽ rời hàng chờ. Không có giao dịch nào được tạo hoặc xóa."
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
              {skippedLow.length > 0 && !includeLow ? (
                <Alert tone="warning" live="polite">
                  <AlertDescription>
                    {skippedLow.length} ứng viên độ tin thấp sẽ bị bỏ qua trừ khi
                    bạn bật tùy chọn bên dưới.
                  </AlertDescription>
                </Alert>
              ) : null}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={includeLow}
                  onChange={(event) => setIncludeLow(event.target.checked)}
                  disabled={isBusy}
                />
                <span>Bao gồm ứng viên độ tin thấp sau bước xem lại</span>
              </label>
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
                { label: "Sẽ ghi sổ", value: `${eligible.length} giao dịch` },
                { label: "Bị bỏ qua", value: `${skippedLow.length} ứng viên` },
              ]
            : []),
          ...(action === "category"
            ? [{ label: "Danh mục", value: selectedCategory?.name ?? "Chưa chọn" }]
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
