import type { ReactNode } from "react";
import type { PlanningCardTone } from "@/lib/planning-pages";
import { cn } from "@/lib/utils";
import styles from "./planning-card.module.css";

export type PlanningCardProps = {
  children: ReactNode;
  /** Calm threshold/state; visible text inside the card remains authoritative. */
  tone?: PlanningCardTone;
  className?: string;
  "aria-label"?: string;
};

export function PlanningCard({
  children,
  tone = "ok",
  className,
  "aria-label": ariaLabel,
}: PlanningCardProps) {
  return (
    <article
      data-slot="planning-card"
      data-tone={tone}
      className={cn(styles.card, className)}
      aria-label={ariaLabel}
    >
      {children}
    </article>
  );
}
