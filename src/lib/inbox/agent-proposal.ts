/*
 * Agent-proposed candidate identity (617 spec).
 *
 * `candidates.propose` writes proposals as ordinary inbox candidates with
 * `source = "agent"`. The proposing OAuth client rides inside
 * `source_external_id` under the same `|` namespace convention source
 * observations already use (`mf-src-v1|…`):
 *
 *   agent|<clientId|first-party>|<idempotencyKey>
 *
 * Keeping the client inside the existing field means the approve-time
 * `source_external_id_match` duplicate guard, source lifecycle and
 * archive/restore contracts cover agent proposals unchanged.
 */

const AGENT_SOURCE_PREFIX = "agent";
const FIRST_PARTY_CLIENT = "first-party";

export function buildAgentSourceExternalId(
  clientId: string | null,
  idempotencyKey: string,
): string {
  return `${AGENT_SOURCE_PREFIX}|${clientId ?? FIRST_PARTY_CLIENT}|${idempotencyKey}`;
}

/**
 * Extract the proposing OAuth client for display. Returns null for
 * first-party sessions and for ids that do not match the agent format
 * (fail-safe: an unexpected shape just falls back to the generic label).
 */
export function agentClientFromExternalId(
  externalId: string | null | undefined,
): string | null {
  if (!externalId) return null;
  const parts = externalId.split("|");
  if (parts.length !== 3 || parts[0] !== AGENT_SOURCE_PREFIX) return null;
  const client = parts[1];
  if (!client || client === FIRST_PARTY_CLIENT) return null;
  return client;
}
