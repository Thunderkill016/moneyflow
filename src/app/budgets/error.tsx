"use client";

import { RouteError } from "@/components/route-error";

export default function BudgetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      homeHref="/budgets"
      homeLabel="Về Ngân sách"
      routeKey="budgets"
    />
  );
}
