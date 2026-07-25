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

/** Supabase SSR cookies look like `sb-<ref>-auth-token` (and chunked variants). */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth"));
}

/** Public marketing / legal — no session refresh when cookies absent (TTFB/LCP). */
const PUBLIC_NO_AUTH_PATHS = ["/", "/landing", "/privacy"] as const;

function isPublicNoAuthPath(path: string): boolean {
  return (PUBLIC_NO_AUTH_PATHS as readonly string[]).some(
    (p) => path === p || (p !== "/" && path.startsWith(`${p}/`)),
  );
}

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  // LCP/TTFB: public pages without session cookies skip auth getClaims.
  if (isPublicNoAuthPath(path) && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(cacheHeaders).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const needsAuth = protectedPaths.some(
    (protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`),
  );

  if (needsAuth && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // Logged-in: auth screens + public `/` → Tổng quan (POST_AUTH_REDIRECT)
  if (isAuthenticated && (authPaths.includes(path) || path === "/")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = POST_AUTH_REDIRECT;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
