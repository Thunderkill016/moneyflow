import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  isVoiceCaptureSupported,
  transcribeOnce,
} from "./web-speech-engine.ts";

type FakeRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  startCalls: number;
  stopCalls: number;
  start(): void;
  stop(): void;
  abort(): void;
};

let lastInstance: FakeRecognition | null = null;

function installFakeSR() {
  lastInstance = null;
  const FakeCtor = function (this: unknown) {
    const inst: FakeRecognition = {
      lang: "",
      interimResults: false,
      continuous: false,
      maxAlternatives: 0,
      onresult: null,
      onerror: null,
      onend: null,
      startCalls: 0,
      stopCalls: 0,
      start() {
        this.startCalls += 1;
      },
      stop() {
        this.stopCalls += 1;
        // Simulate natural end after stop.
        setTimeout(() => this.onend?.(), 0);
      },
      abort() {
        setTimeout(() => this.onend?.(), 0);
      },
    };
    lastInstance = inst;
    return inst;
  };
  (globalThis as Record<string, unknown>).window = {
    SpeechRecognition: FakeCtor,
    clearTimeout,
    setTimeout,
  };
  // Node 22 exposes navigator as getter-only; redefine it instead of assigning.
  Object.defineProperty(globalThis, "navigator", {
    value: { mediaDevices: { getUserMedia: async () => ({}) } },
    configurable: true,
    writable: true,
  });
}

function uninstallFake() {
  delete (globalThis as Record<string, unknown>).window;
  // Leave the redefined navigator in place; it does not affect other tests.
}

function fakeResultEvent(transcript: string, isFinal: boolean, resultIndex = 0) {
  return {
    resultIndex,
    results: {
      length: 1,
      0: { isFinal, length: 1, 0: { transcript } },
    },
  };
}

describe("web-speech-engine", () => {
  beforeEach(installFakeSR);
  afterEach(uninstallFake);

  it("is supported when SpeechRecognition + mic exist", () => {
    assert.equal(isVoiceCaptureSupported(), true);
  });

  it("is not supported without SpeechRecognition", () => {
    delete (globalThis.window as unknown as Record<string, unknown>).SpeechRecognition;
    assert.equal(isVoiceCaptureSupported(), false);
  });

  it("pins lang to vi-VN and enables interim results", async () => {
    const promise = transcribeOnce({ maxSeconds: 5 });
    assert.ok(lastInstance);
    assert.equal(lastInstance!.lang, "vi-VN");
    assert.equal(lastInstance!.interimResults, true);
    assert.equal(lastInstance!.startCalls, 1);
    lastInstance!.onresult?.(fakeResultEvent("ăn sáng", false));
    lastInstance!.onresult?.(fakeResultEvent("ăn sáng hai chục", true));
    lastInstance!.onend?.();
    const { text } = await promise;
    assert.equal(text, "ăn sáng hai chục");
  });

  it("delivers interim partials via onPartial", async () => {
    const partials: string[] = [];
    const promise = transcribeOnce({
      maxSeconds: 5,
      onPartial: (t) => partials.push(t),
    });
    lastInstance!.onresult?.(fakeResultEvent("cà phê", false));
    lastInstance!.onend?.();
    await promise;
    assert.deepEqual(partials, ["cà phê"]);
  });

  it("does not duplicate final text when onresult fires twice", async () => {
    const promise = transcribeOnce({ maxSeconds: 5 });
    lastInstance!.onresult?.(fakeResultEvent("ăn sáng", true, 0));
    // Browser re-fires with the same result; resultIndex=0 but the result
    // was already counted — with correct resultIndex handling this second
    // fire carries no NEW result (simulated here as resultIndex past the end).
    lastInstance!.onresult?.({ resultIndex: 1, results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: "ăn sáng" } } } });
    lastInstance!.onend?.();
    const { text } = await promise;
    assert.equal(text, "ăn sáng");
  });

  it("rejects in vietnamese on not-allowed", async () => {
    const promise = transcribeOnce({ maxSeconds: 5 });
    lastInstance!.onerror?.({ error: "not-allowed" });
    await assert.rejects(promise, /quyền micro/);
  });

  it("rejects in vietnamese on no-speech", async () => {
    const promise = transcribeOnce({ maxSeconds: 5 });
    lastInstance!.onerror?.({ error: "no-speech" });
    await assert.rejects(promise, /Không nghe rõ/);
  });

  it("rejects in vietnamese on network error", async () => {
    const promise = transcribeOnce({ maxSeconds: 5 });
    lastInstance!.onerror?.({ error: "network" });
    await assert.rejects(promise, /Cần mạng/);
  });

  it("stops listening when aborted", async () => {
    const controller = new AbortController();
    const promise = transcribeOnce({ maxSeconds: 30, signal: controller.signal });
    controller.abort();
    const { text } = await promise;
    assert.equal(text, "");
    assert.equal(lastInstance!.stopCalls, 1);
  });
});
