import { capabilityDefinitions } from "./manifest.ts";
import {
  capabilityWriteLimiter,
  capabilityWriteRateKey,
} from "../../lib/rate-limit.ts";
import { isWriteClientAllowed } from "./write-policy.ts";
import { emitInvocationLog } from "./invocation-log.ts";
import { CapabilityError } from "./types.ts";

import type { InvocationLogger } from "./invocation-log.ts";
import type {
  CapabilityContext,
  CapabilityDeps,
  CapabilityErrorCode,
} from "./types.ts";

export const capabilities = capabilityDefinitions;

export { describeCapabilityManifest as describeCapabilities } from "./manifest.ts";

export function getCapability(id: string) {
  return capabilities.find((capability) => capability.id === id);
}

export async function runCapability(
  id: string,
  rawInput: unknown,
  options: {
    context?: CapabilityContext;
    deps?: CapabilityDeps;
    transport?: string;
    onInvocation?: InvocationLogger;
  } = {},
) {
  /*
   * Every execution emits exactly one invocation record (624 spec S1) —
   * success and failure alike, identified by the same fields on both
   * transports. Arguments and outputs never enter the record.
   */
  const startedAt = Date.now();
  const emit = options.onInvocation ?? emitInvocationLog;
  const transport = options.transport ?? "unknown";
  const capability = getCapability(id);
  let context: CapabilityContext | undefined;
  let status: "ok" | "error" = "ok";
  let errorCode: CapabilityErrorCode | undefined;

  try {
    if (!capability) {
      throw new CapabilityError("not_found", `Unknown capability: ${id}`);
    }

    let input;
    try {
      input = capability.input.parse(rawInput);
    } catch {
      throw new CapabilityError("invalid_input", `Invalid input for ${id}`);
    }

    context =
      options.context ??
      (await (await import("./context.ts")).createCapabilityContext());

    /*
     * Write gate (617 spec): applies to every transport uniformly. Third-party
     * OAuth clients need an explicit allowlist entry; first-party callers pass.
     * Write calls carry their own tighter limiter on top of transport limits.
     */
    if (capability.authorization !== "read") {
      if (!isWriteClientAllowed(context.clientId)) {
        throw new CapabilityError(
          "forbidden",
          `Capability ${id} is not allowed for this client`,
        );
      }
      const write = capabilityWriteLimiter.check(
        capabilityWriteRateKey(context.viewerId, context.clientId),
      );
      if (!write.ok) {
        throw new CapabilityError("rate_limited", `Capability ${id} rate limited`, {
          retryAfterMs: write.retryAfterMs,
        });
      }
    }

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
  } catch (error) {
    status = "error";
    errorCode = error instanceof CapabilityError ? error.code : "internal";
    throw error;
  } finally {
    try {
      emit({
        event: "capability_invocation",
        capabilityId: id,
        version: capability?.version ?? null,
        viewerId: context?.viewerId ?? options.context?.viewerId ?? null,
        clientId: context?.clientId ?? options.context?.clientId ?? null,
        transport,
        authorization: capability?.authorization ?? null,
        status,
        errorCode,
        durationMs: Date.now() - startedAt,
      });
    } catch {
      /* logging must never break the capability path */
    }
  }
}
