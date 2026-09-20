import { NextResponse } from "next/server";
import { getViewer } from "@/server/auth";
import { runCapability } from "@/server/capabilities/registry";
import { CapabilityError } from "@/server/capabilities/types";
import { buildCapabilityContext } from "@/server/capabilities/context";
import {
  capabilityAnonRateKey,
  capabilityApiLimiter,
  capabilityApiRateKey,
  clientKeyFromHeaders,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Programmatic read access to the capability layer — the same contract the UI
 * consumes, never a second data path.
 *
 * Authentication is uniform with the rest of the app: `Authorization: Bearer
 * <supabase access token>` or a session cookie both resolve through
 * getViewer(), and every downstream loader still runs under that identity's
 * RLS. A caller without either gets 401 + WWW-Authenticate, never the
 * /login redirect a page request would follow and never demo data — the demo
 * viewer is rejected outright because it is not an authenticated identity.
 *
 * Error bodies carry machine codes only: no financial data, no token material,
 * no stack detail. The limiter buckets by viewer id post-auth and by client
 * key pre-auth; it is per-instance best-effort protection (see
 * docs/rate-limit.md).
 */
const NO_STORE = { "cache-control": "no-store" } as const;
const BEARER_CHALLENGE = {
  "www-authenticate": 'Bearer realm="moneyflow-capabilities"',
} as const;

function jsonError(
  status: number,
  code: string,
  extraHeaders?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { error: code },
    { status, headers: { ...NO_STORE, ...extraHeaders } },
  );
}

function throttled(retryAfterMs: number): NextResponse {
  return jsonError(429, "rate_limited", {
    "retry-after": String(Math.max(1, Math.ceil(retryAfterMs / 1000))),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const preAuth = capabilityApiLimiter.check(
    capabilityAnonRateKey(clientKeyFromHeaders(request.headers)),
  );
  if (!preAuth.ok) return throttled(preAuth.retryAfterMs);

  const viewer = await getViewer();
  if (!viewer || viewer.isDemo) {
    return jsonError(401, "unauthorized", BEARER_CHALLENGE);
  }

  const postAuth = capabilityApiLimiter.check(capabilityApiRateKey(viewer.id));
  if (!postAuth.ok) return throttled(postAuth.retryAfterMs);

  let input: unknown = {};
  try {
    input = await request.json();
  } catch {
    return jsonError(400, "invalid_json");
  }

  try {
    const output = await runCapability(id, input, {
      context: buildCapabilityContext(viewer.id),
    });
    return NextResponse.json(output, { headers: NO_STORE });
  } catch (error) {
    console.error(
      "[capability-api]",
      id,
      error instanceof CapabilityError ? error.code : "internal",
    );
    if (error instanceof CapabilityError) {
      if (error.code === "invalid_input") return jsonError(400, "invalid_input");
      if (error.code === "unauthorized") return jsonError(401, "unauthorized", BEARER_CHALLENGE);
      if (error.code === "not_found") return jsonError(404, "not_found");
    }
    return jsonError(500, "internal");
  }
}
