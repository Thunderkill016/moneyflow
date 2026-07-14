import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { ONBOARDING_PATH } from "@/lib/onboarding";

export const metadata: Metadata = { title: "Tạo tài khoản — MoneyFlow" };
export default function Page() {
  return <AuthForm mode="register" next={ONBOARDING_PATH} />;
}
