/**
 * PWA helpers: the versioned offline cache, unconditional service-worker
 * registration, and the deferred install prompt.
 *
 * The offline cache holds the last rendered `/dashboard` navigation response —
 * real financial HTML — so every wipe path (`(auth)` layout mount, both
 * account-deletion paths) must run `clearOfflineCache`. The worker only ever
 * replays what the server already sent; it never caches APIs, writes, or
 * foreign origins.
 */

import { PUSH_SERVICE_WORKER_URL } from "./push-client.ts";

export const OFFLINE_CACHE_NAME = "moneyflow-offline-v1";

type CachesLike = { delete(name: string): Promise<boolean> };

/**
 * Delete the offline page cache. Returns false when CacheStorage is absent or
 * restricted — callers treat "could not wipe" as advisory: the upcoming sign-in
 * render is still authoritative because the cache only serves when the network
 * is already unreachable.
 */
export async function clearOfflineCache(
  cachesApi: CachesLike | null = typeof caches !== "undefined" ? caches : null,
): Promise<boolean> {
  if (!cachesApi) return false;
  try {
    return await cachesApi.delete(OFFLINE_CACHE_NAME);
  } catch {
    return false;
  }
}

/**
 * Register the shared service worker for every product page — the fetch handler
 * that makes `/dashboard` readable offline exists whether or not the reader
 * ever enables push. Push opt-in keeps calling `registerPushServiceWorker`;
 * `register()` is idempotent for the same URL+scope, so both can coexist.
 */
export async function registerAppServiceWorker(
  serviceWorker: Pick<ServiceWorkerContainer, "register"> | undefined = typeof navigator !==
    "undefined"
    ? navigator.serviceWorker
    : undefined,
): Promise<ServiceWorkerRegistration | null> {
  if (!serviceWorker) return null;
  try {
    return await serviceWorker.register(PUSH_SERVICE_WORKER_URL, { scope: "/" });
  } catch {
    return null;
  }
}

export type InstallState = "installed" | "promptable" | "manual" | "unavailable";

/** Minimal structural shape — lib.dom lacks BeforeInstallPromptEvent. */
export type DeferredInstallPrompt = {
  preventDefault(): void;
  prompt(): Promise<void> | void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type InstallPromptWindow = {
  matchMedia?: (query: string) => { matches: boolean };
  navigator?: { standalone?: boolean; userAgent?: string };
};

export type InstallPromptStore = {
  /** Capture a `beforeinstallprompt` event; suppresses the browser infobar. */
  capture(event: Event | DeferredInstallPrompt): void;
  /** `appinstalled` fired — the deferred prompt is consumed forever. */
  markInstalled(): void;
  state(): InstallState;
  /** Fire the captured prompt; single-use — the browser discards it after. */
  promptInstall(): Promise<"accepted" | "dismissed" | "unavailable">;
  subscribe(listener: () => void): () => void;
};

export function createInstallPromptStore(win: InstallPromptWindow): InstallPromptStore {
  let deferred: DeferredInstallPrompt | null = null;
  let installed = standaloneNow();
  const listeners = new Set<() => void>();

  function emit() {
    for (const listener of listeners) listener();
  }

  function standaloneNow(): boolean {
    try {
      if (win.matchMedia?.("(display-mode: standalone)").matches) return true;
    } catch {
      /* matchMedia can throw in embedded contexts — fall through */
    }
    return win.navigator?.standalone === true;
  }

  function isIos(): boolean {
    return /iphone|ipad|ipod/i.test(win.navigator?.userAgent ?? "");
  }

  return {
    capture(event) {
      event.preventDefault();
      deferred = event as DeferredInstallPrompt;
      emit();
    },
    markInstalled() {
      installed = true;
      deferred = null;
      emit();
    },
    state() {
      if (installed || standaloneNow()) return "installed";
      if (deferred) return "promptable";
      if (isIos()) return "manual";
      return "unavailable";
    },
    async promptInstall() {
      const event = deferred;
      if (!event) return "unavailable";
      deferred = null;
      await event.prompt();
      const { outcome } = await event.userChoice;
      if (outcome === "accepted") installed = true;
      emit();
      return outcome;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let sharedStore: InstallPromptStore | null = null;

/**
 * The one shared store. Window listeners attach at module scope on import so a
 * `beforeinstallprompt` fired before any page mounts is still captured — the
 * browser emits it as soon as installability (manifest + fetch-capable SW)
 * checks pass, which can precede the settings visit by minutes.
 */
export function installPromptStore(): InstallPromptStore {
  if (!sharedStore) {
    sharedStore = createInstallPromptStore(
      typeof window !== "undefined" ? window : {},
    );
  }
  return sharedStore;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    installPromptStore().capture(event);
  });
  window.addEventListener("appinstalled", () => {
    installPromptStore().markInstalled();
  });
}
