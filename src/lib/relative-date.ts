/**
 * The ledger's day-level date label — "Hôm nay", "Hôm qua", "21 thg 9".
 *
 * Single source of truth moved out of `src/server/finance.ts`: the same
 * grammar now serves the feed mapper (server) and the dashboard's recent-day
 * headers (client). `today` is passed in resolved form (Asia/Ho_Chi_Minh
 * `YYYY-MM-DD`) so the label follows the workspace date, never a client clock.
 */

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatRelativeDate(date: string, today: string) {
  if (date === today) return "Hôm nay";
  if (date === shiftDate(today, -1)) return "Hôm qua";
  const parsed = new Date(`${date}T00:00:00+07:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(parsed);
}
