"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import {
  categoryKindLabels,
  CATEGORY_NAME_MAX,
  normalizeCategoryName,
  type CategorySummary,
  type SaveCategoryInput,
} from "@/lib/categories";
import type { TransactionKind } from "@/lib/sample-data";

export function CategoryDialog({
  open,
  category,
  onClose,
  onSave,
}: {
  open: boolean;
  category: CategorySummary | null;
  onClose: () => void;
  onSave: (input: SaveCategoryInput) => Promise<{ ok: boolean; message?: string }>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<TransactionKind>(category?.kind ?? "expense");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = normalizeCategoryName(String(formData.get("name") ?? ""));
    if (!name || name.length > CATEGORY_NAME_MAX) {
      setError(`Tên danh mục cần từ 1 đến ${CATEGORY_NAME_MAX} ký tự.`);
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({
        id: category?.id,
        name,
        kind: category?.kind ?? kind,
        icon: category?.icon,
        color: category?.color,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu danh mục." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setError(result.message || "Không thể lưu danh mục.");
      return;
    }
    setError("");
    formRef.current?.reset();
  }

  return (
    <dialog
      ref={dialogRef}
      className="account-dialog"
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
      onClose={onClose}
      aria-labelledby="category-dialog-title"
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">Danh mục</p>
          <h2 id="category-dialog-title">
            {category ? "Đổi tên danh mục" : "Thêm danh mục"}
          </h2>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label="Đóng"
        >
          <Icon name="close" />
        </button>
      </div>

      <form ref={formRef} className="account-form" onSubmit={handleSubmit}>
        <label>
          <span>Tên danh mục</span>
          <input
            name="name"
            defaultValue={category?.name ?? ""}
            placeholder="Ví dụ: Cafe"
            maxLength={CATEGORY_NAME_MAX}
            autoFocus
            required
          />
        </label>
        <label>
          <span>Loại</span>
          {category ? (
            <input
              value={categoryKindLabels[category.kind]}
              readOnly
              aria-readonly="true"
            />
          ) : (
            <select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as TransactionKind);
                setError("");
              }}
            >
              <option value="expense">{categoryKindLabels.expense}</option>
              <option value="income">{categoryKindLabels.income}</option>
            </select>
          )}
        </label>
        <p className="account-form-hint">
          Không có danh mục con. Tên phải khác các danh mục cùng loại (chi hoặc
          thu).
        </p>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-footer-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={onClose}
            disabled={submitting}
          >
            Hủy
          </button>
          <button
            className="primary-button account-submit"
            type="submit"
            disabled={submitting}
          >
            <Icon name="check" />
            {submitting
              ? "Đang lưu..."
              : category
                ? "Lưu thay đổi"
                : "Thêm danh mục"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
