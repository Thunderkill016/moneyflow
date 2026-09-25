import type { Metadata } from "next";
import { CommitmentsPage } from "@/components/planning/commitments-page";
import { requireViewer } from "@/server/auth";
import { getCommitmentsWorkspace } from "@/server/commitments";
import { getPatternDismissedKeys } from "@/server/dismissals";

export const metadata: Metadata = { title: "Khoản định kỳ — MoneyFlow", description: "Theo dõi hóa đơn và khoản chi bắt buộc hàng tháng." };
export default async function Page() { const viewer = await requireViewer(); const [workspace, dismissedPatternKeys] = await Promise.all([getCommitmentsWorkspace(), getPatternDismissedKeys("recurring")]); return <CommitmentsPage viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }} initialCommitments={workspace.commitments} initialDetectionRows={workspace.detectionRows} dismissedPatternKeys={dismissedPatternKeys} accounts={workspace.accounts} categories={workspace.categories} monthStart={workspace.monthStart} today={workspace.today} dataError={workspace.dataError} />; }
