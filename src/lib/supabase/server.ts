import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createUserTokenClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { bearerToken } from "@/lib/bearer";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function createClient() {
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
