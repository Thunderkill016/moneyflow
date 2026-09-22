/**
 * Pure countdown math for timed UI that must pause on user interaction
 * (WCAG 2.2.1 — a toast holding the only recovery path cannot keep ticking
 * while the reader is hovering it or has focus inside it).
 *
 * The component owns the actual `setTimeout` handle; these helpers track how
 * much time is left across pause/resume so the deadline is measured in
 * *unpaused* milliseconds, not wall clock.
 */

export type Countdown = {
  /** Milliseconds still left to run. */
  remainingMs: number;
  /**
   * `Date.now()` timestamp of the last arm/resume while `running`; `0` once
   * paused — elapsed time is already folded into `remainingMs`.
   */
  startedAt: number;
  running: boolean;
};

/** Fresh countdown that starts consuming time immediately. */
export function startCountdown(durationMs: number, now: number): Countdown {
  return { remainingMs: durationMs, startedAt: now, running: true };
}

/** Full-duration countdown parked until it is resumed. */
export function pausedCountdown(durationMs: number): Countdown {
  return { remainingMs: durationMs, startedAt: 0, running: false };
}

/**
 * Fold the elapsed slice into `remainingMs` and stop the clock. Idempotent —
 * pausing a paused countdown returns it unchanged, and remaining time never
 * goes below zero even if `now` ran backwards past `startedAt`.
 */
export function pauseCountdown(countdown: Countdown, now: number): Countdown {
  if (!countdown.running) return countdown;
  const elapsed = Math.max(0, now - countdown.startedAt);
  return {
    remainingMs: Math.max(0, countdown.remainingMs - elapsed),
    startedAt: 0,
    running: false,
  };
}

/**
 * Restart the clock with whatever time was left. A countdown whose window
 * already lapsed while paused stays stopped — callers should treat that as
 * "expire immediately" rather than arming a zero-length timer.
 */
export function resumeCountdown(countdown: Countdown, now: number): Countdown {
  if (countdown.running || countdown.remainingMs <= 0) return countdown;
  return { ...countdown, startedAt: now, running: true };
}
