/**
 * Privacy-safe product analytics (TASK-030 / research strategy § analytics).
 *
 * Allowed: counts, rates, source_type enums, timings, booleans.
 * Forbidden: raw statements, paste text, raw_snippet, full notes, file bodies.
 *
 * The sink uses the already-installed Vercel Web Analytics client. It receives
 * only the sanitized scalar payload, and remains inert when no browser analytics
 * script is present (for example in tests or an intentional local demo).
 */

import { track as vercelTrack } from "@vercel/analytics";
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
  | "quick_capture_correction_opened"
  | "quick_capture_save"
  | "route_error"
  | "share_received";

const MAX_STRING_PROP = 64;
const MAX_QUICK_CAPTURE_ELAPSED_MS = 30 * 60 * 1_000;
const IMMEDIATE_CORRECTION_WINDOW_MS = 5 * 1_000;

export type QuickCapturePatternCount = 0 | 1 | 2;
export type QuickCapturePatternRank = 1 | 2;

function validPatternCount(value: number): value is QuickCapturePatternCount {
  return value === 0 || value === 1 || value === 2;
}

/** Build aggregate-only metadata for the quick-capture experiment. */
export function buildQuickCaptureSaveMeta(input: {
  elapsedMs: number;
  patternCount: number;
  selectedPatternRank: number | null;
  outcome: "success" | "failure";
}): SafeAnalyticsProps | null {
  if (!Number.isFinite(input.elapsedMs) || input.elapsedMs < 0) return null;
  if (!validPatternCount(input.patternCount)) return null;
  if (
    input.selectedPatternRank !== null &&
    (input.selectedPatternRank < 1 ||
      input.selectedPatternRank > input.patternCount ||
      !Number.isInteger(input.selectedPatternRank))
  ) {
    return null;
  }

  return {
    elapsed_ms: Math.min(
      Math.round(input.elapsedMs),
      MAX_QUICK_CAPTURE_ELAPSED_MS,
    ),
    pattern_count: input.patternCount,
    completion_mode:
      input.selectedPatternRank !== null
        ? "pattern_selected"
        : input.patternCount > 0
          ? "manual_with_patterns"
          : "no_pattern_available",
    selected_pattern_rank: input.selectedPatternRank,
    save_outcome: input.outcome,
  };
}

/** Match the bounded correction action shown immediately after a successful save. */
export function buildQuickCaptureCorrectionMeta(
  elapsedMs: number,
): SafeAnalyticsProps | null {
  if (
    !Number.isFinite(elapsedMs) ||
    elapsedMs < 0 ||
    elapsedMs > IMMEDIATE_CORRECTION_WINDOW_MS
  ) {
    return null;
  }

  return { elapsed_bucket: "within_5_seconds" };
}

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
 * Track a product event. Never accepts raw statement fields. The event is sent
 * only after validation/sanitization and only from a browser where the existing
 * Web Analytics runtime can receive it.
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

  // The provider receives `safe` only — never the caller's original props.
  void redactForLog({ event: name, props: safe });
  if (typeof window !== "undefined") vercelTrack(name, safe);
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
