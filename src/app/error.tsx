"use client";

import { RouteError } from "@/components/route-error";

/**
 * Root segment error boundary (wireframes §21).
 * No raw financial payload in message, console, analytics, or contact URL.
 */
export default function ErrorBoundary({
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
      homeHref="/"
      homeLabel="Về trang chủ"
      routeKey="root"
    />
  );
}
