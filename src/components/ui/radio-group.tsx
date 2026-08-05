"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type RadioGroupTargetSize = "aa" | "important"

type RadioOption = {
  value: string
  label: React.ReactNode
  description?: React.ReactNode
  disabled?: boolean
}

type RadioGroupProps = {
  name: string
  legend: React.ReactNode
  options: readonly RadioOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  description?: React.ReactNode
  error?: React.ReactNode
  disabled?: boolean
  required?: boolean
  targetSize?: RadioGroupTargetSize
  className?: string
}

function RadioGroup({
  name,
  legend,
  options,
  value,
  defaultValue,
  onValueChange,
  description,
  error,
  disabled = false,
  required = false,
  targetSize = "aa",
  className,
}: RadioGroupProps) {
  const groupId = React.useId()
  const descriptionId = description ? `${groupId}-description` : undefined
  const errorId = error ? `${groupId}-error` : undefined

  return (
    <fieldset
      data-slot="radio-group"
      aria-describedby={[descriptionId, errorId].filter(Boolean).join(" ") || undefined}
      aria-invalid={error ? true : undefined}
      disabled={disabled}
      className={cn("grid gap-2", className)}
    >
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <div className="grid gap-1.5">
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`
          const optionDescriptionId = option.description
            ? `${optionId}-description`
            : undefined
          const checked = value === undefined ? undefined : value === option.value

          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-lg text-sm text-foreground",
                targetSize === "important" ? "min-h-11 py-2" : "min-h-6 py-0.5",
                (disabled || option.disabled) && "cursor-not-allowed opacity-50"
              )}
            >
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                defaultChecked={
                  value === undefined ? defaultValue === option.value : undefined
                }
                required={required}
                disabled={option.disabled}
                aria-describedby={optionDescriptionId}
                onChange={(event) => {
                  if (event.currentTarget.checked) onValueChange?.(event.currentTarget.value)
                }}
                className="mt-0.5 size-4 shrink-0 accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <span className="grid gap-0.5">
                <span className="font-medium">{option.label}</span>
                {option.description ? (
                  <span id={optionDescriptionId} className="text-muted-foreground">
                    {option.description}
                  </span>
                ) : null}
              </span>
            </label>
          )
        })}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}

export {
  RadioGroup,
  type RadioGroupProps,
  type RadioGroupTargetSize,
  type RadioOption,
}
