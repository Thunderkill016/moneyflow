import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { ACCOUNT_DELETION_PATH } from "@/lib/account-deletion-reauth";
import { safeNextPath } from "@/lib/auth-redirect";
import { isBackendConfigured } from "@/lib/backend/provider";

export const metadata: Metadata = {
  title: "Đăng nhập — MoneyFlow",
  description: "Đăng nhập MoneyFlow để ghi thu chi, theo dõi ví và ngân sách của bạn.",
  alternates: { canonical: "/login" },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    reauth?: string;
    error?: string;
    reset?: string;
  }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const reauth = params.reauth === "1" && next === ACCOUNT_DELETION_PATH;
  return (
    <AuthForm
      mode="login"
      next={next}
      demoMode={!isBackendConfigured()}
      reauth={reauth}
      authError={params.error}
      resetDone={params.reset === "success"}
    />
  );
}
