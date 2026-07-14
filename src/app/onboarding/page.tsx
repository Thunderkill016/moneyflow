import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding-flow";
import type { AccountSummary } from "@/lib/accounts";
import { findCashWallet } from "@/lib/onboarding";
import { getAccountsWorkspace } from "@/server/accounts";
import { getViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Bắt đầu — MoneyFlow",
  description:
    "Cam kết quyền riêng tư, xác nhận ví tiền mặt, và tùy chọn ghi chi tiêu đầu tiên.",
};

export default async function OnboardingPage() {
  const viewer = await getViewer();
  let initialCash: Pick<
    AccountSummary,
    "id" | "name" | "kind" | "initialBalance" | "isArchived"
  > | null = null;
  let isDemo = true;

  if (viewer) {
    isDemo = viewer.isDemo;
    const workspace = await getAccountsWorkspace();
    const cash = findCashWallet(workspace.accounts);
    if (cash && cash.kind === "cash") {
      initialCash = {
        id: cash.id,
        name: cash.name,
        kind: "cash",
        initialBalance: typeof cash.initialBalance === "number" ? cash.initialBalance : 0,
        isArchived: Boolean(cash.isArchived),
      };
    }
  }

  return <OnboardingFlow initialCash={initialCash} isDemo={isDemo} />;
}
