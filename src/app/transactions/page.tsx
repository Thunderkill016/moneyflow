import type { Metadata } from "next";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";
import {
  normalizeTransactionAmountInput,
  normalizeTransactionDateParam,
  normalizeTransactionReviewParam,
} from "@/lib/transaction-filters";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import { getPatternDismissedKeys } from "@/server/dismissals";
import { getReconciliationImportEvidence } from "@/server/reconciliation-import-evidence";

export const metadata: Metadata = {
  title: "Giao dịch — MoneyFlow",
  description: "Tìm và quản lý các khoản thu chi trong MoneyFlow.",
};

type TransactionKind = "all" | "expense" | "income" | "transfer";

function normalizeKind(value: string | undefined): TransactionKind {
  return value === "expense" || value === "income" || value === "transfer"
    ? value
    : "all";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    kind?: string;
    account?: string;
    review?: string;
    from?: string;
    to?: string;
    min?: string;
    max?: string;
    open?: string;
  }>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();
  /*
   * Import provenance rides beside the feed (transaction_import_provenance
   * is keyed by transaction_id, not a feed column). Demo viewers get the
   * empty map from the same helper — rows without evidence render nothing.
   */
  const [importEvidence, dupeDismissals] = await Promise.all([
    getReconciliationImportEvidence(
      workspace.transactions.map((transaction) => transaction.id),
    ),
    // Server-persisted dismissals follow the account across devices; demo
    // viewers get null and the component reads browser-local storage instead.
    getPatternDismissedKeys("ledger_dupe"),
  ]);
  const initialCategory = workspace.categories.some(
    (item) => item.name === params.category,
  )
    ? params.category
    : "all";
  const initialAccount = workspace.accounts.some(
    (item) => item.name === params.account,
  )
    ? params.account
    : "all";

  return (
    <TransactionsWorkspace
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      dupeDismissals={dupeDismissals}
      viewerId={viewer.id}
      workspace={workspace}
      importEvidence={importEvidence}
      initialQuery={params.q?.slice(0, 200) ?? ""}
      initialCategory={initialCategory}
      initialAccount={initialAccount}
      initialKind={normalizeKind(params.kind)}
      initialReview={normalizeTransactionReviewParam(params.review)}
      initialFromDate={normalizeTransactionDateParam(params.from)}
      initialToDate={normalizeTransactionDateParam(params.to)}
      initialMinAmount={normalizeTransactionAmountInput(params.min)}
      initialMaxAmount={normalizeTransactionAmountInput(params.max)}
      initialOpenId={params.open?.slice(0, 100)}
    />
  );
}
