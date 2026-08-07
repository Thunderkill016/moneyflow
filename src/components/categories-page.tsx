"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryDialog } from "@/components/category-dialog";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import {
  SecondaryHeader,
  SecondaryReviewDialog,
  SecondarySection,
  SecondaryWorkspace,
} from "@/components/secondary/secondary-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { ViewerSummary } from "@/components/user-chip";
import {
  saveCategoryAction,
  setCategoryArchivedAction,
} from "@/app/actions/categories";
import {
  categoryKindLabels,
  validateSaveCategory,
  type CategorySummary,
  type SaveCategoryInput,
} from "@/lib/categories";
import {
  PAGE_EMPTY_CATEGORY,
  PAGE_EMPTY_CATEGORY_FILTER,
} from "@/lib/planning-pages";
import type { TransactionKind } from "@/lib/sample-data";
import styles from "./categories-page.module.css";

const KNOWN_ICONS: IconName[] = [
  "bowl",
  "car",
  "bag",
  "home",
  "receipt",
  "spark",
  "heart",
  "book",
  "wallet",
  "bank",
  "arrows",
];

function categoryIcon(name: string | null): IconName {
  return name && (KNOWN_ICONS as string[]).includes(name) ? (name as IconName) : "spark";
}

function categoryTone(color: string | null) {
  const key = color && color in styles ? color : "violet";
  return styles[key as keyof typeof styles] ?? styles.violet;
}

function CategorySection({
  title,
  description,
  items,
  busyId,
  onEdit,
  onToggleArchive,
  slot,
}: {
  title: string;
  description: string;
  items: CategorySummary[];
  busyId: string | null;
  onEdit: (item: CategorySummary) => void;
  onToggleArchive: (item: CategorySummary) => void;
  slot: string;
}) {
  if (items.length === 0) return null;

  return (
    <SecondarySection title={title} description={<p>{description}</p>} slot={slot}>
      <div className={styles.grid} data-slot="category-list">
        {items.map((item) => (
          <article
            className={item.isArchived ? `${styles.card} ${styles.archived}` : styles.card}
            key={item.id}
            data-slot="category-card"
          >
            <span
              className={`${styles.icon} ${categoryTone(item.color)}`}
              aria-hidden="true"
            >
              <Icon name={categoryIcon(item.icon)} />
            </span>
            <div className={styles.body}>
              <div className={styles.titleRow}>
                <h3>{item.name}</h3>
                <span className={styles.kind}>{categoryKindLabels[item.kind]}</span>
              </div>
              <p className={styles.meta}>
                {item.isDefault ? "Danh mục mặc định" : "Danh mục tự tạo"}
                {item.isArchived ? " · Đã ẩn khỏi giao dịch mới" : " · Đang hoạt động"}
              </p>
            </div>
            <div className={styles.actions}>
              {!item.isArchived ? (
                <Button
                  type="button"
                  intent="quiet"
                  targetSize="important"
                  onClick={() => onEdit(item)}
                  aria-label={`Sửa ${item.name}`}
                >
                  <Icon name="edit" />
                  Sửa
                </Button>
              ) : null}
              <Button
                type="button"
                intent={item.isArchived ? "secondary" : "quiet"}
                targetSize="important"
                onClick={() => onToggleArchive(item)}
                disabled={busyId === item.id}
                pending={busyId === item.id}
                pendingLabel="Đang xử lý…"
                aria-label={item.isArchived ? `Hiện lại ${item.name}` : `Ẩn ${item.name}`}
              >
                <Icon name={item.isArchived ? "restore" : "archive"} />
                {item.isArchived ? "Hiện lại" : "Ẩn"}
              </Button>
            </div>
          </article>
        ))}
      </div>
    </SecondarySection>
  );
}

