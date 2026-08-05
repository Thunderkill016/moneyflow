"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type CheckboxFieldTargetSize = "aa" | "important"

type CheckboxFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "ref"
> & {
  label: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  indeterminate?: boolean
  targetSize?: CheckboxFieldTargetSize
  rootClassName?: string
}

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined
}

function CheckboxField({
  id,
  label,
  description,
  error,
  indeterminate = false,
  targetSize = "aa",
  rootClassName,
  "aria-describedby": ariaDescribedBy,
  ...props
}: CheckboxFieldProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <div data-slot="checkbox-field" className={cn("grid gap-1", rootClassName)}>
      <label
        htmlFor={inputId}
        className={cn(
          "flex cursor-pointer items-start gap-3 rounded-lg text-sm text-foreground",
          targetSize === "important" ? "min-h-11 py-2" : "min-h-6 py-0.5",
          props.disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          {...props}
          ref={inputRef}
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={joinIds(ariaDescribedBy, descriptionId, errorId)}
          className="mt-0.5 size-4 shrink-0 accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="grid gap-0.5">
          <span className="font-medium">{label}</span>
          {description ? (
            <span id={descriptionId} className="text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
      </label>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export {
  CheckboxField,
  type CheckboxFieldProps,
  type CheckboxFieldTargetSize,
}
