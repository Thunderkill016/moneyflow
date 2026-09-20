/**
 * Soft in-process rate limit.
 *
 * Guards public endpoints and server actions against accidental double-submit
 * floods and casual abuse. Process-local only — not shared across serverless
 * instances.
 */

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
  maxKeys?: number;
};

export type RateLimitOk = {
  ok: true;
  remaining: number;
  limit: number;
};

export type RateLimitDenied = {
  ok: false;
  remaining: 0;
  limit: number;
  /** Milliseconds until the oldest hit falls out of the window. */
  retryAfterMs: number;
};

export type RateLimitResult = RateLimitOk | RateLimitDenied;

export type RateLimiter = {
  allow(key: string, now?: number): boolean;
  check: (key: string, now?: number) => RateLimitResult;
  peek: (key: string, now?: number) => RateLimitResult;
  reset: (key?: string) => void;
  readonly config: Readonly<Required<RateLimitConfig>>;
};

type Entry = {
  count: number;
  resetAt: number;
};

function normalizedKey(key: string): string {
  return typeof key === "string" && key.length > 0 ? key.slice(0, 200) : "anon";
}

/**
 * Create a process-local fixed-window limiter keyed by opaque strings.
 * Injectable `now` keeps unit tests deterministic.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const limit = Math.max(1, Math.floor(config.limit));
  const windowMs = Math.max(1, Math.floor(config.windowMs));
  const maxKeys = Math.max(1, Math.floor(config.maxKeys ?? 10_000));
  const entries = new Map<string, Entry>();

  function evictExpired(now: number): void {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= now) entries.delete(key);
    }
  }

  function evictOldestIfFull(key: string): void {
    if (entries.has(key) || entries.size < maxKeys) return;
    const oldest = entries.keys().next().value;
    if (oldest !== undefined) entries.delete(oldest);
  }

  function consume(key: string, now: number): Entry {
    evictExpired(now);
    const safeKey = normalizedKey(key);
    const current = entries.get(safeKey);
    if (current && now < current.resetAt) {
      current.count += 1;
      return current;
    }

    evictOldestIfFull(safeKey);
    const entry = { count: 1, resetAt: now + windowMs };
    entries.set(safeKey, entry);
    return entry;
  }

  function resultFromEntry(entry: Entry, now: number): RateLimitResult {
    if (entry.count > limit) {
      return {
        ok: false,
        remaining: 0,
        limit,
        retryAfterMs: Math.max(1, entry.resetAt - now),
      };
    }
    return { ok: true, remaining: limit - entry.count, limit };
  }

  return {
    config: { limit, windowMs, maxKeys },
    allow(key: string, now = Date.now()) {
      return consume(key, now).count <= limit;
    },
    check(key: string, now = Date.now()) {
      return resultFromEntry(consume(key, now), now);
    },
    peek(key: string, now = Date.now()) {
      evictExpired(now);
      const entry = entries.get(normalizedKey(key));
      if (!entry) return { ok: true, remaining: limit, limit };
      if (entry.count >= limit) {
        return {
          ok: false,
          remaining: 0,
          limit,
          retryAfterMs: Math.max(1, entry.resetAt - now),
        };
      }
      return resultFromEntry(entry, now);
    },
    reset(key?: string) {
      if (key === undefined) {
        entries.clear();
        return;
      }
      entries.delete(normalizedKey(key));
    },
  };
}

export function clientKeyFromHeaders(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;

  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || "unknown";
}

/** Soft defaults: ~1 import action every 4s on average, burst 15 / minute. */
export const IMPORT_ACTION_LIMIT: RateLimitConfig = {
  limit: 15,
  windowMs: 60_000,
};

/**
 * Shared process-local limiter for createImportBatch + createInboxCandidates.
 * Key with `importRateKey(userId)`.
 */
export const importActionLimiter = createRateLimiter(IMPORT_ACTION_LIMIT);

export function importRateKey(userId: string): string {
  const id =
    typeof userId === "string" && userId.length > 0 ? userId.slice(0, 80) : "unknown";
  return `import:${id}`;
}

/** Calm Vietnamese notice when the soft guard trips. */
export function rateLimitUserMessage(retryAfterMs: number): string {
  const sec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (sec <= 5) {
    return "Bạn thao tác hơi nhanh. Đợi vài giây rồi thử lại.";
  }
  return `Bạn thao tác hơi nhanh. Thử lại sau khoảng ${sec} giây.`;
}
