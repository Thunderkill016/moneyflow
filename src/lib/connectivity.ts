/*
 * What the browser can and cannot tell us about connectivity.
 *
 * The load-bearing asymmetry: `navigator.onLine === false` is trustworthy,
 * `true` is not. A browser reports online whenever it has any network
 * interface at all — a captive portal, a router with no upstream, a phone
 * holding one bar that carries nothing. So `false` means definitely offline
 * and `true` means only "not known to be offline".
 *
 * Every function here is written around that. Nothing in this module may be
 * used to claim a request will succeed; it exists to stop the product giving
 * advice that cannot work, not to predict the network.
 *
 * This is offline AWARENESS. It is not offline capability: nothing is queued,
 * cached or retried, and a user still cannot record anything while
 * disconnected. Saying otherwise would be a larger lie than saying nothing.
 */

export type ConnectionState =
  /** `navigator.onLine` reported false. Requests will fail. */
  | "offline"
  /** No contrary evidence. Not a promise that anything will work. */
  | "assumed-online";

/**
 * Read the browser's claim.
 *
 * Returns `assumed-online` where `navigator` is absent — server rendering has
 * no navigator, and the first paint must assume connected so hydration matches
 * and then correct itself once mounted.
 */
export function readConnectionState(
  nav: Pick<Navigator, "onLine"> | undefined = typeof navigator === "undefined"
    ? undefined
    : navigator,
): ConnectionState {
  if (!nav) return "assumed-online";
  return nav.onLine === false ? "offline" : "assumed-online";
}

/** The persistent shell notice, or null when there is nothing truthful to say. */
export function connectionNotice(state: ConnectionState): string | null {
  if (state !== "offline") return null;
  return "Đang mất kết nối — bạn vẫn xem được sổ, nhưng chưa lưu được thay đổi.";
}

/**
 * What to say when a save fails.
 *
 * Offline, "hãy thử lại" is the one recommendation guaranteed not to work, so
 * it is replaced by what is actually true: the entry is still on screen and it
 * needs connectivity. When the state is only assumed online the cause is
 * unknown, so the existing message is left alone rather than guessed at.
 */
export function saveFailureMessage(
  state: ConnectionState,
  fallback: string,
): string {
  if (state !== "offline") return fallback;
  return "Đang mất kết nối nên chưa lưu được. Nội dung bạn nhập vẫn còn — thử lại khi có mạng.";
}
