/**
 * Groq Whisper transcription (server-side).
 *
 * Pure-ish module: takes an audio blob + API key + fetch implementation,
 * returns the transcript. The Next.js route in
 * src/app/api/voice/transcribe/route.ts is a thin wrapper handling HTTP,
 * rate limiting, and env config.
 */

export const GROQ_TRANSCRIBE_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";
export const GROQ_MODEL = "whisper-large-v3-turbo";

export type TranscribeError =
  | { kind: "auth" }
  | { kind: "rate-limited" }
  | { kind: "network" }
  | { kind: "failed" };

export function transcribeErrorMessage(error: TranscribeError): string {
  switch (error.kind) {
    case "auth":
      return "Cấu hình nhận dạng giọng nói không hợp lệ.";
    case "rate-limited":
      return "Dịch vụ nhận dạng đang bận. Thử lại sau một phút nhé.";
    case "network":
      return "Không kết nối được dịch vụ nhận dạng.";
    case "failed":
      return "Nhận dạng giọng nói thất bại.";
  }
}

/**
 * Send audio to Groq Whisper and return the Vietnamese transcript.
 * Throws { kind: TranscribeError["kind"] } shaped as Error with the
 * Vietnamese message attached.
 */
export async function transcribeWithGroq(
  audio: Blob,
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const form = new FormData();
  form.append("file", audio, "voice.webm");
  form.append("model", GROQ_MODEL);
  form.append("language", "vi");
  form.append("response_format", "json");

  let response: Response;
  try {
    response = await fetchFn(GROQ_TRANSCRIBE_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
  } catch {
    throw new Error(transcribeErrorMessage({ kind: "network" }));
  }

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new Error(transcribeErrorMessage({ kind: "auth" }));
    }
    if (status === 429) {
      throw new Error(transcribeErrorMessage({ kind: "rate-limited" }));
    }
    throw new Error(transcribeErrorMessage({ kind: "failed" }));
  }

  try {
    const data = (await response.json()) as { text?: unknown };
    return typeof data.text === "string" ? data.text.trim() : "";
  } catch {
    throw new Error(transcribeErrorMessage({ kind: "failed" }));
  }
}
