import Link from "next/link"
import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
      targetSize: {
        compat: "",
        aa: "min-h-6 min-w-6",
        important: "min-h-11 min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      targetSize: "compat",
    },
  }
)

type ButtonIntent = "primary" | "secondary" | "quiet" | "destructive"
type ButtonDensity = "standard" | "compact"
type ButtonTargetSize = "compat" | "aa" | "important"

const targetSizeClass: Record<ButtonTargetSize, string> = {
  compat: "",
  aa: "min-h-6 min-w-6",
  important: "min-h-11 min-w-11",
}

type ButtonProps = ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    intent?: ButtonIntent
    density?: ButtonDensity
    pending?: boolean
    pendingLabel?: React.ReactNode
    unstyled?: boolean
  }

const intentVariant: Record<ButtonIntent, NonNullable<ButtonProps["variant"]>> = {
  primary: "default",
  secondary: "secondary",
  quiet: "ghost",
  destructive: "destructive",
}

const densitySize: Record<ButtonDensity, NonNullable<ButtonProps["size"]>> = {
  standard: "default",
  compact: "sm",
}

function Button({
  className,
  variant,
  size,
  targetSize = "compat",
  intent,
  density,
  pending = false,
  pendingLabel,
  unstyled = false,
  disabled,
  children,
  "aria-busy": ariaBusy,
  ...props
}: ButtonProps) {
  const resolvedVariant = variant ?? (intent ? intentVariant[intent] : "default")
  const resolvedSize = size ?? (density ? densitySize[density] : "default")

  return (
    <ButtonPrimitive
      data-slot="button"
      data-pending={pending ? "true" : undefined}
      aria-busy={pending || ariaBusy || undefined}
      disabled={disabled || pending}
      className={cn(
        unstyled
          ? targetSizeClass[targetSize]
          : buttonVariants({
              variant: resolvedVariant,
              size: resolvedSize,
              targetSize,
            }),
        className
      )}
      {...props}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </ButtonPrimitive>
  )
}

type LinkButtonProps = Omit<React.ComponentProps<typeof Link>, "className"> &
  VariantProps<typeof buttonVariants> & {
    className?: string
    intent?: ButtonIntent
    density?: ButtonDensity
    unstyled?: boolean
  }

function LinkButton({
  className,
  variant,
  size,
  targetSize = "compat",
  intent,
  density,
  unstyled = false,
  ...props
}: LinkButtonProps) {
  const resolvedVariant = variant ?? (intent ? intentVariant[intent] : "default")
  const resolvedSize = size ?? (density ? densitySize[density] : "default")

  return (
    <Link
      data-slot="link-button"
      className={cn(
        unstyled
          ? targetSizeClass[targetSize]
          : buttonVariants({
              variant: resolvedVariant,
              size: resolvedSize,
              targetSize,
            }),
        className
      )}
      {...props}
    />
  )
}

type IconButtonProps = Omit<ButtonProps, "aria-label" | "children" | "size"> & {
  "aria-label": string
  children: React.ReactNode
  size?: "icon" | "icon-xs" | "icon-sm" | "icon-lg"
}

function IconButton({
  size = "icon",
  targetSize = "important",
  ...props
}: IconButtonProps) {
  return <Button size={size} targetSize={targetSize} {...props} />
}

export {
  Button,
  IconButton,
  LinkButton,
  buttonVariants,
  type ButtonDensity,
  type ButtonIntent,
  type ButtonProps,
  type ButtonTargetSize,
  type IconButtonProps,
  type LinkButtonProps,
}
