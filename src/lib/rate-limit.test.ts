import assert from "node:assert/strict";
import test from "node:test";
import {
  clientKeyFromHeaders,
  createRateLimiter,
  importRateKey,
  rateLimitUserMessage,
} from "./rate-limit.ts";

test("allows the limit then blocks the next request in a window", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });

  assert.equal(limiter.allow("client", 100), true);
  assert.equal(limiter.allow("client", 200), true);
  assert.equal(limiter.allow("client", 300), false);
});

test("restores allowance after the oldest hit leaves the sliding window", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });

  assert.equal(limiter.allow("client", 100), true);
  assert.equal(limiter.allow("client", 1_099), false);
  assert.equal(limiter.allow("client", 1_101), true);
});

test("tracks keys independently", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });

  assert.equal(limiter.allow("first", 100), true);
  assert.equal(limiter.allow("first", 200), false);
  assert.equal(limiter.allow("second", 200), true);
});

test("evicts the oldest inserted key when maxKeys is reached", () => {
  const limiter = createRateLimiter({
    limit: 1,
    windowMs: 1_000,
    maxKeys: 2,
  });

  assert.equal(limiter.allow("first", 100), true);
  assert.equal(limiter.allow("second", 100), true);
  assert.equal(limiter.allow("third", 100), true);
  assert.equal(limiter.allow("first", 100), true);
});

test("parses forwarded client headers", () => {
  assert.equal(
    clientKeyFromHeaders(
      new Headers({ "x-forwarded-for": " 203.0.113.1, 198.51.100.2" }),
    ),
    "203.0.113.1",
  );
  assert.equal(
    clientKeyFromHeaders(new Headers({ "x-real-ip": " 192.0.2.1 " })),
    "192.0.2.1",
  );
  assert.equal(clientKeyFromHeaders(new Headers()), "unknown");
});

test("allows up to limit hits inside the window", () => {
  const limiter = createRateLimiter({ limit: 3, windowMs: 10_000 });
  const t0 = 1_000_000;

  assert.equal(limiter.check("u1", t0).ok, true);
  assert.equal(limiter.check("u1", t0 + 1).ok, true);
  const third = limiter.check("u1", t0 + 2);
  assert.equal(third.ok, true);
  if (third.ok) assert.equal(third.remaining, 0);

  const denied = limiter.check("u1", t0 + 3);
  assert.equal(denied.ok, false);
  if (!denied.ok) {
    assert.equal(denied.remaining, 0);
    assert.ok(denied.retryAfterMs > 0);
  }
});

test("window slide frees capacity after oldest expires", () => {
  const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });
  const t0 = 5_000;

  assert.equal(limiter.check("u2", t0).ok, true);
  assert.equal(limiter.check("u2", t0 + 100).ok, true);
  assert.equal(limiter.check("u2", t0 + 200).ok, false);

  // Oldest at t0 falls out at t0+1000.
  const after = limiter.check("u2", t0 + 1_000);
  assert.equal(after.ok, true);
});

test("keys are isolated", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 5_000 });
  const t0 = 0;
  assert.equal(limiter.check("a", t0).ok, true);
  assert.equal(limiter.check("a", t0 + 1).ok, false);
  assert.equal(limiter.check("b", t0 + 1).ok, true);
});

test("peek does not consume a slot", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 5_000 });
  const t0 = 10;
  const peek = limiter.peek("p", t0);
  assert.equal(peek.ok, true);
  if (peek.ok) assert.equal(peek.remaining, 1);

  assert.equal(limiter.check("p", t0).ok, true);
  assert.equal(limiter.peek("p", t0 + 1).ok, false);
});

test("reset clears state", () => {
  const limiter = createRateLimiter({ limit: 1, windowMs: 5_000 });
  assert.equal(limiter.check("r", 0).ok, true);
  assert.equal(limiter.check("r", 1).ok, false);
  limiter.reset("r");
  assert.equal(limiter.check("r", 2).ok, true);
  limiter.reset();
  assert.equal(limiter.check("r", 3).ok, true);
});

test("importRateKey is stable and bounded", () => {
  assert.equal(importRateKey("abc"), "import:abc");
  assert.equal(importRateKey(""), "import:unknown");
  const long = "x".repeat(200);
  assert.ok(importRateKey(long).length <= "import:".length + 80);
});

test("rateLimitUserMessage is calm Vietnamese", () => {
  assert.match(rateLimitUserMessage(2_000), /vài giây|thử lại/i);
  assert.match(rateLimitUserMessage(45_000), /45 giây/);
});
