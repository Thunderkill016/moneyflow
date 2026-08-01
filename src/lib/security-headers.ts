import {
  parseAuthCaptchaConfig,
  TURNSTILE_ORIGIN,
} from "./auth-captcha.ts";

type Header = Readonly<{ key: string; value: string }>;

function authCaptchaReadyFromEnv(): boolean {
  return parseAuthCaptchaConfig(
    process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED,
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  ).ready;
}

export function buildContentSecurityPolicy(
  isProduction: boolean = process.env.NODE_ENV === "production",
  authCaptchaReady: boolean = authCaptchaReadyFromEnv(),
): string {
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "https://va.vercel-scripts.com",
  ];
  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
    "https://vitals.vercel-insights.com",
  ];
  if (!isProduction) scriptSources.push("'unsafe-eval'");
  if (authCaptchaReady) {
    scriptSources.push(TURNSTILE_ORIGIN);
    connectSources.push(TURNSTILE_ORIGIN);
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "script-src-attr 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    authCaptchaReady
      ? `frame-src ${TURNSTILE_ORIGIN}`
      : "frame-src 'none'",
  ].join("; ");
}

export function buildSecurityHeaders(
  isProduction: boolean = process.env.NODE_ENV === "production",
  authCaptchaReady: boolean = authCaptchaReadyFromEnv(),
): readonly Header[] {
  return [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isProduction, authCaptchaReady),
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Origin-Agent-Cluster", value: "?1" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  ] as const;
}
