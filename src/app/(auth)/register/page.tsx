import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { ONBOARDING_PATH } from "@/lib/onboarding";

export const metadata: Metadata = {
  title: "Tạo tài khoản — MoneyFlow",
  description:
    "Tạo tài khoản MoneyFlow miễn phí — sổ thu chi cá nhân rõ ràng, không cần mật khẩu ngân hàng.",
  alternates: { canonical: "/register" },
};
export default function Page() {
  return <AuthForm mode="register" next={ONBOARDING_PATH} />;
}
