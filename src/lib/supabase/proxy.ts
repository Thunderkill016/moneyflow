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

export async function updateSession(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  const path = request.nextUrl.pathname;

  // TASK-132 LCP: public marketing `/` with no session cookies skips auth getClaims.
  if (path === "/" && !hasSupabaseAuthCookie(request)) {
    return NextResponse.next({ request });
  }

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
