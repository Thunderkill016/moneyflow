import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Đăng nhập — MoneyFlow" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  return <AuthForm mode="login" next={next} demoMode={!isSupabaseConfigured()} />;
}
