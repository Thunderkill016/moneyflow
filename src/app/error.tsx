"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Segment error boundary (wireframes-inbox §21).
 * No raw financial payload in message or contact URL.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const code = error.digest
    ? `mf_${error.digest.slice(0, 8)}`
    : "mf_500";
  const supportHref = `mailto:support@moneyflow.app?subject=${encodeURIComponent(
    "Hỗ trợ Money Flow",
  )}&body=${encodeURIComponent(
    `Mã lỗi: ${code}\n\n(Mô tả ngắn — không dán raw/sao kê tài chính.)\n`,
  )}`;

  useEffect(() => {
    console.error(error);
  }, [error]);

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
          <Link className="secondary-button" href="/inbox">
            Về Inbox
          </Link>
          <a className="secondary-button" href={supportHref}>
            Liên hệ hỗ trợ
          </a>
        </div>
      </div>
    </main>
  );
}
