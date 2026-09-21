import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getViewer } from "@/server/auth";
import {
  capabilityTools,
  executeCapabilityTool,
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
} from "@/server/capabilities/mcp";
import { logInvocationRejection } from "@/server/capabilities/invocation-log";
import {
  capabilityAnonRateKey,
  capabilityApiLimiter,
  capabilityApiRateKey,
  clientKeyFromHeaders,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Model Context Protocol endpoint — Streamable HTTP, stateless.
 *
 * Stateless (`sessionIdGenerator: undefined`) is required on serverless:
 * consecutive requests land on different instances, so no session state can
 * exist. A fresh McpServer is built per request with the authenticated
 * viewer closed over every tool — there is no code path where one caller's
 * tool invocation can read another tenant's rows.
 *
 * Auth is the same seam as the REST transport: Bearer <supabase JWT> or a
 * session cookie resolves through getViewer(); every loader keeps enforcing
 * RLS under that identity. Unauthenticated callers get 401 +
 * WWW-Authenticate pointing at the RFC 9728 protected-resource document.
 *
 * Per the Streamable HTTP spec, Origin is validated on browser-sent requests
 * to prevent DNS rebinding: absent Origin (non-browser agents) is fine, a
 * present-but-foreign Origin is refused with 403.
 */
const NO_STORE = { "cache-control": "no-store" } as const;

function jsonError(
  status: number,
  code: string,
  extraHeaders?: Record<string, string>,
): Response {
  return Response.json(
    { error: code },
    { status, headers: { ...NO_STORE, ...extraHeaders } },
  );
}

function bearerChallenge(request: Request): Record<string, string> {
  const origin = new URL(request.url).origin;
  return {
    "www-authenticate": `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
  };
}

function forbiddenOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

async function handle(request: Request): Promise<Response> {
  if (forbiddenOrigin(request)) {
    logInvocationRejection({ transport: "mcp", errorCode: "forbidden_origin" });
    return jsonError(403, "forbidden_origin");
  }

  const preAuth = capabilityApiLimiter.check(
    capabilityAnonRateKey(clientKeyFromHeaders(request.headers)),
  );
  if (!preAuth.ok) {
    logInvocationRejection({ transport: "mcp", errorCode: "rate_limited" });
    return jsonError(429, "rate_limited", {
      "retry-after": String(Math.max(1, Math.ceil(preAuth.retryAfterMs / 1000))),
    });
  }

  const viewer = await getViewer();
  if (!viewer || viewer.isDemo) {
    logInvocationRejection({ transport: "mcp", errorCode: "unauthorized" });
    return jsonError(401, "unauthorized", bearerChallenge(request));
  }

  const postAuth = capabilityApiLimiter.check(capabilityApiRateKey(viewer.id));
  if (!postAuth.ok) {
    logInvocationRejection({
      viewerId: viewer.id,
      transport: "mcp",
      errorCode: "rate_limited",
    });
    return jsonError(429, "rate_limited", {
      "retry-after": String(Math.max(1, Math.ceil(postAuth.retryAfterMs / 1000))),
    });
  }

  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });
  for (const tool of capabilityTools()) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      (args: unknown) => executeCapabilityTool(viewer, tool.capabilityId, args),
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as GET, handle as POST, handle as DELETE };
