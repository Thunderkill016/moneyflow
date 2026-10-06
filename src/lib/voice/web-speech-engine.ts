/**
 * Vietnamese speech recognition via the Web Speech API.
 *
 * Browser-only module — always dynamically imported, never in the SSR bundle.
 *
 * Zero download, zero signup, zero server: recognition starts instantly using
 * the browser's built-in speech engine with lang pinned to vi-VN. Trade-off
 * vs on-device: the browser vendor (e.g. Google in Chrome) performs the
 * transcription, so short audio clips leave the device — the UI and privacy
 * policy say so plainly.
 *
 * Lifecycle:
 *   isVoiceCaptureSupported() -> transcribeOnce()
 */

/** Minimal Web Speech API shapes (no @types dependency). */
type SpeechRecognitionResultItem = {
  readonly transcript: string;
};
type SpeechRecognitionResult = {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
};
type SpeechRecognitionResultList = {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
};
type SpeechRecognitionEvent = Event & {
  readonly results: SpeechRecognitionResultList;
};
type SpeechRecognitionErrorEvent = Event & {
  readonly error: string;
};
type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type TranscribeOptions = {
  /** Hard cap on listening length. Default 20s. */
  maxSeconds?: number;
  /** Live interim transcript callback. */
  onPartial?: (text: string) => void;
};

export type TranscribeResult = {
  /** Final transcript (may be empty when nothing was recognized). */
  text: string;
};

export function isVoiceCaptureSupported(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  const hasMic = Boolean(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
  );
  return hasMic && getSpeechRecognitionCtor() !== null;
}

/**
 * Listen once and return the Vietnamese transcript.
 * Resolves on: recognition end (auto after a pause), maxSeconds, or user
 * abort via AbortSignal. Rejects with a Vietnamese message on failure.
 */
export async function transcribeOnce(
  options: TranscribeOptions & { signal?: AbortSignal } = {},
): Promise<TranscribeResult> {
  const { maxSeconds = 20, onPartial, signal } = options;

  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor || !isVoiceCaptureSupported()) {
    throw new Error(
      "Trình duyệt này không hỗ trợ nhập giọng nói. Bạn nhập tay nhé.",
    );
  }
  if (signal?.aborted) {
    throw new Error("Đã hủy ghi âm.");
  }

  return await new Promise<TranscribeResult>((resolve, reject) => {
    const recognition = new Ctor();
    recognition.lang = "vi-VN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let settled = false;
    let finalText = "";

    const cleanup = () => {
      window.clearTimeout(maxTimer);
      signal?.removeEventListener("abort", abortHandler);
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ text: text.trim() });
    };
    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        recognition.abort();
      } catch {
        /* already ended */
      }
      reject(new Error(message));
    };
    const abortHandler = () => {
      // Stopping (not aborting) lets onend deliver what was heard so far.
      try {
        recognition.stop();
      } catch {
        finish(finalText);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]!;
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText = finalText ? `${finalText} ${text}` : text;
        } else {
          interim += text;
        }
      }
      const live = interim || finalText;
      if (live) onPartial?.(live.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          fail(
            "Bạn đã từ chối quyền micro. Bật lại trong cài đặt trình duyệt, hoặc nhập tay nhé.",
          );
          break;
        case "no-speech":
          fail("Không nghe rõ. Thử lại ở chỗ yên tĩnh hơn, hoặc nhập tay nhé.");
          break;
        case "network":
          fail("Cần mạng để nhận dạng giọng nói. Kiểm tra mạng rồi thử lại nhé.");
          break;
        case "aborted":
          finish(finalText);
          break;
        default:
          fail("Nhận dạng giọng nói thất bại. Thử lại hoặc nhập tay nhé.");
      }
    };

    recognition.onend = () => {
      finish(finalText);
    };

    signal?.addEventListener("abort", abortHandler, { once: true });
    const maxTimer = window.setTimeout(() => {
      try {
        recognition.stop();
      } catch {
        finish(finalText);
      }
    }, maxSeconds * 1000);

    try {
      recognition.start();
    } catch {
      fail("Không mở được micro. Thử lại hoặc nhập tay nhé.");
    }
  });
}

/**
 * Compatibility shim: the previous engines exposed model lifecycle helpers.
 * Web Speech needs no model, so these are no-ops kept so callers don't have
 * to branch on the engine.
 */
export async function ensureVoiceModel(): Promise<void> {
  if (!isVoiceCaptureSupported()) {
    throw new Error(
      "Trình duyệt này không hỗ trợ nhập giọng nói. Bạn nhập tay nhé.",
    );
  }
}

export function releaseVoiceModel(): void {
  /* nothing to release */
}
