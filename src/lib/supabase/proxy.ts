import {
  handleAuthRequest,
  handleAuthResponse,
} from "@neondatabase/auth/server";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACCOUNT_DELETION_PATH } from "@/lib/account-deletion-reauth";
import { POST_AUTH_REDIRECT } from "@/lib/auth-redirect";
import {
  getBackendProvider,
  getNeonBackendConfig,
} from "@/lib/backend/provider";
import { getSupabaseConfig } from "@/lib/supabase/config";

const NEON_SESSION_COOKIE = "__Secure-neon-auth.session_token";
const NEON_SESSION_VERIFIER_PARAM = "neon_auth_session_verifier";
const NEON_CHALLENGE_COOKIES = [
  "__Secure-neon-auth.session_challenge",
  // Legacy misspelled challenge cookie the auth server still emits.
  "__Secure-neon-auth.session_challange",
] as const;

/*
 * Managed-auth OAuth return leg (#774): after the provider callback, Neon
 * redirects the browser to callbackURL?neon_auth_session_verifier=… — no
 * session cookie exists yet. The verifier exchanges (together with the
 * session_challenge cookie planted at sign-in/social) against the auth
 * server's /get-session, which returns the real session cookies. Without
 * this exchange every social sign-in lands logged-out.
 */
async function exchangeNeonOAuthVerifier(
  request: NextRequest,
): Promise<NextResponse | null> {
  const verifier = request.nextUrl.searchParams.get(
    NEON_SESSION_VERIFIER_PARAM,
  );
  if (!verifier) return null;
  if (!NEON_CHALLENGE_COOKIES.some((name) => request.cookies.has(name)))
    return null;
  // Same call the SDK's middleware exchange makes: forward the verifier
  // URL + challenge cookie to upstream /get-session, then run the response
  // through handleAuthResponse so the signed session_data cache cookie is
  // minted identically (cookieSecret signs it). Config/network failures
  // fail closed to null — the request continues unauthenticated.
  let res: Response;
  try {
    const config = getNeonBackendConfig();
    if (!config) return null;
    res = await handleAuthResponse(
      await handleAuthRequest(
        config.authBaseUrl,
        new Request(request.url, { method: "GET", headers: request.headers }),
        "get-session",
      ),
      config.authBaseUrl,
      { secret: config.cookieSecret },
    );
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const clean = request.nextUrl.clone();
  clean.searchParams.delete(NEON_SESSION_VERIFIER_PARAM);
  const redirect = NextResponse.redirect(clean);
  for (const cookie of res.headers.getSetCookie())
    redirect.headers.append("set-cookie", cookie);
  return redirect;
}

/** Supabase SSR cookies look like `sb-<ref>-auth-token` (and chunked variants). */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth"),
    );
}

function hasNeonAuthCookie(request: NextRequest): boolean {
  return request.cookies.has(NEON_SESSION_COOKIE);
}

const protectedPaths = [
  "/inbox",
  "/capture",
  "/timeline",
  "/accounts",
  "/categories",
  "/rules",
  "/imports",
  "/dashboard",
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

/**
 * True for Server Action invocations. Mirrors Next's own detection (see
 * getServerActionRequestMetadata): a JS-driven action carries the `next-action`
 * header; the no-JS form fallback posts urlencoded/multipart bodies to the
 * same route.
 */
function isServerActionRequest(request: NextRequest): boolean {
  if (request.method !== "POST") return false;
  if (request.headers.has("next-action")) return true;
  const contentType = request.headers.get("content-type") ?? "";
  return (
    contentType === "application/x-www-form-urlencoded" ||
    contentType.startsWith("multipart/form-data")
  );
}

/** Public marketing / legal — no session refresh when cookies absent (TTFB/LCP). */
const PUBLIC_NO_AUTH_PATHS = ["/", "/landing", "/privacy"] as const;

function isPublicNoAuthPath(path: string): boolean {
  return (PUBLIC_NO_AUTH_PATHS as readonly string[]).some(
    (p) => path === p || (p !== "/" && path.startsWith(`${p}/`)),
  );
}

async function isNeonAuthenticated(request: NextRequest): Promise<boolean> {
  /*
   * Session truth lives upstream: proxy the managed-auth /get-session call
   * with the request's session cookie — the same fail-closed contract as
   * supabase.auth.getClaims(). No session cookie => definitely logged out;
   * upstream error => treated as logged out (RLS still blocks data access).
   */
  const session = request.cookies.get(NEON_SESSION_COOKIE);
  if (!session?.value) return false;
  const authBase = process.env.NEON_AUTH_BASE_URL?.trim().replace(/\/+$/, "");
  if (!authBase) return false;
  try {
    const res = await fetch(`${authBase}/get-session`, {
      headers: { cookie: `${NEON_SESSION_COOKIE}=${session.value}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      session?: unknown;
      user?: { id?: string };
    };
    return Boolean(data?.session && data.user?.id);
  } catch {
    return false;
  }
}

export async function updateSession(request: NextRequest) {
  const neon = getBackendProvider() === "neon";
  const config = neon ? null : getSupabaseConfig();
  if (!neon && !config) return NextResponse.next({ request });
  if (neon && !process.env.NEON_AUTH_BASE_URL) {
    return NextResponse.next({ request });
  }

  const path = request.nextUrl.pathname;

  // OAuth return leg must run before every cookie check — no session cookie
  // exists yet, the verifier exchange is what mints it.
  if (neon) {
    const oauthExchange = await exchangeNeonOAuthVerifier(request);
    if (oauthExchange) return oauthExchange;
  }

  // LCP/TTFB: public pages without session cookies skip auth getClaims.
  const hasAuthCookie = neon
    ? hasNeonAuthCookie(request)
    : hasSupabaseAuthCookie(request);
  if (isPublicNoAuthPath(path) && !hasAuthCookie) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  let isAuthenticated: boolean;
  if (neon) {
    isAuthenticated = await isNeonAuthenticated(request);
  } else {
    const supabase = createServerClient(config!.url, config!.publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, cacheHeaders) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
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
    isAuthenticated = Boolean(data?.claims?.sub);
  }
  const needsAuth = protectedPaths.some(
    (protectedPath) =>
      path === protectedPath || path.startsWith(`${protectedPath}/`),
  );

  /*
   * A logged-out tab submitting a Server Action must not be bounced to /login
   * here: the redirect would fail the action opaquely (the 2-tab logout race —
   * the form's draft never gets its honest error). Let the request reach the
   * action so requireActionViewer() can return the structured auth-required
   * failure the UI surfaces with the draft intact. Every action gates on the
   * viewer before touching the database, so nothing leaks past this.
   */
  if (needsAuth && !isAuthenticated && !isServerActionRequest(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  const accountDeletionReauth =
    path === "/login" &&
    request.nextUrl.searchParams.get("reauth") === "1" &&
    request.nextUrl.searchParams.get("next") === ACCOUNT_DELETION_PATH;

  // Logged-in users normally leave auth screens. The one exception is explicit
  // account-deletion step-up, which must be able to create a fresh Auth session.
  if (
    isAuthenticated &&
    (authPaths.includes(path) || path === "/") &&
    !accountDeletionReauth
  ) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = POST_AUTH_REDIRECT;
    homeUrl.search = "";
    return NextResponse.redirect(homeUrl);
  }

  return response;
}
