/**
 * On-device Vietnamese speech recognition via Vosk (WASM).
 *
 * Browser-only module — always dynamically imported, never in the SSR bundle.
 * 100% on-device: no audio ever leaves the user's device, no network needed
 * after the model is cached by the browser, $0 forever.
 *
 * Lifecycle:
 *   isVoiceCaptureSupported() -> ensureVoiceModel() -> transcribeOnce()
 *
 * Note: the model URL is passed straight to vosk-browser. A blob: URL created
 * via URL.createObjectURL must NOT be used — workers spawned from a blob URL
 * cannot fetch another blob URL in Chromium ("Failed to fetch").
 */

export const VOSK_MODEL_VERSION = "vosk-model-small-vn-0.4";
export const VOSK_MODEL_URL = `/models/${VOSK_MODEL_VERSION}.tar.gz`;

export type TranscribeOptions = {
  /** Hard cap on recording length. Default 20s. */
  maxSeconds?: number;
  /** Auto-stop after this many seconds of near-silence. Default 2s. */
  silenceSeconds?: number;
  onPartial?: (text: string) => void;
};

export type TranscribeResult = {
  /** Final transcript (may be empty when nothing was recognized). */
  text: string;
};

type VoskModule = typeof import("vosk-browser");

let voskModulePromise: Promise<VoskModule> | null = null;
let modelPromise: Promise<import("vosk-browser").Model> | null = null;

function loadVoskModule(): Promise<VoskModule> {
  if (!voskModulePromise) {
    voskModulePromise = import("vosk-browser");
  }
  return voskModulePromise;
}

export function isVoiceCaptureSupported(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return false;
  }
  const hasMic = Boolean(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
  );
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  return hasMic && Boolean(AudioCtor) && typeof WebAssembly !== "undefined";
}

/**
 * Load the Vosk model (spawns a worker; ~33MB download on first run, then
 * served from the browser HTTP cache). Safe to call repeatedly — loads once.
 * Throws with a Vietnamese message on failure.
 */
export async function ensureVoiceModel(): Promise<void> {
  if (!isVoiceCaptureSupported()) {
    throw new Error("Thiết bị này không hỗ trợ nhập giọng nói.");
  }
  if (!modelPromise) {
    modelPromise = (async () => {
      const vosk = await loadVoskModule();
      // Plain same-origin URL: the worker fetches it directly. Do NOT pass a
      // blob: object URL here (Chromium blocks worker -> blob: fetch).
      return await vosk.createModel(VOSK_MODEL_URL);
    })().catch((error: unknown) => {
      modelPromise = null;
      throw error instanceof Error
        ? error
        : new Error("Không khởi động được nhận dạng giọng nói.");
    });
  }
  await modelPromise;
}

function getAudioContextCtor(): typeof AudioContext {
  const ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!ctor) throw new Error("Thiết bị này không hỗ trợ nhập giọng nói.");
  return ctor;
}

/**
 * Record once from the microphone and return the transcript.
 * Stops on: user abort (via AbortSignal), silence timeout, or maxSeconds.
 * Always releases microphone + audio graph afterwards.
 */
export async function transcribeOnce(
  options: TranscribeOptions & { signal?: AbortSignal } = {},
): Promise<TranscribeResult> {
  const { maxSeconds = 20, silenceSeconds = 2, onPartial, signal } = options;

  await ensureVoiceModel();
  const model = await modelPromise!;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  });

  const AudioCtor = getAudioContextCtor();
  const audioContext = new AudioCtor({ sampleRate: 16000 });
  const recognizer = new model.KaldiRecognizer(16000);

  return await new Promise<TranscribeResult>((resolve, reject) => {
    let settled = false;
    let silenceMs = 0;
    const startedAt = Date.now();

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    const levels = new Float32Array(analyser.fftSize);
    // ScriptProcessor is deprecated but remains the most compatible way to
    // tap raw PCM across mobile browsers in 2026.
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    source.connect(analyser);
    source.connect(processor);
    processor.connect(audioContext.destination);

    let finalText = "";

    const cleanup = () => {
      try {
        recognizer.remove();
      } catch {
        /* already removed */
      }
      try {
        processor.disconnect();
        source.disconnect();
        analyser.disconnect();
      } catch {
        /* already disconnected */
      }
      for (const track of stream.getTracks()) track.stop();
      void audioContext.close().catch(() => undefined);
    };

    const finish = (text: string) => {
      if (settled) return;
      settled = true;
      window.clearInterval(watchdog);
      // Flush trailing audio; the "result" handler below captures the text
      // into finalText even after settle, so resolve after a short delay.
      try {
        recognizer.retrieveFinalResult();
      } catch {
        /* flush is best-effort */
      }
      window.setTimeout(() => {
        cleanup();
        resolve({ text: finalText || text });
      }, 600);
    };

    const fail = (error: unknown) => {
      if (settled) return;
      settled = true;
      window.clearInterval(watchdog);
      cleanup();
      reject(
        error instanceof Error
          ? error
          : new Error("Nhận dạng giọng nói thất bại."),
      );
    };

    recognizer.on("result", (message) => {
      if (message.event === "result") {
        const text = message.result.text?.trim() ?? "";
        // Always capture — the post-timeout flush arrives after settle.
        if (text) finalText = text;
        if (!settled && text) finish(text);
      } else if (message.event === "error") {
        fail(new Error(message.error || "Nhận dạng giọng nói thất bại."));
      }
    });
    recognizer.on("partialresult", (message) => {
      if (message.event === "partialresult" && message.result.partial) {
        onPartial?.(message.result.partial);
      }
    });

    processor.onaudioprocess = (event) => {
      if (settled) return;
      try {
        recognizer.acceptWaveform(event.inputBuffer);
      } catch {
        // A single bad buffer must not kill the session.
      }
    };

    const abortHandler = () => finish(finalText);
    signal?.addEventListener("abort", abortHandler, { once: true });

    // Watchdog: silence auto-stop + hard cap.
    const watchdog = window.setInterval(() => {
      if (settled) return;
      const elapsedSec = (Date.now() - startedAt) / 1000;
      analyser.getFloatTimeDomainData(levels);
      let sum = 0;
      for (let i = 0; i < levels.length; i++) sum += levels[i]! * levels[i]!;
      const rms = Math.sqrt(sum / levels.length);
      if (rms < 0.015) {
        silenceMs += 250;
      } else {
        silenceMs = 0;
      }
      if (silenceMs >= silenceSeconds * 1000 || elapsedSec >= maxSeconds) {
        finish(finalText);
      }
    }, 250);
  });
}

/** Drop the cached model promise. */
export function releaseVoiceModel(): void {
  if (modelPromise) {
    void modelPromise.then((model) => {
      try {
        model.terminate();
      } catch {
        /* already terminated */
      }
    });
    modelPromise = null;
  }
}
