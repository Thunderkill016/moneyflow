import assert from "node:assert/strict";
import test from "node:test";
import {
  connectionNotice,
  readConnectionState,
  saveFailureMessage,
} from "./connectivity.ts";

/*
 * The asymmetry this module exists around: `navigator.onLine === false` is
 * trustworthy, `true` is not. A browser reports online whenever it has any
 * network interface — a captive portal, a router with no upstream, one bar that
 * carries nothing. Treating `true` as proof a request will succeed would
 * replace one wrong claim with another.
 */

test("false is trusted; true only means not known to be offline", () => {
  assert.equal(readConnectionState({ onLine: false }), "offline");
  assert.equal(readConnectionState({ onLine: true }), "assumed-online");

  // The name carries the caveat: nothing here promises a request will work.
  assert.notEqual(readConnectionState({ onLine: true }), "online");
});

test("no navigator means assumed-online, so the first paint matches the server", () => {
  /*
   * Server rendering has no navigator. Returning anything else here would make
   * the client's first paint differ from the server's and mismatch hydration.
   */
  assert.equal(readConnectionState(undefined), "assumed-online");
});

test("the shell says nothing unless there is something true to say", () => {
  assert.equal(connectionNotice("assumed-online"), null);
  assert.match(connectionNotice("offline") ?? "", /mất kết nối/iu);
});

test("the offline notice does not claim the ledger is unreadable", () => {
  // Reading works offline from what is already rendered; only saving does not.
  const notice = connectionNotice("offline") ?? "";
  assert.match(notice, /xem được/iu);
  assert.match(notice, /chưa lưu được/iu);
});

test("a failed save stops advising a retry once we know we are offline", () => {
  const fallback = "Không thể lưu giao dịch. Hãy thử lại.";

  const offline = saveFailureMessage("offline", fallback);
  assert.notEqual(offline, fallback);
  assert.ok(
    !/^.*Hãy thử lại\.$/u.test(offline),
    "retrying into a dead network is the one thing guaranteed not to work",
  );
  assert.match(offline, /vẫn còn/iu, "it must say the entry is kept");
});

test("an unknown cause keeps the caller's own message", () => {
  /*
   * A save can fail for reasons that have nothing to do with the network. When
   * the state is only assumed online we do not know which, so guessing would be
   * worse than passing through what the caller already established.
   */
  const fallback = "Danh mục không còn tồn tại.";
  assert.equal(saveFailureMessage("assumed-online", fallback), fallback);
});

test("nothing here queues, caches or retries", () => {
  // Awareness, not capability. The module must not grow a sync path by accident.
  const source = readConnectionState.toString() + saveFailureMessage.toString();
  assert.ok(!/setTimeout|fetch\(|localStorage|queue/iu.test(source));
});
