import { redirect } from "next/navigation";

/** Legacy URL retained for bookmarks and old authentication callbacks. */
export default function LegacyInsightsRedirect() {
  redirect("/dashboard");
}
