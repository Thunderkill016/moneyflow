"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";

/*
 * OAuth 2.1 consent decisions — the app-side half of the Supabase
 * authorization-code flow. Supabase validates the request, we verify the
 * signed-in viewer and record the user's choice; Supabase then mints the
 * authorization code. The returned redirect_url points at the *client's*
 * registered redirect URI (e.g. an MCP client's localhost callback), which
 * is why it is safe to send the browser to an external address here.
 */
const authorizationIdSchema = z.string().min(1).max(200);

function consentErrorPath(authorizationId: string): string {
  return `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&error=consent_failed`;
}

async function decide(
  formData: FormData,
  decision: "approve" | "deny",
): Promise<never> {
  const parsed = authorizationIdSchema.safeParse(
    formData.get("authorization_id"),
  );
  if (!parsed.success) redirect("/");

  const authorizationId = parsed.data;
  const viewer = await getViewer();
  if (!viewer || viewer.isDemo) redirect("/login");

  const supabase = await createClient();
  if (!supabase) redirect("/");

  const api =
    decision === "approve"
      ? supabase.auth.oauth.approveAuthorization
      : supabase.auth.oauth.denyAuthorization;
  const { data, error } = await api.call(supabase.auth.oauth, authorizationId, {
    skipBrowserRedirect: true,
  });

  if (error || !data?.redirect_url) {
    redirect(consentErrorPath(authorizationId));
  }
  redirect(data.redirect_url);
}

export async function approveOAuthAuthorization(
  formData: FormData,
): Promise<void> {
  await decide(formData, "approve");
}

export async function denyOAuthAuthorization(
  formData: FormData,
): Promise<void> {
  await decide(formData, "deny");
}
