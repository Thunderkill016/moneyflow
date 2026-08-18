"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardHeaderSections,
  DashboardLedgerColumn,
} from "@/components/dashboard/dashboard-overview-sections";
import styles from "@/components/dashboard/dashboard.module.css";
import { Icon } from "@/components/icons";
import { AppShell } from "@/components/layout/app-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTransactions } from "@/hooks/use-transactions";
import { buildAttentionItems } from "@/lib/attention";
import { sumBudgetSpent, type BudgetSummary } from "@/lib/planning/budgets";
import { hydrateCommitmentsWithOccurrences } from "@/lib/planning/commitment-occurrence-store";
import {
  monthStartFromDate,
  type RecurringCommitment,
} from "@/lib/planning/commitments";
import {
  calculateDashboardSummary,
  reconcileBalanceSnapshot,
  topExpenseCategories,
} from "@/lib/finance";
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
  type CreateTransferInput,
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
const TransferDialog = dynamic(
  () => import("@/components/transfer-dialog").then((mod) => mod.TransferDialog),
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
  initialInboxCount,
  budgets,
  commitments,
}: {
  viewer: ViewerSummary;
  workspace: DashboardWorkspace;
  initialInboxCount: number;
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
}) {
  const {
    transactions,
    addTransaction: addTransactionToStore,
    addTransfer,
    isMutating,
  } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    isDemo: viewer.isDemo,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [demoInboxCount, setDemoInboxCount] = useState(0);
  const [demoCommitments, setDemoCommitments] = useState<
    RecurringCommitment[] | null
  >(null);

  useEffect(() => {
    if (!viewer.isDemo) return;
    const monthStart = monthStartFromDate(workspace.today);
    const frame = window.requestAnimationFrame(() => {
      setDemoCommitments(
        hydrateCommitmentsWithOccurrences(commitments, monthStart),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewer.isDemo, commitments, workspace.today]);

  useEffect(() => {
    if (!viewer.isDemo) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      try {
        setDemoInboxCount(countPending(readStoredCandidates()));
      } catch {
        setDemoInboxCount(0);
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
  }, [transactions.length, viewer.isDemo]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const liveCommitments =
    viewer.isDemo && demoCommitments ? demoCommitments : commitments;
  const inboxCount = viewer.isDemo ? demoInboxCount : initialInboxCount;

  const currentBalance = useMemo(
    () =>
      reconcileBalanceSnapshot(
        workspace.totalBalance,
        workspace.transactions,
        transactions,
      ),
    [transactions, workspace.totalBalance, workspace.transactions],
  );

  const liveBudgets = useMemo(
    () =>
      budgets.map((budget) => {
        const spentDelta =
          sumBudgetSpent(transactions, budget.categoryId, budget.monthStart) -
          sumBudgetSpent(
            workspace.transactions,
            budget.categoryId,
            budget.monthStart,
          );
        return { ...budget, spent: budget.spent + spentDelta };
      }),
    [budgets, transactions, workspace.transactions],
  );

  const totals = useMemo(
    () =>
      calculateDashboardSummary(transactions, {
        isDemo: viewer.isDemo,
        totalBalance: currentBalance,
        today: workspace.today,
      }),
    [currentBalance, transactions, viewer.isDemo, workspace.today],
  );

  const topCategories = useMemo(
    () => topExpenseCategories(transactions, { today: workspace.today, limit: 5 }),
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

  async function handleTransfer(input: CreateTransferInput) {
    const result = await addTransfer(input);
    if (result.ok) {
      setTransferOpen(false);
      setNotice("Đã chuyển tiền giữa các tài khoản.");
    }
    return result;
  }

  const actionsDisabled = Boolean(workspace.dataError);
  const isEmptyLedger = transactions.length === 0;
  const displayName = viewer.displayName || (viewer.isDemo ? "Minh" : "bạn");
  const openGhiChi = () => setDialogOpen(true);
  const openTransferFromCapture = () => {
    setDialogOpen(false);
    setTransferOpen(true);
  };

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
      <main className={styles.dashboard}>
        {workspace.dataError ? (
          <Alert tone="error" live="assertive" className="data-alert">
            <Icon name="bell" aria-hidden="true" />
            <AlertDescription>{workspace.dataError}</AlertDescription>
          </Alert>
        ) : null}

        <DashboardHeaderSections
          displayName={displayName}
          attentionItems={attentionItems}
          totals={totals}
          today={workspace.today}
          isEmptyLedger={isEmptyLedger && !workspace.dataError}
          onAddTransaction={openGhiChi}
        />

        <DashboardLedgerColumn
          topCategories={topCategories}
          transactions={transactions}
          isEmptyLedger={isEmptyLedger}
          actionsDisabled={actionsDisabled}
          today={workspace.today}
          onAddTransaction={openGhiChi}
        />
      </main>

      <AddTransactionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addTransaction}
        onTransferRequested={
          workspace.accounts.length >= 2 ? openTransferFromCapture : undefined
        }
        accounts={workspace.accounts}
        categories={workspace.categories}
        disabled={isMutating || actionsDisabled}
      />
      <TransferDialog
        open={transferOpen}
        accounts={workspace.accounts}
        onClose={() => setTransferOpen(false)}
        onTransfer={handleTransfer}
      />
    </AppShell>
  );
}
