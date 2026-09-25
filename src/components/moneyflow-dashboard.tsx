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
import type { ToastTone } from "@/components/ui/toast";
import { useTransactions } from "@/hooks/use-transactions";
import { buildAttentionItems, type BackupReminderState } from "@/lib/attention";
import { captureConsequence } from "@/lib/capture-consequence";
import {
  reconcileAccountBalances,
  type AccountBalanceRow,
} from "@/lib/dashboard-accounts";
import type { LedgerTrustSummary } from "@/lib/ledger-trust";
import { getTransactionReviewStatus } from "@/lib/transaction-review";
import { sumBudgetSpent, type BudgetSummary } from "@/lib/planning/budgets";
import { hydrateCommitmentsWithOccurrences } from "@/lib/planning/commitment-occurrence-store";
import {
  buildCommittedRemainder,
  committedRemainderLabel,
} from "@/lib/planning/committed-remainder";
import { derivePayeeSuggestions } from "@/lib/quick-add-defaults";
import {
  monthStartFromDate,
  type RecurringCommitment,
} from "@/lib/planning/commitments";
import {
  dueDateForMonth as incomeDueDateForMonth,
  type RecurringIncomeTemplate,
} from "@/lib/planning/income-templates";
import {
  hydrateIncomeTemplatesWithOccurrences,
  readStoredIncomeTemplates,
} from "@/lib/planning/income-template-store";
import { monthStatementDetail } from "@/lib/dashboard-month";
import {
  calculateDashboardSummary,
  reconcileBalanceSnapshot,
  topExpenseCategories,
} from "@/lib/finance";
import {
  countPending,
  readStoredCandidates,
} from "@/lib/inbox/candidate-store";
import { GHI_CHI_TIEU_LABEL } from "@/lib/nav-ia";
import {
  type AccountOption,
  type CategoryOption,
  type CreateTransactionInput,
  type CreateTransferInput,
  type GoalOption,
  type Transaction,
  type UpdateMoneyTransactionInput,
  type UpdateTransferInput,
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
  () =>
    import("@/components/transfer-dialog").then((mod) => mod.TransferDialog),
  { ssr: false },
);
const EditTransactionDialog = dynamic(
  () =>
    import("@/components/edit-transaction-dialog").then(
      (mod) => mod.EditTransactionDialog,
    ),
  { ssr: false },
);

type DashboardWorkspace = {
  transactions: Transaction[];
  accounts: AccountOption[];
  categories: CategoryOption[];
  /** Goal picker options for the edit dialog. */
  goals?: GoalOption[];
  totalBalance: number;
  today: string;
  dataError: string | null;
};

