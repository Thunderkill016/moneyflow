"use client";

import { FormEvent, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import {
  categoryKindLabels,
  CATEGORY_NAME_MAX,
  defaultCategoryMeta,
  normalizeCategoryName,
  type CategorySummary,
  type SaveCategoryInput,
} from "@/lib/categories";
import type { TransactionKind } from "@/lib/sample-data";
import styles from "./category-dialog.module.css";

const ICON_OPTIONS = [
  ["bowl", "Ăn uống"],
  ["car", "Di chuyển"],
  ["bag", "Mua sắm"],
  ["home", "Nhà ở"],
  ["receipt", "Hóa đơn"],
  ["spark", "Linh hoạt"],
  ["heart", "Sức khỏe"],
  ["book", "Giáo dục"],
  ["wallet", "Thu nhập"],
  ["bank", "Tài chính"],
] as const;

const COLOR_OPTIONS = [
  ["blue", "Xanh dương"],
  ["green", "Xanh lá"],
  ["violet", "Tím"],
  ["amber", "Hổ phách"],
  ["cyan", "Xanh ngọc"],
  ["coral", "San hô"],
  ["pink", "Hồng"],
  ["red", "Đỏ"],
] as const;

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
  const nameRef = useRef<HTMLInputElement>(null);
  const initialKind = category?.kind ?? "expense";
  const defaults = defaultCategoryMeta(initialKind);
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<TransactionKind>(initialKind);
  const [icon, setIcon] = useState(category?.icon ?? defaults.icon);
  const [color, setColor] = useState(category?.color ?? defaults.color);
  const [nameError, setNameError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleKindChange(nextKind: TransactionKind) {
    const nextDefaults = defaultCategoryMeta(nextKind);
    setKind(nextKind);
    setIcon(nextDefaults.icon);
    setColor(nextDefaults.color);
    setNameError("");
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = normalizeCategoryName(name);
    setNameError("");
    setFormError("");

    if (!normalizedName || normalizedName.length > CATEGORY_NAME_MAX) {
      setNameError(`Tên danh mục cần từ 1 đến ${CATEGORY_NAME_MAX} ký tự.`);
      nameRef.current?.focus();
      return;
    }

    setSubmitting(true);
    let result: { ok: boolean; message?: string };
    try {
      result = await onSave({
        id: category?.id,
        name: normalizedName,
        kind: category?.kind ?? kind,
        icon,
        color,
      });
    } catch {
      result = { ok: false, message: "Mất kết nối khi lưu danh mục." };
    } finally {
      setSubmitting(false);
    }

    if (!result.ok) {
      setFormError(result.message || "Không thể lưu danh mục.");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting) onClose();
      }}
      title={category ? "Sửa danh mục" : "Thêm danh mục"}
      description={
        category
          ? "Cập nhật tên và dấu hiệu nhận diện. Loại thu hoặc chi không đổi sau khi tạo."
          : "Tạo danh mục thu hoặc chi với tên, biểu tượng và màu nhận diện riêng."
      }
      dismissible={!submitting}
      initialFocusRef={nameRef}
      className={styles.dialog}
      contentClassName={styles.content}
      footer={
        <div className={styles.footer}>
          <Button
            type="button"
            intent="secondary"
            targetSize="important"
            disabled={submitting}
            onClick={onClose}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="category-form"
            intent="primary"
            targetSize="important"
            pending={submitting}
            pendingLabel="Đang lưu…"
          >
            {category ? "Lưu thay đổi" : "Thêm danh mục"}
          </Button>
        </div>
      }
    >
      <form id="category-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        <TextField
          ref={nameRef}
          label="Tên danh mục"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError("");
            setFormError("");
          }}
          placeholder="Ví dụ: Cà phê"
          maxLength={CATEGORY_NAME_MAX}
          autoComplete="off"
          required
          disabled={submitting}
          error={nameError || undefined}
          description="Tên phải khác các danh mục cùng loại."
          targetSize="important"
        />

        <SelectField
          label="Loại"
          value={category?.kind ?? kind}
          onChange={(event) => handleKindChange(event.target.value as TransactionKind)}
          disabled={Boolean(category) || submitting}
          description={category ? "Loại được giữ cố định để bảo toàn lịch sử." : undefined}
          targetSize="important"
        >
          <option value="expense">{categoryKindLabels.expense}</option>
          <option value="income">{categoryKindLabels.income}</option>
        </SelectField>

        <div className={styles.identityGrid}>
          <SelectField
            label="Biểu tượng"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            disabled={submitting}
            targetSize="important"
          >
            {ICON_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Màu nhận diện"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            disabled={submitting}
            description="Màu chỉ hỗ trợ nhận diện; loại và trạng thái luôn có chữ."
            targetSize="important"
          >
            {COLOR_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
        </div>

        {formError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}
