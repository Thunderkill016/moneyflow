import { redactForLog } from "./safe-log.ts";

/*
 * The shape a client error takes on its way to a log, and the rules that keep
 * it safe to write down.
 *
 * MoneyFlow already had the sanitising half of this: `safe-log.ts` redacts
 * statement text, amounts and thirty-odd sensitive field names, and its own
 * comment says it exists to run "before console / APM / third-party sinks".
 * What was missing was any sink at all — `logClientError` wrote to
 * `console.error`, which nobody reads, so a user hitting a bug in production
 * was invisible.
 *
 * This deliberately does NOT introduce an error-tracking service. A third party
 * would mean a new dependency, a new data processor to disclose, and a finance
 * app's error payloads leaving for a vendor. Posting to our own route instead
 * puts the report in the logs the deployment platform already keeps, with no
 * new processor and nothing new to disclose.
 */

/** Hard caps. A report is a breadcrumb, not a document. */
export const CLIENT_ERROR_ENDPOINT = "/api/client-error";
export const MAX_REPORT_BYTES = 4 * 1024;
export const MAX_FIELD_CHARS = 300;

export type ClientErrorReport = {
  /** Where it happened, e.g. a route key. */
  context: string;
  name: string;
  message: string;
  /** Next.js error digest when present — the join key to a server-side trace. */
  digest?: string;
  /** Pathname only. Never a full URL: query strings carry filters and ids. */
  route?: string;
};

/*
 * Sanitise one field as a STRING, never as an object property.
 *
 * `redactForLog` redacts by key name as well as by content, and its sensitive
 * list contains "message", "note" and "description". Passing an error through
 * it as `{ message }` therefore redacts every message unconditionally — the
 * reporter would ship "[redacted]" for a plain `TypeError` and never carry
 * anything actionable. A test caught that; the design was wrong, not the test.
 *
 * Passing the string itself keeps the content rule that matters — statement
 * text, multi-line blobs and strings carrying several amounts are replaced —
 * while ordinary error text survives.
 */
function safeField(value: unknown): string {
  if (typeof value !== "string") return "";
  const redacted = redactForLog(value);
  return typeof redacted === "string" ? redacted.slice(0, MAX_FIELD_CHARS) : "";
}

/**
 * Build a report from an error, sanitised.
 *
 * `redactForLog` does the deciding: a message that looks like statement text,
 * or carries several amounts, is replaced rather than shortened.
 */
export function buildClientErrorReport(
  context: string,
  error: unknown,
  route?: string,
): ClientErrorReport {
  const isError = error instanceof Error;
  const name = isError ? error.name : "NonError";
  const message = isError ? error.message : String(error);
  const digest = isError ? (error as { digest?: unknown }).digest : undefined;

  return {
    context: safeField(context) || "unknown",
    name: safeField(name) || "Error",
    message: safeField(message),
    ...(typeof digest === "string" ? { digest: safeField(digest) } : {}),
    /*
     * Pathname only. A full URL would carry the query string, and this product
     * puts category names, account names and date windows in query strings.
     */
    ...(route ? { route: safeField(route.split("?")[0]) } : {}),
  };
}

/**
 * Re-sanitise a report that arrived over the network.
 *
 * The client sanitises before sending, and the server does not trust that. A
 * buggy or hostile caller can POST anything to a public route, and whatever it
 * posts would otherwise land verbatim in the deployment logs — which is a worse
 * leak than the console the sink replaces, because logs are retained.
 */
export function sanitizeIncomingReport(input: unknown): ClientErrorReport | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;

  const source = input as Record<string, unknown>;
  const context = safeField(source.context);
  const name = safeField(source.name);
  if (!context || !name) return null;

  return {
    context,
    name,
    message: safeField(source.message),
    ...(typeof source.digest === "string" && source.digest
      ? { digest: safeField(source.digest) }
      : {}),
    ...(typeof source.route === "string" && source.route
      ? { route: safeField(source.route.split("?")[0]) }
      : {}),
  };
}

/** Oversized bodies are refused before parsing rather than truncated. */
export function reportTooLarge(contentLength: string | null): boolean {
  if (contentLength === null) return false;
  const length = Number(contentLength);
  return Number.isFinite(length) && length > MAX_REPORT_BYTES;
}
