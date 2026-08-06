import * as React from "react"

import { cn } from "@/lib/utils"

type TextFieldTargetSize = "aa" | "important"

type TextFieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  ref?: React.Ref<HTMLInputElement>
  label: React.ReactNode
  description?: React.ReactNode
  error?: React.ReactNode
  correctionSuggestion?: React.ReactNode
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  pending?: boolean
  targetSize?: TextFieldTargetSize
  rootClassName?: string
  inputClassName?: string
  /** @deprecated Prefer the React 19 `ref` prop. Kept while existing consumers migrate. */
  inputRef?: React.Ref<HTMLInputElement>
}

function joinIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(" ") || undefined
}

function TextField({
  ref: forwardedRef,
  id,
  label,
  description,
  error,
  correctionSuggestion,
  prefix,
  suffix,
  pending = false,
  targetSize = "aa",
  rootClassName,
  inputClassName,
  inputRef,
  disabled,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextFieldProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const descriptionId = description ? `${inputId}-description` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const suggestionId = correctionSuggestion ? `${inputId}-suggestion` : undefined
  const resolvedRef = forwardedRef ?? inputRef

  return (
    <div data-slot="text-field" className={cn("grid gap-1.5", rootClassName)}>
      <label htmlFor={inputId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div
        data-slot="text-field-control"
        className={cn(
          "flex items-center rounded-lg border border-input bg-background shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          error && "border-destructive focus-within:border-destructive focus-within:ring-destructive/20",
          disabled && "cursor-not-allowed opacity-50",
          targetSize === "important" ? "min-h-11" : "min-h-9"
        )}
      >
        {prefix ? (
          <span aria-hidden="true" className="pl-3 text-muted-foreground">
            {prefix}
          </span>
        ) : null}
        <input
          ref={resolvedRef}
          id={inputId}
          data-slot="text-field-input"
          aria-invalid={error ? true : undefined}
          aria-busy={pending || undefined}
          aria-describedby={joinIds(
            ariaDescribedBy,
            descriptionId,
            errorId,
            suggestionId
          )}
          disabled={disabled || pending}
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed sm:text-sm",
            inputClassName
          )}
          {...props}
        />
        {suffix ? (
          <span aria-hidden="true" className="pr-3 text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {correctionSuggestion ? (
        <p id={suggestionId} className="text-sm text-muted-foreground">
          {correctionSuggestion}
        </p>
      ) : null}
    </div>
  )
}

export { TextField, type TextFieldProps, type TextFieldTargetSize }