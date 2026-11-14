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
    badgeClass:
      "bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 border-indigo-500/30",
  },
  INVESTMENT: {
    label: "Tích lũy & Đầu tư",
    badgeClass:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  },
  DEBT: {
    label: "Công nợ & Thẻ tín dụng",
    badgeClass:
      "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  },
};

export const TX_TYPE_META: Readonly<
  Record<TransactionType, { label: string; badgeClass: string }>
> = {
  EXPENSE: {
    label: "Chi tiêu",
    badgeClass:
      "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
  },
  INCOME: {
    label: "Thu nhập",
    badgeClass:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  },
  TRANSFER: {
    label: "Chuyển / Tích lũy",
    badgeClass:
      "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
  },
  RECONCILE: {
    label: "Khớp số dư",
    badgeClass:
      "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
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
