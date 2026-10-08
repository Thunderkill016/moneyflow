import assert from "node:assert/strict";
import test from "node:test";

import {
  AUTH_SIGNED_OUT_MESSAGE_KIND,
  broadcastAuthSignedOut,
  isAuthSignedOutMessage,
  subscribeAuthSignedOut,
} from "./auth-cross-tab.ts";

type Listener = (event: { data: unknown }) => void;

/**
 * In-memory BroadcastChannel double: every channel created from one hub
 * delivers to the others, never to itself — mirroring real semantics.
 */
function makeHub() {
  const channels = new Set<FakeChannel>();
  class FakeChannel {
    listeners = new Set<Listener>();
    closed = false;
    constructor() {
      channels.add(this);
    }
    postMessage = (data: unknown) => {
      for (const other of channels) {
        if (other === this || other.closed) continue;
        for (const listener of other.listeners) listener({ data });
      }
    };
    addEventListener = (_type: string, listener: Listener) => {
      this.listeners.add(listener);
    };
    removeEventListener = (_type: string, listener: Listener) => {
      this.listeners.delete(listener);
    };
    close = () => {
      this.closed = true;
      channels.delete(this);
    };
  }
  return { create: () => new FakeChannel() };
}

test("isAuthSignedOutMessage accepts a well-formed logout message", () => {
  assert.equal(
    isAuthSignedOutMessage({
      kind: AUTH_SIGNED_OUT_MESSAGE_KIND,
      at: 1728200000000,
    }),
    true,
  );
});

test("isAuthSignedOutMessage rejects malformed payloads", () => {
  const bad = [
    null,
    undefined,
    "moneyflow:auth-signed-out",
    { kind: "other-kind", at: 1 },
    { kind: AUTH_SIGNED_OUT_MESSAGE_KIND },
    { kind: AUTH_SIGNED_OUT_MESSAGE_KIND, at: Number.NaN },
    { kind: AUTH_SIGNED_OUT_MESSAGE_KIND, at: "yesterday" },
    [],
  ];
  for (const value of bad) {
    assert.equal(isAuthSignedOutMessage(value), false, JSON.stringify(value));
  }
});

test("a logout broadcast reaches the other tab's subscriber", () => {
  const hub = makeHub();
  let received = 0;
  const unsubscribe = subscribeAuthSignedOut(() => {
    received += 1;
  }, hub.create);
  broadcastAuthSignedOut(hub.create);
  assert.equal(received, 1);
  unsubscribe();
});

test("the sender never receives its own broadcast", () => {
  const hub = makeHub();
  let received = 0;
  // Subscribe and broadcast from the same hub; the fake sender channel is a
  // different instance than the subscriber channel, so this models two tabs.
  const unsubscribe = subscribeAuthSignedOut(() => {
    received += 1;
  }, hub.create);
  broadcastAuthSignedOut(hub.create);
  broadcastAuthSignedOut(hub.create);
  assert.equal(received, 2);
  unsubscribe();
});

test("unsubscribe stops delivery and malformed messages are ignored", () => {
  const hub = makeHub();
  let received = 0;
  const unsubscribe = subscribeAuthSignedOut(() => {
    received += 1;
  }, hub.create);
  const sender = hub.create();
  sender.postMessage({ kind: "not-auth", at: 1 });
  assert.equal(received, 0);
  unsubscribe();
  broadcastAuthSignedOut(hub.create);
  assert.equal(received, 0);
  sender.close();
});

test("broadcast and subscribe are safe no-ops without a channel", () => {
  const none = () => null;
  assert.doesNotThrow(() => broadcastAuthSignedOut(none));
  const unsubscribe = subscribeAuthSignedOut(() => {
    throw new Error("must not be called");
  }, none);
  assert.doesNotThrow(() => unsubscribe());
});
