import { capabilityDefinitions } from "./manifest.ts";
import { CapabilityError } from "./types.ts";

import type { CapabilityContext, CapabilityDeps } from "./types.ts";

export const capabilities = capabilityDefinitions;

export { describeCapabilityManifest as describeCapabilities } from "./manifest.ts";

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
