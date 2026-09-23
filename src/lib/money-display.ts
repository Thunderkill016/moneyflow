import {
  formatMoney,
  formatMoneyWithKind,
  formatSignedMoney,
  type MoneySignKind,
} from "./money.ts";

type MoneyDisplayBase = {
  amount: number;
  compact?: boolean;
  currencyCode?: string;
  /** Optional context announced before the value, for example “Số dư tổng”. */
  label?: string;
};

export type MoneyDisplayOptions =
  | (MoneyDisplayBase & {
      mode?: "plain";
      kind?: never;
      direction?: never;
    })
  | (MoneyDisplayBase & {
      mode: "signed";
      kind?: never;
      direction?: never;
    })
  | (MoneyDisplayBase & {
      mode: "kind";
      kind: MoneySignKind;
      /** Add ledger direction arrows while keeping the accessible label concise. */
      direction?: boolean;
    });

export type MoneyDisplayTone = "neutral" | MoneySignKind;

const ledgerPrefixes: Record<MoneySignKind, string> = {
  income: "+ ↑",
  expense: "− ↓",
  transfer: "↔",
};

const kindAriaLabels: Record<MoneySignKind, string> = {
  income: "Thu cộng",
  expense: "Chi trừ",
  transfer: "Chuyển",
};

function formattedAbsoluteAmount(options: MoneyDisplayBase) {
  return formatMoney(
    Math.abs(options.amount),
    options.compact,
    options.currencyCode,
  );
}

export function moneyDisplayText(options: MoneyDisplayOptions): string {
  if (options.mode === "signed") {
    return formatSignedMoney(
      options.amount,
      options.compact,
      options.currencyCode,
    );
  }

  if (options.mode === "kind") {
    if (options.direction) {
      return `${ledgerPrefixes[options.kind]} ${formattedAbsoluteAmount(options)}`;
    }
    return formatMoneyWithKind(
      options.amount,
      options.kind,
      options.compact,
      options.currencyCode,
    );
  }

  return formatMoney(options.amount, options.compact, options.currencyCode);
}

export function moneyDisplayTone(
  options: MoneyDisplayOptions,
): MoneyDisplayTone {
  if (options.mode === "kind") return options.kind;
  if (options.mode === "signed") {
    if (options.amount > 0) return "income";
    if (options.amount < 0) return "expense";
  }
  return "neutral";
}

export function moneyDisplayAriaLabel(options: MoneyDisplayOptions): string {
  // Compact text ("12,5 tr") is a one-line visual squeeze; a screen reader
  // has no line limit and always hears the exact đồng figure.
  const exact = { ...options, compact: false };
  let valueLabel: string;

  if (options.mode === "kind") {
    valueLabel = `${kindAriaLabels[options.kind]} ${formattedAbsoluteAmount(exact)}`;
  } else if (options.mode === "signed" && options.amount > 0) {
    valueLabel = `Cộng ${formattedAbsoluteAmount(exact)}`;
  } else if (options.mode === "signed" && options.amount < 0) {
    valueLabel = `Trừ ${formattedAbsoluteAmount(exact)}`;
  } else {
    valueLabel = moneyDisplayText(exact);
  }

  const context = options.label?.trim();
  return context ? `${context} ${valueLabel}` : valueLabel;
}
