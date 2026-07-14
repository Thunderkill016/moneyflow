"use client";

import { RouteError } from "@/components/route-error";

export default function InsightsError({
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
      homeHref="/insights"
      homeLabel="Về Tổng quan"
      routeKey="insights"
    />
  );
}
