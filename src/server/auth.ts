import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { bearerToken } from "@/lib/bearer";
import {
  getBackendProvider,
  getNeonBackendConfig,
} from "@/lib/backend/provider";
import { getNeonAuth, verifyNeonBearerJwt } from "@/lib/neon/server";
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

/*
 * Neon viewer resolution (#774): cookie sessions resolve through the managed
 * auth SDK's getSession (validated upstream + cached), Bearer credentials are
 * verified against the Neon JWKS — the same fail-closed contract as
 * supabase.auth.getClaims(). Data reads go through createClient(), which in
 * Neon mode returns an RLS-scoped PostgREST client carrying the request's
 * data-api JWT.
 */
const getNeonViewer = cache(async (): Promise<Viewer | null> => {
  const bearer = bearerToken((await headers()).get("authorization"));

  let id: string;
  let email: string | null;
  let displayNameMeta: unknown;
  if (bearer) {
    const claims = await verifyNeonBearerJwt(bearer);
    if (!claims?.sub) return null;
    id = String(claims.sub);
    email = typeof claims.email === "string" ? claims.email : null;
    displayNameMeta = claims;
  } else {
    const auth = getNeonAuth();
    if (!auth) return null;
    const { data: session } = await auth.getSession();
    if (!session?.user?.id) return null;
    id = String(session.user.id);
    email = typeof session.user.email === "string" ? session.user.email : null;
    displayNameMeta = session.user;
  }

  const supabase = await createClient();
  if (!supabase) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();

  return {
    id,
    email,
    displayName: resolveDisplayName(
      profile?.full_name,
      displayNameMeta as Record<string, unknown> | undefined,
    ),
    isDemo: false,
    clientId: null, // third-party OAuth client_id is a Supabase-only surface today
  };
});

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (getBackendProvider() === "neon") {
    if (!getNeonBackendConfig()) {
      return {
        id: "demo-user",
        email: null,
        displayName: "Minh Anh",
        isDemo: true,
        clientId: null,
      };
    }
    return getNeonViewer();
  }

  if (!isSupabaseConfigured()) {
    return {
      id: "demo-user",
      email: null,
      displayName: "Minh Anh",
      isDemo: true,
      clientId: null,
    };
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
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .maybeSingle();

  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    displayName: resolveDisplayName(
      profile?.full_name,
      data.claims.user_metadata,
    ),
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
