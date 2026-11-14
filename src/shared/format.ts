import type { AccountGroup, CurrencyCode } from "../core/schema/account.schema.ts";
import type { TransactionType } from "../core/schema/transaction.schema.ts";

const VND_FORMATTER = new Intl.NumberFormat("vi-VN");

export function formatMoney(
  amount: number,
  currency: CurrencyCode = "VND",
): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (currency === "USD") {
    return `$${safe.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
  if (currency === "BTC") {
    return `${safe.toLocaleString("en-US", { maximumFractionDigits: 6 })} BTC`;
  }
  if (currency === "XAU") {
    return `${safe.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} chỉ`;
  }
  return `${VND_FORMATTER.format(Math.round(safe))} ₫`;
}

export function formatSignedMoney(
  delta: number,
  currency: CurrencyCode = "VND",
): string {
  const prefix = delta > 0 ? "+" : delta < 0 ? "-" : "";
  return `${prefix}${formatMoney(Math.abs(delta), currency)}`;
}

export function formatCompactVnd(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2).replace(/\.00$/u, "")} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/u, "")} tr`;
  }
  if (abs >= 1_000) {
    return `${sign}${Math.round(abs / 1_000)}k`;
  }
  return `${sign}${Math.round(abs)} ₫`;
}

export function formatDateTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDay(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

export const ACCOUNT_GROUP_META: Readonly<
  Record<AccountGroup, { label: string; badgeClass: string }>
> = {
  LIQUID: {
    label: "Thanh khoản (Safe-to-Spend)",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  INVESTMENT: {
    label: "Tích lũy & Đầu tư",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  DEBT: {
    label: "Công nợ & Thẻ tín dụng",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

export const TX_TYPE_META: Readonly<
  Record<TransactionType, { label: string; badgeClass: string }>
> = {
  EXPENSE: {
    label: "Chi tiêu",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  INCOME: {
    label: "Thu nhập",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  TRANSFER: {
    label: "Chuyển / Tích lũy",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  RECONCILE: {
    label: "Khớp số dư",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
};

export const CATEGORY_EMOJI: Readonly<Record<string, string>> = {
  "an-uong": "🍜",
  "di-chuyen": "⛽",
  "mua-sam": "🛍️",
  "hoa-don": "🧾",
  "giai-tri": "🎬",
  "suc-khoe": "💊",
  "thu-nhap": "💰",
  "tich-luy": "📈",
  "chuyen-vi": "🔁",
  "khop-so-du": "⚖️",
};