export function MoneyFlowDashboard({
  viewer,
  workspace,
  metaCategories,
  accountBalances,
  backupState,
  initialInboxCount,
  ledgerTrust,
  budgets,
  commitments,
  goalPaceAttentionCount,
  incomeTemplates,
}: {
  viewer: ViewerSummary;
  workspace: DashboardWorkspace;
  /**
   * Active + archived categories for row/icon presentation. The bundle only
   * carries the active picker set, so the page supplies the full list — an
   * archived category keeps its stored identity on historical rows.
   */
  metaCategories: readonly CategoryOption[];
  accountBalances: AccountBalanceRow[];
  backupState: BackupReminderState;
  initialInboxCount: number;
  ledgerTrust: LedgerTrustSummary | null;
  budgets: BudgetSummary[];
  commitments: RecurringCommitment[];
  /**
   * Server-computed count of overdue/behind-pace goals — a bare number, so
   * goal objects never enter this client boundary.
   */
  goalPaceAttentionCount: number;
  /**
   * Month-resolved income templates — declared inputs to the remainder's
   * "thu dự kiến" disclosure only; no planning surface is rendered from them.
   */
  incomeTemplates: RecurringIncomeTemplate[];
}) {
  const {
    transactions,
    addTransaction: addTransactionToStore,
    addTransfer,
    updateTransaction,
    isMutating,
  } = useTransactions({
    initialTransactions: workspace.transactions,
    accounts: workspace.accounts,
    categories: workspace.categories,
    goals: workspace.goals,
    isDemo: viewer.isDemo,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [recentSaved, setRecentSaved] = useState<Transaction | null>(null);
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState<ToastTone | undefined>(undefined);
  const [demoInboxCount, setDemoInboxCount] = useState(0);
  const [demoCommitments, setDemoCommitments] = useState<
    RecurringCommitment[] | null
  >(null);
  const [demoIncomeTemplates, setDemoIncomeTemplates] = useState<
    RecurringIncomeTemplate[] | null
  >(null);
  const monthStart = monthStartFromDate(workspace.today);

  useEffect(() => {
    if (!viewer.isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      setDemoCommitments(
        hydrateCommitmentsWithOccurrences(commitments, monthStart),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewer.isDemo, commitments, monthStart]);

  /*
   * Demo income state lives in browser storage, same as commitments: template
   * edits override the seed list, and the occurrence map carries this month's
   * received flags. Stored rows re-derive `dueDate` for the current month —
   * the same precedence the /income-templates page applies.
   */
  useEffect(() => {
    if (!viewer.isDemo) return;
    const frame = window.requestAnimationFrame(() => {
      const stored = readStoredIncomeTemplates();
      const base = (stored ?? incomeTemplates).map((item) => ({
        ...item,
        dueDate: incomeDueDateForMonth(monthStart, item.dueDay),
      }));
      setDemoIncomeTemplates(
        hydrateIncomeTemplatesWithOccurrences(base, monthStart),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewer.isDemo, incomeTemplates, monthStart]);

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
    const timeout = window.setTimeout(() => {
      setNotice("");
      setNoticeTone(undefined);
      setRecentSaved(null);
    }, 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function showNotice(message: string, tone: ToastTone) {
    setNotice(message);
    setNoticeTone(tone);
  }

  const liveCommitments =
    viewer.isDemo && demoCommitments ? demoCommitments : commitments;
  const liveIncomeTemplates =
    viewer.isDemo && demoIncomeTemplates
      ? demoIncomeTemplates
      : incomeTemplates;
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

  const liveAccountBalances = useMemo(
    () =>
      reconcileAccountBalances(
        accountBalances,
        workspace.transactions,
        transactions,
      ),
    [accountBalances, transactions, workspace.transactions],
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
    () =>
      topExpenseCategories(transactions, {
        today: workspace.today,
        limit: 5,
      }),
    [transactions, workspace.today],
  );

  const monthDetail = useMemo(
    () => monthStatementDetail(transactions, workspace.today),
    [transactions, workspace.today],
  );

  /*
   * Obligations-aware remainder: "balance − unpaid declared commitments this
   * month", disclosed as exactly that, with expected income appended as its
   * own labeled suffix ("chưa gồm X thu dự kiến") — reported, never folded
   * in. `committedRemainderLabel` returns null whenever the derivation is
   * incomplete or nothing was declared — the line then does not exist rather
   * than implying coverage it cannot prove.
   */
  const remainderLine = useMemo(
    () =>
      committedRemainderLabel(
        buildCommittedRemainder({
          currentBalance,
          accounts: workspace.accounts,
          commitments: liveCommitments,
          incomeTemplates: liveIncomeTemplates,
          monthStart,
        }),
      ),
    [
      currentBalance,
      workspace.accounts,
      liveCommitments,
      liveIncomeTemplates,
      monthStart,
    ],
  );

  const needsReviewCount = useMemo(
    () =>
      transactions.filter(
        (item) => getTransactionReviewStatus(item) === "needs_review",
      ).length,
    [transactions],
  );

  const payeeSuggestions = useMemo(
    () => derivePayeeSuggestions(transactions),
    [transactions],
  );

  const attentionItems = useMemo(
    () =>
      buildAttentionItems({
        budgets: liveBudgets,
        commitments: liveCommitments,
        inboxCount,
        needsReviewCount,
        goalPaceAttentionCount,
        today: workspace.today,
        backup: backupState,
      }),
    [
      liveBudgets,
      liveCommitments,
      inboxCount,
      needsReviewCount,
      goalPaceAttentionCount,
      workspace.today,
      backupState,
    ],
  );

  async function addTransaction(input: CreateTransactionInput) {
    const result = await addTransactionToStore(input);
    if (result.ok && result.transaction) {
      // Same helper as the quick-capture surface, so a save reads identically
      // wherever it happens rather than being richer on one screen than another.
      setRecentSaved(result.transaction);
      showNotice(
        captureConsequence({
          saved: result.transaction,
          transactions: [result.transaction, ...transactions],
        }),
        "success",
      );
    }
    return result;
  }

  async function handleUpdate(
    input: UpdateMoneyTransactionInput | UpdateTransferInput,
  ) {
    const result = await updateTransaction(input);
    if (result.ok) {
      setEditing(null);
      setRecentSaved(null);
      showNotice("Đã cập nhật giao dịch.", "success");
    }
    return result;
  }

  async function handleTransfer(input: CreateTransferInput) {
    const result = await addTransfer(input);
    if (result.ok) {
      setTransferOpen(false);
      setRecentSaved(null);
      showNotice("Đã chuyển tiền giữa các tài khoản.", "success");
    }
    return result;
  }

  const actionsDisabled = Boolean(workspace.dataError);
  const isEmptyLedger = transactions.length === 0;
  const displayName = viewer.displayName || (viewer.isDemo ? "Minh" : "bạn");
  const openGhiChi = () => setDialogOpen(true);
  const openTransferFromCapture = () => {
    setDialogOpen(false);
    setRecentSaved(null);
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
      noticeTone={noticeTone}
      noticeAction={
        recentSaved
          ? {
              label: "Sửa",
              onClick: () => {
                setEditing(recentSaved);
                setRecentSaved(null);
                setNotice("");
                setNoticeTone(undefined);
              },
              disabled: isMutating,
            }
          : undefined
      }
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
          ledgerTrust={viewer.isDemo ? null : ledgerTrust}
          totals={totals}
          accountBalances={liveAccountBalances}
          monthDetail={monthDetail}
          remainderLine={remainderLine}
          today={workspace.today}
          isEmptyLedger={isEmptyLedger && !workspace.dataError}
          dataError={workspace.dataError}
          onAddTransaction={openGhiChi}
        />

        <DashboardLedgerColumn
          topCategories={topCategories}
          transactions={transactions}
          metaCategories={metaCategories}
          isEmptyLedger={isEmptyLedger}
          actionsDisabled={actionsDisabled}
          today={workspace.today}
          onAddTransaction={openGhiChi}
        />
      </main>

      {dialogOpen ? (
        <AddTransactionDialog
          open
          onClose={() => setDialogOpen(false)}
          onAdd={addTransaction}
          onTransferRequested={
            workspace.accounts.length >= 2 ? openTransferFromCapture : undefined
          }
          accounts={workspace.accounts}
          categories={workspace.categories}
          goals={workspace.goals}
          transactions={transactions}
          disabled={isMutating || actionsDisabled}
        />
      ) : null}
      {transferOpen ? (
        <TransferDialog
          open
          accounts={workspace.accounts}
          onClose={() => setTransferOpen(false)}
          onTransfer={handleTransfer}
        />
      ) : null}
      {editing ? (
        <EditTransactionDialog
          key={editing.id}
          transaction={editing}
          accounts={workspace.accounts}
          categories={workspace.categories}
          goals={workspace.goals}
          onClose={() => setEditing(null)}
          onSave={handleUpdate}
          disabled={isMutating || actionsDisabled}
          payeeSuggestions={payeeSuggestions}
        />
      ) : null}
    </AppShell>
  );
}
