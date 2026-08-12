"use client"

import * as React from "react"
import { X } from "lucide-react"

import { IconButton } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import styles from "./dialog.module.css"

type DialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  dismissible?: boolean
  closeLabel?: string
  initialFocusRef?: React.RefObject<HTMLElement | null>
  className?: string
  contentClassName?: string
}

function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  dismissible = true,
  closeLabel = "Đóng",
  initialFocusRef,
  className,
  contentClassName,
}: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null)
  const restoreFocusRef = React.useRef<HTMLElement | null>(null)
  const titleId = React.useId()
  const descriptionId = description ? `${titleId}-description` : undefined

  React.useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null
      dialog.showModal()
      queueMicrotask(() => {
        const focusTarget =
          initialFocusRef?.current ??
          dialog.querySelector<HTMLElement>(
            "[autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
          )
        focusTarget?.focus()
      })
    }

    if (!open && dialog.open) dialog.close()
  }, [initialFocusRef, open])

  React.useEffect(() => {
    if (open) return
    const target = restoreFocusRef.current
    if (target?.isConnected) target.focus()
    restoreFocusRef.current = null
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      data-slot="dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      /**
       * `svh`, not `dvh`. The dynamic viewport unit changes as mobile browser
       * chrome shows and hides, so a dialog sized in `dvh` resizes and jumps
       * while the user scrolls it. `svh` is the smallest viewport state, so the
       * dialog fits with chrome visible and then stays put.
       */
      className={cn(
        "m-auto max-h-[calc(100svh-2rem)] w-[min(36rem,calc(100%-2rem))] overflow-visible rounded-2xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 open:grid",
        className
      )}
      onCancel={(event) => {
        if (!dismissible) {
          event.preventDefault()
          return
        }
        event.preventDefault()
        onOpenChange(false)
      }}
      onClose={() => {
        if (open) onOpenChange(false)
      }}
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onOpenChange(false)
      }}
    >
      <section
        data-slot="dialog-content"
        className={cn(styles.content, contentClassName)}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="grid gap-1">
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
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
              size="icon"
              aria-label={closeLabel}
              onClick={() => onOpenChange(false)}
            >
              <X aria-hidden="true" />
            </IconButton>
          ) : null}
        </header>
        <div data-slot="dialog-body" className={styles.body}>
          {children}
        </div>
        {footer ? (
          <footer className={styles.footer}>{footer}</footer>
        ) : null}
      </section>
    </dialog>
  )
}

export { Dialog, type DialogProps }
