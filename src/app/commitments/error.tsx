"use client";

import { RouteError } from "@/components/route-error";

export default function CommitmentsError({
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
      homeHref="/commitments"
      homeLabel="Về Khoản định kỳ"
      routeKey="commitments"
    />
  );
}
