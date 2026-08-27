/**
 * Privacy-safe client logging (TASK-030).
 * Never write full bank statements / paste / raw_snippet to console.
 */

import {
  buildClientErrorReport,
  CLIENT_ERROR_ENDPOINT,
  MAX_REPORT_BYTES,
} from "./client-error-report.ts";

/** Keys that may hold statement or paste content — never log values. */
export const RAW_SENSITIVE_KEYS = new Set([
  "raw",
  "rawtext",
  "raw_text",
  "rawsnippet",
  "raw_snippet",
  "snippet",
  "statement",
  "statementtext",
  "statement_text",
  "csv",
  "csvtext",
  "csv_text",
  "paste",
  "pastetext",
  "paste_text",
  "body",
  "content",
  "filetext",
  "file_text",
  "filecontent",
  "file_content",
  "payload",
  "text",
  "note",
  "message",
  "description",
  "merchant",
]);

const REDACTED = "[redacted]";

/** Heuristic: multi-line or long text that looks like a statement/paste. */
export function looksLikeFinancialRaw(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;

  // Long blobs are never safe in logs.
  if (trimmed.length > 240) return true;

  const lineCount = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0).length;
  if (lineCount >= 3) return true;

  // Currency / amount patterns common in VN statements + SMS.
  const moneyHits =
    (trimmed.match(
      /(?:\d{1,3}(?:[.,]\d{3})+|\d+[kK])\s*(?:đ|d|vnd|VND)?|(?:VND|đồng)\s*[\d.,]+|[-+]?\d{4,}/g,
    )?.length ?? 0);
  if (moneyHits >= 2 && trimmed.length > 40) return true;

  // Bank-ish table headers / account masks.
  if (
    /\b(account|số dư|giao dịch|transaction|debit|credit|balance|stk|số tk)\b/i.test(
      trimmed,
    ) &&
    trimmed.length > 48
  ) {
    return true;
  }

  return false;
}

function normalizeKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
}

/**
 * Deep-sanitize values before console / APM / third-party sinks.
 * Objects: drop or redact sensitive keys; strings: redact if raw-like.
 */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[max_depth]";
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    return looksLikeFinancialRaw(value) ? REDACTED : value.slice(0, 200);
  }
  if (typeof value === "function") return "[function]";
  if (value instanceof Error) {
    return serializeErrorForLog(value);
  }
  if (Array.isArray(value)) {
    if (value.length > 20) {
      return [
        ...value.slice(0, 20).map((item) => redactForLog(item, depth + 1)),
        `[+${value.length - 20} more]`,
      ];
    }
    return value.map((item) => redactForLog(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const nk = normalizeKey(key);
      if (RAW_SENSITIVE_KEYS.has(nk)) {
        out[key] = REDACTED;
        continue;
      }
      out[key] = redactForLog(child, depth + 1);
    }
    return out;
  }
  return String(value);
}

export type SafeErrorSummary = {
  name: string;
  /** Short message only if it does not look like financial raw. */
  message: string;
  digest?: string;
  /** Stack omitted — can embed component props with user data. */
  stack: false;
};

export function serializeErrorForLog(error: unknown): SafeErrorSummary {
  if (!(error instanceof Error) && (!error || typeof error !== "object")) {
    return {
      name: "NonError",
      message: typeof error === "string" && !looksLikeFinancialRaw(error)
        ? error.slice(0, 120)
        : "unknown",
      stack: false,
    };
  }

  const err = error as Error & { digest?: string };
  const name = typeof err.name === "string" ? err.name.slice(0, 80) : "Error";
  let message = typeof err.message === "string" ? err.message : "error";
  if (looksLikeFinancialRaw(message) || message.length > 200) {
    message = "redacted_error_message";
  } else {
    message = message.slice(0, 200);
  }
  const digest =
    typeof err.digest === "string" ? err.digest.slice(0, 32) : undefined;

  return { name, message, digest, stack: false };
}

/**
 * Safe console.error for client boundaries.
 * Never dumps full Error stacks or payload objects that may contain statements.
 */
export function logClientError(context: string, error: unknown): void {
  const safeContext =
    typeof context === "string" && context.length > 0
      ? context.slice(0, 64)
      : "client_error";
  console.error(`[moneyflow:${safeContext}]`, serializeErrorForLog(error));
  reportClientError(safeContext, error);
}

/*
 * Send the error somewhere a person will actually see it.
 *
 * `sendBeacon` rather than `fetch`: an error frequently precedes a navigation
 * or a reload, and a beacon is queued by the browser and survives the page
 * going away. A fetch started at the same moment is cancelled with the document
 * and the report is lost exactly when it matters most.
 *
 * Everything here is best effort and silent. Reporting an error must never
 * raise one, never block a render, and never surface to the reader — they
 * already have the problem the report is about.
 */
function reportClientError(context: string, error: unknown): void {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  try {
    const report = buildClientErrorReport(context, error, window.location?.pathname);
    const body = JSON.stringify(report);
    if (body.length > MAX_REPORT_BYTES) return;

    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        CLIENT_ERROR_ENDPOINT,
        new Blob([body], { type: "application/json" }),
      );
      return;
    }

    void fetch(CLIENT_ERROR_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Nothing here may escape. A failed report is a lost breadcrumb, not a bug.
  }
}

/**
 * Safe console.warn with redacted payload (dev diagnostics only).
 * Prefer structured codes over free-form text.
 */
export function logClientWarn(
  context: string,
  payload?: Record<string, unknown>,
): void {
  const safeContext =
    typeof context === "string" && context.length > 0
      ? context.slice(0, 64)
      : "client_warn";
  console.warn(
    `[moneyflow:${safeContext}]`,
    payload ? redactForLog(payload) : undefined,
  );
}

/**
 * User-facing notice / toast copy must never embed raw statement text.
 * Returns a short Vietnamese fallback when the message looks unsafe.
 */
export function safeUserNotice(
  message: string,
  fallback = "Đã xử lý. (Chi tiết nhạy cảm không hiển thị.)",
): string {
  if (typeof message !== "string" || message.trim().length === 0) {
    return fallback;
  }
  if (looksLikeFinancialRaw(message)) return fallback;
  if (message.length > 180) return `${message.slice(0, 177)}…`;
  return message;
}
