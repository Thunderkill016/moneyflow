export type MoneySignKind = "income" | "expense" | "transfer";

export function formatMoney(amount: number, compact = false) {
  if (compact && Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(millions)} tr`;
  }

  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

/** Signed display so thu/chi is never color-only (+ / − / ↔). */
export function formatSignedMoney(amount: number, compact = false) {
  if (amount > 0) return `+ ${formatMoney(amount, compact)}`;
  if (amount < 0) return `− ${formatMoney(Math.abs(amount), compact)}`;
  return formatMoney(0, compact);
}

/** Prefix for a known ledger kind (amount is always positive in store). */
export function moneyKindPrefix(kind: MoneySignKind): string {
  if (kind === "income") return "+";
  if (kind === "transfer") return "↔";
  return "−";
}

export function formatMoneyWithKind(amount: number, kind: MoneySignKind, compact = false) {
  const prefix = moneyKindPrefix(kind);
  const body = formatMoney(Math.abs(amount), compact);
  return kind === "transfer" ? `${prefix} ${body}` : `${prefix} ${body}`;
}

export function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function formatMoneyInput(value: string) {
  const amount = parseMoneyInput(value);
  return amount ? new Intl.NumberFormat("vi-VN").format(amount) : "";
}
