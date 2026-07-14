"use client";

import { RouteError } from "@/components/route-error";

export default function SettingsError({
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
      homeHref="/settings"
      homeLabel="Về Cài đặt"
      routeKey="settings"
    />
  );
}
