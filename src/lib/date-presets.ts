export type DatePreset = "week" | "month" | "lastMonth";

export type DateRange = {
  from: string;
  to: string;
};

function parseIsoDay(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

function formatIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * One-tap ranges for the ledger's date filters. Everything derives from the
 * server-resolved `today`, never a client clock, so the range a chip sets is
 * the same range its pressed state reports.
 *
 * "Tuần này" starts on Monday — the convention Vietnamese calendars use —
 * and ends today rather than on Sunday, since future days cannot hold
 * transactions yet.
 */
export function datePresetRange(
  preset: DatePreset,
  today: string,
): DateRange {
  const day = parseIsoDay(today);
  if (preset === "week") {
    // getUTCDay: 0 = Sunday … 6 = Saturday; Monday is 6 days before Sunday.
    const daysSinceMonday = (day.getUTCDay() + 6) % 7;
    return { from: formatIsoDay(addDays(day, -daysSinceMonday)), to: today };
  }
  if (preset === "month") {
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }
  const firstOfMonth = parseIsoDay(`${today.slice(0, 7)}-01`);
  const lastMonthEnd = addDays(firstOfMonth, -1);
  return {
    from: `${formatIsoDay(lastMonthEnd).slice(0, 7)}-01`,
    to: formatIsoDay(lastMonthEnd),
  };
}

/**
 * Which preset the current manual range equals, if any. When two presets
 * coincide (e.g. today is Monday the 1st) the earliest in declaration order
 * wins, so pressed state stays deterministic.
 */
export function activeDatePreset(
  from: string,
  to: string,
  today: string,
): DatePreset | null {
  for (const preset of ["week", "month", "lastMonth"] as DatePreset[]) {
    const range = datePresetRange(preset, today);
    if (range.from === from && range.to === to) return preset;
  }
  return null;
}
