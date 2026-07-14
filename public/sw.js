/**
 * Money Flow service worker — TASK-130 due-commitment notifications.
 * Privacy-first: notification payloads must not include money amounts.
 * Click opens /commitments (or data.url when provided).
 */

const SW_VERSION = "moneyflow-sw-v1";

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
      : "/commitments";
  // Only same-origin relative paths
  const path =
    rawUrl.startsWith("/") && !rawUrl.startsWith("//") ? rawUrl : "/commitments";

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
  let url = "/commitments";

  try {
    if (event.data) {
      const data = event.data.json();
      if (data && typeof data === "object") {
        if (typeof data.title === "string" && data.title.trim()) title = data.title.trim();
        if (typeof data.body === "string" && data.body.trim()) body = data.body.trim();
        if (typeof data.tag === "string" && data.tag.trim()) tag = data.tag.trim();
        if (typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//")) {
          url = data.url;
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
