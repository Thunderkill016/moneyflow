import type { ReactNode } from "react";
import type { PlanningCardTone } from "@/lib/planning-pages";

export type PlanningCardProps = {
  children: ReactNode;
  /** Calm threshold / state — pairs with text inside the card, never color alone. */
  tone?: PlanningCardTone;
  className?: string;
  "aria-label"?: string;
};

/**
 * R6 — Shared shell for budgets / commitments / goals list cards.
 * Domain layout lives in children; shell only owns border, radius, elevation, tone.
 */
export function PlanningCard({
  children,
  tone = "ok",
  className,
  "aria-label": ariaLabel,
}: PlanningCardProps) {
  const toneClass = tone !== "ok" ? ` planning-card--${tone}` : "";
  const extra = className ? ` ${className}` : "";
  return (
    <article
      className={`planning-card${toneClass}${extra}`}
      aria-label={ariaLabel}
    >
      {children}
    </article>
  );
}
