import type { SourceLifecycleState } from "./provenance.ts";
import {
  canonicalizeSourceExternalId,
  normalizeStrictSourceAmount,
  normalizeStrictSourceDate,
  type NormalizedSourceAdapterRow,
  type SourceAdapterFinding,
  type SourceAdapterTransport,
  type SourceAmountEvidence,
  type SourceDateEvidence,
  type SourceIdentityEvidence,
} from "./source-adapter.ts";

/**
 * Locates one source observation without claiming that the locator identifies a
 * financial transaction. Row/sheet positions may change between overlapping
 * exports and must never be promoted into sourceExternalId.
 */
export type SourceObservationLocator = {
  sourceRowIndex: number;
  sourceSheetIndex?: number;
  /**
   * Optional adapter-local record key for diagnostics only. This is not a
   * provider transaction id and is never persisted as source identity.
   */
  sourceRecordKey?: string;
};

/**
 * Evidence as observed at the acquisition boundary, before MoneyFlow creates a
 * canonical financial candidate. The observation deliberately keeps transport
 * location separate from provider transaction identity.
 */
export type SourceObservation = {
  transport: SourceAdapterTransport;
  locator: SourceObservationLocator;
  date: SourceDateEvidence;
  amount: SourceAmountEvidence;
  merchant: string;
  note: string;
  rawSnippet: string;
  identity?: SourceIdentityEvidence;
  predecessorIdentity?: SourceIdentityEvidence;
  lifecycle?: SourceLifecycleState;
  parserVersion: string;
  mappingVersion: number;
  findings?: SourceAdapterFinding[];
};

/**
 * Existing downstream import-draft shape, now named for its architectural role.
 * Keeping it structurally identical avoids a parallel candidate model while
 * adapters migrate to the observation boundary.
 */
export type CanonicalSourceCandidate = NormalizedSourceAdapterRow;

export type SourceObservationNormalizationResult =
  | { ok: true; candidate: CanonicalSourceCandidate }
  | { ok: false; findings: SourceAdapterFinding[] };

export type SourceObservationAdapterResult =
  | { ok: true; observations: SourceObservation[] }
  | { ok: false; findings: SourceAdapterFinding[] };

/**
 * Primary contract for evidence-aware acquisition adapters. Adapters observe
 * source facts; normalization into a financial candidate happens separately.
 */
export type SourceObservationAdapter<Input = unknown> = {
  key: string;
  version: string;
  transport: SourceAdapterTransport;
  observe(input: Input): SourceObservationAdapterResult;
};

function dateFinding(reason: string): SourceAdapterFinding {
  return {
    field: "date",
    code: reason,
    message: `Source date requires review: ${reason}`,
  };
}

function amountFinding(reason: string): SourceAdapterFinding {
  return {
    field: reason === "ambiguous_direction" ? "direction" : "amount",
    code: reason,
    message: `Source amount requires review: ${reason}`,
  };
}

function identityFinding(code: string, message: string): SourceAdapterFinding {
  return { field: "identity", code, message };
}

function lifecycleFinding(code: string, message: string): SourceAdapterFinding {
  return { field: "lifecycle", code, message };
}

/**
 * Deterministic observation -> canonical-candidate boundary.
 *
 * Financial fields fail closed when date/amount semantics are ambiguous. Source
 * identity is weaker authority: unconfirmed or unstable ids are retained only
 * as findings and are omitted from persistence, so fingerprint/review matching
 * remains available. Observation locators never participate in identity.
 */
export function normalizeSourceObservation(
  observation: SourceObservation,
): SourceObservationNormalizationResult {
  const findings = [...(observation.findings ?? [])];
  const date = normalizeStrictSourceDate(observation.date);
  if (!date.ok) findings.push(dateFinding(date.reason));

  const amount = normalizeStrictSourceAmount(observation.amount);
  if (!amount.ok) findings.push(amountFinding(amount.reason));

  if (!date.ok || !amount.ok) {
    return { ok: false, findings };
  }

  const sourceExternalId = canonicalizeSourceExternalId(observation.identity);
  if (observation.identity && !sourceExternalId) {
    findings.push(
      identityFinding(
        "source_identity_not_persistable",
        "Source identity is not confirmed and source-stable in a safe namespace; MoneyFlow will use reconciliation fallback instead.",
      ),
    );
  }

  const predecessorExternalId = canonicalizeSourceExternalId(
    observation.predecessorIdentity,
  );
  if (observation.predecessorIdentity && !predecessorExternalId) {
    findings.push(
      identityFinding(
        "source_predecessor_not_persistable",
        "Source predecessor identity is not strong enough to persist.",
      ),
    );
  }

  if (observation.lifecycle === "removed" && !sourceExternalId) {
    findings.push(
      lifecycleFinding(
        "source_removed_without_stable_identity",
        "A removed source observation cannot become a financial candidate without a confirmed stable source identity.",
      ),
    );
    return { ok: false, findings };
  }

  if (observation.lifecycle && !sourceExternalId) {
    findings.push(
      lifecycleFinding(
        "source_lifecycle_without_stable_identity",
        "Lifecycle evidence is review-only because no confirmed stable source identity is available.",
      ),
    );
  }

  const sourcePredecessorExternalId =
    sourceExternalId &&
    predecessorExternalId &&
    predecessorExternalId !== sourceExternalId
      ? predecessorExternalId
      : undefined;

  return {
    ok: true,
    candidate: {
      kind: amount.kind,
      amount: amount.amount,
      merchant: observation.merchant.trim(),
      note: observation.note,
      occurredOn: date.date,
      confidence: "high",
      rawSnippet: observation.rawSnippet,
      sourceRowIndex: observation.locator.sourceRowIndex,
      sourceExternalId,
      sourceLifecycleState: sourceExternalId
        ? observation.lifecycle
        : undefined,
      sourcePredecessorExternalId,
      parserVersion: observation.parserVersion,
      mappingVersion: observation.mappingVersion,
      findings,
    },
  };
}

export function normalizeSourceObservations(
  observations: SourceObservation[],
): {
  candidates: CanonicalSourceCandidate[];
  rejected: Array<{ observation: SourceObservation; findings: SourceAdapterFinding[] }>;
} {
  const candidates: CanonicalSourceCandidate[] = [];
  const rejected: Array<{
    observation: SourceObservation;
    findings: SourceAdapterFinding[];
  }> = [];

  for (const observation of observations) {
    const result = normalizeSourceObservation(observation);
    if (result.ok) candidates.push(result.candidate);
    else rejected.push({ observation, findings: result.findings });
  }

  return { candidates, rejected };
}
