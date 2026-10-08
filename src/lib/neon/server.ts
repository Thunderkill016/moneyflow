import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createNeonAuth } from "@neondatabase/auth/next/server";
import { getNeonBackendConfig } from "@/lib/backend/provider";
import { verifyNeonJwtClaims } from "@/lib/neon/jwt";

/**
 * Neon backend seam for the migration PoC (#774). All Neon-specific wiring
 * lives behind this module + the provider flag in lib/backend/provider.ts;
 * the Supabase path stays untouched.
 *
 * Session cookie written by the managed-auth handler/SDK.
 * `__Secure-` prefix is fixed by @neondatabase/auth (always Secure).
 */
const NEON_SESSION_COOKIE = "__Secure-neon-auth.session_token";

type NeonAuthInstance = ReturnType<typeof createNeonAuth>;

let cachedAuth: NeonAuthInstance | null | undefined;

/** Managed Better Auth server SDK instance (null in demo mode). */
export function getNeonAuth(): NeonAuthInstance | null {
  if (cachedAuth !== undefined) return cachedAuth;
  const config = getNeonBackendConfig();
  cachedAuth = config
    ? createNeonAuth({
        baseUrl: config.authBaseUrl,
        cookies: { secret: config.cookieSecret },
      })
    : null;
  return cachedAuth;
}

/**
 * Per-request Data API JWT. Managed Better Auth issues the PostgREST-bound
 * token through the `set-auth-jwt` response header on /get-session — the same
 * exchange the official SDK's auth handler proxies back to browsers. Cached
 * per render so every loader on one request shares a single upstream call.
 */
export const getNeonSessionJwt = cache(async (): Promise<string | null> => {
  const config = getNeonBackendConfig();
  if (!config) return null;
  const session = (await cookies()).get(NEON_SESSION_COOKIE);
  if (!session?.value) return null;

  const res = await fetch(`${config.authBaseUrl}/get-session`, {
    headers: { cookie: `${NEON_SESSION_COOKIE}=${session.value}` },
    cache: "no-store",
  });
  return res.headers.get("set-auth-jwt");
});

/**
 * Verify a caller-supplied Bearer JWT (MCP/API path) against the managed
 * auth JWKS. Mirrors supabase's getClaims() contract: returns claims on a
 * valid token, null on any failure — callers decide how to fail closed.
 */
export async function verifyNeonBearerJwt(token: string) {
  const config = getNeonBackendConfig();
  if (!config) return null;
  // Managed Auth signs with iss == aud == the auth service origin (verified on
  // polished-pine-75721729). Pinning both keeps a token minted for another
  // service sharing this project's keys from ever resolving a viewer.
  const authOrigin = new URL(config.authBaseUrl).origin;
  return verifyNeonJwtClaims(token, {
    jwksUrl: config.jwksUrl,
    issuer: authOrigin,
    audience: authOrigin,
  });
}
