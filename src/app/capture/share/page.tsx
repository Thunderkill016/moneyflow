import type { Metadata } from "next";
import { Suspense } from "react";
import { CaptureSharePage } from "@/components/inbox/capture-share-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Nhận chia sẻ — Capture — Money Flow",
  description:
    "Nhận text hoặc file từ Share sheet (PWA), xếp ứng viên vào Inbox để duyệt.",
};

function ShareFallback() {
  return (
    <main
      className="route-loading capture-route-loading"
      aria-label="Đang tải nhận chia sẻ"
      aria-busy="true"
    >
      <div className="loading-line wide" />
      <div className="loading-line" />
      <div className="capture-skeleton-block">
        <div className="capture-skeleton-row">
          <span className="loading-line capture-skel-label" />
          <span className="loading-line capture-skel-desc" />
        </div>
      </div>
    </main>
  );
}

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <Suspense fallback={<ShareFallback />}>
      <CaptureSharePage
        viewer={{
          email: viewer.email,
          displayName: viewer.displayName,
          isDemo: viewer.isDemo,
        }}
      />
    </Suspense>
  );
}
