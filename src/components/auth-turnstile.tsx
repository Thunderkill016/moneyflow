"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  CAPTCHA_TOKEN_FIELD,
  TURNSTILE_SCRIPT_URL,
} from "@/lib/auth-captcha";
import styles from "./auth-turnstile.module.css";

type TurnstileRenderOptions = {
  sitekey: string;
  theme: "auto";
  size: "flexible" | "compact";
  appearance: "interaction-only";
  language: "vi";
  retry: "auto";
  "refresh-expired": "auto";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

function getTurnstile(): TurnstileApi | null {
  if (typeof window === "undefined") return null;
  return window.turnstile ?? null;
}

export function AuthTurnstile({
  siteKey,
  token,
  pending,
  className,
  onTokenChange,
}: {
  siteKey: string;
  token: string;
  pending: boolean;
  className?: string;
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const wasPendingRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState("Đang tải xác minh bảo mật…");

  useEffect(() => {
    const turnstile = getTurnstile();
    const container = containerRef.current;
    if (!scriptReady || !turnstile || !container || widgetIdRef.current) {
      return;
    }

    const size = window.matchMedia("(max-width: 380px)").matches
      ? "compact"
      : "flexible";

    widgetIdRef.current = turnstile.render(container, {
      sitekey: siteKey,
      theme: "auto",
      size,
      appearance: "interaction-only",
      language: "vi",
      retry: "auto",
      "refresh-expired": "auto",
      callback(nextToken) {
        onTokenChange(nextToken);
        setStatus("Đã xác minh bảo mật.");
      },
      "expired-callback"() {
        onTokenChange("");
        setStatus("Xác minh đã hết hạn và đang được làm mới.");
      },
      "error-callback"() {
        onTokenChange("");
        setStatus("Không thể xác minh. Kiểm tra kết nối rồi thử lại.");
      },
    });

    return () => {
      const current = getTurnstile();
      if (current && widgetIdRef.current) {
        current.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, [onTokenChange, scriptReady, siteKey]);

  useEffect(() => {
    if (wasPendingRef.current && !pending && widgetIdRef.current) {
      getTurnstile()?.reset(widgetIdRef.current);
      onTokenChange("");
      setStatus("Đang xác minh lại cho lần thử tiếp theo…");
    }
    wasPendingRef.current = pending;
  }, [onTokenChange, pending]);

  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <Script
        id="moneyflow-auth-turnstile"
        src={TURNSTILE_SCRIPT_URL}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() =>
          setStatus("Không thể tải xác minh bảo mật. Hãy tải lại trang.")
        }
      />
      <input type="hidden" name={CAPTCHA_TOKEN_FIELD} value={token} />
      <div className={styles.widget} ref={containerRef} />
      <small className={styles.status} role="status" aria-live="polite">
        {status}
      </small>
    </div>
  );
}
