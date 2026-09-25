"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  carryForwardBudgetsAction,
  deleteBudgetAction,
  saveBudgetAction,
} from "@/app/actions/budgets";
import { Icon, type IconName } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { MoneyValue } from "@/components/money-value";
import { PlanningCard } from "@/components/planning/planning-card";
import {
  Button,
  LinkButton,
  PlanningHeader,
  PlanningReviewDialog,
  PlanningSection,
  PlanningSummary,
  PlanningSummaryItem,
  PlanningWorkspace,
  planningStyles,
} from "@/components/planning/planning-layout";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import type { ToastTone } from "@/components/ui/toast";
import { type ViewerSummary } from "@/components/user-chip";
import { formatMoney, formatSignedMoney } from "@/lib/money";
import {
  budgetEffectiveAvailable,
  budgetEffectiveLimit,
  budgetEffectiveStatusLabel,
  budgetEffectiveThreshold,
  budgetPaceLine,
  budgetProgress,
  budgetRollover,
  budgetRolloverLabel,
  budgetsToCarryForward,
  budgetTransactionsHref,
  compareBudgetAmount,
  type BudgetMonthAdjustment,
  type BudgetRollover,
  type BudgetSummary,
  type SaveBudgetInput,
} from "@/lib/planning/budgets";
import {
  allocateMonthFromTotals,
  allocationExplanation,
  uncoveredCommitmentTotal,
} from "@/lib/planning/allocation";
import type { RecurringCommitment } from "@/lib/planning/commitments";
import { buildMonthReview } from "@/lib/planning/month-review";
import { budgetToneToCard } from "@/lib/planning-pages";
import { categoryMetaFor, categoryMetaIndex, type CategoryOption } from "@/lib/sample-data";

const BudgetDialog = dynamic(
  () => import("@/components/planning/budget-dialog").then((module) => module.BudgetDialog),
  { ssr: false },
);

type BudgetPageWorkspace = {
  budgets: BudgetSummary[];
  previousBudgets: BudgetSummary[];
  /**
   * Every budgeted month inside the rollover window before the viewed month.
   * Fed through `budgetRollover` per card so "Còn lại" is the effective
   * available, never a silently month-only figure.
   */
  priorBudgets: BudgetSummary[];
  monthIncome: number;
  /** Recorded month expense — feeds the past-month review, never the pace UI. */
  monthExpense: number;
  monthCommitments: RecurringCommitment[];
  categories: CategoryOption[];
  monthStart: string;
  monthEnd: string;
  previousMonthStart: string;
  nextMonthStart: string;
  canGoNext: boolean;
  adjustment: BudgetMonthAdjustment;
  today: string;
  dataError: string | null;
};

type BudgetsPageProps = {
  viewer: ViewerSummary;
  workspace: BudgetPageWorkspace;
};

type BudgetTotals = { limit: number; spent: number };

function sumBudgetTotals(budgets: BudgetSummary[]): BudgetTotals {
  return budgets.reduce(
    (result, item) => ({
      limit: result.limit + item.limit,
      spent: result.spent + item.spent,
    }),
    { limit: 0, spent: 0 },
  );
}

