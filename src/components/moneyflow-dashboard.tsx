"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";

/** Defer heavy dialog JS until user opens Ghi chi — improves insights TBT/LCP path. */
const AddTransactionDialog = dynamic(
  () =>
    import("@/components/add-transaction-dialog").then((mod) => mod.AddTransactionDialog),
  { ssr: false },
);
import {
  calculateDashboardSummary,
  netTransactionEffect,
  topExpenseCategories,
} from "@/lib/finance";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type Transaction,
} from "@/lib/sample-data";
import { formatMoney, formatMoneyWithKind, formatSignedMoney } from "@/lib/money";
import { useTransactions } from "@/hooks/use-transactions";
import { type ViewerSummary } from "@/components/user-chip";
import {
  budgetBarColor,
  budgetProgress,
  budgetRemaining,
  budgetStatusLabel,
  budgetThreshold,
  sumBudgetSpent,
  type BudgetSummary,
} from "@/lib/budgets";
import { hydrateCommitmentsWithOccurrences } from "@/lib/commitment-occurrence-store";
import {
  commitmentTotals,
  monthStartFromDate,
  unpaidActiveCount,
  type RecurringCommitment,
} from "@/lib/commitments";
import { hydrateIncomeTemplatesWithOccurrences } from "@/lib/income-template-store";
import {
  incomeTemplateTotals,
  pendingActiveCount,
  type RecurringIncomeTemplate,
} from "@/lib/income-templates";
import {
  dailyGoalSaving,
  goalProgress,
  goalRemaining,
  goalTotals,
  pickFeaturedGoal,
  type SavingsGoal,
} from "@/lib/goals";
import {
  EXPORT_CSV_LABEL,
  EXPORT_SETTINGS_HREF,
} from "@/lib/export-data";
import { GHI_CHI_TIEU_LABEL, PLANNING_LINKS } from "@/lib/nav-ia";
import {
  buildWeeklySummary,
  formatWeekRangeLabel,
  WEEKLY_SUMMARY_ARIA,
  WEEKLY_SUMMARY_EMPTY_LEDGER,
  WEEKLY_SUMMARY_EMPTY_WEEK,
  WEEKLY_SUMMARY_REPORTS_HREF,
  WEEKLY_SUMMARY_REPORTS_LABEL,
  WEEKLY_SUMMARY_TITLE,
  weeklyExpenseCompareLine,
} from "@/lib/weekly-summary";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";

type DashboardWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

