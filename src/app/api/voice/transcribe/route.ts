import { NextResponse } from "next/server";
import { clientKeyFromHeaders, createRateLimiter } from "@/lib/rate-limit";
import { transcribeWithGroq } from "@/lib/voice/groq-transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * POST /api/voice/transcribe — voice capture transcription proxy.
 *
 * The browser records a short audio clip and posts it here; this route
 * forwards it to Groq's Whisper API (whisper-large-v3-turbo) and returns
 * the Vietnamese transcript. The API key lives only in the server
 * environment (GROQ_API_KEY) — it is never exposed to the client.
 *
 * Why a proxy instead of calling Groq from the browser: the key must not
 * ship in client JS, and the rate limiter below protects the shared
 * free-tier quota from abuse.
 */

// 20s of Opus-in-WebM is well under 1MB; 5MB is a generous ceiling that
// still keeps a single request far below Groq's 25MB cap.
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
// Voice clips are short and bursty: 10 transcriptions per minute per client
// is plenty for real use and protects the free-tier quota.
const limiter = createRateLimiter({ limit: 10, windowMs: 60_000 });

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!limiter.allow(clientKeyFromHeaders(request.headers))) {
    return jsonError(
      "Bạn đang dùng giọng nói quá nhanh. Thử lại sau một phút nhé.",
      429,
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonError("Chưa cấu hình nhận dạng giọng nói trên máy chủ.", 503);
  }

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (file instanceof File) audio = file;
  } catch {
    return jsonError("Không đọc được file âm thanh.", 400);
  }
  if (!audio || audio.size === 0) {
    return jsonError("Thiếu file âm thanh.", 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError("File âm thanh quá lớn.", 413);
  }

  try {
    const text = await transcribeWithGroq(audio, apiKey);
    return NextResponse.json({ text });
  } catch (caught) {
    const message =
      caught instanceof Error ? caught.message : "Nhận dạng giọng nói thất bại.";
    const status = message.includes("đang bận") ? 429 : 502;
    return jsonError(message, status);
  }
}
