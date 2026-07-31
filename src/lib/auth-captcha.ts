export const AUTH_CAPTCHA_ENABLED_ENV = "NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED";
export const TURNSTILE_SITE_KEY_ENV = "NEXT_PUBLIC_TURNSTILE_SITE_KEY";
export const CAPTCHA_TOKEN_FIELD = "captchaToken";
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";
export const TURNSTILE_SCRIPT_URL = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;

const MAX_CAPTCHA_TOKEN_LENGTH = 4096;

export type AuthCaptchaConfig = Readonly<{
  enabled: boolean;
  siteKey: string | null;
  ready: boolean;
}>;

export function parseAuthCaptchaConfig(
  enabledValue: string | null | undefined,
  siteKeyValue: string | null | undefined,
): AuthCaptchaConfig {
  const enabled = enabledValue?.trim().toLowerCase() === "true";
  const siteKey = siteKeyValue?.trim() || null;

  return {
    enabled,
    siteKey,
    ready: enabled && siteKey !== null,
  };
}

export function getPublicAuthCaptchaConfig(): AuthCaptchaConfig {
  return parseAuthCaptchaConfig(
    process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED,
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

export function normalizeCaptchaToken(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const token = value.trim();
  if (!token || token.length > MAX_CAPTCHA_TOKEN_LENGTH) return undefined;
  return token;
}

export function captchaTokenRequiredButMissing(
  config: AuthCaptchaConfig,
  token: string | undefined,
): boolean {
  return config.enabled && (!config.ready || !token);
}