export function MoneyFlowDashboard({
  viewer,
  workspace,
  budgets,
  commitments,
  incomeTemplates = [],
  goals,
}: {
  viewer: ViewerSummary;
  workspace: DashboardWorkspace;
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
  incomeTemplates?: RecurringIncomeTemplate[];
  goals: SavingsGoal[];
}) {
  const { transactions, addTransaction: addTransactionToStore, isMutating } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  /** Demo: overlay local pay occurrences so reserved matches /commitments after pay. */
  const [demoCommitments, setDemoCommitments] = useState<RecurringCommitment[] | null>(null);
  const [demoIncomeTemplates, setDemoIncomeTemplates] = useState<
    RecurringIncomeTemplate[] | null
  >(null);

  useEffect(() => {
    if (!viewer.isDemo) return;
    const monthStart = monthStartFromDate(workspace.today);
    const frame = window.requestAnimationFrame(() => {
      setDemoCommitments(hydrateCommitmentsWithOccurrences(commitments, monthStart));
      setDemoIncomeTemplates(
        hydrateIncomeTemplatesWithOccurrences(incomeTemplates, monthStart),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewer.isDemo, commitments, incomeTemplates, workspace.today]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const liveCommitments =
    viewer.isDemo && demoCommitments ? demoCommitments : commitments;
  const liveIncomeTemplates =
    viewer.isDemo && demoIncomeTemplates ? demoIncomeTemplates : incomeTemplates;

  const currentBalance = useMemo(() => {
    if (viewer.isDemo) return workspace.totalBalance;
    return (
      workspace.totalBalance +
      netTransactionEffect(transactions) -
      netTransactionEffect(workspace.transactions)
    );
  }, [transactions, viewer.isDemo, workspace.totalBalance, workspace.transactions]);

  const liveBudgets = useMemo(
    () =>
      budgets.map((budget) => {
        const spentDelta =
          sumBudgetSpent(transactions, budget.categoryId, budget.monthStart) -
          sumBudgetSpent(workspace.transactions, budget.categoryId, budget.monthStart);
        return { ...budget, spent: budget.spent + spentDelta };
      }),
    [budgets, transactions, workspace.transactions],
  );
  const remainingBudget = liveBudgets.length
    ? liveBudgets.reduce((sum, item) => sum + Math.max(0, item.limit - item.spent), 0)
    : undefined;
  const reservedCommitments = commitmentTotals(liveCommitments).reserved;
  const incomeTotals = incomeTemplateTotals(liveIncomeTemplates);
  const pendingIncomeCount = pendingActiveCount(liveIncomeTemplates);
  const activeIncomeCount = liveIncomeTemplates.filter((item) => !item.isArchived).length;
  const unpaidCommitments = unpaidActiveCount(liveCommitments);
  const activeCommitmentCount = liveCommitments.filter((item) => !item.isArchived).length;
  const savings = goalTotals(goals, workspace.today);

  const totals = useMemo(
    () =>
      calculateDashboardSummary(transactions, {
        isDemo: viewer.isDemo,
        totalBalance: currentBalance,
        today: workspace.today,
        remainingBudget,
        reservedCommitments,
        reservedSavings: savings.allocated,
        plannedDailySavings: savings.plannedDaily,
      }),
    [
      currentBalance,
      remainingBudget,
      reservedCommitments,
      savings.allocated,
      savings.plannedDaily,
      transactions,
      viewer.isDemo,
      workspace.today,
    ],
  );

  const topCategories = useMemo(
    () => topExpenseCategories(transactions, { today: workspace.today, limit: 5 }),
    [transactions, workspace.today],
  );

  const weeklySummary = useMemo(
    () => buildWeeklySummary(transactions, workspace.today),
    [transactions, workspace.today],
  );
  const weeklyCompareLine = weeklyExpenseCompareLine(weeklySummary.expenseChangePercent);
  const weeklyHasActivity = weeklySummary.income > 0 || weeklySummary.expense > 0;

  async function addTransaction(input: CreateTransactionInput) {
    const result = await addTransactionToStore(input);
    if (result.ok && result.transaction) {
      setDialogOpen(false);
      setNotice(
        `${result.transaction.kind === "expense" ? "Đã ghi khoản chi" : "Đã ghi khoản thu"} ${formatMoney(result.transaction.amount)}.`,
      );
    }
    return result;
  }

  const featuredBudget = [...liveBudgets].sort((a, b) => budgetProgress(b) - budgetProgress(a))[0];
  const featuredProgress = featuredBudget ? budgetProgress(featuredBudget) : 0;
  const featuredLevel = featuredBudget ? budgetThreshold(featuredBudget) : null;
  const featuredStatus = featuredBudget ? budgetStatusLabel(featuredBudget) : "";
  const featuredRemaining = featuredBudget ? budgetRemaining(featuredBudget) : 0;
  const displayName = viewer.displayName || (viewer.isDemo ? "Minh" : "bạn");
  const featuredGoal = pickFeaturedGoal(goals);
  const featuredGoalProgress = featuredGoal ? goalProgress(featuredGoal) : 0;
  const featuredGoalDaily = featuredGoal
    ? dailyGoalSaving(featuredGoal, workspace.today)
    : 0;
  const featuredGoalLeft = featuredGoal ? goalRemaining(featuredGoal) : 0;
  const featuredGoalAchieved = featuredGoalProgress >= 100;
  const protectedTotal = reservedCommitments + savings.allocated;
  const isEmptyLedger = transactions.length === 0;
  const actionsDisabled = Boolean(workspace.dataError);

  const openGhiChi = () => setDialogOpen(true);

  const safeExplain =
    protectedTotal > 0
      ? `Số dư khả dụng (đã giữ trước ${formatMoney(protectedTotal)} cho hóa đơn và mục tiêu) chia đều cho các ngày còn lại trong tháng.`
      : "Số dư khả dụng chia đều cho các ngày còn lại trong tháng, trừ chi đã ghi hôm nay.";

  return (
    <AppShell
      viewer={viewer}
      primaryAction={{
        label: GHI_CHI_TIEU_LABEL,
        onClick: openGhiChi,
        disabled: actionsDisabled,
        icon: "plus",
      }}
      fabAction={{
        label: GHI_CHI_TIEU_LABEL,
        onClick: openGhiChi,
        disabled: actionsDisabled,
        icon: "plus",
      }}
      notice={notice}
    >
      <main className="dashboard insights-dashboard">
        {workspace.dataError ? (
          <div className="data-alert" role="alert">
            <Icon name="bell" />
            <span>{workspace.dataError}</span>
          </div>
        ) : null}

        <section className="welcome-row">
          <div>
            <p className="eyebrow">Tổng quan</p>
            <h1>Chào {displayName}.</h1>
            <p>Còn bao nhiêu, tháng này thu–chi thế nào, tiền đi đâu — một màn hình.</p>
          </div>
          <div className="welcome-actions">
            <span className="date-pill" aria-hidden="true">
              <span>Tháng này</span>
            </span>
            <Link
              className="secondary-button insights-export-csv"
              href={EXPORT_SETTINGS_HREF}
            >
              <Icon name="arrowDown" /> {EXPORT_CSV_LABEL}
            </Link>
            <button
              type="button"
              className="primary-button insights-ghi-chi"
              onClick={openGhiChi}
              disabled={actionsDisabled}
            >
              <Icon name="plus" /> {GHI_CHI_TIEU_LABEL}
            </button>
          </div>
        </section>

        <nav className="insights-planning-nav" aria-label="Kế hoạch từ Tổng quan">
          <p className="insights-planning-label">Kế hoạch</p>
          <ul>
            {PLANNING_LINKS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="insights-planning-link">
                  <Icon name={item.icon} />
                  <span>
                    <strong>{item.label}</strong>
                    {item.description ? <small>{item.description}</small> : null}
                  </span>
                  <Icon name="arrowRight" />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <section className="insights-kpi" aria-label="Tóm tắt tháng này">
          <article>
            <span>Số dư tổng</span>
            <strong className="font-mono" aria-label={`Số dư tổng ${formatMoney(totals.balance)}`}>
              {formatMoney(totals.balance)}
            </strong>
            <small>Trên mọi ví đang dùng</small>
          </article>
          <article>
            <span>Thu tháng</span>
            <strong
              className="font-mono amount income"
              aria-label={`Thu tháng cộng ${formatMoney(totals.income)}`}
            >
              {formatMoneyWithKind(totals.income, "income")}
            </strong>
            <small>Không gồm chuyển ví</small>
          </article>
          <article>
            <span>Chi tháng</span>
            <strong
              className="font-mono amount"
              aria-label={`Chi tháng trừ ${formatMoney(totals.expense)}`}
            >
              {formatMoneyWithKind(totals.expense, "expense")}
            </strong>
            <small>Không gồm chuyển ví</small>
          </article>
          <article>
            <span>Ròng</span>
            <strong
              className={`font-mono ${totals.net >= 0 ? "amount income" : "amount"}`}
              aria-label={`Ròng ${formatSignedMoney(totals.net)}`}
            >
              {formatSignedMoney(totals.net)}
            </strong>
            <small>Thu trừ chi tháng này</small>
          </article>
        </section>

        {isEmptyLedger && !workspace.dataError ? (
          <EmptyState
            icon="wallet"
            title="Chưa có giao dịch nào"
            description="Ghi khoản chi đầu tiên để thấy số dư, thu–chi tháng và danh mục chi tiêu."
            actionLabel={GHI_CHI_TIEU_LABEL}
            onAction={openGhiChi}
            secondaryLabel="Thêm tài khoản"
            secondaryHref="/accounts"
            className="insights-empty"
          />
        ) : null}

        <section className="content-grid insights-main-grid">
          <div className="insights-main-stack">
            {!isEmptyLedger ? (
              <>
                <article className="panel categories-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Chi theo danh mục</h2>
                      <p>Top danh mục tháng này — thanh ngang, không biểu đồ tròn.</p>
                    </div>
                    <Link className="section-link" href="/reports">
                      Báo cáo <Icon name="arrowRight" />
                    </Link>
                  </div>
                  {topCategories.length ? (
                    <ul className="insights-category-list">
                      {topCategories.map((item) => {
                        const meta = categoryMeta[item.name] ?? categoryMeta["Thu nhập khác"];
                        return (
                          <li className="insights-category-row" key={item.name}>
                            <span className={`transaction-icon ${meta.color}`}>
                              <Icon name={meta.icon as IconName} />
                            </span>
                            <div className="insights-category-meta">
                              <div className="insights-category-labels">
                                <strong>{item.name}</strong>
                                <span
                                  className="font-mono amount"
                                  aria-label={`Chi ${formatMoney(item.amount)}`}
                                >
                                  {formatMoneyWithKind(item.amount, "expense")}
                                </span>
                              </div>
                              <div
                                className="insights-category-bar"
                                role="img"
                                aria-label={`${item.name}: ${item.share}% chi tháng`}
                              >
                                <i style={{ width: `${Math.max(item.share, item.amount > 0 ? 4 : 0)}%` }} />
                              </div>
                              <small>{item.share}%</small>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="panel-empty compact">
                      <span>
                        <Icon name="chart" />
                      </span>
                      <h3>Chưa có chi tiêu tháng này</h3>
                      <p>Khi bạn ghi chi, danh mục sẽ hiện ở đây dưới dạng thanh ngang.</p>
                      <button type="button" onClick={openGhiChi} disabled={actionsDisabled}>
                        {GHI_CHI_TIEU_LABEL}
                      </button>
                    </div>
                  )}
                </article>

                <article className="transactions-panel panel">
                  <div className="section-heading">
                    <div>
                      <h2>Giao dịch gần đây</h2>
                      <p>Cập nhật ngay khi bạn ghi khoản mới.</p>
                    </div>
                    <Link className="section-link" href="/transactions">
                      Xem tất cả <Icon name="arrowRight" />
                    </Link>
                  </div>
                  <div className="transaction-list">
                    {transactions.slice(0, 5).map((transaction) => {
                      const meta = categoryMeta[transaction.category] ?? categoryMeta["Thu nhập khác"];
                      return (
                        <div className="transaction-row" key={transaction.id}>
                          <span className={`transaction-icon ${meta.color}`}>
                            <Icon name={meta.icon as IconName} />
                          </span>
                          <span className="transaction-detail">
                            <strong>{transaction.note}</strong>
                            <small>
                              {transaction.kind === "transfer"
                                ? `${transaction.account} → ${transaction.destinationAccount}`
                                : `${transaction.category} · ${transaction.account}`}
                            </small>
                          </span>
                          <span className="transaction-time">{transaction.relativeDate}</span>
                          <strong
                            className={`font-mono ${
                              transaction.kind === "income"
                                ? "amount income"
                                : transaction.kind === "transfer"
                                  ? "amount transfer"
                                  : "amount"
                            }`}
                            aria-label={
                              transaction.kind === "income"
                                ? `Thu cộng ${formatMoney(transaction.amount)}`
                                : transaction.kind === "transfer"
                                  ? `Chuyển ${formatMoney(transaction.amount)}`
                                  : `Chi trừ ${formatMoney(transaction.amount)}`
                            }
                          >
                            {/* Sign + direction: never color-only (design-system RULE 4) */}
                            {transaction.kind === "income"
                              ? "+ ↑ "
                              : transaction.kind === "transfer"
                                ? "↔ "
                                : "− ↓ "}
                            {formatMoney(transaction.amount)}
                          </strong>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </>
            ) : null}
          </div>

          <div className="right-stack">
            <article
              className="weekly-summary-panel panel"
              aria-label={WEEKLY_SUMMARY_ARIA}
            >
              <div className="section-heading compact">
                <div>
                  <h2>{WEEKLY_SUMMARY_TITLE}</h2>
                  <p>
                    {formatWeekRangeLabel(weeklySummary.weekStart, weeklySummary.weekEnd)}
                  </p>
                </div>
                <Link
                  className="icon-button"
                  href={WEEKLY_SUMMARY_REPORTS_HREF}
                  aria-label="Mở báo cáo theo tuần"
                >
                  <Icon name="arrowRight" />
                </Link>
              </div>
              {weeklyHasActivity ? (
                <>
                  <div className="weekly-summary-kpis" role="group" aria-label="Thu chi tuần này">
                    <div>
                      <span>Thu</span>
                      <strong
                        className="font-mono amount income"
                        aria-label={`Thu tuần cộng ${formatMoney(weeklySummary.income)}`}
                      >
                        {formatMoneyWithKind(weeklySummary.income, "income")}
                      </strong>
                    </div>
                    <div>
                      <span>Chi</span>
                      <strong
                        className="font-mono amount"
                        aria-label={`Chi tuần trừ ${formatMoney(weeklySummary.expense)}`}
                      >
                        {formatMoneyWithKind(weeklySummary.expense, "expense")}
                      </strong>
                    </div>
                    <div>
                      <span>Ròng</span>
                      <strong
                        className={`font-mono ${weeklySummary.net >= 0 ? "amount income" : "amount"}`}
                        aria-label={`Ròng ${formatSignedMoney(weeklySummary.net)}`}
                      >
                        {formatSignedMoney(weeklySummary.net)}
                      </strong>
                    </div>
                  </div>
                  {weeklySummary.topCategory ? (
                    <p className="weekly-summary-top">
                      Chi nhiều nhất: <strong>{weeklySummary.topCategory}</strong>
                      {" · "}
                      <span
                        className="font-mono"
                        aria-label={`Chi ${formatMoney(weeklySummary.topCategoryAmount)}`}
                      >
                        {formatMoneyWithKind(weeklySummary.topCategoryAmount, "expense")}
                      </span>
                    </p>
                  ) : null}
                  {weeklyCompareLine ? (
                    <p className="weekly-summary-compare">{weeklyCompareLine}</p>
                  ) : null}
                  <p className="goal-dashboard-more">
                    <Link href={WEEKLY_SUMMARY_REPORTS_HREF}>{WEEKLY_SUMMARY_REPORTS_LABEL}</Link>
                  </p>
                </>
              ) : (
                <div className="budget-empty">
                  <p>{isEmptyLedger ? WEEKLY_SUMMARY_EMPTY_LEDGER : WEEKLY_SUMMARY_EMPTY_WEEK}</p>
                  {isEmptyLedger ? (
                    <button type="button" onClick={openGhiChi} disabled={actionsDisabled}>
                      {GHI_CHI_TIEU_LABEL}
                    </button>
                  ) : (
                    <Link href={WEEKLY_SUMMARY_REPORTS_HREF}>{WEEKLY_SUMMARY_REPORTS_LABEL}</Link>
                  )}
                </div>
              )}
            </article>

            <article className="safe-card safe-card-secondary" aria-label="Có thể chi hôm nay">
              <div className="safe-card-top">
                <div>
                  <p>Có thể chi hôm nay</p>
                  <h2 className="font-mono">{formatMoney(totals.safeToday)}</h2>
                </div>
                <span className="status-badge">
                  <span /> Gợi ý
                </span>
              </div>
              <div className="safe-meter" aria-label="Mức chi tiêu hôm nay">
                <span
                  style={{
                    width: `${
                      totals.dailyAllowance > 0
                        ? Math.min(100, 100 - (totals.safeToday / totals.dailyAllowance) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="safe-explain">{safeExplain}</p>
              <button
                type="button"
                className="hero-add"
                onClick={openGhiChi}
                disabled={actionsDisabled}
              >
                <Icon name="plus" /> {GHI_CHI_TIEU_LABEL}
              </button>
            </article>

            <article
              className={`budget-panel panel${
                featuredLevel === "over"
                  ? " budget-panel-over"
                  : featuredLevel === "near"
                    ? " budget-panel-near"
                    : ""
              }`}
            >
              <div className="section-heading compact">
                <div>
                  <h2>Ngân sách tháng</h2>
                  <p>{featuredBudget?.categoryName ?? "Chưa thiết lập"}</p>
                </div>
                <Link className="icon-button" href="/budgets" aria-label="Mở chi tiết ngân sách">
                  <Icon name="arrowRight" />
                </Link>
              </div>
              {featuredBudget && featuredLevel ? (
                <>
                  <div className="budget-number">
                    <strong className="font-mono">{formatMoney(featuredBudget.spent)}</strong>
                    <span className="font-mono">/ {formatMoney(featuredBudget.limit)}</span>
                  </div>
                  <div
                    className="budget-track"
                    role="progressbar"
                    aria-valuenow={Math.min(featuredProgress, 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${featuredStatus}. Đã dùng ${featuredProgress} phần trăm`}
                  >
                    <span
                      style={{
                        width: `${Math.min(100, featuredProgress)}%`,
                        backgroundColor: budgetBarColor(featuredLevel),
                      }}
                    />
                  </div>
                  <div className="budget-foot">
                    <span className={`budget-status-text budget-status-${featuredLevel}`}>
                      {featuredStatus}
                      {featuredLevel === "near" && featuredRemaining > 0
                        ? ` · Còn ${formatMoney(featuredRemaining)}`
                        : ""}
                    </span>
                    <strong className="font-mono">Đã dùng {featuredProgress}%</strong>
                  </div>
                </>
              ) : (
                <div className="budget-empty">
                  <p>Chưa đặt hạn mức cho tháng này.</p>
                  <Link href="/budgets">Thiết lập ngân sách</Link>
                </div>
              )}
            </article>

            <article className="insight-panel" aria-label="Khoản định kỳ đang giữ trước">
              <span className="round-icon purple">
                <Icon name="calendar" />
              </span>
              <div>
                <p className="eyebrow">Khoản định kỳ</p>
                <h2>
                  {reservedCommitments > 0
                    ? `${formatMoney(reservedCommitments)} đang được giữ trước`
                    : activeCommitmentCount > 0
                      ? "Tháng này đã trả hết khoản định kỳ"
                      : "Chưa có hóa đơn cần giữ trước"}
                </h2>
                <p>
                  {reservedCommitments > 0 ? (
                    <>
                      <span className="font-mono">
                        {unpaidCommitments} khoản chưa trả
                      </span>
                      {" · "}
                      <Link href="/commitments">Xem lịch thanh toán và đánh dấu đã trả →</Link>
                    </>
                  ) : activeCommitmentCount > 0 ? (
                    <Link href="/commitments">Xem lịch khoản định kỳ →</Link>
                  ) : (
                    <Link href="/commitments">Thêm khoản định kỳ đầu tiên →</Link>
                  )}
                </p>
              </div>
            </article>

            <article className="insight-panel" aria-label="Lương định kỳ chờ nhận">
              <span className="round-icon green">
                <Icon name="wallet" />
              </span>
              <div>
                <p className="eyebrow">Lương định kỳ</p>
                <h2>
                  {incomeTotals.expected > 0
                    ? `${formatMoney(incomeTotals.expected)} chờ nhận`
                    : activeIncomeCount > 0
                      ? "Tháng này đã ghi nhận hết lương"
                      : "Chưa có lương định kỳ"}
                </h2>
                <p>
                  {incomeTotals.expected > 0 ? (
                    <>
                      <span className="font-mono">
                        {pendingIncomeCount} khoản chưa nhận
                      </span>
                      {" · "}
                      <Link href="/income-templates">Ghi nhận khi tiền về →</Link>
                    </>
                  ) : activeIncomeCount > 0 ? (
                    <Link href="/income-templates">Xem lịch thu →</Link>
                  ) : (
                    <Link href="/income-templates">Thêm lương định kỳ →</Link>
                  )}
                </p>
              </div>
            </article>

            <article
              className={`goal-dashboard-panel panel${featuredGoalAchieved ? " achieved" : ""}`}
              aria-label="Mục tiêu tiết kiệm nổi bật"
            >
              <div className="section-heading compact">
                <div>
                  <h2>Mục tiêu tiết kiệm</h2>
                  <p>{featuredGoal?.name ?? "Chưa có mục tiêu"}</p>
                </div>
                <Link className="icon-button" href="/goals" aria-label="Mở trang mục tiêu tiết kiệm">
                  <Icon name="arrowRight" />
                </Link>
              </div>
              {featuredGoal ? (
                <>
                  <div className="budget-number">
                    <strong className="font-mono">{formatMoney(featuredGoal.allocated)}</strong>
                    <span className="font-mono">/ {formatMoney(featuredGoal.target)}</span>
                  </div>
                  <div
                    className="budget-track"
                    role="progressbar"
                    aria-valuenow={featuredGoalProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${featuredGoal.name}: đã đạt ${featuredGoalProgress} phần trăm`}
                  >
                    <span style={{ width: `${featuredGoalProgress}%` }} />
                  </div>
                  <div className="budget-foot">
                    <span>
                      {featuredGoalAchieved
                        ? "Đã đạt mục tiêu"
                        : `Đã đạt ${featuredGoalProgress}%`}
                      {!featuredGoalAchieved && featuredGoalLeft > 0
                        ? ` · Còn ${formatMoney(featuredGoalLeft)}`
                        : ""}
                    </span>
                    <strong className="font-mono">
                      {featuredGoalAchieved
                        ? "Hoàn thành"
                        : featuredGoalDaily > 0
                          ? `${formatMoney(featuredGoalDaily)}/ngày`
                          : "Tự do tiến độ"}
                    </strong>
                  </div>
                  <p className="goal-dashboard-more">
                    <Link href="/goals">Xem tất cả mục tiêu →</Link>
                  </p>
                </>
              ) : (
                <div className="budget-empty">
                  <p>Dành tiền cho một điều bạn muốn đạt được.</p>
                  <Link href="/goals">Tạo mục tiêu</Link>
                </div>
              )}
            </article>
          </div>
        </section>
      </main>

      <AddTransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addTransaction}
        accounts={workspace.accounts}
        categories={workspace.categories}
        disabled={isMutating || actionsDisabled}
      />
    </AppShell>
  );
}
