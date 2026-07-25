import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

type WorkerEvent = {
  waitUntil: (promise: Promise<unknown> | unknown) => void;
  [key: string]: unknown;
};

type WorkerHandler = (event: WorkerEvent) => void;

function loadServiceWorker() {
  const handlers = new Map<string, WorkerHandler>();
  const openedPaths: string[] = [];
  const notifications: Array<{
    title: string;
    options: { data?: { url?: string } };
  }> = [];

  const workerSelf = {
    location: { origin: "https://mfvn.vercel.app" },
    addEventListener(name: string, handler: WorkerHandler) {
      handlers.set(name, handler);
    },
    skipWaiting: async () => undefined,
    clients: {
      claim: async () => undefined,
      matchAll: async () => [],
      openWindow: async (path: string) => {
        openedPaths.push(path);
        return null;
      },
    },
    registration: {
      showNotification: async (
        title: string,
        options: { data?: { url?: string } },
      ) => {
        notifications.push({ title, options });
      },
    },
  };

  const context = vm.createContext({
    self: workerSelf,
    URL,
    decodeURIComponent,
    Promise,
  });
  vm.runInContext(readFileSync("public/sw.js", "utf8"), context, {
    filename: "public/sw.js",
  });

  async function dispatch(name: string, event: Record<string, unknown>) {
    const handler = handlers.get(name);
    assert.ok(handler, `missing ${name} handler`);
    let pending: Promise<unknown> = Promise.resolve();
    handler({
      ...event,
      waitUntil(value) {
        pending = Promise.resolve(value);
      },
    });
    await pending;
  }

  function safePath(value: string) {
    return vm.runInContext(
      `safeNotificationPath(${JSON.stringify(value)})`,
      context,
    ) as string;
  }

  return { dispatch, safePath, openedPaths, notifications };
}

test("service worker notification paths stay same-origin after WHATWG normalization", () => {
  const worker = loadServiceWorker();
  const backslashAttack = "/\\evil.example";
  assert.equal(
    new URL(backslashAttack, "https://mfvn.vercel.app").origin,
    "https://evil.example",
  );

  assert.equal(worker.safePath(backslashAttack), "/commitments");
  assert.equal(worker.safePath("/%5Cevil.example"), "/commitments");
  assert.equal(worker.safePath("//evil.example"), "/commitments");
  assert.equal(worker.safePath("/%E0%A4%A"), "/commitments");
  assert.equal(
    worker.safePath("/commitments?tab=due#today"),
    "/commitments?tab=due#today",
  );
});

test("notification click never opens an attacker origin", async () => {
  const worker = loadServiceWorker();
  await worker.dispatch("notificationclick", {
    notification: {
      data: { url: "/\\evil.example" },
      close() {},
    },
  });

  assert.deepEqual(worker.openedPaths, ["/commitments"]);
});

test("push payload stores only a safe notification URL", async () => {
  const worker = loadServiceWorker();
  await worker.dispatch("push", {
    data: {
      json() {
        return { url: "/\\evil.example", body: "Mở MoneyFlow" };
      },
    },
  });

  assert.equal(worker.notifications.length, 1);
  assert.equal(worker.notifications[0]?.options.data?.url, "/commitments");
});
