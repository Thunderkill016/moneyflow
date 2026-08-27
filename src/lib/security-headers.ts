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
    /*
     * `'unsafe-inline'` is kept deliberately, and this is the reason.
     *
     * The alternative is a per-request nonce, and Next is explicit that it
     * "must use dynamic rendering to add nonces". This app prerenders 35 of its
     * 51 routes as static content; a nonce would turn every one of them into a
     * function invocation on every request. Production currently measures LCP
     * 2.4s and CLS 0 on throttled mobile — that is what would be spent.
     *
     * Hashes are not an option either: Next's inline scripts carry per-page
     * flight data (`self.__next_f.push(...)`), so they differ per page and per
     * build and cannot be enumerated ahead of time.
     *
     * What limits the damage instead: `script-src-attr 'none'` blocks inline
     * event handlers such as `onclick=`, `object-src 'none'` and
     * `base-uri 'self'` close the two classic bypasses, and every other
     * directive below is an allowlist rather than a wildcard. Revisit this if
     * the app ever becomes predominantly dynamic, when the trade reverses.
     */
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
    /*
     * Every image and font this product serves comes from its own origin —
     * measured on production across `/`, `/login`, `/security` and `/privacy`:
     * 3 images and 12 fonts, all from the app itself, none from anywhere else.
     * `https:` allowed any HTTPS host on the internet to be an image source,
     * which is a tracking-pixel and exfiltration channel for nothing gained.
     * `data:` and `blob:` stay because uploaded receipts are previewed locally.
     */
    "img-src 'self' data: blob:",
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
