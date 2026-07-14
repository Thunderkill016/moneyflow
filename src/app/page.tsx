import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import { getViewer } from "@/server/auth";

/**
 * Public home: landing when logged out.
 * Logged-in (and demo) users → Tổng quan thu chi (`/insights`).
 */
export default async function Home() {
  const viewer = await getViewer();
  if (viewer) {
    redirect(POST_AUTH_REDIRECT);
  }
  return <LandingPage />;
}