function formatMonthLabel(monthStart: string) {
  const label = new Intl.DateTimeFormat("vi-VN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(`${monthStart}T00:00:00+07:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function comparisonText(current: number, previous: number | null) {
  const comparison = compareBudgetAmount(current, previous);
  if (comparison.state === "unavailable") return "Chưa có dữ liệu tháng trước.";
  if (comparison.state === "same") return "Bằng tháng trước.";
  const direction = comparison.state === "increase" ? "Tăng" : "Giảm";
  return `${direction} ${formatMoney(Math.abs(comparison.difference))} so với tháng trước.`;
}

function monthHref(monthStart: string) {
  return `/budgets?month=${monthStart.slice(0, 7)}`;
}

export function BudgetsPage({ viewer, workspace }: BudgetsPageProps) {
  const [budgets, setBudgets] = useState(workspace.budgets);
  const [editing, setEditing] = useState<BudgetSummary | null>(null);
  const [reviewBudget, setReviewBudget] = useState<BudgetSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogVersion, setDialogVersion] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [carrying, setCarrying] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<ToastTone | undefined>(undefined);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => {
      setNotice("");
      setNoticeTone(undefined);
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function showNotice(message: string, tone: ToastTone) {
    setNotice(message);
    setNoticeTone(tone);
  }

  const totals = useMemo(() => sumBudgetTotals(budgets), [budgets]);
  const metaIndex = useMemo(
    () => categoryMetaIndex(workspace.categories),
    [workspace.categories],
  );
  /*
   * Per-category carry from prior budgeted months. Recomputed from the live
   * `budgets` state so a card added or removed mid-session immediately gains
   * or loses its "chuyển từ tháng trước" explanation.
   */
  const rolloverByCategory = useMemo(() => {
    const map = new Map<string, BudgetRollover>();
    for (const budget of budgets) {
      map.set(
        budget.categoryId,
        budgetRollover({
          priorBudgets: workspace.priorBudgets,
          categoryId: budget.categoryId,
          monthStart: workspace.monthStart,
        }),
      );
    }
    return map;
  }, [budgets, workspace.priorBudgets, workspace.monthStart]);
  const totalCarry = useMemo(() => {
    let total = 0;
    for (const rollover of rolloverByCategory.values()) {
      const next = total + rollover.carry;
      if (!Number.isSafeInteger(next)) return 0;
      total = next;
    }
    return total;
  }, [rolloverByCategory]);
  const totalAvailable = totals.limit + totalCarry - totals.spent;
  /*
   * Recomputed from the live `budgets` state rather than read from the server
   * payload, so the figure moves the moment a limit is added, edited or removed
   * — a stale "chưa phân bổ" would be worse than none at all.
   */
  const allocation = useMemo(
    () =>
      allocateMonthFromTotals({
        income: workspace.monthIncome,
        limits: totals.limit,
        committed: uncoveredCommitmentTotal({
          commitments: workspace.monthCommitments,
          budgets,
          monthStart: workspace.monthStart,
        }),
        monthStart: workspace.monthStart,
      }),
    [workspace.monthIncome, workspace.monthCommitments, workspace.monthStart, budgets, totals.limit],
  );
  const previousTotals = useMemo(
    () => sumBudgetTotals(workspace.previousBudgets),
    [workspace.previousBudgets],
  );
  /*
   * Close-out facts for a finished month. Derived from the live `budgets`
   * state so editing a past month's limit re-counts "trong giới hạn"
   * immediately; null for the in-progress month, which keeps the pace UI.
   */
  const monthReview = useMemo(
    () =>
      buildMonthReview({
        monthStart: workspace.monthStart,
        today: workspace.today,
        income: workspace.monthIncome,
        expense: workspace.monthExpense,
        budgets,
        priorBudgets: workspace.priorBudgets,
        commitments: workspace.monthCommitments,
      }),
    [
      workspace.monthStart,
      workspace.today,
      workspace.monthIncome,
      workspace.monthExpense,
      workspace.priorBudgets,
      workspace.monthCommitments,
      budgets,
    ],
  );
  const hasPreviousData = workspace.previousBudgets.length > 0;
  const previousByCategory = useMemo(
    () => new Map(workspace.previousBudgets.map((item) => [item.categoryId, item])),
    [workspace.previousBudgets],
  );
  const availableCategories = workspace.categories.filter(
    (category) => !budgets.some((budget) => budget.categoryId === category.id),
  );
  /*
   * Recomputed from live budget state, so the offer disappears the moment the
   * last missing category is filled — including when the user fills it by hand.
   */
  const carryable = useMemo(
    () =>
      budgetsToCarryForward({
        previousBudgets: workspace.previousBudgets,
        currentBudgets: budgets,
        monthStart: workspace.monthStart,
      }),
    [workspace.previousBudgets, workspace.monthStart, budgets],
  );
  const monthLabel = formatMonthLabel(workspace.monthStart);
  const previousMonthLabel = formatMonthLabel(workspace.previousMonthStart);
  const adjustmentNotice =
    workspace.adjustment === "future"
      ? "Tháng tương lai chưa có dữ liệu. MoneyFlow đang hiển thị tháng hiện tại."
      : workspace.adjustment === "invalid"
        ? "Tháng trong đường dẫn không hợp lệ. MoneyFlow đang hiển thị tháng hiện tại."
        : null;

  async function applyPreviousMonth() {
    if (carrying || carryable.length === 0) return;
    setCarrying(true);
    const result = await carryForwardBudgetsAction(carryable);
    setCarrying(false);
    if (!result.ok) {
      showNotice(result.message, "error");
      return;
    }
    // Merge rather than replace: a category the user edited by hand while this
    // was in flight keeps its own value, since carry-forward never claimed it.
    setBudgets((current) => {
      const existing = new Set(current.map((item) => item.categoryId));
      return [...current, ...result.budgets.filter((item) => !existing.has(item.categoryId))];
    });
    const carriedAll = result.budgets.length === carryable.length;
    showNotice(
      carriedAll
        ? `Đã áp dụng ${result.budgets.length} hạn mức của ${previousMonthLabel}.`
        : `Đã áp dụng ${result.budgets.length}/${carryable.length} hạn mức. Hãy kiểm tra phần còn lại.`,
      carriedAll ? "success" : "warning",
    );
  }

  function openDialog(budget: BudgetSummary | null) {
    setEditing(budget);
    setDialogVersion((value) => value + 1);
    setDialogOpen(true);
  }

  async function save(input: SaveBudgetInput) {
    if (input.monthStart !== workspace.monthStart) {
      return { ok: false, message: "Tháng ngân sách đã thay đổi. Hãy tải lại trang." };
    }
    if (viewer.isDemo) {
      const category = workspace.categories.find((item) => item.id === input.categoryId);
      if (!category) return { ok: false, message: "Danh mục không hợp lệ." };
      const existing = budgets.find((item) => item.categoryId === input.categoryId);
      const next: BudgetSummary = {
        id: existing?.id ?? crypto.randomUUID(),
        categoryId: category.id,
        categoryName: category.name,
        categoryIcon: category.icon,
        categoryColor: category.color,
        monthStart: workspace.monthStart,
        limit: input.limit,
        spent: existing?.spent ?? 0,
      };
      setBudgets((current) =>
        existing
          ? current.map((item) => (item.id === existing.id ? next : item))
          : [...current, next],
      );
      setDialogOpen(false);
      showNotice(
        existing ? "Đã cập nhật ngân sách demo." : "Đã thêm ngân sách demo.",
        "success",
      );
      return { ok: true };
    }

    const result = await saveBudgetAction(input);
    if (result.ok && result.budget) {
      const next = result.budget;
      if (next.monthStart !== workspace.monthStart) {
        return { ok: false, message: "Máy chủ trả về ngân sách của tháng khác." };
      }
      setBudgets((current) =>
        current.some((item) => item.id === next.id)
          ? current.map((item) => (item.id === next.id ? next : item))
          : [...current, next],
      );
      setDialogOpen(false);
      showNotice("Đã lưu ngân sách.", "success");
    }
    return result;
  }

  function requestRemove(budget: BudgetSummary) {
    if (budget.monthStart !== workspace.monthStart) {
      showNotice("Không thể xóa ngân sách của tháng khác.", "error");
      return;
    }
    setReviewBudget(budget);
  }

  async function confirmRemove() {
    if (!reviewBudget) return;
    setBusyId(reviewBudget.id);
    const result = viewer.isDemo
      ? { ok: true as const }
      : await deleteBudgetAction(reviewBudget.id);
    setBusyId(null);
    if (!result.ok) {
      setReviewBudget(null);
      showNotice(result.message, "error");
      return;
    }
    setBudgets((current) => current.filter((item) => item.id !== reviewBudget.id));
    showNotice(
      "Đã xóa hạn mức ngân sách. Các giao dịch vẫn được giữ nguyên.",
      "success",
    );
    setReviewBudget(null);
  }

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: "Thêm ngân sách",
        onClick: () => openDialog(null),
        disabled: Boolean(workspace.dataError) || !availableCategories.length,
      }}
      showPrimaryActionOnMobile
      notice={notice}
      noticeTone={noticeTone}
    >
      <PlanningWorkspace>
        {workspace.dataError ? (
          <Alert tone="error" live="assertive">
            <AlertDescription>{workspace.dataError}</AlertDescription>
          </Alert>
        ) : null}
        {adjustmentNotice ? (
          <Alert tone="warning" live="polite">
            <AlertDescription>{adjustmentNotice}</AlertDescription>
          </Alert>
        ) : null}

        <PlanningHeader
          section="Kế hoạch chi tiêu"
          title="Ngân sách"
          description={`${monthLabel} · So sánh hạn mức với số đã chi và mở đúng giao dịch đứng sau mỗi tổng.`}
          truthNote="Ngân sách là hạn mức theo danh mục cho từng tháng. Số còn lại đã gồm phần chuyển từ các tháng trước — chi dưới hạn mức cộng vào, vượt hạn mức trừ đi. MoneyFlow không chuyển tiền vào phong bì và không tự phân bổ số dư."
        />

        <section className={planningStyles.periodNav} aria-label="Chọn tháng ngân sách" data-slot="planning-period-nav">
          <Link href={monthHref(workspace.previousMonthStart)} className={planningStyles.periodLink}>
            <Icon name="arrowRight" />
            Tháng trước
          </Link>
          <form action="/budgets" method="get" className={planningStyles.periodForm}>
            <label htmlFor="budget-month">Tháng đang xem</label>
            <div className={planningStyles.periodFormRow}>
              <input
                id="budget-month"
                name="month"
                type="month"
                defaultValue={workspace.monthStart.slice(0, 7)}
              />
              <Button type="submit" intent="secondary" targetSize="important">
                Xem tháng
              </Button>
            </div>
          </form>
          {workspace.canGoNext ? (
            <Link href={monthHref(workspace.nextMonthStart)} className={planningStyles.periodLink}>
              Tháng sau
              <Icon name="arrowRight" />
            </Link>
          ) : (
            <span className={planningStyles.periodDisabled} aria-disabled="true">
              Tháng sau
              <Icon name="arrowRight" />
            </span>
          )}
        </section>

        {workspace.dataError ? null : (
        <PlanningSummary label="Tổng quan ngân sách">
          <PlanningSummaryItem
            label="Tổng hạn mức"
            meta={comparisonText(totals.limit, hasPreviousData ? previousTotals.limit : null)}
          >
            <MoneyValue amount={totals.limit} emphasis="strong" align="start" />
          </PlanningSummaryItem>
          <PlanningSummaryItem
            label="Đã chi"
            meta={comparisonText(totals.spent, hasPreviousData ? previousTotals.spent : null)}
          >
            <MoneyValue amount={totals.spent} emphasis="strong" align="start" />
          </PlanningSummaryItem>
          <PlanningSummaryItem
            label={totalAvailable < 0 ? "Đã vượt" : "Còn lại"}
            meta={
              totalCarry !== 0
                ? `Đã gồm ${formatSignedMoney(totalCarry)} chuyển từ các tháng trước.`
                : hasPreviousData
                  ? `Đối chiếu với ${previousMonthLabel}.`
                  : "Chưa có dữ liệu tháng trước."
            }
          >
            <MoneyValue
              amount={Math.abs(totalAvailable)}
              emphasis="strong"
              align="start"
            />
          </PlanningSummaryItem>
          <PlanningSummaryItem
            label={
              allocation.state === "over" ? "Phân bổ vượt thu nhập" : "Chưa phân bổ"
            }
            meta={allocationExplanation(allocation)}
          >
            <MoneyValue
              amount={Math.abs(allocation.unassigned)}
              emphasis="strong"
              align="start"
            />
          </PlanningSummaryItem>
        </PlanningSummary>
        )}

        {/*
         * Closed-month recap: thu/chi/ròng from recorded ledger facts, plus
         * how many limits and recurring obligations closed inside plan. Facts
         * only — no score or verdict — and any segment whose inputs do not
         * exist for the month is withheld rather than shown as "0/0".
         */}
        {!workspace.dataError && monthReview ? (
          <section
            className={planningStyles.monthReview}
            aria-label={`Tổng kết ${monthLabel}`}
            data-slot="month-review"
          >
            <h2 className={planningStyles.monthReviewTitle}>
              Tổng kết {monthLabel}
            </h2>
            <dl className={planningStyles.monthReviewList}>
              <div className={planningStyles.monthReviewItem}>
                <dt>Thu</dt>
                <dd>{formatMoney(monthReview.income)}</dd>
              </div>
              <div className={planningStyles.monthReviewItem}>
                <dt>Chi</dt>
                <dd>{formatMoney(monthReview.expense)}</dd>
              </div>
              <div className={planningStyles.monthReviewItem}>
                <dt>Ròng</dt>
                <dd>{formatSignedMoney(monthReview.net)}</dd>
              </div>
              {monthReview.budgets ? (
                <div className={planningStyles.monthReviewItem}>
                  <dt>Hạn mức trong giới hạn</dt>
                  <dd>
                    {monthReview.budgets.within}/{monthReview.budgets.total}
                  </dd>
                </div>
              ) : null}
              {monthReview.commitments ? (
                <div className={planningStyles.monthReviewItem}>
                  <dt>Khoản định kỳ đã trả</dt>
                  <dd>
                    {monthReview.commitments.paid}/{monthReview.commitments.total}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {!workspace.dataError && !availableCategories.length && budgets.length ? (
          <p className={planningStyles.context}>
            Mọi danh mục chi tiêu đã có hạn mức — tạo danh mục mới để đặt thêm ngân sách.
          </p>
        ) : null}

        <PlanningSection
          title="Theo danh mục"
          description={`Chọn “Xem giao dịch” để kiểm tra đúng các khoản của ${monthLabel}.`}
          slot="budget-list"
          action={
            carryable.length ? (
              <Button
                type="button"
                intent="secondary"
                targetSize="important"
                onClick={applyPreviousMonth}
                disabled={carrying}
              >
                {carrying
                  ? "Đang áp dụng…"
                  : `Áp dụng ${carryable.length} hạn mức của ${previousMonthLabel}`}
              </Button>
            ) : undefined
          }
        >
          {budgets.length ? (
            <div className={planningStyles.grid}>
              {budgets.map((budget) => {
                /*
                 * Effective figures fold the carry in: available = limit +
                 * carry − spent. "Hạn mức" still shows the month's own limit —
                 * the rollover line right below is what makes the difference
                 * between the two numbers legible.
                 */
                const rollover =
                  rolloverByCategory.get(budget.categoryId) ?? {
                    carry: 0,
                    monthsIncluded: 0,
                  };
                const effective = {
                  spent: budget.spent,
                  limit: budgetEffectiveLimit(budget, rollover.carry),
                };
                const progress = budgetProgress(effective);
                const available = budgetEffectiveAvailable(
                  budget,
                  rollover.carry,
                );
                const pace = budgetPaceLine(
                  effective,
                  workspace.monthStart,
                  workspace.today,
                );
                const level = budgetEffectiveThreshold(budget, rollover.carry);
                const tone = budgetToneToCard(level);
                const statusText = budgetEffectiveStatusLabel(
                  budget,
                  rollover.carry,
                );
                const rolloverLine = budgetRolloverLabel(rollover);
                const meta = categoryMetaFor(
                  metaIndex,
                  "expense",
                  budget.categoryName,
                );
                const previousBudget = previousByCategory.get(budget.categoryId);
                const transactionHref = budgetTransactionsHref(
                  workspace.monthStart,
                  budget.categoryName,
                );

                return (
                  <PlanningCard key={budget.id} tone={tone}>
                    <div className={planningStyles.cardTop}>
                      <span className={planningStyles.icon}>
                        <Icon name={meta.icon as IconName} />
                      </span>
                      <div className={planningStyles.cardTitle}>
                        <h3>{budget.categoryName}</h3>
                        <p>{monthLabel}</p>
                      </div>
                      <span className={planningStyles.status} data-slot="planning-card-status">
                        {statusText} · {Math.min(progress, 999)}%
                      </span>
                    </div>

                    <div className={planningStyles.metrics}>
                      <div className={planningStyles.metric}>
                        <span className={planningStyles.metricLabel}>Hạn mức</span>
                        <MoneyValue amount={budget.limit} emphasis="strong" align="start" />
                      </div>
                      <div className={planningStyles.metric}>
                        <span className={planningStyles.metricLabel}>Đã chi</span>
                        <MoneyValue amount={budget.spent} emphasis="strong" align="start" />
                      </div>
                      <div className={planningStyles.metric}>
                        <span className={planningStyles.metricLabel}>
                          {available < 0 ? "Vượt" : "Còn lại"}
                        </span>
                        <MoneyValue amount={Math.abs(available)} emphasis="strong" align="start" />
                      </div>
                    </div>

                    {rolloverLine ? (
                      <p className={planningStyles.context}>{rolloverLine}</p>
                    ) : null}

                    {previousBudget ? (
                      <p className={planningStyles.context}>
                        {previousMonthLabel}: hạn mức {formatMoney(previousBudget.limit)}, đã chi {formatMoney(previousBudget.spent)}.
                      </p>
                    ) : (
                      <p className={planningStyles.context}>Chưa có hạn mức cùng danh mục ở tháng trước.</p>
                    )}

                    <div
                      className={planningStyles.progress}
                      role="progressbar"
                      aria-valuenow={Math.min(progress, 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${statusText}. Đã dùng ${progress} phần trăm`}
                    >
                      <span
                        className={planningStyles.progressFill}
                        data-tone={tone}
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>

                    {pace ? <p className={planningStyles.context}>{pace}</p> : null}

                    <div className={planningStyles.actions} data-slot="planning-card-actions">
                      <LinkButton
                        href={transactionHref}
                        intent="primary"
                        targetSize="important"
                        aria-label={`Xem giao dịch danh mục ${budget.categoryName} trong ${monthLabel}`}
                      >
                        <Icon name="arrowRight" /> Xem giao dịch
                      </LinkButton>
                      <Button
                        type="button"
                        intent="secondary"
                        targetSize="important"
                        onClick={() => openDialog(budget)}
                      >
                        <Icon name="edit" /> Sửa
                      </Button>
                      <Button
                        type="button"
                        intent="quiet"
                        targetSize="important"
                        disabled={busyId === budget.id}
                        onClick={() => requestRemove(budget)}
                      >
                        <Icon name="trash" /> Xóa hạn mức
                      </Button>
                    </div>
                  </PlanningCard>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<Icon name="target" />}
              title={
                workspace.dataError
                  ? "Không tải được ngân sách"
                  : availableCategories.length
                    ? `Chưa có ngân sách cho ${monthLabel}`
                    : "Chưa có danh mục chi tiêu để đặt hạn mức"
              }
              description={
                workspace.dataError
                  ? "Dữ liệu của bạn vẫn được bảo vệ. Thử tải lại trang hoặc quay lại Tổng quan."
                  : availableCategories.length
                    ? "Tháng này chưa có hạn mức theo danh mục. Thêm hạn mức không ảnh hưởng các tháng khác."
                    : "Ngân sách đặt theo danh mục chi tiêu. Tạo một danh mục trước, rồi quay lại đặt hạn mức cho tháng này."
              }
              primaryAction={
                workspace.dataError ? (
                  <LinkButton href="/dashboard" intent="secondary" targetSize="important">
                    Về Tổng quan
                  </LinkButton>
                ) : availableCategories.length ? (
                  <Button
                    type="button"
                    intent="primary"
                    targetSize="important"
                    onClick={() => openDialog(null)}
                  >
                    <Icon name="plus" /> Tạo ngân sách đầu tiên
                  </Button>
                ) : (
                  <LinkButton href="/categories" intent="primary" targetSize="important">
                    <Icon name="plus" /> Tạo danh mục
                  </LinkButton>
                )
              }
            />
          )}
        </PlanningSection>
      </PlanningWorkspace>

      <BudgetDialog
        key={`${workspace.monthStart}-${editing?.id ?? "new"}-${dialogVersion}`}
        open={dialogOpen}
        budget={editing}
        categories={
          editing
            ? workspace.categories.filter((item) => item.id === editing.categoryId)
            : availableCategories
        }
        monthStart={workspace.monthStart}
        onClose={() => setDialogOpen(false)}
        onSave={save}
      />
      <PlanningReviewDialog
        open={Boolean(reviewBudget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !busyId) setReviewBudget(null);
        }}
        title="Xóa hạn mức ngân sách?"
        description="Kiểm tra đúng danh mục và tháng trước khi tiếp tục."
        details={[
          { label: "Danh mục", value: reviewBudget?.categoryName ?? "" },
          { label: "Tháng", value: monthLabel },
          {
            label: "Hạn mức",
            value: reviewBudget ? formatMoney(reviewBudget.limit) : "",
          },
        ]}
        consequence="Chỉ hạn mức của tháng này bị xóa. Các giao dịch và số dư tài khoản vẫn được giữ nguyên."
        confirmLabel="Xóa hạn mức"
        confirmIntent="destructive"
        pending={Boolean(reviewBudget && busyId === reviewBudget.id)}
        onConfirm={confirmRemove}
      />
    </AppShell>
  );
}
