"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  saveCategoryAction,
  setCategoryArchivedAction,
} from "@/app/actions/categories";
import { CategoryDialog } from "@/components/category-dialog";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import type { ViewerSummary } from "@/components/user-chip";
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

function categoryIcon(name: string | null): IconName {
  const known: IconName[] = [
    "bowl",
    "car",
    "bag",
    "home",
    "receipt",
    "spark",
    "heart",
    "book",
    "wallet",
    "plus",
    "arrows",
  ];
  if (name && (known as string[]).includes(name)) return name as IconName;
  return "spark";
}

function CategorySection({
  title,
  description,
  items,
  busyId,
  onEdit,
  onToggleArchive,
}: {
  title: string;
  description: string;
  items: CategorySummary[];
  busyId: string | null;
  onEdit: (item: CategorySummary) => void;
  onToggleArchive: (item: CategorySummary) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="accounts-section">
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="account-grid category-grid">
        {items.map((item) => (
          <article
            className={`account-card category-card${item.isArchived ? " is-archived" : ""}`}
            key={item.id}
          >
            <div className={`account-kind-icon category-kind-${item.kind}`}>
              <Icon name={categoryIcon(item.icon)} />
            </div>
            <div className="account-card-title">
              <div>
                <h3>{item.name}</h3>
                <p>
                  {categoryKindLabels[item.kind]}
                  {item.isDefault ? " · Mặc định" : ""}
                  {item.isArchived ? " · Đã ẩn" : ""}
                </p>
              </div>
            </div>
            <div className="account-card-foot">
              <span>{item.isDefault ? "Seed giữ lại" : "Tự tạo"}</span>
              <div>
                {!item.isArchived && (
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    aria-label={`Đổi tên ${item.name}`}
                  >
                    <Icon name="edit" />
                    Đổi tên
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onToggleArchive(item)}
                  disabled={busyId === item.id}
                  aria-label={
                    item.isArchived
                      ? `Hiện lại ${item.name}`
                      : `Ẩn ${item.name}`
                  }
                >
                  <Icon name={item.isArchived ? "restore" : "archive"} />
                  {item.isArchived ? "Hiện lại" : "Ẩn"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
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
      const next: CategorySummary = {
        id: input.id ?? crypto.randomUUID(),
        name: validated.name,
        kind: validated.kind,
        icon: input.icon ?? (validated.kind === "income" ? "wallet" : "spark"),
        color: input.color ?? (validated.kind === "income" ? "green" : "violet"),
        isDefault: input.id
          ? Boolean(categories.find((item) => item.id === input.id)?.isDefault)
          : false,
        isArchived: input.id
          ? Boolean(categories.find((item) => item.id === input.id)?.isArchived)
          : false,
      };
      setCategories((current) =>
        input.id
          ? current.map((item) => (item.id === input.id ? next : item))
          : [...current, next],
      );
      setDialogOpen(false);
      setNotice(input.id ? "Đã đổi tên danh mục demo." : "Đã thêm danh mục demo.");
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

  async function toggleArchived(category: CategorySummary) {
    const archivedNext = !category.isArchived;
    if (
      archivedNext &&
      !window.confirm(
        `Ẩn danh mục “${category.name}”? Danh mục sẽ không hiện khi ghi giao dịch mới. Lịch sử cũ vẫn giữ.`,
      )
    ) {
      return;
    }
    setBusyId(category.id);
    if (viewer.isDemo) {
      setCategories((current) =>
        current.map((item) =>
          item.id === category.id
            ? { ...item, isArchived: archivedNext }
            : item,
        ),
      );
      setBusyId(null);
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
    setNotice(archivedNext ? "Đã ẩn danh mục." : "Đã hiện lại danh mục.");
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
      <main className="dashboard accounts-workspace categories-workspace">
        {dataError && (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{dataError}</span>
          </div>
        )}

        <section className="accounts-heading">
          <div>
            <p className="eyebrow">Phân loại thu chi</p>
            <h1>Danh mục</h1>
            <p>
              Thêm, đổi tên hoặc ẩn danh mục chi tiêu và thu nhập. Không có danh
              mục con. Danh mục mặc định vẫn được seed khi đăng ký.
            </p>
          </div>
          <div className="page-heading-actions">
            <Link className="secondary-button" href="/settings">
              <Icon name="settings" />
              Cài đặt
            </Link>
          </div>
        </section>

        {!isEmpty && !dataError && (
          <div
            className="segmented-control categories-kind-filter"
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
              <button
                key={value}
                type="button"
                className={kindFilter === value ? "active" : undefined}
                aria-pressed={kindFilter === value}
                onClick={() => setKindFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {isEmpty ? (
          <EmptyState
            icon={PAGE_EMPTY_CATEGORY.icon}
            title={PAGE_EMPTY_CATEGORY.title}
            description={PAGE_EMPTY_CATEGORY.description}
            actionLabel={PAGE_EMPTY_CATEGORY.actionLabel}
            onAction={() => openCategory(null)}
          />
        ) : null}

        {!isEmpty && !dataError && (
          <>
            {(kindFilter === "all" || kindFilter === "expense") && (
              <CategorySection
                title="Chi tiêu đang dùng"
                description="Hiện khi ghi chi tiêu mới."
                items={activeExpense}
                busyId={busyId}
                onEdit={openCategory}
                onToggleArchive={toggleArchived}
              />
            )}
            {(kindFilter === "all" || kindFilter === "income") && (
              <CategorySection
                title="Thu nhập đang dùng"
                description="Hiện khi ghi thu nhập mới."
                items={activeIncome}
                busyId={busyId}
                onEdit={openCategory}
                onToggleArchive={toggleArchived}
              />
            )}
            {archived.length > 0 && (
              <CategorySection
                title="Đã ẩn"
                description="Vẫn giữ lịch sử; có thể hiện lại bất cứ lúc nào."
                items={archived}
                busyId={busyId}
                onEdit={openCategory}
                onToggleArchive={toggleArchived}
              />
            )}
            {activeExpense.length === 0 &&
              activeIncome.length === 0 &&
              archived.length === 0 && (
                <EmptyState
                  icon={PAGE_EMPTY_CATEGORY_FILTER.icon}
                  title={PAGE_EMPTY_CATEGORY_FILTER.title}
                  description={PAGE_EMPTY_CATEGORY_FILTER.description}
                />
              )}
          </>
        )}
      </main>

      <CategoryDialog
        key={`${editing?.id ?? "new"}-${dialogVersion}`}
        open={dialogOpen}
        category={editing}
        onClose={() => setDialogOpen(false)}
        onSave={saveCategory}
      />
    </AppShell>
  );
}
