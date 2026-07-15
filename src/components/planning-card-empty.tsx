import Link from "next/link";
import type { PlanningCardEmptyConfig } from "@/lib/insights-planning-empty";

export type PlanningCardEmptyProps = PlanningCardEmptyConfig & {
  className?: string;
};

/**
 * Compact empty for Insights planning cards (budget / bill / goal / weekly).
 * Exactly one primary CTA when action is provided — no secondary.
 */
export function PlanningCardEmpty({
  description,
  actionLabel,
  actionHref,
  className,
}: PlanningCardEmptyProps) {
  const hasAction = Boolean(actionLabel?.trim() && actionHref?.trim());

  return (
    <div className={`planning-card-empty${className ? ` ${className}` : ""}`}>
      <p>{description}</p>
      {hasAction ? (
        <Link href={actionHref!} className="planning-card-empty-cta">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
