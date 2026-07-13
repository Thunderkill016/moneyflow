export function formatMoney(amount: number, compact = false) {
  if (compact && Math.abs(amount) >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 1,
    }).format(millions)} tr`;
  }

  return `${new Intl.NumberFormat("vi-VN").format(amount)} ₫`;
}

export function parseMoneyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

export function formatMoneyInput(value: string) {
  const amount = parseMoneyInput(value);
  return amount ? new Intl.NumberFormat("vi-VN").format(amount) : "";
}
