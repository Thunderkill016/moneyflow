import assert from "node:assert/strict";
import test from "node:test";
import {
  pauseCountdown,
  pausedCountdown,
  resumeCountdown,
  startCountdown,
} from "./pausable-countdown.ts";

test("startCountdown runs for the full duration", () => {
  const countdown = startCountdown(8000, 1000);
  assert.equal(countdown.remainingMs, 8000);
  assert.equal(countdown.startedAt, 1000);
  assert.equal(countdown.running, true);
});

test("pauseCountdown folds elapsed time into the remainder", () => {
  const running = startCountdown(8000, 1000);
  const paused = pauseCountdown(running, 4000);
  assert.equal(paused.remainingMs, 5000);
  assert.equal(paused.running, false);
});

test("pauseCountdown is idempotent and never returns negative time", () => {
  const running = startCountdown(8000, 1000);
  const paused = pauseCountdown(running, 4000);
  assert.equal(pauseCountdown(paused, 6000), paused);

  // A pause landing after the deadline clamps to zero instead of going negative.
  const lapsed = pauseCountdown(running, 20_000);
  assert.equal(lapsed.remainingMs, 0);
  assert.equal(lapsed.running, false);

  // Clock skew (`now` before `startedAt`) is clamped, not credited.
  const skewed = pauseCountdown(running, 500);
  assert.equal(skewed.remainingMs, 8000);
  assert.equal(skewed.running, false);
});

test("resumeCountdown restarts with the preserved remainder", () => {
  const running = startCountdown(8000, 1000);
  const paused = pauseCountdown(running, 4000);
  const resumed = resumeCountdown(paused, 9000);
  assert.equal(resumed.remainingMs, 5000);
  assert.equal(resumed.startedAt, 9000);
  assert.equal(resumed.running, true);

  // A second pause keeps only the unpaused slice: 8s window, 3s ran before
  // the first hold and 2s more after resume leaves 3s.
  const repaused = pauseCountdown(resumed, 11_000);
  assert.equal(repaused.remainingMs, 3000);
});

test("resumeCountdown leaves running and lapsed countdowns untouched", () => {
  const running = startCountdown(8000, 1000);
  assert.equal(resumeCountdown(running, 2000), running);

  const lapsed = pauseCountdown(running, 20_000);
  assert.equal(resumeCountdown(lapsed, 21_000), lapsed);
  assert.equal(lapsed.running, false);
});

test("pausedCountdown parks a full duration until resumed", () => {
  const held = pausedCountdown(3500);
  assert.equal(held.remainingMs, 3500);
  assert.equal(held.running, false);
  const resumed = resumeCountdown(held, 5000);
  assert.equal(resumed.running, true);
  assert.equal(resumed.remainingMs, 3500);
});
