import assert from "node:assert/strict";
import test from "node:test";

import {
  clearOfflineCache,
  createInstallPromptStore,
  OFFLINE_CACHE_NAME,
  registerAppServiceWorker,
} from "./pwa.ts";

test("clearOfflineCache deletes the versioned offline cache", async () => {
  const deleted: string[] = [];
  const ok = await clearOfflineCache({
    delete: async (name: string) => {
      deleted.push(name);
      return true;
    },
  });
  assert.equal(ok, true);
  assert.deepEqual(deleted, [OFFLINE_CACHE_NAME]);
});

test("clearOfflineCache no-ops without a CacheStorage implementation", async () => {
  assert.equal(await clearOfflineCache(null), false);
});

test("clearOfflineCache swallows a restricted-environment rejection", async () => {
  const ok = await clearOfflineCache({
    delete: async () => {
      throw new Error("denied");
    },
  });
  assert.equal(ok, false);
});

test("registerAppServiceWorker registers the shared worker at root scope", async () => {
  const calls: Array<{ url: string | URL; scope?: string }> = [];
  const registration = { scope: "/" } as unknown as ServiceWorkerRegistration;
  const fake: Pick<ServiceWorkerContainer, "register"> = {
    register: async (url, options) => {
      calls.push({ url, scope: options?.scope });
      return registration;
    },
  };
  const result = await registerAppServiceWorker(fake);
  assert.equal(result, registration);
  assert.deepEqual(calls, [{ url: "/sw.js", scope: "/" }]);
});

test("registerAppServiceWorker no-ops without service worker support", async () => {
  assert.equal(await registerAppServiceWorker(undefined), null);
});

test("registerAppServiceWorker swallows a registration failure", async () => {
  const fake: Pick<ServiceWorkerContainer, "register"> = {
    register: async () => {
      throw new Error("denied");
    },
  };
  const result = await registerAppServiceWorker(fake);
  assert.equal(result, null);
});

function deferredPrompt(outcome: "accepted" | "dismissed") {
  const calls = { preventDefault: 0, prompt: 0 };
  const event = {
    preventDefault() {
      calls.preventDefault += 1;
    },
    prompt: async () => {
      calls.prompt += 1;
    },
    userChoice: Promise.resolve({ outcome }),
  };
  return { event, calls };
}

function fakeWindow(overrides: {
  standalone?: boolean;
  ua?: string;
  matchMediaStandalone?: boolean;
}) {
  return {
    matchMedia: (query: string) => ({
      matches: query === "(display-mode: standalone)" && overrides.matchMediaStandalone === true,
    }),
    navigator: {
      standalone: overrides.standalone,
      userAgent: overrides.ua ?? "Mozilla/5.0 (X11; Linux x86_64) Chrome/130",
    },
  };
}

test("install store starts unavailable on a plain desktop browser", () => {
  const store = createInstallPromptStore(fakeWindow({}));
  assert.equal(store.state(), "unavailable");
});

test("captured beforeinstallprompt flips the store to promptable and defers the infobar", () => {
  const store = createInstallPromptStore(fakeWindow({}));
  const { event, calls } = deferredPrompt("accepted");
  store.capture(event as unknown as Event);
  assert.equal(calls.preventDefault, 1);
  assert.equal(store.state(), "promptable");
});

test("promptInstall fires the deferred prompt once and honours the outcome", async () => {
  const store = createInstallPromptStore(fakeWindow({}));
  const { event, calls } = deferredPrompt("accepted");
  store.capture(event as unknown as Event);
  assert.equal(await store.promptInstall(), "accepted");
  assert.equal(calls.prompt, 1);
  assert.equal(store.state(), "installed");
  assert.equal(await store.promptInstall(), "unavailable");
});

test("a dismissed prompt falls back to unavailable, not a retry loop", async () => {
  const store = createInstallPromptStore(fakeWindow({}));
  const { event } = deferredPrompt("dismissed");
  store.capture(event as unknown as Event);
  assert.equal(await store.promptInstall(), "dismissed");
  assert.equal(store.state(), "unavailable");
});

test("promptInstall without a captured event reports unavailable", async () => {
  const store = createInstallPromptStore(fakeWindow({}));
  assert.equal(await store.promptInstall(), "unavailable");
});

test("standalone display mode reports installed even without a prompt event", () => {
  const store = createInstallPromptStore(fakeWindow({ matchMediaStandalone: true }));
  assert.equal(store.state(), "installed");
});

test("iOS navigator.standalone reports installed", () => {
  const store = createInstallPromptStore(
    fakeWindow({ standalone: true, ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)" }),
  );
  assert.equal(store.state(), "installed");
});

test("iOS Safari without standalone shows the manual state, never a fake button", () => {
  const store = createInstallPromptStore(
    fakeWindow({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1" }),
  );
  assert.equal(store.state(), "manual");
});

test("markInstalled clears a pending prompt and notifies subscribers", () => {
  const store = createInstallPromptStore(fakeWindow({}));
  const { event } = deferredPrompt("dismissed");
  store.capture(event as unknown as Event);
  let notified = 0;
  const unsubscribe = store.subscribe(() => {
    notified += 1;
  });
  store.markInstalled();
  assert.equal(store.state(), "installed");
  assert.equal(notified, 1); // subscribed after capture — only markInstalled notifies
  unsubscribe();
  store.markInstalled();
  assert.equal(notified, 1);
});
