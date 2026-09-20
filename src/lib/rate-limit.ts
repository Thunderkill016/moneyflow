/**
 * Soft in-process rate limit (TASK-121).
 *
 * Guards upload/import server actions against accidental double-submit floods
 * and casual abuse. Process-local only — not shared across serverless
 * instances. See docs/rate-limit.md for the edge middleware plan.
 *
 * Ledger writes already use DB idempotency keys; this layer is for import
 * batch / candidate create paths that are not idempotent by design.
 */

export type RateLimitConfig = {
  /** Max accepted events inside the sliding window. */
  limit: number;
  /** Sliding window length in milliseconds. */
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
  /** Record one attempt; returns whether it is allowed. */
  allow: (key: string, now?: number) => boolean;
  check: (key: string, now?: number) => RateLimitResult;
  /** Peek without recording a hit. */
  peek: (key: string, now?: number) => RateLimitResult;
  /** Clear one key or the entire map (tests). */
  reset: (key?: string) => void;
  readonly config: Readonly<RateLimitConfig>;
};

function prune(timestamps: number[], now: number, windowMs: number): number[] {
  const cutoff = now - windowMs;
  // Timestamps are append-only chronological; find first still in window.
  let i = 0;
  while (i < timestamps.length && timestamps[i]! <= cutoff) i += 1;
  return i === 0 ? timestamps : timestamps.slice(i);
}

/**
 * Create a sliding-window limiter keyed by opaque strings (e.g. `import:userId`).
 * Injectable `now` keeps unit tests deterministic.
 */
export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  const limit = Math.max(1, Math.floor(config.limit));
  const windowMs = Math.max(1, Math.floor(config.windowMs));
  const maxKeys = Math.max(1, Math.floor(config.maxKeys ?? 10_000));
  const hits = new Map<string, number[]>();

  function ensureCapacity(safeKey: string): void {
    if (hits.has(safeKey) || hits.size < maxKeys) return;
    const firstKey = hits.keys().next().value;
    if (firstKey !== undefined) hits.delete(firstKey);
  }

  function evaluate(key: string, now: number, record: boolean): RateLimitResult {
    const safeKey = typeof key === "string" && key.length > 0 ? key.slice(0, 200) : "anon";
    const pruned = prune(hits.get(safeKey) ?? [], now, windowMs);

    if (pruned.length >= limit) {
      const oldest = pruned[0] ?? now;
      const retryAfterMs = Math.max(1, oldest + windowMs - now);
      ensureCapacity(safeKey);
      hits.set(safeKey, pruned);
      return { ok: false, remaining: 0, limit, retryAfterMs };
    }

    if (record) {
      pruned.push(now);
      ensureCapacity(safeKey);
      hits.set(safeKey, pruned);
      return { ok: true, remaining: Math.max(0, limit - pruned.length), limit };
    }

    ensureCapacity(safeKey);
    hits.set(safeKey, pruned);
    return { ok: true, remaining: Math.max(0, limit - pruned.length), limit };
  }

  function check(key: string, now = Date.now()): RateLimitResult {
    return evaluate(key, now, true);
  }

  return {
    config: { limit, windowMs },
    allow(key: string, now = Date.now()) {
      return check(key, now).ok;
    },
    check,
    peek(key: string, now = Date.now()) {
      return evaluate(key, now, false);
    },
    reset(key?: string) {
      if (key === undefined) {
        hits.clear();
        return;
      }
      hits.delete(key);
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

/** Soft defaults for capability API reads: ~1 call/s sustained, burst 60/min. */
export const CAPABILITY_API_LIMIT: RateLimitConfig = {
  limit: 60,
  windowMs: 60_000,
};

/**
 * Shared process-local limiter for the capability API transport. Authenticated
 * calls key on the viewer id; unauthenticated probes key on the client key so
 * token guessing cannot bypass the bucket by omitting credentials.
 */
export const capabilityApiLimiter = createRateLimiter(CAPABILITY_API_LIMIT);

export function capabilityApiRateKey(viewerId: string): string {
  const id =
    typeof viewerId === "string" && viewerId.length > 0
      ? viewerId.slice(0, 80)
      : "unknown";
  return `capability:${id}`;
}

export function capabilityAnonRateKey(clientKey: string): string {
  const key =
    typeof clientKey === "string" && clientKey.length > 0
      ? clientKey.slice(0, 80)
      : "unknown";
  return `capability-anon:${key}`;
}

/** Calm Vietnamese notice when the soft guard trips. */
export function rateLimitUserMessage(retryAfterMs: number): string {
  const sec = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (sec <= 5) {
    return "Bạn thao tác hơi nhanh. Đợi vài giây rồi thử lại.";
  }
  return `Bạn thao tác hơi nhanh. Thử lại sau khoảng ${sec} giây.`;
}
