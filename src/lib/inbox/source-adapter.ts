import type {
  CandidateConfidence,
  CandidateKind,
} from "./candidate-store.ts";
import type { SourceLifecycleState } from "./provenance.ts";

export const SOURCE_EXTERNAL_ID_MAX_LENGTH = 200;
export const SOURCE_ADAPTER_CONTRACT_VERSION = 1;

export type SourceEvidenceLevel =
  | "confirmed"
  | "observed-but-unverified"
  | "unknown";

export type SourceReferenceStability =
  | "source-stable"
  | "display-only"
  | "export-local"
  | "unknown";

export type SourceIdentityScope =
  | {
      kind: "institution";
      institutionKey: string;
    }
  | {
      kind: "account";
      institutionKey: string;
      /**
       * Stable source-side account namespace already reviewed as safe to persist.
       * Never substitute a mutable MoneyFlow account id or raw account number.
       */
      accountKey: string;
      accountKeyPersistence: "safe" | "unsafe";
    };

export type SourceIdentityEvidence = {
  value: string;
  evidence: SourceEvidenceLevel;
  stability: SourceReferenceStability;
  scope: SourceIdentityScope;
};

const SAFE_NAMESPACE_KEY = /^[a-z0-9][a-z0-9._-]{0,39}$/;

function safeNamespaceKey(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return SAFE_NAMESPACE_KEY.test(normalized) ? normalized : null;
}

function encoded(value: string): string | null {
  try {
    return encodeURIComponent(value.trim());
  } catch {
    return null;
  }
}

/**
 * Shared persistence guard for source identities. Identity is never truncated:
 * an overlong value is omitted so two different source IDs cannot alias after a
 * database-boundary shortening step.
 */
export function persistableSourceExternalId(
  value: string | null | undefined,
): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > SOURCE_EXTERNAL_ID_MAX_LENGTH) return undefined;
  return trimmed;
}

/**
 * Convert source identity evidence into the single DB-facing sourceExternalId.
 *
 * The current database uniqueness key is `(user_id, source, source_external_id)`
 * where `source` is only the transport family. The canonical value therefore
 * carries every proven institution/account namespace needed by the source
 * contract. Failure is intentionally lossy-safe: omit identity rather than
 * truncate, hash, infer from row order, or depend on mutable MoneyFlow mapping.
 */
export function canonicalizeSourceExternalId(
  identity: SourceIdentityEvidence | null | undefined,
): string | undefined {
  if (!identity) return undefined;
  if (identity.evidence !== "confirmed") return undefined;
  if (identity.stability !== "source-stable") return undefined;

  const value = persistableSourceExternalId(identity.value);
  if (!value) return undefined;

  const institutionKey = safeNamespaceKey(identity.scope.institutionKey);
  if (!institutionKey) return undefined;

  const encodedValue = encoded(value);
  if (!encodedValue) return undefined;

  const pieces = ["mf-src-v1"];
  if (identity.scope.kind === "institution") {
    pieces.push("institution", institutionKey, encodedValue);
  } else {
    if (identity.scope.accountKeyPersistence !== "safe") return undefined;
    const accountKey = identity.scope.accountKey.trim();
    if (!accountKey) return undefined;
    const encodedAccountKey = encoded(accountKey);
    if (!encodedAccountKey) return undefined;
    pieces.push("account", institutionKey, encodedAccountKey, encodedValue);
  }

  return persistableSourceExternalId(pieces.join("|"));
}

export type SourceDateFormat =
  | "iso-date"
  | "dmy-date"
  | "excel-serial"
  | "unknown";

export type ExcelDateSystem = "1900" | "1904";

export type SourceDateEvidence = {
  value: string | number;
  format: SourceDateFormat;
  dateSystem?: ExcelDateSystem;
  /** Adapters in this slice only accept calendar dates, never guessed instants. */
  calendarSemantics: "date-only";
};

export type StrictSourceDateResult =
  | { ok: true; date: string }
  | {
      ok: false;
      reason:
        | "missing_date"
        | "unknown_date_format"
        | "invalid_calendar_date"
        | "invalid_excel_serial"
        | "ambiguous_excel_datetime"
        | "missing_excel_date_system"
        | "excel_1900_leap_bug";
    };

function formatUtcDate(date: Date): string | null {
  if (!Number.isFinite(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calendarDate(year: number, month: number, day: number): string | null {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1900 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return formatUtcDate(date);
}

function normalizeTextDate(
  text: string,
  format: "iso-date" | "dmy-date",
): StrictSourceDateResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, reason: "missing_date" };

  if (format === "iso-date") {
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return { ok: false, reason: "invalid_calendar_date" };
    const date = calendarDate(Number(match[1]), Number(match[2]), Number(match[3]));
    return date
      ? { ok: true, date }
      : { ok: false, reason: "invalid_calendar_date" };
  }

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!dmy) return { ok: false, reason: "invalid_calendar_date" };
  const date = calendarDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  return date
    ? { ok: true, date }
    : { ok: false, reason: "invalid_calendar_date" };
}

