"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardHeaderSections,
  DashboardLedgerColumn,
} from "@/components/dashboard/dashboard-overview-sections";
import { DashboardPlanningColumn } from "@/components/dashboard/dashboard-planning-sections";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { useTransactions } from "@/hooks/use-transactions";
import { buildAttentionItems } from "@/lib/attention";
import { sumBudgetSpent, type BudgetSummary } from "@/lib/planning/budgets";
import { hydrateCommitmentsWithOccurrences } from "@/lib/planning/commitment-occurrence-store";
import {
  commitmentTotals,
  monthStartFromDate,
  type RecurringCommitment,
} from "@/lib/planning/commitments";
import {
  calculateDashboardSummary,
  netTransactionEffect,
  topExpenseCategories,
} from "@/lib/finance";
import { goalTotals, type SavingsGoal } from "@/lib/planning/goals";
import { hydrateIncomeTemplatesWithOccurrences } from "@/lib/planning/income-template-store";
import type { RecurringIncomeTemplate } from "@/lib/planning/income-templates";
import {
  countPending,
  readStoredCandidates,
} from "@/lib/inbox/candidate-store";
import { formatMoney } from "@/lib/money";
import { GHI_CHI_TIEU_LABEL } from "@/lib/nav-ia";
import {
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type Transaction,
} from "@/lib/sample-data";
import type { ViewerSummary } from "@/components/user-chip";

const AddTransactionDialog = dynamic(
  () =>
    import("@/components/add-transaction-dialog").then(
      (mod) => mod.AddTransactionDialog,
    ),
  { ssr: false },
);

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
  const {
    transactions,
    addTransaction: addTransactionToStore,
    isMutating,
  } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const [demoCommitments, setDemoCommitments] = useState<
    RecurringCommitment[] | null
  >(null);
  const [demoIncomeTemplates, setDemoIncomeTemplates] = useState<
    RecurringIncomeTemplate[] | null
  >(null);

  useEffect(() => {
    if (!viewer.isDemo) return;
    const monthStart = monthStartFromDate(workspace.today);
    const frame = window.requestAnimationFrame(() => {
      setDemoCommitments(
        hydrateCommitmentsWithOccurrences(commitments, monthStart),
      );
      setDemoIncomeTemplates(
        hydrateIncomeTemplatesWithOccurrences(incomeTemplates, monthStart),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewer.isDemo, commitments, incomeTemplates, workspace.today]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      try {
        setInboxCount(countPending(readStoredCandidates()));
      } catch {
        setInboxCount(0);
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 1500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }
    const timeout = window.setTimeout(run, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [transactions.length]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const liveCommitments =
    viewer.isDemo && demoCommitments ? demoCommitments : commitments;
  const liveIncomeTemplates =
    viewer.isDemo && demoIncomeTemplates
      ? demoIncomeTemplates
      : incomeTemplates;

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
          sumBudgetSpent(
            transactions,
            budget.categoryId,
            budget.monthStart,
          ) -
          sumBudgetSpent(
            workspace.transactions,
            budget.categoryId,
            budget.monthStart,
          );
        return { ...budget, spent: budget.spent + spentDelta };
      }),
    [budgets, transactions, workspace.transactions],
  );

  const remainingBudget = liveBudgets.length
    ? liveBudgets.reduce(
        (sum, item) => sum + Math.max(0, item.limit - item.spent),
        0,
      )
    : undefined;
  const reservedCommitments = commitmentTotals(liveCommitments).reserved;
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
    () =>
      topExpenseCategories(transactions, {
        today: workspace.today,
        limit: 5,
      }),
    [transactions, workspace.today],
  );

  const attentionItems = useMemo(
    () =>
      buildAttentionItems({
        budgets: liveBudgets,
        commitments: liveCommitments,
        inboxCount,
        today: workspace.today,
      }),
    [liveBudgets, liveCommitments, inboxCount, workspace.today],
  );

  async function addTransaction(input: CreateTransactionInput) {
    const result = await addTransactionToStore(input);
    if (result.ok && result.transaction) {
      setDialogOpen(false);
      setNotice(
        `${
          result.transaction.kind === "expense"
            ? "Đã ghi khoản chi"
            : "Đã ghi khoản thu"
        } ${formatMoney(result.transaction.amount)}.`,
      );
    }
    return result;
  }

  const actionsDisabled = Boolean(workspace.dataError);
  const isEmptyLedger = transactions.length === 0;
  const displayName = viewer.displayName || (viewer.isDemo ? "Minh" : "bạn");
  const openGhiChi = () => setDialogOpen(true);

  return (
    <AppShell
      viewer={viewer}
      inboxCount={inboxCount}
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

        <DashboardHeaderSections
          displayName={displayName}
          attentionItems={attentionItems}
          totals={totals}
          isEmptyLedger={isEmptyLedger && !workspace.dataError}
          actionsDisabled={actionsDisabled}
          onAddTransaction={openGhiChi}
        />

        <section className="content-grid insights-main-grid">
          <DashboardLedgerColumn
            topCategories={topCategories}
            transactions={transactions}
            isEmptyLedger={isEmptyLedger}
            actionsDisabled={actionsDisabled}
            onAddTransaction={openGhiChi}
          />
          <DashboardPlanningColumn
            transactions={transactions}
            budgets={liveBudgets}
            commitments={liveCommitments}
            incomeTemplates={liveIncomeTemplates}
            goals={goals}
            today={workspace.today}
            isEmptyLedger={isEmptyLedger}
          />
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
