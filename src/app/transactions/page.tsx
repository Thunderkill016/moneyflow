import type { Metadata } from "next";
import { TransactionsPage } from "@/components/transactions-page";
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
  searchParams: Promise<{ category?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();
  const initialCategory = workspace.categories.some(
    (item) => item.name === params.category,
  )
    ? params.category
    : "all";

  return (
    <TransactionsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={workspace}
      initialCategory={initialCategory}
      initialKind={normalizeKind(params.kind)}
    />
  );
}
