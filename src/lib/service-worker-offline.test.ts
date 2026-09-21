import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

type WorkerEvent = {
  waitUntil: (promise: Promise<unknown> | unknown) => void;
  respondWith?: (promise: Promise<unknown> | unknown) => void;
  request?: unknown;
  [key: string]: unknown;
};

type WorkerHandler = (event: WorkerEvent) => void;

/**
 * Minimal CacheStorage fake: one Map per cache name, keyed by request URL.
 * `match` resolves the stored entry or undefined — enough to prove what the
 * worker stores and serves, not to reimplement the spec.
 */
function fakeCacheStorage() {
  const stores = new Map<string, Map<string, unknown>>();
  return {
    api: {
      async open(name: string) {
        if (!stores.has(name)) stores.set(name, new Map());
        const store = stores.get(name)!;
        return {
          async put(request: { url: string } | string, response: unknown) {
            const key = typeof request === "string" ? request : request.url;
            store.set(key, response);
          },
          async match(request: { url: string } | string) {
            const key = typeof request === "string" ? request : request.url;
            return store.get(key);
          },
        };
      },
      async match(request: { url: string } | string) {
        const key = typeof request === "string" ? request : request.url;
        for (const store of stores.values()) {
          if (store.has(key)) return store.get(key);
        }
        return undefined;
      },
      async delete(name: string) {
        return stores.delete(name);
      },
    },
    stored(name: string, key: string) {
      return stores.get(name)?.get(key);
    },
  };
}

class FakeResponse {
  status: number;
  body: unknown;
  constructor(body: unknown, init?: { status?: number; headers?: unknown }) {
    this.body = body;
    this.status = init?.status ?? 200;
  }
  get ok() {
    return this.status >= 200 && this.status < 300;
  }
  clone() {
    return new FakeResponse(this.body, { status: this.status });
  }
}

function loadServiceWorker(options: { online?: boolean } = {}) {
  const handlers = new Map<string, WorkerHandler>();
  const cacheStorage = fakeCacheStorage();
  const online = options.online ?? true;

  const workerSelf = {
    location: { origin: "https://mfvn.vercel.app" },
    addEventListener(name: string, handler: WorkerHandler) {
      handlers.set(name, handler);
    },
    skipWaiting: async () => undefined,
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
      openWindow: async () => null,
    },
    registration: { showNotification: async () => undefined },
  };

  const context = vm.createContext({
    self: workerSelf,
    URL,
    decodeURIComponent,
    Promise,
    caches: cacheStorage.api,
    Response: FakeResponse,
    fetch: async () => {
      if (!online) throw new Error("offline");
      return new FakeResponse("<html>rendered</html>", { status: 200 });
    },
  });
  vm.runInContext(readFileSync("public/sw.js", "utf8"), context, {
    filename: "public/sw.js",
  });

  async function dispatchFetch(request: {
    url: string;
    method?: string;
    mode?: string;
  }) {
    const handler = handlers.get("fetch");
    assert.ok(handler, "missing fetch handler");
    let answered: Promise<unknown> | undefined;
    handler({
      request,
      respondWith(value) {
        answered = Promise.resolve(value);
      },
      waitUntil() {},
    });
    return answered ? answered : null;
  }

  return { dispatchFetch, cacheStorage };
}

const DASHBOARD_URL = "https://mfvn.vercel.app/dashboard";
const NAV = { method: "GET", mode: "navigate" } as const;

test("a successful /dashboard navigation is cached and returned", async () => {
  const worker = loadServiceWorker();
  const response = (await worker.dispatchFetch({ url: DASHBOARD_URL, ...NAV })) as {
    ok: boolean;
  };
  assert.equal(response.ok, true);
  assert.ok(
    worker.cacheStorage.stored("moneyflow-offline-v1", "/dashboard") ??
      worker.cacheStorage.stored("moneyflow-offline-v1", DASHBOARD_URL),
    "dashboard response was stored",
  );
});

test("other routes, non-GET and foreign origins are never cached", async () => {
  const worker = loadServiceWorker();

  const tx = await worker.dispatchFetch({
    url: "https://mfvn.vercel.app/transactions",
    ...NAV,
  });
  assert.ok(tx, "navigation responses still pass through");
  assert.equal(
    worker.cacheStorage.stored("moneyflow-offline-v1", "https://mfvn.vercel.app/transactions"),
    undefined,
    "non-dashboard pages are not stored",
  );

  assert.equal(
    await worker.dispatchFetch({
      url: "https://mfvn.vercel.app/api/health",
      method: "GET",
      mode: "cors",
    }),
    null,
    "non-navigation requests are untouched",
  );
  assert.equal(
    await worker.dispatchFetch({ url: DASHBOARD_URL, method: "POST", mode: "navigate" }),
    null,
    "POST is untouched",
  );
  assert.equal(
    await worker.dispatchFetch({ url: "https://evil.example/dashboard", ...NAV }),
    null,
    "foreign origins are untouched",
  );
});

test("offline /dashboard navigation serves the cached copy", async () => {
  const worker = loadServiceWorker({ online: false });
  const cachedCopy = new FakeResponse("<html>last render</html>", { status: 200 });
  const cache = await worker.cacheStorage.api.open("moneyflow-offline-v1");
  await cache.put("/dashboard", cachedCopy);

  const served = (await worker.dispatchFetch({ url: DASHBOARD_URL, ...NAV })) as FakeResponse;
  assert.equal(served.body, "<html>last render</html>");
});

test("offline navigation to an uncached path gets the notice, never foreign content", async () => {
  const worker = loadServiceWorker({ online: false });
  const response = (await worker.dispatchFetch({
    url: "https://mfvn.vercel.app/transactions",
    ...NAV,
  })) as FakeResponse;
  assert.ok(response, "an offline fallback responds");
  const body = typeof response.body === "string" ? response.body : "";
  assert.match(body, /ngoại tuyến/i);
  assert.doesNotMatch(body, /Bạn đang có/, "never fabricates dashboard content");
});
