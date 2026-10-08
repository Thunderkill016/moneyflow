import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Đặt mật khẩu mới — MoneyFlow" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  // Managed-auth reset links land here with ?token=…; Supabase ignores it.
  const { token } = await searchParams;
  return <AuthForm mode="update" resetToken={token ?? ""} />;
}
