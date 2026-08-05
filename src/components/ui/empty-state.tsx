import * as React from "react"

import { cn } from "@/lib/utils"

type EmptyStateProps = React.ComponentProps<"section"> & {
  icon?: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  primaryAction?: React.ReactNode
  secondaryAction?: React.ReactNode
}

function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <section
      data-slot="empty-state"
      className={cn(
        "grid justify-items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-10 text-center",
        className
      )}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className="text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <div className="grid max-w-prose gap-1">
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {primaryAction || secondaryAction ? (
        <div
          data-slot="empty-state-actions"
          className="flex flex-wrap justify-center gap-2"
        >
          {primaryAction ? (
            <span data-slot="empty-state-primary-action" className="contents">
              {primaryAction}
            </span>
          ) : null}
          {secondaryAction ? (
            <span data-slot="empty-state-secondary-action" className="contents">
              {secondaryAction}
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export { EmptyState, type EmptyStateProps }
