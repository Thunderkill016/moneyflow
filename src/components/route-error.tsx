"use client";

import Link from "next/link";
import { useEffect } from "react";
import { routeErrorCode } from "@/lib/route-error-code";
import { logClientError } from "@/lib/safe-log";
import { trackProductEvent } from "@/lib/safe-analytics";
import { supportMailtoHref } from "@/lib/support-contact";

export type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  /** Primary recovery destination after a hard failure. */
  homeHref?: string;
  homeLabel?: string;
  /** Short label for analytics (no PII / no raw payload). */
  routeKey?: string;
};

/**
 * Shared segment error UI (wireframes §21 + AGENTS: every data page needs error).
 * Never surface error.message / stack / statement body in UI, console, or analytics.
 */
export function RouteError({
  error,
  reset,
  homeHref = "/insights",
  homeLabel = "Về Tổng quan",
  routeKey = "app",
}: RouteErrorProps) {
  const code = routeErrorCode(error);
  const supportHref = supportMailtoHref(
    "Hỗ trợ Money Flow",
    `Mã lỗi: ${code}\n\n(Mô tả ngắn — không dán raw/sao kê tài chính.)\n`,
  );

  useEffect(() => {
    logClientError("route_error", error);
    trackProductEvent("route_error", {
      has_digest: Boolean(error.digest),
      route: routeKey,
    });
  }, [error, routeKey]);

  return (
    <main className="route-error">
      <div>
        <p className="eyebrow">Money Flow</p>
        <h1>Có lỗi xảy ra</h1>
        <p className="route-error-lead">
          Không tải được màn hình này. Dữ liệu của bạn vẫn được bảo vệ.
        </p>
        <p className="route-error-code font-mono">
          Mã: {code} · Đã ghi nhận (không kèm raw tài chính)
        </p>
        <div className="route-error-actions">
          <button type="button" className="primary-button" onClick={reset}>
            Thử lại
          </button>
          <Link className="secondary-button" href={homeHref}>
            {homeLabel}
          </Link>
          <a className="secondary-button" href={supportHref}>
            Liên hệ hỗ trợ
          </a>
        </div>
      </div>
    </main>
  );
}

