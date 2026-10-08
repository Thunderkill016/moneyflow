import { NextResponse } from "next/server";
import { getBackendProvider } from "@/lib/backend/provider";
import { getNeonAuth } from "@/lib/neon/server";

/*
 * Managed Neon Auth proxy (#774): the official SDK's handler forwards auth
 * traffic (sign-in/up, OAuth callbacks, get-session with the set-auth-jwt
 * header) between this app and the managed auth server. Only mounted when
 * MF_BACKEND_PROVIDER=neon — the Supabase path owns no /api/auth surface.
 */
function disabled() {
  return NextResponse.json({ error: "not-found" }, { status: 404 });
}

function handler() {
  if (getBackendProvider() !== "neon") return null;
  return getNeonAuth()?.handler() ?? null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const h = handler();
  return h ? h.GET(request, context) : disabled();
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const h = handler();
  return h ? h.POST(request, context) : disabled();
}
