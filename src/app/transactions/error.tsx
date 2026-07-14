"use client";

import { RouteError } from "@/components/route-error";

export default function TransactionsError({
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
      homeHref="/transactions"
      homeLabel="Về Giao dịch"
      routeKey="transactions"
    />
  );
}
