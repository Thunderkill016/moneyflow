export function dashboardPeriodLabel(today: string): string {
  const match = /^\d{4}-(\d{2})-\d{2}$/.exec(today);
  if (!match) return "Kỳ hiện tại";

  const month = Number(match[1]);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return "Kỳ hiện tại";
  }

  return `Tháng ${month}`;
}