export function CategoriesPage({
  viewer,
  initialCategories,
  dataError,
}: {
  viewer: ViewerSummary;
  initialCategories: CategorySummary[];
  dataError: string | null;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategorySummary | null>(null);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | TransactionKind>("all");
  const [archiveReview, setArchiveReview] = useState<CategorySummary | null>(null);

  const visible = useMemo(() => {
    if (kindFilter === "all") return categories;
    return categories.filter((item) => item.kind === kindFilter);
  }, [categories, kindFilter]);

  const activeExpense = visible.filter(
    (item) => item.kind === "expense" && !item.isArchived,
  );
  const activeIncome = visible.filter(
    (item) => item.kind === "income" && !item.isArchived,
  );
  const archived = visible.filter((item) => item.isArchived);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function openCategory(category: CategorySummary | null) {
    setEditing(category);
    setDialogVersion((value) => value + 1);
    setDialogOpen(true);
  }

  async function saveCategory(input: SaveCategoryInput) {
    const validated = validateSaveCategory(input, categories);
    if (!validated.ok) return { ok: false, message: validated.message };

    if (viewer.isDemo) {
      const previous = input.id
        ? categories.find((item) => item.id === input.id)
        : undefined;
      const next: CategorySummary = {
        id: input.id ?? crypto.randomUUID(),
        name: validated.name,
        kind: validated.kind,
        icon: input.icon ?? previous?.icon ?? (validated.kind === "income" ? "wallet" : "spark"),
        color: input.color ?? previous?.color ?? (validated.kind === "income" ? "green" : "violet"),
        isDefault: Boolean(previous?.isDefault),
        isArchived: Boolean(previous?.isArchived),
      };
      setCategories((current) =>
        input.id
          ? current.map((item) => (item.id === input.id ? next : item))
          : [...current, next],
      );
      setDialogOpen(false);
      setNotice(input.id ? "Đã cập nhật danh mục demo." : "Đã thêm danh mục demo.");
      return { ok: true };
    }

    const result = await saveCategoryAction({
      ...input,
      name: validated.name,
      kind: validated.kind,
    });
    if (result.ok && result.category) {
      setCategories((current) =>
        input.id
          ? current.map((item) =>
              item.id === input.id ? (result.category as CategorySummary) : item,
            )
          : [...current, result.category as CategorySummary],
      );
      setDialogOpen(false);
      setNotice(input.id ? "Đã cập nhật danh mục." : "Đã thêm danh mục.");
    }
    return result;
  }

  async function applyArchived(category: CategorySummary, archivedNext: boolean) {
    setBusyId(category.id);
    if (viewer.isDemo) {
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id ? { ...item, isArchived: archivedNext } : item,
        ),
      );
      setBusyId(null);
      setArchiveReview(null);
      setNotice(archivedNext ? "Đã ẩn danh mục." : "Đã hiện lại danh mục.");
      return;
    }

    const result = await setCategoryArchivedAction(category.id, archivedNext);
    setBusyId(null);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setCategories((current) =>
      current.map((item) =>
        item.id === category.id
          ? result.category ?? { ...item, isArchived: archivedNext }
          : item,
      ),
    );
    setArchiveReview(null);
    setNotice(archivedNext ? "Đã ẩn danh mục." : "Đã hiện lại danh mục.");
  }

  function toggleArchived(category: CategorySummary) {
    if (category.isArchived) {
      void applyArchived(category, false);
      return;
    }
    setArchiveReview(category);
  }

  const isEmpty = categories.length === 0 && !dataError;

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm danh mục",
        onClick: () => openCategory(null),
        disabled: Boolean(dataError),
      }}
      fabAction={{
        label: "Thêm danh mục",
        onClick: () => openCategory(null),
        disabled: Boolean(dataError),
      }}
      notice={notice}
    >
      <SecondaryWorkspace slot="categories-workspace">
        {dataError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription className={styles.alertContent}>
              <Icon name="bell" />
              <span>{dataError}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        <SecondaryHeader
          section="Phân loại thu chi"
          title="Danh mục"
          description={
            <p>
              Thêm, sửa hoặc ẩn danh mục thu và chi. Màu cùng biểu tượng hỗ trợ nhận
              diện; loại và trạng thái luôn được ghi bằng chữ.
            </p>
          }
          actions={
            <LinkButton href="/settings" intent="secondary" targetSize="important">
              <Icon name="settings" />
              Cài đặt
            </LinkButton>
          }
        />

        {!isEmpty && !dataError ? (
          <div
            className={styles.filter}
            role="group"
            aria-label="Lọc loại danh mục"
          >
            {(
              [
                ["all", "Tất cả"],
                ["expense", "Chi tiêu"],
                ["income", "Thu nhập"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                intent={kindFilter === value ? "primary" : "secondary"}
                targetSize="important"
                aria-pressed={kindFilter === value}
                onClick={() => setKindFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        ) : null}

        {isEmpty ? (
          <EmptyState
            icon={<Icon name={PAGE_EMPTY_CATEGORY.icon as IconName} />}
            title={PAGE_EMPTY_CATEGORY.title}
            description={PAGE_EMPTY_CATEGORY.description}
            primaryAction={
              <Button
                type="button"
                intent="primary"
                targetSize="important"
                onClick={() => openCategory(null)}
              >
                {PAGE_EMPTY_CATEGORY.actionLabel}
              </Button>
            }
          />
        ) : null}

        {!isEmpty && !dataError ? (
          <>
            {(kindFilter === "all" || kindFilter === "expense") ? (
              <CategorySection
                title="Chi tiêu đang dùng"
                description="Có thể chọn khi ghi khoản chi mới."
                items={activeExpense}
                busyId={busyId}
                onEdit={openCategory}
                onToggleArchive={toggleArchived}
                slot="category-expense-list"
              />
            ) : null}
            {(kindFilter === "all" || kindFilter === "income") ? (
              <CategorySection
                title="Thu nhập đang dùng"
                description="Có thể chọn khi ghi khoản thu mới."
                items={activeIncome}
                busyId={busyId}
                onEdit={openCategory}
                onToggleArchive={toggleArchived}
                slot="category-income-list"
              />
            ) : null}
            {archived.length > 0 ? (
              <CategorySection
                title="Đã ẩn"
                description="Không còn trong picker mới; lịch sử cũ vẫn được giữ và có thể hiện lại."
                items={archived}
                busyId={busyId}
                onEdit={openCategory}
                onToggleArchive={toggleArchived}
                slot="category-archived-list"
              />
            ) : null}
            {activeExpense.length === 0 &&
            activeIncome.length === 0 &&
            archived.length === 0 ? (
              <EmptyState
                icon={<Icon name={PAGE_EMPTY_CATEGORY_FILTER.icon as IconName} />}
                title={PAGE_EMPTY_CATEGORY_FILTER.title}
                description={PAGE_EMPTY_CATEGORY_FILTER.description}
              />
            ) : null}
          </>
        ) : null}
      </SecondaryWorkspace>

      <CategoryDialog
        key={`${editing?.id ?? "new"}-${dialogVersion}`}
        open={dialogOpen}
        category={editing}
        onClose={() => setDialogOpen(false)}
        onSave={saveCategory}
      />

      <SecondaryReviewDialog
        open={Boolean(archiveReview)}
        onOpenChange={(open) => {
          if (!open && !busyId) setArchiveReview(null);
        }}
        title="Ẩn danh mục?"
        description="Kiểm tra ảnh hưởng trước khi ẩn khỏi các giao dịch mới."
        details={archiveReview ? [
          { label: "Danh mục", value: archiveReview.name },
          { label: "Loại", value: categoryKindLabels[archiveReview.kind] },
          { label: "Lịch sử", value: "Được giữ nguyên" },
        ] : []}
        consequence="Danh mục sẽ biến mất khỏi picker khi ghi giao dịch mới. Giao dịch, ngân sách và lịch sử cũ không bị xóa; bạn có thể hiện lại sau."
        confirmLabel="Ẩn danh mục"
        confirmIntent="destructive"
        pending={Boolean(archiveReview && busyId === archiveReview.id)}
        onConfirm={() => archiveReview ? applyArchived(archiveReview, true) : undefined}
        slot="category-review"
      />
    </AppShell>
  );
}
