import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Đăng nhập — MoneyFlow",
  description: "Đăng nhập MoneyFlow để ghi thu chi, theo dõi ví và ngân sách của bạn.",
  alternates: { canonical: "/login" },
};

const ACCOUNT_DELETION_PATH = "/settings/delete-account";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reauth?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const reauth = params.reauth === "1" && next === ACCOUNT_DELETION_PATH;
  return (
    <AuthForm
      mode="login"
      next={next}
      demoMode={!isSupabaseConfigured()}
      reauth={reauth}
    />
  );
}