function normalizeExcelDate(
  serial: number,
  dateSystem: ExcelDateSystem | undefined,
): StrictSourceDateResult {
  if (!dateSystem) return { ok: false, reason: "missing_excel_date_system" };
  if (!Number.isFinite(serial) || serial < 0) {
    return { ok: false, reason: "invalid_excel_serial" };
  }
  if (!Number.isInteger(serial)) {
    return { ok: false, reason: "ambiguous_excel_datetime" };
  }

  let date: Date;
  if (dateSystem === "1900") {
    if (serial === 60) return { ok: false, reason: "excel_1900_leap_bug" };
    if (serial < 1) return { ok: false, reason: "invalid_excel_serial" };
    const adjustedDays = serial > 60 ? serial - 1 : serial;
    const base = Date.UTC(1899, 11, 31);
    date = new Date(base + adjustedDays * 86_400_000);
  } else {
    const base = Date.UTC(1904, 0, 1);
    date = new Date(base + serial * 86_400_000);
  }

  const normalized = formatUtcDate(date);
  return normalized
    ? { ok: true, date: normalized }
    : { ok: false, reason: "invalid_excel_serial" };
}

/**
 * Strict source-date normalization. It never reads the current clock and never
 * infers locale, timezone, or Excel date system. Ambiguity is reviewable input,
 * not a reason to manufacture a date.
 */
export function normalizeStrictSourceDate(
  input: SourceDateEvidence,
): StrictSourceDateResult {
  if (input.format === "unknown") {
    return { ok: false, reason: "unknown_date_format" };
  }

  if (input.format === "excel-serial") {
    if (typeof input.value !== "number") {
      return { ok: false, reason: "invalid_excel_serial" };
    }
    return normalizeExcelDate(input.value, input.dateSystem);
  }

  if (typeof input.value !== "string") {
    return { ok: false, reason: "invalid_calendar_date" };
  }
  return normalizeTextDate(input.value, input.format);
}

export type SourceAmountDirection = "debit" | "credit" | "unknown";

export type SourceAmountEvidence = {
  value: number;
  currency: string;
  direction: SourceAmountDirection;
  /** Adapters must prove that the source value itself is absolute. */
  amountSemantics: "absolute" | "unknown";
};

export type StrictSourceAmountResult =
  | { ok: true; amount: number; kind: "expense" | "income" }
  | {
      ok: false;
      reason:
        | "invalid_amount"
        | "unsupported_currency"
        | "ambiguous_amount_semantics"
        | "ambiguous_direction";
    };

/**
 * Strict VND amount/direction normalization for evidence-backed adapters.
 * Transfer classification remains downstream matching/review authority; this
 * helper only establishes money direction from explicit debit/credit evidence.
 */
export function normalizeStrictSourceAmount(
  input: SourceAmountEvidence,
): StrictSourceAmountResult {
  if (!Number.isSafeInteger(input.value) || input.value <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }
  if (input.currency.trim().toUpperCase() !== "VND") {
    return { ok: false, reason: "unsupported_currency" };
  }
  if (input.amountSemantics !== "absolute") {
    return { ok: false, reason: "ambiguous_amount_semantics" };
  }
  if (input.direction === "unknown") {
    return { ok: false, reason: "ambiguous_direction" };
  }
  return {
    ok: true,
    amount: input.value,
    kind: input.direction === "debit" ? "expense" : "income",
  };
}

export type SourceAdapterTransport = "csv" | "xlsx" | "pdf";

export type SourceAdapterFinding = {
  field: "date" | "amount" | "direction" | "identity" | "lifecycle";
  code: string;
  message: string;
};

export type NormalizedSourceAdapterRow = {
  kind: CandidateKind;
  amount: number;
  merchant: string;
  note: string;
  occurredOn: string;
  confidence: CandidateConfidence;
  rawSnippet: string;
  sourceRowIndex: number;
  sourceExternalId?: string;
  sourceLifecycleState?: SourceLifecycleState;
  sourcePredecessorExternalId?: string;
  parserVersion: string;
  mappingVersion: number;
  findings: SourceAdapterFinding[];
};

export type SourceAdapterResult =
  | { ok: true; rows: NormalizedSourceAdapterRow[] }
  | { ok: false; findings: SourceAdapterFinding[] };

/** Pure adapter boundary: deterministic input → evidence, with no mutation API. */
export type SourceAdapter<Input = unknown> = {
  key: string;
  version: string;
  transport: SourceAdapterTransport;
  adapt(input: Input): SourceAdapterResult;
};
