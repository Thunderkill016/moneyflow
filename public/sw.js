/**
 * Money Flow service worker — TASK-130 due-commitment notifications.
 * Privacy-first: notification payloads must not include money amounts.
 * Click opens /commitments (or a validated same-origin data.url).
 */

const SW_VERSION = "moneyflow-sw-v1";
const DEFAULT_NOTIFICATION_PATH = "/commitments";
const UNSAFE_NAVIGATION_CHARS = /[\u0000-\u001f\u007f\\]/;

/**
 * Return only a same-origin path/query/hash suitable for clients.navigate/openWindow.
 * WHATWG URLs normalize backslashes as path separators, so checking only `//`
 * is not enough to prevent values such as `/\\evil.example` leaving the app.
 */
function safeNotificationPath(rawUrl) {
  if (
    typeof rawUrl !== "string" ||
    !rawUrl.startsWith("/") ||
    rawUrl.startsWith("//") ||
    UNSAFE_NAVIGATION_CHARS.test(rawUrl)
  ) {
    return DEFAULT_NOTIFICATION_PATH;
  }

  let destination;
  try {
    destination = new URL(rawUrl, self.location.origin);
  } catch {
    return DEFAULT_NOTIFICATION_PATH;
  }

  if (destination.origin !== self.location.origin) {
    return DEFAULT_NOTIFICATION_PATH;
  }

  let decodedPathname;
  try {
    decodedPathname = decodeURIComponent(destination.pathname);
  } catch {
    return DEFAULT_NOTIFICATION_PATH;
  }

  if (
    decodedPathname.startsWith("//") ||
    UNSAFE_NAVIGATION_CHARS.test(decodedPathname)
  ) {
    return DEFAULT_NOTIFICATION_PATH;
  }

  return `${destination.pathname}${destination.search}${destination.hash}`;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const rawUrl =
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : DEFAULT_NOTIFICATION_PATH;
  const path = safeNotificationPath(rawUrl);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client && typeof client.navigate === "function") {
            return client.navigate(path).then((c) => (c && c.focus ? c.focus() : client.focus()));
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(path);
      }
      return undefined;
    }),
  );
});

/**
 * Optional push handler for future VAPID server delivery.
 * If payload is missing/invalid, show a generic privacy-safe body (no amounts).
 */
self.addEventListener("push", (event) => {
  let title = "Cam kết đến hạn";
  let body =
    "Bạn có khoản định kỳ đến hạn hoặc sắp đến. Mở Cam kết để xem chi tiết.";
  let tag = "moneyflow-commitment-due";
  let url = DEFAULT_NOTIFICATION_PATH;

  try {
    if (event.data) {
      const data = event.data.json();
      if (data && typeof data === "object") {
        if (typeof data.title === "string" && data.title.trim()) title = data.title.trim();
        if (typeof data.body === "string" && data.body.trim()) body = data.body.trim();
        if (typeof data.tag === "string" && data.tag.trim()) tag = data.tag.trim();
        if (typeof data.url === "string") {
          url = safeNotificationPath(data.url);
        }
      }
    }
  } catch {
    /* use defaults — never crash on bad push JSON */
  }

  // Strip accidental money-like patterns from body (privacy belt)
  body = body.replace(/[₫đ]\s*[\d.,\s]+/gi, "").replace(/\d{1,3}([.,]\d{3})+/g, "…");

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url, version: SW_VERSION },
    }),
  );
});
