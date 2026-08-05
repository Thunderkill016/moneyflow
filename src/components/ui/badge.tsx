import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      tone: {
        neutral: "border-border bg-muted text-foreground",
        info:
          "border-[var(--mf-info-border)] bg-[var(--mf-info-soft)] text-[var(--mf-info-text)]",
        income:
          "border-[var(--mf-income-border)] bg-[var(--mf-income-soft)] text-[var(--mf-income-text)]",
        warning:
          "border-[var(--mf-warning-border)] bg-[var(--mf-warning-soft)] text-[var(--mf-warning-text)]",
        expense:
          "border-[var(--mf-expense-border)] bg-[var(--mf-expense-soft)] text-[var(--mf-expense-text)]",
        transfer:
          "border-[var(--mf-transfer-border)] bg-[var(--mf-transfer-soft)] text-[var(--mf-transfer-text)]",
      },
      density: {
        standard: "h-5 px-2 py-0.5",
        compact: "h-4 px-1.5 py-0 text-[0.6875rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      density: "standard",
    },
  }
)

type BadgeTone =
  | "neutral"
  | "info"
  | "income"
  | "warning"
  | "expense"
  | "transfer"

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    tone?: BadgeTone
  }

function Badge({
  className,
  variant,
  tone,
  density = "standard",
  render,
  ...props
}: BadgeProps) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(
          badgeVariants({
            variant: tone ? undefined : (variant ?? "default"),
            tone,
            density,
          }),
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant: tone ?? variant ?? "default",
    },
  })
}

export { Badge, badgeVariants, type BadgeProps, type BadgeTone }
