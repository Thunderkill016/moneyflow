import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import { getSupabaseConfig } from "@/lib/supabase/config";

const protectedPaths = [
  "/inbox",
  "/capture",
  "/timeline",
  "/accounts",
  "/categories",
  "/rules",
  "/imports",
  "/insights",
  "/settings",
  "/transactions",
  "/budgets",
  "/commitments",
  "/income-templates",
  "/goals",
  "/reports",
];
const authPaths = ["/login", "/register", "/forgot-password"];

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;
  const needsAuth = protectedPaths.some(
    (protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`),
  );

  if (needsAuth && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && authPaths.includes(path)) {
    // Thu chi home: see lib/auth-redirect.ts (POST_AUTH_REDIRECT = /insights)
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = POST_AUTH_REDIRECT;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
