/**
 * Day-grouping for the dashboard's recent-activity list.
 *
 * Groups key on the real calendar day (`occurredOn`) and render newest day
 * first regardless of input quirks — an optimistic backdated row can sit
 * ahead of newer days in the array, but it must land inside its own day
 * group, not pull the whole list out of order. Rows keep their ledger order
 * within each group.
 *
 * The header label is derived from `occurredOn` + the workspace `today`,
 * never from `relativeDate`: optimistic rows carry status text there
 * ("Đang lưu…", "Vừa sửa"), and a day header must be a date, not a status.
 */

import { formatRelativeDate } from "./relative-date.ts";

export type RecentDayGroup<T> = {
  /** ISO `YYYY-MM-DD` — also the `<time dateTime>` value for the header. */
  occurredOn: string;
  /** Day-level label derived from `occurredOn` against `today`. */
  label: string;
  rows: T[];
};

export function groupRecentTransactionsByDay<
  T extends { occurredOn: string },
>(rows: T[], today: string): RecentDayGroup<T>[] {
  const groups = new Map<string, RecentDayGroup<T>>();
  for (const row of rows) {
    const group = groups.get(row.occurredOn);
    if (group) {
      group.rows.push(row);
    } else {
      groups.set(row.occurredOn, {
        occurredOn: row.occurredOn,
        label: formatRelativeDate(row.occurredOn, today),
        rows: [row],
      });
    }
  }
  return [...groups.values()].sort((a, b) =>
    b.occurredOn.localeCompare(a.occurredOn),
  );
}
