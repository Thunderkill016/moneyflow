"use client";

import { RouteError } from "@/components/route-error";

export default function ActivityError({
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
      homeHref="/activity"
      homeLabel="Về Hoạt động"
      routeKey="activity"
    />
  );
}
