import type { Metadata } from "next";
import { DeleteAccountPage } from "@/components/delete-account-page";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Xóa tài khoản — Money Flow",
  description:
    "Xóa dữ liệu Money Flow trên thiết bị. Gõ XÓA để xác nhận. Thao tác không hoàn tác.",
};

export default async function Page() {
  const viewer = await requireViewer();
  return (
    <DeleteAccountPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
    />
  );
}
