import type { Metadata } from "next";
import { VoiceCapturePage } from "@/components/voice/voice-capture-page";
import { requireViewer } from "@/server/auth";
import { getDashboardFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Nói để ghi — Capture — Money Flow",
  description: "Ghi giao dịch bằng giọng nói tiếng Việt, không cần gõ.",
};

export default async function Page() {
  const viewer = await requireViewer();
  // The voice capture UI only writes via addTransaction and never reads the
  // seeded transaction list, so the bounded dashboard scope skips the full
  // ledger and review-feed scans this page never needs.
  const workspace = await getDashboardFinanceWorkspace();

  return (
    <VoiceCapturePage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      workspace={{
        transactions: workspace.transactions,
        accounts: workspace.accounts,
        categories: workspace.categories,
        goals: workspace.goals,
        dataError: workspace.dataError,
      }}
    />
  );
}
