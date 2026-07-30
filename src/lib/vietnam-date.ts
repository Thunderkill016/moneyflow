/**
 * The single owner of "what calendar day is it in Vietnam".
 *
 * This decides which day a transaction belongs to, so it is a financial rule,
 * not a formatting helper. `AGENTS.md` requires such rules to live in a testable
 * domain module rather than a UI component.
 *
 * It previously existed six times under five names — in `quick-add-prefs.ts`,
 * `inbox/parse-text.ts`, `server/finance.ts`, `server/reports.ts`,
 * `server/commitments.ts`, and inline inside `transfer-dialog.tsx`. Four of those
 * took no `now`, so no test could pin their boundary behaviour, and the inline one
 * could not be tested at all.
 *
 * Keep this module free of `server-only` imports: `transfer-dialog.tsx` is a
 * client component and imports it.
 */

/**
 * Today in Asia/Ho_Chi_Minh as `YYYY-MM-DD`.
 *
 * `en-CA` is deliberate — it is the locale that yields ISO-ordered
 * year-month-day, which is the shape the ledger stores and compares.
 *
 * Always pass `now` from a test. Calling it with the default and asserting a
 * fixed string makes the test depend on the machine clock.
 */
export function todayInVietnam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
