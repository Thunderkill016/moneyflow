import type { Metadata } from "next";
import { AccountsPage } from "@/components/accounts-page";
import { requireViewer } from "@/server/auth";
import { getAccountsWorkspace } from "@/server/accounts";

export const metadata: Metadata = {
  title: "Tài khoản — MoneyFlow",
  description: "Quản lý tài khoản và số dư trong MoneyFlow.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getAccountsWorkspace();
  return <AccountsPage viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }} initialAccounts={workspace.accounts} dataError={workspace.dataError} />;
}
