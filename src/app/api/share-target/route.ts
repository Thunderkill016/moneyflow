import { NextResponse } from "next/server";
import { MAX_UPLOAD_BYTES } from "@/lib/inbox/parse-csv";
import {
  MAX_SHARE_FILES,
  SHARE_PAYLOAD_STORAGE_KEY,
  type SharePayload,
  type SharedFilePayload,
} from "@/lib/inbox/share-payload";

export const runtime = "nodejs";

/**
 * Web Share Target POST bridge (rewritten from POST /capture/share).
 * Reads multipart form → HTML that stashes payload in sessionStorage → GET /capture/share.
 */
export async function POST(request: Request) {
  let payload: SharePayload = {
    title: "",
    text: "",
    url: "",
    files: [],
  };

  try {
    const form = await request.formData();
    payload = {
      title: readStringField(form, "title"),
      text: readStringField(form, "text"),
      url: readStringField(form, "url"),
      files: await readSharedFiles(form),
    };
  } catch {
    // Still bridge an empty payload so the UI can show a friendly error.
    payload = { title: "", text: "", url: "", files: [] };
  }

  const html = buildBridgeHtml(payload);
  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** GET: send humans to the share capture page (manifest action is POST). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const dest = new URL("/capture/share", url.origin);
  // Preserve query for manual tests (?text=…)
  dest.search = url.search;
  return NextResponse.redirect(dest, 303);
}

function readStringField(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value === "string") return value.slice(0, 50_000);
  return "";
}

async function readSharedFiles(form: FormData): Promise<SharedFilePayload[]> {
  const out: SharedFilePayload[] = [];
  const entries = form.getAll("files");

  for (const entry of entries) {
    if (out.length >= MAX_SHARE_FILES) break;
    if (!(entry instanceof File)) continue;
    if (entry.size <= 0) continue;
    if (entry.size > MAX_UPLOAD_BYTES) {
      // Include meta so client can show size error; empty text.
      out.push({
        name: entry.name || "file",
        type: entry.type || "",
        text: "",
        size: entry.size,
      });
      continue;
    }
    try {
      const text = await entry.text();
      out.push({
        name: entry.name || "shared.txt",
        type: entry.type || "",
        text: text.slice(0, MAX_UPLOAD_BYTES),
        size: entry.size,
      });
    } catch {
      out.push({
        name: entry.name || "file",
        type: entry.type || "",
        text: "",
        size: entry.size,
      });
    }
  }

  return out;
}

function buildBridgeHtml(payload: SharePayload): string {
  // Escape for safe embedding inside <script> (avoid </script> breakout).
  const json = JSON.stringify(payload).replace(/</g, "\\u003c");
  const key = SHARE_PAYLOAD_STORAGE_KEY;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Đang nhận chia sẻ… — Money Flow</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #0f172a; background: #f8fafc; }
    p { line-height: 1.5; }
    a { color: #0f766e; }
  </style>
</head>
<body>
  <p>Đang đưa nội dung chia sẻ vào Capture…</p>
  <p><a href="/capture/share">Tiếp tục nếu không tự chuyển</a></p>
  <script>
    (function () {
      try {
        sessionStorage.setItem(${JSON.stringify(key)}, ${json});
      } catch (e) {}
      location.replace("/capture/share");
    })();
  </script>
</body>
</html>`;
}
