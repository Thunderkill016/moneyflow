import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { safeNextPath } from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Đăng nhập — MoneyFlow" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  return <AuthForm mode="login" next={next} demoMode={!isSupabaseConfigured()} />;
}
