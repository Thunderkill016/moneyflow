import type { Metadata } from "next";
import { TransactionsPage } from "@/components/transactions-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Giao dịch — MoneyFlow",
  description: "Tìm và quản lý các khoản thu chi trong MoneyFlow.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();
  return <TransactionsPage viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }} workspace={workspace} />;
}
