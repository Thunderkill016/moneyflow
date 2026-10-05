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
  | "loading-model"
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
 * Orchestrates one voice-capture turn: model load -> mic -> transcript -> parse.
 * The Vosk engine is dynamically imported so the WASM bundle never enters the
 * main chunk; it only loads when the user opens voice capture.
 */
export function useVoiceCapture() {
  // null = support not checked yet (avoids SSR/client hydration mismatch).
  const [supported, setSupported] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [partial, setPartial] = useState("");
  const [parsed, setParsed] = useState<VoiceParsedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("@/lib/voice/vosk-engine").then((engine) => {
      if (!cancelled) setSupported(engine.isVoiceCaptureSupported());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setPartial("");
    setParsed(null);
    const aborter = new AbortController();
    abortRef.current = aborter;
    try {
      const engine = await import("@/lib/voice/vosk-engine");
      if (!engine.isVoiceCaptureSupported()) {
        throw new Error(
          "Thiết bị này không hỗ trợ nhập giọng nói. Bạn nhập tay nhé.",
        );
      }
      setPhase("loading-model");
      await engine.ensureVoiceModel();
      if (aborter.signal.aborted) return;
      setPhase("listening");
      const { text } = await engine.transcribeOnce({
        signal: aborter.signal,
        onPartial: (value) => setPartial(value),
      });
      if (aborter.signal.aborted) return;
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
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
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
