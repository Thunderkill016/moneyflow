import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountDetailPage } from "@/components/account-detail-page";
import {
  buildAccountRegister,
  summarizeAccountRegister,
} from "@/lib/account-register";
import { getAccountsWorkspace } from "@/server/accounts";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Sổ tài khoản — MoneyFlow",
  description: "Xem số dư và lịch sử biến động của một tài khoản MoneyFlow.",
};

export default async function Page({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const viewer = await requireViewer();
  const [accountsWorkspace, financeWorkspace] = await Promise.all([
    getAccountsWorkspace(),
    getFinanceWorkspace(),
  ]);

  const account = accountsWorkspace.accounts.find((item) => item.id === accountId) ?? null;
  const dataError = accountsWorkspace.dataError ?? financeWorkspace.dataError;

  // The account list is already viewer-scoped. Returning the same not-found state
  // for invalid, missing and other-tenant IDs avoids revealing ownership details.
  if (!account && !dataError) notFound();

  const entries = account
    ? buildAccountRegister(financeWorkspace.transactions, account.id)
    : [];
  const summary = summarizeAccountRegister(entries);

  return (
    <AccountDetailPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      account={account}
      entries={entries}
      summary={summary}
      dataError={dataError}
    />
  );
}
