/**
 * Day-grouping for the dashboard's recent-activity list.
 *
 * Rows arrive newest-first; grouping preserves that order and keys on the real
 * calendar day (`occurredOn`) while rendering the ledger's existing day label
 * (`relativeDate`) — "Hôm nay", "Hôm qua" or the localized date — so the
 * header never invents a formatting the product doesn't already use.
 */

export type RecentDayGroup<T> = {
  /** ISO `YYYY-MM-DD` — also the `<time dateTime>` value for the header. */
  occurredOn: string;
  /** Day-level label taken from the first row of the group. */
  label: string;
  rows: T[];
};

export function groupRecentTransactionsByDay<
  T extends { occurredOn: string; relativeDate: string },
>(rows: T[]): RecentDayGroup<T>[] {
  const groups = new Map<string, RecentDayGroup<T>>();
  for (const row of rows) {
    const group = groups.get(row.occurredOn);
    if (group) {
      group.rows.push(row);
    } else {
      groups.set(row.occurredOn, {
        occurredOn: row.occurredOn,
        label: row.relativeDate,
        rows: [row],
      });
    }
  }
  return [...groups.values()];
}
