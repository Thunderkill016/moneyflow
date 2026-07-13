import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      primary: "primary-button",
      secondary: "secondary-button",
      ghost: "ui-button-ghost",
      destructive: "ui-button-destructive",
      icon: "icon-button",
    },
    size: {
      default: "ui-button-default",
      sm: "ui-button-sm",
      icon: "ui-button-icon",
    },
  },
  defaultVariants: { variant: "primary", size: "default" },
});

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return <Component className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
