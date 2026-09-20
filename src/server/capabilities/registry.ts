import { capabilityDefinitions } from "./manifest.ts";
import { CapabilityError } from "./types.ts";

import type { CapabilityContext, CapabilityDeps } from "./types.ts";

export const capabilities = capabilityDefinitions;

export function getCapability(id: string) {
  return capabilities.find((capability) => capability.id === id);
}

export async function runCapability(
  id: string,
  rawInput: unknown,
  options: { context?: CapabilityContext; deps?: CapabilityDeps } = {},
) {
  const capability = getCapability(id);
  if (!capability) throw new CapabilityError("not_found", `Unknown capability: ${id}`);

  let input;
  try {
    input = capability.input.parse(rawInput);
  } catch {
    throw new CapabilityError("invalid_input", `Invalid input for ${id}`);
  }

  const context =
    options.context ??
    await (await import("./context.ts")).createCapabilityContext();
  let output;
  try {
    const run = capability.run as (
      ctx: CapabilityContext,
      input: unknown,
      deps?: CapabilityDeps,
    ) => Promise<unknown>;
    output = await run(context, input, options.deps);
  } catch (error) {
    if (error instanceof CapabilityError) throw error;
    throw new CapabilityError("internal", `Capability ${id} failed`, { cause: error });
  }

  try {
    return capability.output.parse(output);
  } catch (error) {
    throw new CapabilityError("internal", `Capability ${id} returned invalid output`, { cause: error });
  }
}

export function describeCapabilities() {
  return {
    schemaVersion: 1,
    generatedFrom: "src/server/capabilities/registry.ts",
    capabilities: capabilities.map((capability) => ({
      id: capability.id,
      version: capability.version,
      title: capability.title,
      description: capability.description,
      authorization: capability.authorization,
      sideEffects: capability.sideEffects,
      idempotent: capability.idempotent,
      inputSchema: capability.input.toJSONSchema(),
      outputSchema: capability.output.toJSONSchema(),
    })),
  };
}
