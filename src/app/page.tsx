import { redirect } from "next/navigation";
import "./landing-refresh.css";
import { LandingPage } from "@/components/landing-page";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Public home: static landing when Supabase is configured (logged-out).
 * Demo (no Supabase) → /insights. Authenticated users redirected in proxy
 * (skip RSC viewer fetch for better LCP — TASK-132).
 */
export default function Home() {
  if (!isSupabaseConfigured()) {
    redirect(POST_AUTH_REDIRECT);
  }
  return <LandingPage />;
}
