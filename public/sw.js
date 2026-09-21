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

/**
 * Offline read (X1): the last rendered `/dashboard` navigation response is kept
 * in a versioned cache so a reopened ledger still shows its last truth while
 * offline. The cache is wiped from the client on every sign-out/login/deletion
 * boundary — financial HTML must never outlive its session.
 *
 * Bounded on purpose: only same-origin GET navigations to `/dashboard` are
 * stored. Everything else passes through untouched, and an offline navigation
 * to an uncached page gets a calm notice — never dashboard HTML served under a
 * foreign URL.
 */
const OFFLINE_CACHE = "moneyflow-offline-v1";
const OFFLINE_PAGE_KEY = "/dashboard";

function offlineNoticeHtml(hasCachedDashboard) {
  const tail = hasCachedDashboard
    ? 'Tổng quan lần cuối đã lưu vẫn xem được. <a href="/dashboard" style="color:#0EA5E9;font-weight:600">Mở tổng quan đã lưu</a>'
    : "Kết nối lại để tiếp tục.";
  return (
    '<!doctype html><html lang="vi"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>Ngoại tuyến — MoneyFlow</title></head>" +
    '<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#F8FAFC;color:#0F172A;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box">' +
    '<main style="max-width:26rem;text-align:center">' +
    '<h1 style="font-size:1.25rem;font-weight:650;margin:0 0 .5rem">Bạn đang ngoại tuyến</h1>' +
    '<p style="color:#475569;font-size:.9375rem;line-height:1.6;margin:0">' +
    tail +
    "</p></main></body></html>"
  );
}

function offlineNotice(hasCachedDashboard) {
  return new Response(offlineNoticeHtml(hasCachedDashboard), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

async function handleNavigation(request, url) {
  if (url.pathname === OFFLINE_PAGE_KEY) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(OFFLINE_CACHE);
        await cache.put(OFFLINE_PAGE_KEY, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(OFFLINE_PAGE_KEY);
      return cached ?? offlineNotice(false);
    }
  }

  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_PAGE_KEY);
    return offlineNotice(Boolean(cached));
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;

  event.respondWith(handleNavigation(request, url));
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
