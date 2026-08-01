import { NextResponse, type NextRequest } from "next/server";
import { declaredShareRequestTooLarge } from "@/lib/inbox/share-target-security";
import { getLegacySiteHosts, getSiteOrigin, isLegacySiteHost } from "@/lib/site-url";
import { updateSession } from "@/lib/supabase/proxy";

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) {
      response.cookies.set(cookie.name, "", {
        path: "/",
        expires: new Date(0),
        maxAge: 0,
        secure: true,
        sameSite: "lax",
      });
    }
  }
}

function redirectLegacyDomain(request: NextRequest): NextResponse | null {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (!isLegacySiteHost(host, getLegacySiteHosts())) return null;

  const destination = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    getSiteOrigin(),
  );
  const status = request.method === "GET" || request.method === "HEAD" ? 308 : 303;
  const response = NextResponse.redirect(destination, status);
  clearSupabaseAuthCookies(request, response);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function sharePayloadTooLarge() {
  return new NextResponse("Nội dung chia sẻ vượt quá giới hạn cho phép.", {
    status: 413,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function proxy(request: NextRequest) {
  // Retired hostnames are deployment configuration, not application constants.
  // Clear their isolated auth cookies before moving the request to the configured site origin.
  const canonicalRedirect = redirectLegacyDomain(request);
  if (canonicalRedirect) return canonicalRedirect;

  // PWA share_target POSTs multipart to /capture/share — reject declared
  // oversized bodies before invoking the Node multipart parser, then rewrite
  // before auth so the body is not lost on a login redirect (TASK-021).
  if (
    request.method === "POST" &&
    request.nextUrl.pathname === "/capture/share"
  ) {
    if (declaredShareRequestTooLarge(request.headers.get("content-length"))) {
      return sharePayloadTooLarge();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/api/share-target";
    return NextResponse.rewrite(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
