"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddTransactionDialog } from "@/components/add-transaction-dialog";
import { Icon, type IconName } from "@/components/icons";
import { calculateDashboardSummary } from "@/lib/finance";
import {
  categoryMeta,
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type Transaction,
} from "@/lib/sample-data";
import { formatMoney } from "@/lib/money";
import { useTransactions } from "@/hooks/use-transactions";
import { UserChip, viewerInitial, type ViewerSummary } from "@/components/user-chip";
import { budgetProgress, type BudgetSummary } from "@/lib/budgets";
import { commitmentTotals, type RecurringCommitment } from "@/lib/commitments";
import { goalProgress, goalTotals, type SavingsGoal } from "@/lib/goals";

const navItems = [
  { label: "Tổng quan", icon: "home" as const, href: "/" },
  { label: "Giao dịch", icon: "arrows" as const, href: "/transactions" },
  { label: "Ngân sách", icon: "target" as const, href: "/budgets" },
  { label: "Báo cáo", icon: "chart" as const, href: "/reports" },
  { label: "Định kỳ", icon: "calendar" as const, href: "/commitments" },
  { label: "Mục tiêu", icon: "flag" as const, href: "/goals" },
  { label: "Tài khoản", icon: "wallet" as const, href: "/accounts" },
];

const spendBars = [38, 54, 46, 72, 58, 84, 64, 91, 52, 68, 44, 61, 76, 48];

function netTransactions(transactions: Transaction[]) {
  return transactions.reduce(
    (sum, item) => sum + (item.kind === "income" ? item.amount : item.kind === "expense" ? -item.amount : 0),
    0,
  );
}

