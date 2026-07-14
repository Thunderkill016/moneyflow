"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { Icon, type IconName } from "@/components/icons";
import { calculateDashboardSummary, topExpenseCategories } from "@/lib/finance";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type Transaction,
} from "@/lib/sample-data";
import { formatMoney } from "@/lib/money";
import { useTransactions } from "@/hooks/use-transactions";
import { type ViewerSummary } from "@/components/user-chip";
import { budgetProgress, type BudgetSummary } from "@/lib/budgets";
import { commitmentTotals, type RecurringCommitment } from "@/lib/commitments";
import { goalProgress, goalTotals, type SavingsGoal } from "@/lib/goals";
import { GHI_CHI_TIEU_LABEL, PLANNING_LINKS } from "@/lib/nav-ia";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/empty-state";

function netTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (sum, item) => sum + (item.kind === "income" ? item.amount : item.kind === "expense" ? -item.amount : 0),
    0,
  );
}

type DashboardWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

function formatSignedMoney(amount: number) {
  if (amount > 0) return `+ ${formatMoney(amount)}`;
  if (amount < 0) return `− ${formatMoney(Math.abs(amount))}`;
  return formatMoney(0);
}

export function MoneyFlowDashboard({
  viewer,
  workspace,
  budgets,
  commitments,
  goals,
}: {
  viewer: ViewerSummary;
  workspace: DashboardWorkspace;
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
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

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const currentBalance = useMemo(() => {
    if (viewer.isDemo) return workspace.totalBalance;
    return workspace.totalBalance + netTransactions(transactions) - netTransactions(workspace.transactions);
  }, [transactions, viewer.isDemo, workspace.totalBalance, workspace.transactions]);

  const liveBudgets = useMemo(
    () =>
      budgets.map((budget) => {
        const spend = (items: Transaction[]) =>
          items
            .filter(
              (item) =>
                item.kind === "expense" &&
                item.categoryId === budget.categoryId &&
                item.occurredOn.startsWith(budget.monthStart.slice(0, 7)),
            )
            .reduce((sum, item) => sum + item.amount, 0);
        return { ...budget, spent: budget.spent + spend(transactions) - spend(workspace.transactions) };
      }),
    [budgets, transactions, workspace.transactions],
  );
  const remainingBudget = liveBudgets.length
    ? liveBudgets.reduce((sum, item) => sum + Math.max(0, item.limit - item.spent), 0)
    : undefined;
  const reservedCommitments = commitmentTotals(commitments).reserved;
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
  const displayName = viewer.displayName || (viewer.isDemo ? "Minh" : "bạn");
  const featuredGoal = [...goals].filter((goal) => !goal.isArchived).sort((a, b) => goalProgress(b) - goalProgress(a))[0];
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
            <strong className="font-mono">{formatMoney(totals.balance)}</strong>
            <small>Trên mọi ví đang dùng</small>
          </article>
          <article>
            <span>Thu tháng</span>
            <strong className="font-mono amount income">+ {formatMoney(totals.income)}</strong>
            <small>Không gồm chuyển ví</small>
          </article>
          <article>
            <span>Chi tháng</span>
            <strong className="font-mono amount">− {formatMoney(totals.expense)}</strong>
            <small>Không gồm chuyển ví</small>
          </article>
          <article>
            <span>Ròng</span>
            <strong className={`font-mono ${totals.net >= 0 ? "amount income" : "amount"}`}>
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
                                <span className="font-mono">{formatMoney(item.amount)}</span>
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
                          >
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

            <article className="budget-panel panel">
              <div className="section-heading compact">
                <div>
                  <h2>Ngân sách tháng</h2>
                  <p>{featuredBudget?.categoryName ?? "Chưa thiết lập"}</p>
                </div>
                <Link className="icon-button" href="/budgets" aria-label="Mở chi tiết ngân sách">
                  <Icon name="arrowRight" />
                </Link>
              </div>
              {featuredBudget ? (
                <>
                  <div className="budget-number">
                    <strong className="font-mono">{formatMoney(featuredBudget.spent)}</strong>
                    <span className="font-mono">/ {formatMoney(featuredBudget.limit)}</span>
                  </div>
                  <div className="budget-track" aria-label={`Đã dùng ${featuredProgress} phần trăm`}>
                    <span
                      style={{
                        width: `${Math.min(100, featuredProgress)}%`,
                        backgroundColor:
                          featuredProgress >= 100
                            ? "var(--color-danger-default)"
                            : featuredProgress >= 80
                              ? "#f97316"
                              : featuredProgress >= 50
                                ? "var(--color-warning-default)"
                                : "var(--color-success-default)",
                      }}
                    />
                  </div>
                  <div className="budget-foot">
                    <span>Đã dùng {featuredProgress}%</span>
                    <strong className="font-mono">
                      {featuredBudget.spent > featuredBudget.limit
                        ? `Vượt ${formatMoney(featuredBudget.spent - featuredBudget.limit)}`
                        : `Còn ${formatMoney(featuredBudget.limit - featuredBudget.spent)}`}
                    </strong>
                  </div>
                </>
              ) : (
                <div className="budget-empty">
                  <p>Chưa đặt hạn mức cho tháng này.</p>
                  <Link href="/budgets">Thiết lập ngân sách</Link>
                </div>
              )}
            </article>

            <article className="insight-panel">
              <span className="round-icon purple">
                <Icon name="calendar" />
              </span>
              <div>
                <p className="eyebrow">Khoản định kỳ</p>
                <h2>
                  {reservedCommitments
                    ? `${formatMoney(reservedCommitments)} đang được giữ trước`
                    : "Chưa có hóa đơn cần giữ trước"}
                </h2>
                <p>
                  {reservedCommitments ? (
                    <Link href="/commitments">Xem lịch thanh toán và đánh dấu đã trả →</Link>
                  ) : (
                    <Link href="/commitments">Thêm khoản định kỳ đầu tiên →</Link>
                  )}
                </p>
              </div>
            </article>

            <article className="goal-dashboard-panel panel">
              <div className="section-heading compact">
                <div>
                  <h2>Mục tiêu tiết kiệm</h2>
                  <p>{featuredGoal?.name ?? "Chưa có mục tiêu"}</p>
                </div>
                <Link className="icon-button" href="/goals" aria-label="Mở mục tiêu tiết kiệm">
                  <Icon name="arrowRight" />
                </Link>
              </div>
              {featuredGoal ? (
                <>
                  <div className="budget-number">
                    <strong className="font-mono">{formatMoney(featuredGoal.allocated)}</strong>
                    <span className="font-mono">/ {formatMoney(featuredGoal.target)}</span>
                  </div>
                  <div className="budget-track">
                    <span style={{ width: `${goalProgress(featuredGoal)}%` }} />
                  </div>
                  <div className="budget-foot">
                    <span>Đã đạt {goalProgress(featuredGoal)}%</span>
                    <strong className="font-mono">
                      {savings.plannedDaily > 0
                        ? `${formatMoney(savings.plannedDaily)}/ngày`
                        : "Tự do tiến độ"}
                    </strong>
                  </div>
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
