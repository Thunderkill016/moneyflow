export const ACCOUNT_DELETION_RECENT_AUTH_MAX_AGE_SECONDS = 10 * 60;

// MoneyFlow currently exposes only password and Google OAuth as interactive
// sign-in methods. Keep this allowlist narrower than Supabase's full AMR
// vocabulary so unrelated flows (recovery, signup, refresh, future MFA, etc.)
// cannot accidentally become deletion authorization without a reviewed change.
const SUPPORTED_ACCOUNT_DELETION_AUTH_METHODS = new Set([
  "password",
  "oauth",
]);

type AuthMethodReference = {
  method?: unknown;
  timestamp?: unknown;
};

export type AccountDeletionRecentAuthResult =
  | {
      ok: true;
      method: string;
      authenticatedAt: number;
      ageSeconds: number;
    }
  | {
      ok: false;
      reason: "missing_interactive_auth";
    }
  | {
      ok: false;
      reason: "invalid_timestamp";
      latestInteractiveAuthAt: number;
    }
  | {
      ok: false;
      reason: "stale";
      latestInteractiveAuthAt: number;
      ageSeconds: number;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function evaluateAccountDeletionRecentAuth(
  amr: unknown,
  nowSeconds = Math.floor(Date.now() / 1000),
): AccountDeletionRecentAuthResult {
  if (!Array.isArray(amr) || !Number.isFinite(nowSeconds)) {
    return { ok: false, reason: "missing_interactive_auth" };
  }

  let latest: { method: string; timestamp: number } | null = null;

  for (const candidate of amr) {
    if (!isRecord(candidate)) continue;

    const method = candidate.method;
    const timestamp = candidate.timestamp;
    if (
      typeof method !== "string" ||
      !SUPPORTED_ACCOUNT_DELETION_AUTH_METHODS.has(method) ||
      typeof timestamp !== "number" ||
      !Number.isFinite(timestamp)
    ) {
      continue;
    }

    if (!latest || timestamp > latest.timestamp) {
      latest = { method, timestamp };
    }
  }

  if (!latest) return { ok: false, reason: "missing_interactive_auth" };

  if (latest.timestamp > nowSeconds) {
    return {
      ok: false,
      reason: "invalid_timestamp",
      latestInteractiveAuthAt: latest.timestamp,
    };
  }

  const ageSeconds = Math.floor(nowSeconds - latest.timestamp);
  if (ageSeconds > ACCOUNT_DELETION_RECENT_AUTH_MAX_AGE_SECONDS) {
    return {
      ok: false,
      reason: "stale",
      latestInteractiveAuthAt: latest.timestamp,
      ageSeconds,
    };
  }

  return {
    ok: true,
    method: latest.method,
    authenticatedAt: latest.timestamp,
    ageSeconds,
  };
}
