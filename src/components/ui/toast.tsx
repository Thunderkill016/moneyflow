import * as React from "react"

import { cn } from "@/lib/utils"

type ToastTone = "neutral" | "info" | "success" | "warning" | "error"

type ToastMessage = {
  id: string
  title: React.ReactNode
  description?: React.ReactNode
  tone?: ToastTone
  urgent?: boolean
  action?: React.ReactNode
}

type ToastProps = ToastMessage & {
  className?: string
}

type ToastRegionProps = Omit<
  React.ComponentPropsWithoutRef<"section">,
  "aria-label" | "children" | "onMouseEnter" | "onMouseLeave" | "onFocus" | "onBlur"
> & {
  messages: readonly ToastMessage[]
  label?: string
  /**
   * Reports whether the reader is interacting with the region — pointer over
   * a toast or focus inside one. Timed toasts use it to pause their
   * auto-dismiss countdown (WCAG 2.2.1): a toast carrying the only recovery
   * path for an action must not keep ticking while it is being read.
   */
  onHoldChange?: (held: boolean) => void
}

const toneClass: Record<ToastTone, string> = {
  neutral: "border-border bg-background text-foreground",
  info:
    "border-[var(--mf-info-border)] bg-[var(--mf-info-subtle)] text-[var(--mf-info-text)]",
  success:
    "border-[var(--mf-income-border)] bg-[var(--mf-income-subtle)] text-[var(--mf-income-text)]",
  warning:
    "border-[var(--mf-warning-border)] bg-[var(--mf-warning-subtle)] text-[var(--mf-warning-text)]",
  error:
    "border-[var(--mf-expense-border)] bg-[var(--mf-expense-subtle)] text-[var(--mf-expense-text)]",
}

function Toast({
  title,
  description,
  tone = "neutral",
  urgent = false,
  action,
  className,
}: ToastProps) {
  return (
    <article
      data-slot="toast"
      data-tone={tone}
      role={urgent ? "alert" : undefined}
      className={cn(
        "pointer-events-auto grid min-w-0 gap-1 rounded-xl border px-4 py-3 text-sm shadow-lg",
        toneClass[tone],
        className
      )}
    >
      <div className="min-w-0 font-semibold">{title}</div>
      {description ? <div>{description}</div> : null}
      {action ? <div className="mt-1 flex flex-wrap gap-2">{action}</div> : null}
    </article>
  )
}

function ToastRegion({
  messages,
  label = "Thông báo",
  className,
  onHoldChange,
  ...props
}: ToastRegionProps) {
  const uniqueMessages = Array.from(
    new Map(messages.map((message) => [message.id, message])).values()
  )
  const routineMessages = uniqueMessages.filter((message) => !message.urgent)
  const urgentMessages = uniqueMessages.filter((message) => message.urgent)

  /*
   * Hover and focus are independent hold sources — releasing one while the
   * other is still inside the region must not lift the hold. `held` only
   * flips (and only notifies) when the combined state changes.
   */
  const holdRef = React.useRef({ hover: false, focus: false, held: false })
  function setHold(kind: "hover" | "focus", active: boolean) {
    const state = holdRef.current
    if (state[kind] === active) return
    state[kind] = active
    const held = state.hover || state.focus
    if (held !== state.held) {
      state.held = held
      onHoldChange?.(held)
    }
  }

  return (
    <section
      data-slot="toast-region"
      aria-label={label}
      className={cn(
        "pointer-events-none fixed right-4 bottom-4 z-[100] grid w-[min(24rem,calc(100%-2rem))] gap-2",
        className
      )}
      onMouseEnter={() => setHold("hover", true)}
      onMouseLeave={() => setHold("hover", false)}
      onFocus={() => setHold("focus", true)}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
          setHold("focus", false)
        }
      }}
      {...props}
    >
      <div aria-live="polite" aria-relevant="additions text" className="grid gap-2">
        {routineMessages.map((message) => (
          <Toast key={message.id} {...message} />
        ))}
      </div>
      <div className="grid gap-2">
        {urgentMessages.map((message) => (
          <Toast key={message.id} {...message} />
        ))}
      </div>
    </section>
  )
}

export {
  Toast,
  ToastRegion,
  type ToastMessage,
  type ToastProps,
  type ToastRegionProps,
  type ToastTone,
}
