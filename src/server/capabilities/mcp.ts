import { capabilityDefinitions } from "./manifest.ts";
import { runCapability } from "./registry.ts";
import { buildCapabilityContext, CapabilityError } from "./types.ts";

export const MCP_SERVER_NAME = "moneyflow";
export const MCP_SERVER_VERSION = "1.0.0";

/*
 * Tool names must match the spec's `^[a-zA-Z0-9_-]{1,64}$` — dotted capability
 * ids map to underscores. The mapping is deterministic and total, so the tool
 * catalog is always the registry: adding a capability adds a tool with no
 * transport code change.
 */
export function mcpToolName(capabilityId: string): string {
  return capabilityId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function capabilityTools() {
  return capabilityDefinitions.map((capability) => ({
    name: mcpToolName(capability.id),
    capabilityId: capability.id,
    title: capability.title,
    description: capability.description,
    inputSchema: capability.input,
    annotations: {
      title: capability.title,
      readOnlyHint: capability.authorization === "read",
      idempotentHint: capability.idempotent,
      destructiveHint: false,
      openWorldHint: false,
    },
  }));
}

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/*
 * Executes one capability for a viewer that was already authenticated by the
 * transport. The viewer is closed over at registration time — a tool can
 * never reach another tenant's rows because loaders still resolve identity
 * through the request-scoped auth seam (RLS), not through args.
 */
export async function executeCapabilityTool(
  viewer: { id: string; clientId: string | null },
  capabilityId: string,
  args: unknown,
): Promise<ToolResult> {
  try {
    const output = await runCapability(capabilityId, args, {
      context: buildCapabilityContext(viewer.id, { clientId: viewer.clientId }),
      transport: "mcp",
    });
    return {
      content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
      structuredContent: output as Record<string, unknown>,
    };
  } catch (error) {
    const code = error instanceof CapabilityError ? error.code : "internal";
    return {
      isError: true,
      content: [{ type: "text", text: `capability_error:${code}` }],
    };
  }
}
