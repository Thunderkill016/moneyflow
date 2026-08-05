import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

type SelectFieldTargetSize = "aa" | "important"

type SelectFieldProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  placeholder?: string
  targetSize?: SelectFieldTargetSize
  rootClassName?: string
  selectClassName?: string
}

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined
}

function SelectField({
  id,
  label,
  description,
  error,
  placeholder,
  targetSize = "aa",
  rootClassName,
  selectClassName,
  children,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectFieldProps) {
  const generatedId = React.useId()
  const selectId = id ?? generatedId
  const descriptionId = description ? `${selectId}-description` : undefined
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div data-slot="select-field" className={cn("grid gap-1.5", rootClassName)}>
      <label htmlFor={selectId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="relative">
        <select
          id={selectId}
          data-slot="select-field-control"
          aria-invalid={error ? true : undefined}
          aria-describedby={joinIds(ariaDescribedBy, descriptionId, errorId)}
          className={cn(
            "w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 pr-10 text-base text-foreground shadow-xs outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm",
            error && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            targetSize === "important" ? "min-h-11" : "min-h-9",
            selectClassName
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { SelectField, type SelectFieldProps, type SelectFieldTargetSize }
