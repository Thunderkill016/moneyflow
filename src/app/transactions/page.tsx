import type { Metadata } from "next";
import { TransactionsPage } from "@/components/transactions-page";
import {
  normalizeTransactionAmountInput,
  normalizeTransactionDateParam,
  normalizeTransactionReviewParam,
} from "@/lib/transaction-filters";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

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
  }>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();
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
    <TransactionsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
      initialQuery={params.q?.slice(0, 200) ?? ""}
      initialCategory={initialCategory}
      initialAccount={initialAccount}
      initialKind={normalizeKind(params.kind)}
      initialReview={normalizeTransactionReviewParam(params.review)}
      initialFromDate={normalizeTransactionDateParam(params.from)}
      initialToDate={normalizeTransactionDateParam(params.to)}
      initialMinAmount={normalizeTransactionAmountInput(params.min)}
      initialMaxAmount={normalizeTransactionAmountInput(params.max)}
    />
  );
}
