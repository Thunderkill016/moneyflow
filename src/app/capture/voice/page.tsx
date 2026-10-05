import type { Metadata } from "next";
import { VoiceCapturePage } from "@/components/voice/voice-capture-page";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";

export const metadata: Metadata = {
  title: "Nói để ghi — Capture — Money Flow",
  description:
    "Ghi giao dịch bằng giọng nói tiếng Việt, xử lý hoàn toàn trên máy bạn.",
};

export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

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
