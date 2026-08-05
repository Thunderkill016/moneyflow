import * as React from "react"

import {
  formatMoney,
  formatMoneyWithKind,
  formatSignedMoney,
  type MoneySignKind,
} from "@/lib/money"
import { cn } from "@/lib/utils"

type MoneyValueSignPolicy = "none" | "auto"
type MoneyValueEmphasis = "muted" | "standard" | "strong"

type MoneyValueProps = Omit<React.ComponentProps<"span">, "children"> & {
  value: number | null | undefined
  currency?: string
  compact?: boolean
  sign?: MoneyValueSignPolicy
  kind?: MoneySignKind
  emphasis?: MoneyValueEmphasis
  unavailableLabel?: string
  accessibleLabel?: string
}

const emphasisClass: Record<MoneyValueEmphasis, string> = {
  muted: "text-muted-foreground",
  standard: "text-foreground",
  strong: "font-semibold text-foreground",
}

function MoneyValue({
  value,
  currency = "VND",
  compact = false,
  sign = "none",
  kind,
  emphasis = "standard",
  unavailableLabel = "Chưa có dữ liệu",
  accessibleLabel,
  className,
  ...props
}: MoneyValueProps) {
  const available = value !== null && value !== undefined && Number.isFinite(value)
  const displayValue = !available
    ? unavailableLabel
    : kind
      ? formatMoneyWithKind(Math.abs(value), kind, compact, currency)
      : sign === "auto"
        ? formatSignedMoney(value, compact, currency)
        : formatMoney(value, compact, currency)

  return (
    <span
      data-slot="money-value"
      data-kind={kind}
      data-available={available ? "true" : "false"}
      aria-label={accessibleLabel ?? displayValue}
      className={cn(
        "whitespace-nowrap tabular-nums [font-variant-numeric:tabular-nums]",
        emphasisClass[emphasis],
        kind === "income" && "text-[var(--mf-income-text)]",
        kind === "expense" && "text-[var(--mf-expense-text)]",
        kind === "transfer" && "text-[var(--mf-transfer-text)]",
        !available && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {displayValue}
    </span>
  )
}

export {
  MoneyValue,
  type MoneyValueEmphasis,
  type MoneyValueProps,
  type MoneyValueSignPolicy,
}
