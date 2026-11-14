export interface BuildCommitResolution {
  commit: string | null;
  source: string | null;
  error: string | null;
}

const COMMIT_PATTERN = /^[0-9a-f]{40}$/iu;

export const BUILD_COMMIT: string | null =
  process.env.NEXT_PUBLIC_BUILD_COMMIT || null;

export function resolveBuildCommit(
  env: Record<string, string | undefined>,
): BuildCommitResolution {
  const sources = [
    "VERCEL_GIT_COMMIT_SHA",
    "GITHUB_SHA",
    "MF_BUILD_COMMIT",
  ] as const;

  for (const name of sources) {
    const raw = env[name]?.trim().toLowerCase();
    if (!raw) continue;
    if (!COMMIT_PATTERN.test(raw)) {
      return {
        commit: null,
        source: name,
        error: `${name} is set but is not a git commit SHA: "${raw.slice(0, 24)}"`,
      };
    }
    return { commit: raw, source: name, error: null };
  }

  return { commit: null, source: null, error: null };
}

export function shortBuildId(commit: string | null = BUILD_COMMIT): string {
  if (!commit || !/^[0-9a-f]{7,40}$/iu.test(commit)) return "dev";
  return commit.slice(0, 7);
}

export function buildSecurityHeaders(
  isProduction: boolean = process.env.NODE_ENV === "production",
): ReadonlyArray<{ key: string; value: string }> {
  const scriptSrc = isProduction
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'none'",
  ].join("; ");

  return [
    { key: "Content-Security-Policy", value: csp },
    ...(isProduction
      ? [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ]
      : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}
