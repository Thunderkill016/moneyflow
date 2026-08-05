import type { Metadata } from "next";
import { TransactionsWorkspace } from "@/components/transactions/transactions-workspace";
import { requireViewer } from "@/server/auth";
import { getFinanceWorkspace } from "@/server/finance";
import styles from "./timeline-review-boundary.module.css";

export const metadata: Metadata = {
  title: "Dòng thời gian — Money Flow",
  description: "Giao dịch đã duyệt — dòng thời gian tin cậy cho số dư và insights.",
};

/**
 * Timeline (wireframes-inbox §16): approved ledger list with “đã duyệt” copy.
 * Reuses the Phase 5 ledger workspace while forcing the reviewed-only filter
 * and hiding ledger-quality mutation controls that belong to `/transactions`.
 */
export default async function Page() {
  const viewer = await requireViewer();
  const workspace = await getFinanceWorkspace();

  return (
    <div className={styles.boundary}>
      <TransactionsWorkspace
        viewer={{
          email: viewer.email,
          displayName: viewer.displayName,
          isDemo: viewer.isDemo,
        }}
        workspace={workspace}
        variant="timeline"
        initialReview="reviewed"
      />
    </div>
  );
}
