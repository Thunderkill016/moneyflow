"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { deleteBudgetAction, saveBudgetAction } from "@/app/actions/budgets";
import { EmptyState } from "@/components/empty-state";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { PlanningCard } from "@/components/planning/planning-card";
import { type ViewerSummary } from "@/components/user-chip";
import { useDemoMasterData } from "@/hooks/use-demo-master-data";
import {
  budgetBarColor,
  budgetProgress,
  budgetRemaining,
  budgetStatusLabel,
  budgetThreshold,
  type BudgetSummary,
  type SaveBudgetInput,
} from "@/lib/planning/budgets";
import { formatMoney } from "@/lib/money";
import { budgetToneToCard, PAGE_EMPTY_BUDGET } from "@/lib/planning-pages";
import { categoryMeta, type CategoryOption } from "@/lib/sample-data";

const BudgetDialog = dynamic(
  () => import("@/components/planning/budget-dialog").then((module) => module.BudgetDialog),
  { ssr: false },
);

type BudgetsPageProps = {
  viewer: ViewerSummary;
  initialBudgets: BudgetSummary[];
  categories: CategoryOption[];
  monthStart: string;
  dataError: string | null;
};

export function BudgetsPage({
  viewer,
  initialBudgets,
  categories,
  monthStart,
  dataError,
}: BudgetsPageProps) {
  const { categories: liveCategories } = useDemoMasterData({
    isDemo: viewer.isDemo,
    accounts: [],
    categories,
  });
  const [budgets, setBudgets] = useState(initialBudgets);
  const [editing, setEditing] = useState<BudgetSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const totals = useMemo(
    () =>
      budgets.reduce(
        (result, item) => ({
          limit: result.limit + item.limit,
          spent: result.spent + item.spent,
        }),
        { limit: 0, spent: 0 },
      ),
    [budgets],
  );
  const availableCategories = liveCategories.filter(
    (category) => !budgets.some((budget) => budget.categoryId === category.id),
  );
  const monthLabel = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${monthStart}T00:00:00+07:00`));

  function openDialog(budget: BudgetSummary | null) {
    setEditing(budget);
    setDialogVersion((value) => value + 1);
    setDialogOpen(true);
  }

  async function save(input: SaveBudgetInput) {
    if (viewer.isDemo) {
      const category = liveCategories.find(
        (item) => item.id === input.categoryId,
      );
      if (!category) return { ok: false, message: "Danh mục không hợp lệ." };
      const existing = budgets.find((item) => item.categoryId === input.categoryId);
      const next: BudgetSummary = {
        id: existing?.id ?? crypto.randomUUID(),
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        monthStart,
        limit: input.limit,
        spent: existing?.spent ?? 0,
      };
      setBudgets((current) =>
        existing
          ? current.map((item) => (item.id === existing.id ? next : item))
          : [...current, next],
      );
      setDialogOpen(false);
      setNotice(existing ? "Đã cập nhật ngân sách demo." : "Đã thêm ngân sách demo.");
      return { ok: true };
    }

    const result = await saveBudgetAction(input);
    if (result.ok && result.budget) {
      const next = result.budget;
      setBudgets((current) =>
        current.some((item) => item.id === next.id)
          ? current.map((item) => (item.id === next.id ? next : item))
          : [...current, next],
      );
      setDialogOpen(false);
      setNotice("Đã lưu ngân sách.");
    }
    return result;
  }

  async function removeBudget(budget: BudgetSummary) {
    if (!window.confirm(`Xóa hạn mức ${budget.categoryName}? Các giao dịch vẫn được giữ nguyên.`)) {
      return;
    }
    setBusyId(budget.id);
    const result = viewer.isDemo
      ? { ok: true as const }
      : await deleteBudgetAction(budget.id);
    setBusyId(null);
    if (!result.ok) {
      setNotice(result.message);
      return;
    }
    setBudgets((current) => current.filter((item) => item.id !== budget.id));
    setNotice("Đã xóa hạn mức ngân sách.");
  }

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm ngân sách",
        onClick: () => openDialog(null),
        disabled: Boolean(dataError) || !availableCategories.length,
      }}
      fabAction={{
        label: "Thêm ngân sách",
        onClick: () => openDialog(null),
        disabled: Boolean(dataError) || !availableCategories.length,
      }}
      notice={notice}
    >
      <main className="dashboard budgets-workspace">
        {dataError ? (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{dataError}</span>
          </div>
        ) : null}

        <section className="budgets-heading">
          <div>
            <p className="eyebrow">
              <Link href="/insights" className="planning-back-link">
                Insights
              </Link>
              {" · "}Kế hoạch chi tiêu
            </p>
            <h1>Ngân sách</h1>
            <p>
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)} · Hạn mức, đã chi
              và còn lại được đặt cạnh nhau để dễ quyết định.
            </p>
          </div>
        </section>

        <section className="budget-overview" aria-label="Tổng quan ngân sách">
          <div>
            <span>Tổng hạn mức</span>
            <strong className="font-mono">{formatMoney(totals.limit)}</strong>
          </div>
          <div>
            <span>Đã chi</span>
            <strong className="font-mono">{formatMoney(totals.spent)}</strong>
          </div>
          <div>
            <span>{totals.spent > totals.limit ? "Đã vượt" : "Còn lại"}</span>
            <strong
              className={`font-mono ${totals.spent > totals.limit ? "negative" : "positive"}`}
            >
              {formatMoney(Math.abs(totals.limit - totals.spent))}
            </strong>
          </div>
        </section>

        {budgets.length ? (
          <section className="budget-list-section">
            <div className="section-heading">
              <div>
                <h2>Theo danh mục</h2>
                <p>Chọn “Xem giao dịch” để kiểm tra những khoản tạo nên số đã chi.</p>
              </div>
            </div>

            <div className="budget-card-grid">
              {budgets.map((budget) => {
                const progress = budgetProgress(budget);
                const remaining = budgetRemaining(budget);
                const level = budgetThreshold(budget);
                const statusText = budgetStatusLabel(budget);
                const meta =
                  categoryMeta[budget.categoryName] ?? categoryMeta["Thu nhập khác"];
                const isOver = remaining < 0;
                const transactionHref = `/transactions?category=${encodeURIComponent(
                  budget.categoryName,
                )}&kind=expense`;

                return (
                  <PlanningCard
                    key={budget.id}
                    tone={budgetToneToCard(level)}
                    className="budget-category-card"
                  >
                    <div className="budget-category-top">
                      <span className={`transaction-icon ${meta.color}`}>
                        <Icon name={meta.icon as IconName} />
                      </span>
                      <div>
                        <h3>{budget.categoryName}</h3>
                        <p>
                          <span className="budget-status-text">{statusText}</span>
                        </p>
                      </div>
                      <strong aria-label={`Đã dùng ${Math.min(progress, 999)} phần trăm`}>
                        {Math.min(progress, 999)}%
                      </strong>
                    </div>

                    <div className="budget-category-metrics">
                      <div>
                        <span>Hạn mức</span>
                        <strong className="font-mono">{formatMoney(budget.limit)}</strong>
                      </div>
                      <div>
                        <span>Đã chi</span>
                        <strong className="font-mono">{formatMoney(budget.spent)}</strong>
                      </div>
                      <div>
                        <span>{isOver ? "Vượt" : "Còn lại"}</span>
                        <strong className={`font-mono ${isOver ? "negative" : "positive"}`}>
                          {formatMoney(Math.abs(remaining))}
                        </strong>
                      </div>
                    </div>

                    <div
                      className="budget-track"
                      role="progressbar"
                      aria-valuenow={Math.min(progress, 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${statusText}. Đã dùng ${progress} phần trăm`}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, progress)}%`,
                          backgroundColor: budgetBarColor(level),
                        }}
                      />
                    </div>

                    <div className="budget-category-actions">
                      <Link
                        href={transactionHref}
                        aria-label={`Xem giao dịch danh mục ${budget.categoryName}`}
                      >
                        <Icon name="arrowRight" />
                        Xem giao dịch
                      </Link>
                      <button type="button" onClick={() => openDialog(budget)}>
                        <Icon name="edit" />
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBudget(budget)}
                        disabled={busyId === budget.id}
                      >
                        <Icon name="trash" />
                        Xóa hạn mức
                      </button>
                    </div>
                  </PlanningCard>
                );
              })}
            </div>
          </section>
        ) : (
          <EmptyState
            icon={PAGE_EMPTY_BUDGET.icon}
            title={PAGE_EMPTY_BUDGET.title}
            description={PAGE_EMPTY_BUDGET.description}
            actionLabel={
              !dataError && availableCategories.length
                ? PAGE_EMPTY_BUDGET.actionLabel
                : undefined
            }
            onAction={
              !dataError && availableCategories.length ? () => openDialog(null) : undefined
            }
          />
        )}
      </main>

      <BudgetDialog
        key={`${editing?.id ?? "new"}-${dialogVersion}`}
        open={dialogOpen}
        budget={editing}
        categories={
          editing
            ? liveCategories.filter((item) => item.id === editing.categoryId)
            : availableCategories
        }
        monthStart={monthStart}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />
    </AppShell>
  );
}
