import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { capabilityDefinitions } from "./manifest.ts";
import {
  capabilityTools,
  executeCapabilityTool,
  mcpToolName,
} from "./mcp.ts";

const root = process.cwd();
const route = readFileSync(join(root, "src/app/api/mcp/route.ts"), "utf8");
const metadataRoute = readFileSync(
  join(root, "src/app/.well-known/oauth-protected-resource/route.ts"),
  "utf8",
);

test("every capability becomes one spec-legal MCP tool", () => {
  const tools = capabilityTools();
  assert.equal(tools.length, capabilityDefinitions.length);
  const names = new Set(tools.map((tool) => tool.name));
  assert.equal(names.size, tools.length);
  for (const tool of tools) {
    assert.match(tool.name, /^[a-zA-Z0-9_-]{1,64}$/);
    assert.equal(tool.name, mcpToolName(tool.capabilityId));
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.ok(tool.description.length > 0);
    assert.ok(tool.inputSchema);
  }
});

test("dotted capability ids map to underscored tool names", () => {
  assert.equal(mcpToolName("ledger.summary"), "ledger_summary");
  assert.equal(mcpToolName("transactions.search"), "transactions_search");
});

/*
 * executeCapabilityTool goes through runCapability's Zod gate before any
 * loader runs, so malformed args and unknown ids are reachable without a
 * database. The happy path still requires injected loaders — covered by the
 * capability suites themselves.
 */
test("tool execution maps malformed args to an isError result", async () => {
  const result = await executeCapabilityTool("viewer-1", "ledger.summary", {
    period: "not-a-period",
  });
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /capability_error:invalid_input/);
});

test("tool execution maps unknown capability to isError", async () => {
  const result = await executeCapabilityTool("viewer-1", "nope.missing", {});
  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /capability_error:not_found/);
});

test("MCP route is stateless, origin-guarded and Bearer-challenged", () => {
  assert.match(route, /sessionIdGenerator: undefined/);
  assert.match(route, /enableJsonResponse: true/);
  assert.match(route, /forbiddenOrigin/);
  assert.match(route, /resource_metadata/);
  assert.match(route, /viewer\.isDemo/);
  assert.match(route, /capabilityTools\(\)/);
  assert.match(route, /export \{ handle as GET, handle as POST, handle as DELETE \}/);
  assert.doesNotMatch(route, /serviceRole|SERVICE_ROLE_KEY/);
});

test("protected-resource metadata advertises the MCP resource and Supabase issuer", () => {
  assert.match(metadataRoute, /resource: `\$\{origin\}\/api\/mcp`/);
  assert.match(metadataRoute, /authorization_servers: \[`\$\{config\.url\}\/auth\/v1`\]/);
  assert.match(metadataRoute, /bearer_methods_supported: \["header"\]/);
  assert.match(metadataRoute, /status: 404/);
});
