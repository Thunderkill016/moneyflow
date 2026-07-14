"use client";

import { RouteError } from "@/components/route-error";

export default function IncomeTemplatesError({
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
      homeHref="/income-templates"
      homeLabel="Về Lương định kỳ"
      routeKey="income-templates"
    />
  );
}
