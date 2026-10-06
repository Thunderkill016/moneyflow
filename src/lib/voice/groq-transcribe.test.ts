import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GROQ_MODEL,
  GROQ_TRANSCRIBE_URL,
  transcribeErrorMessage,
  transcribeWithGroq,
} from "./groq-transcribe.ts";

function mockFetch(
  impl: (url: string, init: RequestInit) => Promise<Response>,
): typeof fetch {
  return (async (url: unknown, init?: RequestInit) =>
    impl(url as string, init ?? {})) as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("transcribeWithGroq", () => {
  it("posts multipart audio with model + vietnamese language", async () => {
    let seenUrl = "";
    let seenAuth = "";
    const seenFields: Record<string, FormDataEntryValue | null> = {};
    const fetchFn = mockFetch(async (url, init) => {
      seenUrl = url;
      seenAuth = (init.headers as Record<string, string>)["Authorization"] ?? "";
      const form = init.body as FormData;
      for (const key of ["model", "language", "file"]) {
        seenFields[key] = form.get(key);
      }
      return jsonResponse({ text: "ăn sáng hai chục" });
    });

    const text = await transcribeWithGroq(
      new Blob(["audio"], { type: "audio/webm" }),
      "test-key",
      fetchFn,
    );

    assert.equal(text, "ăn sáng hai chục");
    assert.equal(seenUrl, GROQ_TRANSCRIBE_URL);
    assert.equal(seenAuth, "Bearer test-key");
    assert.equal(seenFields["model"], GROQ_MODEL);
    assert.equal(seenFields["language"], "vi");
    assert.ok(seenFields["file"] instanceof File);
  });

  it("trims the transcript", async () => {
    const fetchFn = mockFetch(async () =>
      jsonResponse({ text: "  cà phê ba lăm\n" }),
    );
    const text = await transcribeWithGroq(
      new Blob(["x"]),
      "k",
      fetchFn,
    );
    assert.equal(text, "cà phê ba lăm");
  });

  it("returns empty string when groq returns no text", async () => {
    const fetchFn = mockFetch(async () => jsonResponse({}));
    const text = await transcribeWithGroq(new Blob(["x"]), "k", fetchFn);
    assert.equal(text, "");
  });

  it("maps 401 to the auth message", async () => {
    const fetchFn = mockFetch(async () => jsonResponse({}, 401));
    await assert.rejects(
      transcribeWithGroq(new Blob(["x"]), "k", fetchFn),
      /không hợp lệ/,
    );
  });

  it("maps 429 to the rate-limit message", async () => {
    const fetchFn = mockFetch(async () => jsonResponse({}, 429));
    await assert.rejects(
      transcribeWithGroq(new Blob(["x"]), "k", fetchFn),
      /đang bận/,
    );
  });

  it("maps network failure to the network message", async () => {
    const fetchFn = mockFetch(async () => {
      throw new Error("boom");
    });
    await assert.rejects(
      transcribeWithGroq(new Blob(["x"]), "k", fetchFn),
      /Không kết nối/,
    );
  });
});

describe("transcribeErrorMessage", () => {
  it("covers every error kind in vietnamese", () => {
    for (const kind of ["auth", "rate-limited", "network", "failed"] as const) {
      const message = transcribeErrorMessage({ kind });
      assert.match(message, /[à-ỹ]/i, `kind ${kind} should be vietnamese`);
    }
  });
});
