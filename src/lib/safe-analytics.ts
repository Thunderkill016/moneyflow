/**
 * Privacy-safe product analytics (TASK-030 / research strategy § analytics).
 *
 * Allowed: counts, rates, source_type enums, timings, booleans.
 * Forbidden: raw statements, paste text, raw_snippet, full notes, file bodies.
 *
 * Sink is a no-op until a real provider is wired — still enforces the contract.
 */

import {
  looksLikeFinancialRaw,
  RAW_SENSITIVE_KEYS,
  redactForLog,
} from "./safe-log.ts";

/** Scalar-only props safe for third-party analytics. */
export type SafeAnalyticsValue = string | number | boolean | null;

export type SafeAnalyticsProps = Record<string, SafeAnalyticsValue>;

/** Known event names (extend carefully; keep product, not PII). */
export type ProductEventName =
  | "import_batch_created"
  | "import_batch_committed"
  | "import_batch_cancelled"
  | "import_direct_committed"
  | "paste_analyzed"
  | "paste_committed"
  | "candidate_approved"
  | "candidate_rejected"
  | "export_downloaded"
  | "onboarding_completed"
  | "route_error"
  | "share_received";

const MAX_STRING_PROP = 64;

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

/**
 * Strip / reject fields that could carry raw financial content.
 * Returns null if the entire payload is unsafe (caller should skip event).
 */
export function sanitizeAnalyticsProps(
  props: Record<string, unknown> | undefined | null,
): SafeAnalyticsProps {
  if (!props || typeof props !== "object") return {};

  const out: SafeAnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    const nk = normalizeKey(key);
    if (RAW_SENSITIVE_KEYS.has(nk)) {
      // Never pass sensitive keys — even redacted values can leak shape size.
      continue;
    }
    if (value === null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "boolean" || typeof value === "number") {
      if (typeof value === "number" && !Number.isFinite(value)) continue;
      // Money amounts as integers are OK as aggregates, not as free text.
      out[key] = value;
      continue;
    }
    if (typeof value === "string") {
      if (looksLikeFinancialRaw(value)) continue;
      if (value.length > MAX_STRING_PROP) {
        out[key] = value.slice(0, MAX_STRING_PROP);
      } else {
        out[key] = value;
      }
      continue;
    }
    // Nested objects / arrays are not allowed in analytics props.
  }
  return out;
}

/**
 * True when a props bag still contains anything that looks like raw statement.
 * Used in tests and defensive pre-flight.
 */
export function analyticsPropsContainRaw(
  props: Record<string, unknown> | SafeAnalyticsProps,
): boolean {
  for (const [key, value] of Object.entries(props)) {
    if (RAW_SENSITIVE_KEYS.has(normalizeKey(key))) return true;
    if (typeof value === "string" && looksLikeFinancialRaw(value)) return true;
  }
  return false;
}

export type TrackResult =
  | { ok: true; name: ProductEventName | string; props: SafeAnalyticsProps }
  | { ok: false; reason: "invalid_name" | "raw_rejected" };

/**
 * Track a product event. Never accepts raw statement fields.
 * Currently a no-op sink (no third-party SDK) — safe by default.
 */
export function trackProductEvent(
  name: string,
  props?: Record<string, unknown>,
): TrackResult {
  if (typeof name !== "string" || name.length === 0 || name.length > 64) {
    return { ok: false, reason: "invalid_name" };
  }
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return { ok: false, reason: "invalid_name" };
  }

  // Reject before sanitize if caller explicitly passed sensitive keys with string raw.
  if (props && analyticsPropsContainRaw(props)) {
    // Still attempt sanitize for non-sensitive siblings, but mark rejected
    // if any sensitive key was present (hard fail — never partial-send raw keys).
    const hasSensitiveKey = Object.keys(props).some((k) =>
      RAW_SENSITIVE_KEYS.has(normalizeKey(k)),
    );
    if (hasSensitiveKey) {
      return { ok: false, reason: "raw_rejected" };
    }
  }

  const safe = sanitizeAnalyticsProps(props);
  if (analyticsPropsContainRaw(safe)) {
    return { ok: false, reason: "raw_rejected" };
  }

  // No-op sink. When wiring a provider, pass `safe` only — never `props`.
  void redactForLog({ event: name, props: safe });
  return { ok: true, name, props: safe };
}

/**
 * improveParser opt-in must never ship full statements.
 * Returns anonymized structure counts only (or null if opt-out / empty).
 */
export function buildParserFeedbackMeta(input: {
  improveParserOptIn: boolean;
  source: "paste" | "csv" | "xlsx" | "pdf" | "share";
  rowCount: number;
  warningCount: number;
  mapConfidence?: "high" | "medium" | "low";
}): SafeAnalyticsProps | null {
  if (!input.improveParserOptIn) return null;
  if (!Number.isSafeInteger(input.rowCount) || input.rowCount < 0) return null;
  return {
    source: input.source,
    row_count: input.rowCount,
    warning_count: Number.isSafeInteger(input.warningCount)
      ? input.warningCount
      : 0,
    map_confidence: input.mapConfidence ?? null,
  };
}
