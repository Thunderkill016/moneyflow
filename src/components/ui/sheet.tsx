"use client"

import * as React from "react"
import { X } from "lucide-react"

import { IconButton } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type SheetSide = "center" | "left" | "right" | "top" | "bottom"

type SheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  side?: SheetSide
  modal?: boolean
  dismissible?: boolean
  closeLabel?: string
  className?: string
}

/**
 * Every side is sized in `svh`.
 *
 * `dvh` tracks mobile browser chrome, so a sheet sized in it grows and shrinks
 * under the user's thumb as the address bar hides and reappears — which is what
 * "positioning is unstable on the real phone" was. `svh` is the smallest
 * viewport state: the sheet fits with chrome visible and then holds still.
 */
const modalSideClass: Record<SheetSide, string> = {
  center: "m-auto h-auto max-h-[calc(100svh-2rem)]",
  left:
    "fixed inset-y-0 left-0 right-auto m-0 h-svh max-h-svh w-[min(28rem,100%)] rounded-none border-y-0 border-l-0",
  right:
    "fixed inset-y-0 right-0 left-auto m-0 h-svh max-h-svh w-[min(28rem,100%)] rounded-none border-y-0 border-r-0",
  top:
    "fixed inset-x-0 top-0 bottom-auto m-0 h-auto max-h-[85svh] w-full max-w-none rounded-none border-x-0 border-t-0",
  bottom:
    "fixed inset-x-0 bottom-0 top-auto m-0 h-auto max-h-[85svh] w-full max-w-none rounded-none border-x-0 border-b-0",
}

const nonModalSideClass: Record<Exclude<SheetSide, "center">, string> = {
  left: "inset-y-0 left-0 h-svh w-[min(28rem,100%)] border-r",
  right: "inset-y-0 right-0 h-svh w-[min(28rem,100%)] border-l",
  top: "inset-x-0 top-0 max-h-[85svh] w-full border-b",
  bottom: "inset-x-0 bottom-0 max-h-[85svh] w-full border-t",
}

function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  modal = true,
  dismissible = true,
  closeLabel = "Đóng",
  className,
}: SheetProps) {
  const titleId = React.useId()
  const descriptionId = description ? `${titleId}-description` : undefined

  if (modal) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        footer={footer}
        dismissible={dismissible}
        closeLabel={closeLabel}
        className={cn(modalSideClass[side], className)}
        contentClassName="h-full"
      >
        {children}
      </Dialog>
    )
  }

  if (!open) return null

  if (side === "center") {
    throw new Error("A non-modal Sheet must use an edge side")
  }

  return (
    <aside
      data-slot="sheet"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className={cn(
        "fixed z-50 grid overflow-hidden bg-background text-foreground shadow-2xl",
        nonModalSideClass[side],
        className
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="grid gap-1">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {dismissible ? (
          <IconButton
            type="button"
            variant="ghost"
            aria-label={closeLabel}
            onClick={() => onOpenChange(false)}
          >
            <X aria-hidden="true" />
          </IconButton>
        ) : null}
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer ? (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom,0px))]">
          {footer}
        </footer>
      ) : null}
    </aside>
  )
}

export { Sheet, type SheetProps, type SheetSide }
