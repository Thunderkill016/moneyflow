import {
  normalizeCustomRange,
  type CustomRangeInput,
  type ReportPeriod,
} from "./reports.ts";

export type ReportRangeNotice =
  | "invalid"
  | "swapped"
  | "future"
  | "clamped"
  | null;

/**
 * Explain why the resolved custom window differs from the query-string input.
 * The most restrictive adjustment wins when more than one applies.
 */
export function describeReportRangeAdjustment(
  period: ReportPeriod,
  custom: CustomRangeInput | undefined,
  today: string,
): ReportRangeNotice {
  if (period !== "custom") return null;

  const normalized = normalizeCustomRange(custom ?? {}, today);
  if (!normalized) return "invalid";
  if (normalized.clamped) return "clamped";

  const requestedFrom = custom?.from ?? "";
  const requestedTo = custom?.to ?? "";
  if (requestedFrom > today || requestedTo > today) return "future";
  if (normalized.swapped) return "swapped";
  return null;
}
