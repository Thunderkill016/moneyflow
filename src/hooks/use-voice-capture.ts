"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectVoiceKind,
  parseVietnameseMoney,
  suggestVoiceCategory,
  type VoiceKind,
} from "@/lib/voice/vi-money-parser";

export type VoicePhase =
  | "idle"
  | "preparing"
  | "listening"
  | "confirming";

export type VoiceParsedResult = {
  transcript: string;
  amount: number | null;
  shorthand: boolean;
  rest: string;
  kind: VoiceKind;
  suggestedCategoryName: string | null;
};

/**
 * Orchestrates one voice-capture turn: mic -> transcript -> parse.
 * The Web Speech engine is dynamically imported so it only loads when the
 * user opens voice capture. No download, no signup: the browser's built-in
 * recognizer (lang vi-VN) transcribes; short clips leave the device.
 */
export function useVoiceCapture() {
  // null = support not checked yet (avoids SSR/client hydration mismatch).
  const [supported, setSupported] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [partial, setPartial] = useState("");
  const [parsed, setParsed] = useState<VoiceParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // stopListening = "done, keep what was heard"; reset/cancel = "discard".
  // Without this flag, stopListening's abort() makes start() discard the
  // just-transcribed text and leaves the UI stuck in "listening".
  const keepResultRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/voice/web-speech-engine").then((engine) => {
      if (!cancelled) setSupported(engine.isVoiceCaptureSupported());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async () => {
    // Double-tap guard: a second tap while the first start() is still in
    // flight would orphan the first AbortController and open two mic sessions.
    if (abortRef.current) return;
    setError(null);
    setPartial("");
    setParsed(null);
    const aborter = new AbortController();
    abortRef.current = aborter;
    try {
      const engine = await import("@/lib/voice/web-speech-engine");
      if (!engine.isVoiceCaptureSupported()) {
        throw new Error(
          "Thiết bị này không hỗ trợ nhập giọng nói. Bạn nhập tay nhé.",
        );
      }
      setPhase("preparing");
      await engine.ensureVoiceModel();
      if (aborter.signal.aborted) return;
      setPhase("listening");
      const { text } = await engine.transcribeOnce({
        signal: aborter.signal,
        onPartial: (value) => setPartial(value),
      });
      const keepResult = keepResultRef.current;
      keepResultRef.current = false;
      if (aborter.signal.aborted && !keepResult) return;
      const clean = text.trim();
      if (!clean) {
        setError("Không nghe rõ. Thử lại ở chỗ yên tĩnh hơn, hoặc nhập tay nhé.");
        setPhase("idle");
        return;
      }
      const amountParse = parseVietnameseMoney(clean);
      setParsed({
        transcript: clean,
        amount: amountParse.amount,
        shorthand: amountParse.shorthand,
        rest: amountParse.rest,
        kind: detectVoiceKind(clean),
        suggestedCategoryName: suggestVoiceCategory(
          amountParse.rest || clean,
        ),
      });
      setPhase("confirming");
    } catch (caught) {
      if (aborter.signal.aborted) {
        setPhase("idle");
        return;
      }
      const message =
        caught instanceof DOMException && caught.name === "NotAllowedError"
          ? "Bạn đã từ chối quyền micro. Bật lại trong cài đặt trình duyệt, hoặc nhập tay nhé."
          : caught instanceof Error
            ? caught.message
            : "Có lỗi xảy ra khi nghe. Thử lại hoặc nhập tay nhé.";
      setError(message);
      setPhase("idle");
    } finally {
      if (abortRef.current === aborter) abortRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    keepResultRef.current = true;
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    keepResultRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setParsed(null);
    setPartial("");
    setError(null);
  }, []);

  return {
    supported,
    phase,
    partial,
    parsed,
    error,
    start,
    stopListening,
    reset,
  };
}
