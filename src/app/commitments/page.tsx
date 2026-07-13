import type { Metadata } from "next";
import { CommitmentsPage } from "@/components/commitments-page";
import { requireViewer } from "@/server/auth";
import { getCommitmentsWorkspace } from "@/server/commitments";

export const metadata: Metadata = { title: "Khoản định kỳ — MoneyFlow", description: "Theo dõi hóa đơn và khoản chi bắt buộc hàng tháng." };
export default async function Page() { const viewer = await requireViewer(); const workspace = await getCommitmentsWorkspace(); return <CommitmentsPage viewer={{ email: viewer.email, displayName: viewer.displayName, isDemo: viewer.isDemo }} initialCommitments={workspace.commitments} accounts={workspace.accounts} categories={workspace.categories} monthStart={workspace.monthStart} today={workspace.today} dataError={workspace.dataError} />; }
