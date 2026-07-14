import type { Metadata } from "next";
import { ImportsPage } from "@/components/imports-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Lịch sử import — Money Flow",
  description: "Xem các lượt import sao kê, mở preview và xóa meta raw.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <ImportsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
