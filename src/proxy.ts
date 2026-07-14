import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  // PWA share_target POSTs multipart to /capture/share — rewrite before auth
  // so the body is not lost on a login redirect (TASK-021).
  if (
    request.method === "POST" &&
    request.nextUrl.pathname === "/capture/share"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/api/share-target";
    return NextResponse.rewrite(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
