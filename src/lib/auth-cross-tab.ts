/**
 * Cross-tab auth signalling — the 2-tab logout race.
 *
 * MoneyFlow keeps its session in `sb-*-auth-token` cookies, which the browser
 * shares across tabs. When tab A logs out, tab B keeps rendering as signed in
 * until its next server round-trip, so a submit there used to fail opaquely
 * and drop the in-progress draft. The tab that logs out broadcasts on this
 * channel first; the other tabs raise a persistent, draft-safe banner instead
 * of being bounced.
 *
 * The broadcast is best-effort: a logout whose POST never leaves the tab
 * (offline) still notifies the others, so the banner copy says what happened
 * ("signed out in another tab") without claiming anything about this tab's own
 * cookies. It never navigates and never clears form state — the draft stays
 * exactly where the reader left it.
 */

export const AUTH_BROADCAST_CHANNEL = "moneyflow-auth-v1";

export const AUTH_SIGNED_OUT_MESSAGE_KIND = "moneyflow:auth-signed-out";

export type AuthSignedOutMessage = {
  kind: typeof AUTH_SIGNED_OUT_MESSAGE_KIND;
  /** Wall-clock ms when the logout was initiated. Informational only. */
  at: number;
};

export function isAuthSignedOutMessage(
  value: unknown,
): value is AuthSignedOutMessage {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AuthSignedOutMessage>;
  return (
    candidate.kind === AUTH_SIGNED_OUT_MESSAGE_KIND &&
    typeof candidate.at === "number" &&
    Number.isFinite(candidate.at)
  );
}

/**
 * The sliver of BroadcastChannel this module needs. Structural on purpose:
 * the real BroadcastChannel satisfies it, and so do test doubles, without
 * dragging in the DOM overload set.
 */
type BroadcastChannelLike = {
  postMessage(message: unknown): void;
  addEventListener(
    type: string,
    listener: (event: { data: unknown }) => void,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: { data: unknown }) => void,
  ): void;
  close(): void;
};

export type AuthChannelFactory = () => BroadcastChannelLike | null;

function defaultChannelFactory(): BroadcastChannelLike | null {
  if (typeof window === "undefined") return null;
  if (typeof window.BroadcastChannel === "undefined") return null;
  try {
    return new window.BroadcastChannel(AUTH_BROADCAST_CHANNEL);
  } catch {
    // BroadcastChannel can throw in locked-down contexts (e.g. some webviews).
    // The banner is a courtesy — a missing channel must not break logout.
    return null;
  }
}

/**
 * Tell every other tab that this tab just initiated a logout. Fire-and-forget:
 * the channel is opened, posted to and closed synchronously so the message is
 * queued before the logout POST navigates this tab away. Safe no-op on the
 * server or where BroadcastChannel is unavailable.
 */
export function broadcastAuthSignedOut(
  createChannel: AuthChannelFactory = defaultChannelFactory,
): void {
  const channel = createChannel();
  if (!channel) return;
  try {
    channel.postMessage({
      kind: AUTH_SIGNED_OUT_MESSAGE_KIND,
      at: Date.now(),
    } satisfies AuthSignedOutMessage);
  } finally {
    channel.close();
  }
}

/**
 * The stable machine code for "session missing" failures, mirroring
 * AUTH_REQUIRED_CODE in src/server/auth.ts. Kept as a literal here so
 * client components can compare without importing server code.
 */
export const AUTH_REQUIRED_CODE = "auth-required";

/**
 * True when a Server Action result signals a missing session.
 * Use this to elevate an inline auth error into the session banner.
 */
export function isAuthRequiredResult(
  result: { ok: boolean; code?: string } | null | undefined,
): boolean {
  return !!result && !result.ok && result.code === AUTH_REQUIRED_CODE;
}

/**
 * Notify this tab that its own session is gone (e.g. a Server Action
 * returned code "auth-required"). Unlike the cross-tab broadcast, this
 * targets the current tab via a window event the banner subscribes to.
 */
export const AUTH_SESSION_EXPIRED_EVENT = "moneyflow:auth-session-expired";

export function notifyAuthSessionExpired(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED_EVENT));
}

/**
 * Invoke `onSignedOut` whenever the session expires in this tab
 * (via notifyAuthSessionExpired) or another tab broadcasts a logout.
 * Returns an unsubscribe function.
 */
export function subscribeAuthSessionExpired(onExpired: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => onExpired();
  window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handler);
  const unsubscribeBroadcast = subscribeAuthSignedOut(onExpired);
  return () => {
    window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handler);
    unsubscribeBroadcast();
  };
}

/**
 * Invoke `onSignedOut` whenever another tab broadcasts a logout. The sender
 * never receives its own message (BroadcastChannel semantics). Returns an
 * unsubscribe function. Safe no-op on the server or where BroadcastChannel is
 * unavailable.
 */
export function subscribeAuthSignedOut(
  onSignedOut: () => void,
  createChannel: AuthChannelFactory = defaultChannelFactory,
): () => void {
  const channel = createChannel();
  if (!channel) return () => {};
  const handler = (event: { data: unknown }) => {
    if (isAuthSignedOutMessage(event.data)) {
      onSignedOut();
    }
  };
  channel.addEventListener("message", handler);
  return () => {
    channel.removeEventListener("message", handler);
    channel.close();
  };
}
