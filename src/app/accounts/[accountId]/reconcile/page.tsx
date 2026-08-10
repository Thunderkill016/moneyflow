import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountReconciliationPageGate } from "@/components/account-reconciliation-page-gate";
import { buildAccountRegister } from "@/lib/account-register";
import { emptyReconciliationImportEvidence } from "@/lib/reconciliation-import-evidence";
import { getAccountsWorkspace } from "@/server/accounts";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import { getReconciliationImportEvidence } from "@/server/reconciliation-import-evidence";
import { getAccountReconciliationState } from "@/server/reconciliation";

export const metadata: Metadata = {
  title: "Đối soát tài khoản — MoneyFlow",
  description: "Đối chiếu sổ MoneyFlow với một kỳ sao kê tài khoản.",
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
  const account =
    accountsWorkspace.accounts.find((item) => item.id === accountId) ?? null;
  const dataError = accountsWorkspace.dataError ?? financeWorkspace.dataError;

  if (!account && !dataError) notFound();

  const entries = account
    ? buildAccountRegister(financeWorkspace.transactions, account.id)
    : [];
  const [reconciliationState, importEvidence] = account
    ? await Promise.all([
        getAccountReconciliationState(account.id, entries),
        getReconciliationImportEvidence(
          entries.map((entry) => entry.transaction.id),
        ),
      ])
    : [
        {
          featureAvailable: false,
          rows: [],
          sessions: [],
          dataError: null,
        },
        emptyReconciliationImportEvidence(),
      ];

  return (
    <AccountReconciliationPageGate
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      account={account}
      registerEntries={entries}
      initialState={reconciliationState}
      importEvidence={importEvidence}
      today={financeWorkspace.today}
      dataError={dataError}
    />
  );
}
