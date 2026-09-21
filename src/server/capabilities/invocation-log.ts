import type { CapabilityAuthorization, CapabilityErrorCode } from "./types.ts";

/*
 * Minimal invocation log (spec: docs/plans/active/624-capability-invocation-audit.md).
 *
 * One JSON line per capability execution — viewer, capability, transport,
 * outcome, duration. Input arguments, output values, tokens and headers are
 * never logged: arguments can carry financial data (e.g. candidates.propose
 * payloads). Server `console` is the platform's log ingestion path, same
 * convention as `[client-error]`.
 */
export type InvocationRecord = {
  event: "capability_invocation";
  capabilityId: string | null;
  version: string | null;
  viewerId: string | null;
  clientId: string | null;
  transport: string;
  authorization: CapabilityAuthorization | null;
  status: "ok" | "error" | "rejected";
  errorCode?: CapabilityErrorCode | string;
  durationMs: number;
};

export type InvocationLogger = (record: InvocationRecord) => void;

/** Emits one JSON line. Must never throw — logging never fails a caller. */
export const emitInvocationLog: InvocationLogger = (record) => {
  try {
    console.info(JSON.stringify(record));
  } catch {
    /* logging must never break the capability path */
  }
};

/**
 * Route-level rejection record for requests refused before execution —
 * unauthenticated, demo or rate-limited callers never reach runCapability.
 * capabilityId is null when the transport cannot know it (e.g. MCP pre-auth).
 */
export function logInvocationRejection(fields: {
  capabilityId?: string | null;
  viewerId?: string | null;
  clientId?: string | null;
  transport: string;
  errorCode: string;
}): void {
  emitInvocationLog({
    event: "capability_invocation",
    capabilityId: fields.capabilityId ?? null,
    version: null,
    viewerId: fields.viewerId ?? null,
    clientId: fields.clientId ?? null,
    transport: fields.transport,
    authorization: null,
    status: "rejected",
    errorCode: fields.errorCode,
    durationMs: 0,
  });
}
