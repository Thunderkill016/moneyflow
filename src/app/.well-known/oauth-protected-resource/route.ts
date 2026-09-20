import { getSupabaseConfig } from "@/lib/supabase/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * RFC 9728 Protected Resource Metadata for the MCP endpoint.
 *
 * MCP clients discover the authorization server through this document before
 * starting an OAuth flow. The authorization server is Supabase Auth — its
 * OAuth 2.1 issuer endpoints live under `<project>/auth/v1`. The `resource`
 * value is the MCP endpoint URL itself, so clients bind tokens to this
 * resource (RFC 8707 audience).
 *
 * Public by design: the document contains endpoint URLs only, no user data.
 * Absent Supabase configuration (demo mode) there is no authorization server
 * to point at, so the document is withheld rather than fabricated.
 */
export function GET(request: Request): Response {
  const config = getSupabaseConfig();
  if (!config) return new Response(null, { status: 404 });

  const origin = new URL(request.url).origin;
  return Response.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [`${config.url}/auth/v1`],
      bearer_methods_supported: ["header"],
      scopes_supported: [],
    },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}
