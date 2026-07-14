"use client";

import { RouteError } from "@/components/route-error";

export default function AccountsError({
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
      homeHref="/accounts"
      homeLabel="Về Tài khoản"
      routeKey="accounts"
    />
  );
}
