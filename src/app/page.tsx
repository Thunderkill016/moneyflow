import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getViewer } from "@/server/auth";

/**
 * Public home: landing when logged out.
 * Logged-in (and demo) users go Inbox-first — wireframes §17 demote dashboard.
 */
export default async function Home() {
  const viewer = await getViewer();
  if (viewer) {
    redirect("/inbox");
  }
  return <LandingPage />;
}
