import type { Metadata } from "next";
import { PrivacyPolicyPage } from "@/components/privacy-policy-page";

export const metadata: Metadata = {
  title: "Quyền riêng tư — MoneyFlow",
  description:
    "Chính sách quyền riêng tư MoneyFlow: dữ liệu thu thập, không mật khẩu ngân hàng, RLS, lưu trữ, xuất/xóa, liên hệ.",
};

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
