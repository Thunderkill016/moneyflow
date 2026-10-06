/**
 * Vietnamese speech recognition via Groq Whisper API (whisper-large-v3-turbo).
 *
 * Browser-only module — always dynamically imported, never in the SSR bundle.
 *
 * Why Groq instead of on-device Vosk: no 33MB model download, transcription
 * starts immediately, and Whisper large is markedly more accurate on
 * Vietnamese than the small on-device model. Trade-off: short audio clips
 * are sent to Groq for transcription (the UI and privacy policy say so).
 * The API key never leaves the server — the browser posts audio to our own
 * /api/voice/transcribe proxy.
 *
 * Lifecycle:
 *   isVoiceCaptureSupported() -> transcribeOnce()
 */

export type TranscribeOptions = {
  /** Hard cap on recording length. Default 20s. */
  maxSeconds?: number;
  /** Auto-stop after this many seconds of near-silence. Default 2s. */
  silenceSeconds?: number;
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
  return hasMic && typeof window.MediaRecorder !== "undefined";
}

function pickMimeType(): string {
  if (typeof window === "undefined" || !window.MediaRecorder) return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    try {
      if (window.MediaRecorder.isTypeSupported(mime)) return mime;
    } catch {
      /* try next */
    }
  }
  return "";
}

/**
 * Record once from the microphone, send the clip to /api/voice/transcribe,
 * and return the transcript. Stops on: user abort (via AbortSignal),
 * silence timeout, or maxSeconds. Always releases the microphone afterwards.
 */
export async function transcribeOnce(
  options: TranscribeOptions & { signal?: AbortSignal } = {},
): Promise<TranscribeResult> {
  const { maxSeconds = 20, silenceSeconds = 2, signal } = options;

  if (!isVoiceCaptureSupported()) {
    throw new Error("Thiết bị này không hỗ trợ nhập giọng nói.");
  }
  if (signal?.aborted) {
    throw new Error("Đã hủy ghi âm.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  });

  const mimeType = pickMimeType();
  let recorder: MediaRecorder;
  try {
    recorder =
      mimeType.length > 0
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
  } catch {
    for (const track of stream.getTracks()) track.stop();
    throw new Error("Thiết bị này không hỗ trợ ghi âm.");
  }

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  // Silence watchdog via AnalyserNode (MediaRecorder gives no level events).
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let levels: Float32Array<ArrayBuffer> | null = null;
  if (AudioCtor) {
    try {
      audioContext = new AudioCtor();
      const source = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      levels = new Float32Array(analyser.fftSize);
      source.connect(analyser);
    } catch {
      audioContext = null;
      analyser = null;
      levels = null;
    }
  }

  const cleanup = () => {
    for (const track of stream.getTracks()) track.stop();
    if (audioContext) {
      void audioContext.close().catch(() => undefined);
      audioContext = null;
    }
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      resolve(
        new Blob(chunks, { type: mimeType || "audio/webm" }),
      );
    };
  });

  let settled = false;
  const stopRecording = () => {
    if (settled) return;
    settled = true;
    window.clearInterval(watchdog);
    signal?.removeEventListener("abort", abortHandler);
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      /* already stopped */
    }
  };
  const abortHandler = () => stopRecording();
  signal?.addEventListener("abort", abortHandler, { once: true });

  recorder.start(250);

  let silenceMs = 0;
  const startedAt = Date.now();
  const watchdog = window.setInterval(() => {
    if (settled) return;
    const elapsedSec = (Date.now() - startedAt) / 1000;
    if (analyser && levels) {
      analyser.getFloatTimeDomainData(levels);
      let sum = 0;
      for (let i = 0; i < levels.length; i++) sum += levels[i]! * levels[i]!;
      const rms = Math.sqrt(sum / levels.length);
      silenceMs = rms < 0.015 ? silenceMs + 250 : 0;
    }
    if (silenceMs >= silenceSeconds * 1000 || elapsedSec >= maxSeconds) {
      stopRecording();
    }
  }, 250);

  const audioBlob = await stopped;
  cleanup();

  if (signal?.aborted) {
    throw new Error("Đã hủy ghi âm.");
  }
  if (audioBlob.size === 0) {
    throw new Error("Không thu được âm thanh. Thử lại nhé.");
  }

  const form = new FormData();
  form.append("audio", audioBlob, "voice.webm");

  let response: Response;
  try {
    response = await fetch("/api/voice/transcribe", {
      method: "POST",
      body: form,
      signal,
    });
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") {
      throw new Error("Đã hủy ghi âm.");
    }
    throw new Error("Không kết nối được dịch vụ nhận dạng.");
  }

  if (!response.ok) {
    let message = "Nhận dạng giọng nói thất bại.";
    try {
      const data = (await response.json()) as { error?: unknown };
      if (typeof data.error === "string" && data.error) message = data.error;
    } catch {
      /* keep default */
    }
    throw new Error(message);
  }

  let text = "";
  try {
    const data = (await response.json()) as { text?: unknown };
    if (typeof data.text === "string") text = data.text.trim();
  } catch {
    throw new Error("Nhận dạng giọng nói thất bại.");
  }
  return { text };
}

/**
 * Compatibility shim: the previous engine exposed model lifecycle helpers.
 * Whisper needs no on-device model, so these are no-ops kept so callers
 * don't have to branch on the engine.
 */
export async function ensureVoiceModel(): Promise<void> {
  if (!isVoiceCaptureSupported()) {
    throw new Error("Thiết bị này không hỗ trợ nhập giọng nói.");
  }
}

export function releaseVoiceModel(): void {
  /* no on-device model to release */
}
