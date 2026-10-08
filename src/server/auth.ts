import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { bearerToken } from "@/lib/bearer";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveDisplayName } from "@/lib/profile";

export type Viewer = {
  id: string;
  email: string | null;
  displayName: string | null;
  isDemo: boolean;
  /**
   * OAuth client id from the token's `client_id` claim (third-party grant);
   * null for first-party cookie/session callers and demo.
   */
  clientId: string | null;
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) {
    return { id: "demo-user", email: null, displayName: "Minh Anh", isDemo: true, clientId: null };
  }

  const supabase = await createClient();
  if (!supabase) return null;
  /*
   * A Bearer credential identifies the caller by itself — verify the token it
   * carried rather than trusting a stored session. Without one, getClaims()
   * falls back to the cookie session on the same client.
   */
  const bearer = bearerToken((await headers()).get("authorization"));
  const { data, error } = bearer
    ? await supabase.auth.getClaims(bearer)
    : await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const id = String(data.claims.sub);
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();

  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    displayName: resolveDisplayName(profile?.full_name, data.claims.user_metadata),
    isDemo: false,
    clientId:
      typeof data.claims.client_id === "string" ? data.claims.client_id : null,
  };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/**
 * Stable machine reason for Server Action failures caused by a missing
 * session. The UI maps it to the "session ended" notice instead of a generic
 * error; drafts stay untouched either way.
 */
export const AUTH_REQUIRED_CODE = "auth-required";

export const AUTH_REQUIRED_MESSAGE =
  "Phiên đăng nhập đã hết hạn hoặc đã đăng xuất ở tab khác. Nội dung bạn đã nhập vẫn còn — đăng nhập lại để tiếp tục.";

/**
 * Action-context viewer. Pages keep redirecting through requireViewer(), but a
 * Server Action must never redirect on a missing session: the middleware lets
 * unauthenticated action requests through (see isServerActionRequest in
 * lib/supabase/proxy.ts) so the action can return a structured auth failure
 * the UI surfaces with the draft intact. Bouncing to /login here would drop
 * the in-progress form silently — the 2-tab logout race.
 */
export async function requireActionViewer(): Promise<Viewer | null> {
  return getViewer();
}

export function authRequiredFailure(): {
  ok: false;
  code: string;
  message: string;
} {
  return {
    ok: false,
    code: AUTH_REQUIRED_CODE,
    message: AUTH_REQUIRED_MESSAGE,
  };
}