function addDays(date: string, amount: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

type DashboardWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

export function MoneyFlowDashboard({ viewer, workspace, budgets, commitments, goals }: { viewer: ViewerSummary; workspace: DashboardWorkspace; budgets: BudgetSummary[]; commitments: RecurringCommitment[]; goals: SavingsGoal[] }) {
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

  const liveBudgets = useMemo(() => budgets.map((budget) => {
    const spend = (items: Transaction[]) => items
      .filter((item) => item.kind === "expense" && item.categoryId === budget.categoryId && item.occurredOn.startsWith(budget.monthStart.slice(0, 7)))
      .reduce((sum, item) => sum + item.amount, 0);
    return { ...budget, spent: budget.spent + spend(transactions) - spend(workspace.transactions) };
  }), [budgets, transactions, workspace.transactions]);
  const remainingBudget = liveBudgets.length
    ? liveBudgets.reduce((sum, item) => sum + Math.max(0, item.limit - item.spent), 0)
    : undefined;
  const reservedCommitments = commitmentTotals(commitments).reserved;
  const savings = goalTotals(goals, workspace.today);

  const totals = useMemo(
    () => calculateDashboardSummary(transactions, {
      isDemo: viewer.isDemo,
      totalBalance: currentBalance,
      today: workspace.today,
      remainingBudget,
      reservedCommitments,
      reservedSavings: savings.allocated,
      plannedDailySavings: savings.plannedDaily,
    }),
    [currentBalance, remainingBudget, reservedCommitments, savings.allocated, savings.plannedDaily, transactions, viewer.isDemo, workspace.today],
  );

  const chartBars = useMemo(() => {
    if (viewer.isDemo) return spendBars;
    const amounts = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(workspace.today, index - 13);
      return transactions
        .filter((item) => item.kind === "expense" && item.occurredOn === date)
        .reduce((sum, item) => sum + item.amount, 0);
    });
    const highest = Math.max(1, ...amounts);
    return amounts.map((amount) => amount === 0 ? 4 : Math.max(12, Math.round((amount / highest) * 100)));
  }, [transactions, viewer.isDemo, workspace.today]);

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

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Điều hướng chính">
        <Link className="brand" href="/" aria-label="MoneyFlow, trang tổng quan">
          <span className="brand-mark"><span /></span>
          <span>MoneyFlow</span>
        </Link>
        <nav>
          {navItems.map((item, index) => (
            <Link href={item.href} className={index === 0 ? "active" : ""} key={item.label}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="#cai-dat"><Icon name="settings" /><span>Cài đặt</span></a>
          <UserChip viewer={viewer} />
        </div>
      </aside>

      <div className="page-column">
        <header className="topbar" id="top">
          <Link className="mobile-brand brand" href="/" aria-label="MoneyFlow">
            <span className="brand-mark"><span /></span>
            <span>MoneyFlow</span>
          </Link>
          <div className="desktop-search">
            <Icon name="search" />
            <input aria-label="Tìm kiếm" placeholder="Tìm giao dịch..." />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Thông báo"><Icon name="bell" /><span className="notification-dot" /></button>
            <button className="primary-button desktop-add" onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)}>
              <Icon name="plus" /> Thêm giao dịch
            </button>
            <span className="mobile-avatar avatar">{viewerInitial(viewer)}</span>
          </div>
        </header>

        <main className="dashboard">
          {workspace.dataError && <div className="data-alert" role="alert"><Icon name="bell" /><span>{workspace.dataError}</span></div>}
          <section className="welcome-row">
            <div>
              <p className="eyebrow">Tổng quan tài chính</p>
              <h1>Chào buổi sáng, {displayName}.</h1>
              <p>Hôm nay dòng tiền của bạn vẫn đang đi đúng hướng.</p>
            </div>
            <button className="date-pill"><span>Tháng này</span><Icon name="arrowDown" /></button>
          </section>

          <section className="hero-grid" aria-label="Tình hình tài chính hôm nay">
            <article className="safe-card">
              <div className="safe-card-top">
                <div>
                  <p>Có thể chi hôm nay</p>
                  <h2>{formatMoney(totals.safeToday)}</h2>
                </div>
                <span className="status-badge"><span /> An toàn</span>
              </div>
              <div className="safe-meter" aria-label="Mức chi tiêu hôm nay">
                <span style={{ width: `${totals.dailyAllowance > 0 ? Math.min(100, 100 - (totals.safeToday / totals.dailyAllowance) * 100) : 0}%` }} />
              </div>
              <div className="safe-copy">
                <span className="trend-icon"><Icon name="arrowUp" /></span>
                <p>{protectedTotal > 0 ? <>Đã bảo vệ <strong>{formatMoney(protectedTotal)}</strong> cho hóa đơn và mục tiêu.</> : <>Nếu giữ nhịp này, cuối tháng bạn còn khoảng <strong>{formatMoney(totals.forecast)}</strong>.</>}</p>
              </div>
              <button className="hero-add" onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)}>
                <Icon name="plus" /> Ghi một khoản mới
              </button>
            </article>

            <article className="month-card">
              <div className="card-title-row">
                <div><p>Số dư hiện tại</p><h2>{formatMoney(totals.balance)}</h2></div>
                <span className="round-icon green"><Icon name="wallet" /></span>
              </div>
              <div className="month-stats">
                <div><span><Icon name="arrowDown" /> Thu nhập</span><strong>{formatMoney(totals.income, true)}</strong></div>
                <div><span><Icon name="arrowUp" /> Chi tiêu</span><strong>{formatMoney(totals.expense, true)}</strong></div>
              </div>
              <div className="mini-chart" aria-label="Biểu đồ chi tiêu 14 ngày gần đây">
                {chartBars.map((height, index) => <span key={index} style={{ height: `${height}%` }} className={index === chartBars.length - 1 ? "today" : ""} />)}
              </div>
              <div className="chart-labels"><span>01 thg 7</span><span>Hôm nay</span></div>
            </article>
          </section>

          <section className="content-grid">
            <article className="transactions-panel panel">
              <div className="section-heading">
                <div><h2>Giao dịch gần đây</h2><p>Cập nhật ngay khi bạn ghi khoản mới.</p></div>
                <Link className="section-link" href="/transactions">Xem tất cả <Icon name="arrowRight" /></Link>
              </div>
              <div className="transaction-list">
                {transactions.length ? transactions.slice(0, 5).map((transaction) => {
                  const meta = categoryMeta[transaction.category] ?? categoryMeta["Thu nhập khác"];
                  return (
                    <div className="transaction-row" key={transaction.id}>
                      <span className={`transaction-icon ${meta.color}`}><Icon name={meta.icon as IconName} /></span>
                      <span className="transaction-detail"><strong>{transaction.note}</strong><small>{transaction.kind === "transfer" ? `${transaction.account} → ${transaction.destinationAccount}` : `${transaction.category} · ${transaction.account}`}</small></span>
                      <span className="transaction-time">{transaction.relativeDate}</span>
                      <strong className={transaction.kind === "income" ? "amount income" : transaction.kind === "transfer" ? "amount transfer" : "amount"}>
                        {transaction.kind === "income" ? "+" : transaction.kind === "transfer" ? "↔ " : "−"}{formatMoney(transaction.amount)}
                      </strong>
                    </div>
                  );
                }) : <div className="panel-empty"><span><Icon name="arrows" /></span><h3>Chưa có giao dịch</h3><p>Ghi khoản đầu tiên để MoneyFlow bắt đầu phân tích dòng tiền.</p><button onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)}>Thêm giao dịch</button></div>}
              </div>
            </article>

            <div className="right-stack">
              <article className="budget-panel panel">
                <div className="section-heading compact">
                  <div><h2>Ngân sách tháng</h2><p>{featuredBudget?.categoryName ?? "Chưa thiết lập"}</p></div>
                  <Link className="icon-button" href="/budgets" aria-label="Mở chi tiết ngân sách"><Icon name="arrowRight" /></Link>
                </div>
                {featuredBudget ? <>
                  <div className="budget-number"><strong>{formatMoney(featuredBudget.spent)}</strong><span>/ {formatMoney(featuredBudget.limit)}</span></div>
                  <div className="budget-track" aria-label={`Đã dùng ${featuredProgress} phần trăm`}><span style={{ width: `${Math.min(100, featuredProgress)}%` }} /></div>
                  <div className="budget-foot"><span>Đã dùng {featuredProgress}%</span><strong>{featuredBudget.spent > featuredBudget.limit ? `Vượt ${formatMoney(featuredBudget.spent - featuredBudget.limit)}` : `Còn ${formatMoney(featuredBudget.limit - featuredBudget.spent)}`}</strong></div>
                </> : <div className="budget-empty"><p>Chưa đặt hạn mức cho tháng này.</p><Link href="/budgets">Thiết lập ngân sách</Link></div>}
              </article>

              <article className="insight-panel">
                <span className="round-icon purple"><Icon name="calendar" /></span>
                <div><p className="eyebrow">Khoản định kỳ</p><h2>{reservedCommitments ? `${formatMoney(reservedCommitments)} đang được giữ trước` : "Chưa có hóa đơn cần giữ trước"}</h2><p>{reservedCommitments ? <Link href="/commitments">Xem lịch thanh toán và đánh dấu đã trả →</Link> : <Link href="/commitments">Thêm khoản định kỳ đầu tiên →</Link>}</p></div>
              </article>

              <article className="goal-dashboard-panel panel">
                <div className="section-heading compact"><div><h2>Mục tiêu tiết kiệm</h2><p>{featuredGoal?.name ?? "Chưa có mục tiêu"}</p></div><Link className="icon-button" href="/goals" aria-label="Mở mục tiêu tiết kiệm"><Icon name="arrowRight" /></Link></div>
                {featuredGoal ? <><div className="budget-number"><strong>{formatMoney(featuredGoal.allocated)}</strong><span>/ {formatMoney(featuredGoal.target)}</span></div><div className="budget-track"><span style={{ width: `${goalProgress(featuredGoal)}%` }} /></div><div className="budget-foot"><span>Đã đạt {goalProgress(featuredGoal)}%</span><strong>{savings.plannedDaily > 0 ? `${formatMoney(savings.plannedDaily)}/ngày` : "Tự do tiến độ"}</strong></div></> : <div className="budget-empty"><p>Dành tiền cho một điều bạn muốn đạt được.</p><Link href="/goals">Tạo mục tiêu</Link></div>}
              </article>
            </div>
          </section>
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Điều hướng di động">
        {navItems.map((item, index) => (
          <Link href={item.href} className={index === 0 ? "active" : ""} key={item.label}>
            <Icon name={item.icon} /><span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <button className="mobile-fab" onClick={() => setDialogOpen(true)} disabled={Boolean(workspace.dataError)} aria-label="Thêm giao dịch"><Icon name="plus" /></button>

      <AddTransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addTransaction}
        accounts={workspace.accounts}
        categories={workspace.categories}
        disabled={isMutating || Boolean(workspace.dataError)}
      />
      <div className={notice ? "toast visible" : "toast"} role="status" aria-live="polite">
        <span><Icon name="check" /></span>{notice}
      </div>
    </div>
  );
}
