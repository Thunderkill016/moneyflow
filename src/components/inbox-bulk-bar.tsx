"use client";

import { useMemo, useState } from "react";
import type { InboxCandidate } from "@/lib/inbox/candidate-store";
import {
  partitionBulkApprove,
  type BulkReviewAction,
} from "@/lib/inbox/review";
import type { CategoryOption } from "@/lib/sample-data";

export type BulkApplyPayload = {
  action: BulkReviewAction;
  selectedIds: string[];
  includeLowConfidence: boolean;
  categoryId: string;
};

/**
 * Sticky bulk review bar (wireframes §11).
 * Low-confidence rows are skipped on approve unless user opts in.
 */
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

  const count = selectedIds.length;
  const { eligible, skippedLow } = useMemo(
    () => partitionBulkApprove(candidates, selectedIds, includeLow),
    [candidates, selectedIds, includeLow],
  );

  const expenseCategories = useMemo(
    () => categories.filter((item) => item.kind === "expense"),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((item) => item.kind === "income"),
    [categories],
  );
  const allCategories = useMemo(
    () => [...expenseCategories, ...incomeCategories],
    [expenseCategories, incomeCategories],
  );

  const selectedCategoryId = allCategories.some((item) => item.id === categoryId)
    ? categoryId
    : allCategories[0]?.id ?? "";

  if (count === 0) return null;

  async function handleApply() {
    setApplying(true);
    try {
      await onApply({
        action,
        selectedIds: [...selectedIds],
        includeLowConfidence: includeLow,
        categoryId: selectedCategoryId,
      });
    } finally {
      setApplying(false);
    }
  }

  const isBusy = busy || applying;

  return (
    <div className="inbox-bulk-bar" role="region" aria-label="Hành động hàng loạt">
      <div className="inbox-bulk-bar-inner">
        <p className="inbox-bulk-count">
          Đã chọn <strong>{count}</strong> giao dịch
        </p>

        <fieldset className="inbox-bulk-actions" disabled={isBusy}>
          <legend className="sr-only">Hành động</legend>
          <label className="inbox-bulk-radio">
            <input
              type="radio"
              name="bulk-action"
              checked={action === "approve"}
              onChange={() => setAction("approve")}
            />
            <span>
              Duyệt vào sổ
              {action === "approve" ? (
                <small>
                  {" "}
                  (chỉ dòng conf ≥ ngưỡng: {eligible.length}/{count})
                </small>
              ) : null}
            </span>
          </label>
          <label className="inbox-bulk-radio">
            <input
              type="radio"
              name="bulk-action"
              checked={action === "reject"}
              onChange={() => setAction("reject")}
            />
            <span>Từ chối</span>
          </label>
          <label className="inbox-bulk-radio">
            <input
              type="radio"
              name="bulk-action"
              checked={action === "category"}
              onChange={() => setAction("category")}
            />
            <span>Gán danh mục</span>
          </label>
        </fieldset>

        {action === "approve" && skippedLow.length > 0 && !includeLow ? (
          <p className="inbox-bulk-warn" role="status">
            ⚠ {skippedLow.length} dòng conf thấp sẽ bị bỏ qua trừ khi bật tùy chọn bên dưới.
          </p>
        ) : null}

        {action === "approve" ? (
          <label className="inbox-bulk-check">
            <input
              type="checkbox"
              checked={includeLow}
              onChange={(event) => setIncludeLow(event.target.checked)}
              disabled={isBusy}
            />
            <span>Bao gồm cả dòng cần xem (conf thấp)</span>
          </label>
        ) : null}

        {action === "category" ? (
          <label className="field inbox-bulk-category">
            <span>Danh mục</span>
            <select
              value={selectedCategoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              disabled={isBusy || allCategories.length === 0}
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
            </select>
          </label>
        ) : null}

        <div className="inbox-bulk-buttons">
          <button
            type="button"
            className="primary-button"
            onClick={() => void handleApply()}
            disabled={
              isBusy ||
              (action === "approve" && eligible.length === 0) ||
              (action === "category" && !selectedCategoryId)
            }
          >
            {isBusy ? "Đang áp dụng…" : "Áp dụng"}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={onClear}
            disabled={isBusy}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}
