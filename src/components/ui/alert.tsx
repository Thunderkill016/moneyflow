import * as React from "react"

import { cn } from "@/lib/utils"

type AlertTone = "neutral" | "info" | "success" | "warning" | "error"
type AlertLive = "off" | "polite" | "assertive"

type AlertProps = React.ComponentProps<"div"> & {
  tone?: AlertTone
  live?: AlertLive
}

const toneClass: Record<AlertTone, string> = {
  neutral: "border-border bg-muted text-foreground",
  info:
    "border-[var(--mf-info-border)] bg-[var(--mf-info-subtle)] text-[var(--mf-info-text)]",
  success:
    "border-[var(--mf-income-border)] bg-[var(--mf-income-subtle)] text-[var(--mf-income-text)]",
  warning:
    "border-[var(--mf-warning-border)] bg-[var(--mf-warning-subtle)] text-[var(--mf-warning-text)]",
  error:
    "border-[var(--mf-expense-border)] bg-[var(--mf-expense-subtle)] text-[var(--mf-expense-text)]",
}

function Alert({
  className,
  tone = "neutral",
  live = "off",
  role,
  ...props
}: AlertProps) {
  const resolvedRole = role ?? (live === "assertive" ? "alert" : live === "polite" ? "status" : undefined)

  return (
    <div
      data-slot="alert"
      data-tone={tone}
      role={resolvedRole}
      aria-live={live === "off" ? undefined : live}
      className={cn(
        "grid gap-1 rounded-xl border px-4 py-3 text-sm",
        toneClass[tone],
        className
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="alert-title"
      className={cn("font-semibold", className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-current/85", className)}
      {...props}
    />
  )
}

export {
  Alert,
  AlertDescription,
  AlertTitle,
  type AlertLive,
  type AlertProps,
  type AlertTone,
}
