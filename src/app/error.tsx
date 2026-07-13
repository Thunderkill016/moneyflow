"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="route-error">
      <div>
        <p className="eyebrow">MoneyFlow</p>
        <h1>Chưa tải được dữ liệu</h1>
        <p>Kết nối có thể đang gián đoạn. Dữ liệu của bạn vẫn được bảo vệ.</p>
        <button className="primary-button" onClick={reset}>Thử lại</button>
      </div>
    </main>
  );
}
