import type { Metadata } from "next";
import { TimelineWorkspace } from "@/components/transactions/timeline-workspace";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import styles from "./timeline-review-boundary.module.css";

export const metadata: Metadata = {
  title: "Dòng thời gian — Money Flow",
  description: "Giao dịch đã duyệt — dòng thời gian tin cậy cho số dư và insights.",
};

/**
 * Timeline (wireframes-inbox §16): a read-only approved ledger boundary.
 * Ledger-quality mutation controls stay exclusively on `/transactions`.
 */
export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <div className={styles.boundary}>
      <TimelineWorkspace
        viewer={{
          email: viewer.email,
          displayName: viewer.displayName,
          isDemo: viewer.isDemo,
        }}
        workspace={workspace}
      />
    </div>
  );
}
