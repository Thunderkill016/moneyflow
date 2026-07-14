import type { Metadata } from "next";
import { InboxPage } from "@/components/inbox-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Inbox — Money Flow",
  description: "Hộp thư tài chính — duyệt giao dịch trước khi vào sổ.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <InboxPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
