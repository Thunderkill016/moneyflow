import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createUserTokenClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { bearerToken } from "@/lib/bearer";
import {
  getBackendProvider,
  getNeonBackendConfig,
} from "@/lib/backend/provider";
import { getNeonSessionJwt } from "@/lib/neon/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

/*
 * Neon Data API is PostgREST-compatible: a supabase-js client pointed at the
 * Data API URL with `Authorization: Bearer <neon jwt>` exercises the exact
 * same `.from()`/`.rpc()` surface every loader already uses, with RLS enforced
 * by the JWT's claims (verified in the PoC). The key argument is unused by
 * Neon — the Bearer header carries auth — so a fixed placeholder is passed.
 */
async function createNeonDataClient() {
  const config = getNeonBackendConfig();
  if (!config) return null;

  const headerStore = await headers();
  const bearer = bearerToken(headerStore.get("authorization"));
  const jwt = bearer ?? (await getNeonSessionJwt());
  if (!jwt) return null;

  return createUserTokenClient(config.dataApiUrl, "neon-data-api", {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

export async function createClient() {
  if (getBackendProvider() === "neon") return createNeonDataClient();

  const config = getSupabaseConfig();
  if (!config) return null;

  /*
   * A request carrying `Authorization: Bearer <jwt>` is authenticated by that
   * token — the user's own Supabase access token. Honoring it at this seam
   * keeps one auth/data path: every loader calling createClient() gets a
   * PostgREST client that still enforces RLS under the token's identity, the
   * same pattern the delete-account Edge Function uses. There is no
   * service-role or cookie-less data path.
   */
  const headerStore = await headers();
  const token = bearerToken(headerStore.get("authorization"));
  if (token) {
    return createUserTokenClient(config.url, config.publishableKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies. Proxy refreshes them.
        }
      },
    },
  });
}
