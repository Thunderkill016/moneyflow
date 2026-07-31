import { NextResponse } from "next/server";
import {
  MAX_SHARE_FILE_BYTES,
  MAX_SHARE_TEXT_FIELD_CHARS,
  declaredShareRequestTooLarge,
  isMultipartFormData,
  isSupportedSharedTextFile,
  limitShareRequestBody,
  nextSharePayloadSize,
} from "@/lib/inbox/share-target-security";
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
  if (declaredShareRequestTooLarge(request.headers.get("content-length"))) {
    return payloadTooLargeResponse();
  }
  if (!isMultipartFormData(request.headers.get("content-type"))) {
    return unsupportedMediaTypeResponse();
  }

  let payload: SharePayload = {
    title: "",
    text: "",
    url: "",
    files: [],
  };

  try {
    const boundedForm = await readBoundedFormData(request);
    if (boundedForm.tooLarge) return payloadTooLargeResponse();
    if (!boundedForm.form) throw new Error("missing_share_form");

    const sharedFiles = await readSharedFiles(boundedForm.form);
    if (sharedFiles.tooLarge) return payloadTooLargeResponse();

    payload = {
      title: readStringField(boundedForm.form, "title"),
      text: readStringField(boundedForm.form, "text"),
      url: readStringField(boundedForm.form, "url"),
      files: sharedFiles.files,
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

function payloadTooLargeResponse() {
  return new NextResponse("Nội dung chia sẻ vượt quá giới hạn cho phép.", {
    status: 413,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function unsupportedMediaTypeResponse() {
  return new NextResponse("MoneyFlow chỉ nhận biểu mẫu chia sẻ multipart.", {
    status: 415,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function readBoundedFormData(
  request: Request,
): Promise<{ form: FormData | null; tooLarge: boolean }> {
  if (!request.body) {
    return { form: await request.formData(), tooLarge: false };
  }

  const limited = limitShareRequestBody(request.body);
  const requestInit: RequestInit & { duplex: "half" } = {
    method: request.method,
    headers: request.headers,
    body: limited.stream,
    duplex: "half",
  };
  const boundedRequest = new Request(request.url, requestInit);

  try {
    return { form: await boundedRequest.formData(), tooLarge: false };
  } catch (error) {
    if (limited.wasTooLarge()) return { form: null, tooLarge: true };
    throw error;
  }
}

function readStringField(form: FormData, name: string): string {
  const value = form.get(name);
  if (typeof value === "string") {
    return value.slice(0, MAX_SHARE_TEXT_FIELD_CHARS);
  }
  return "";
}

async function readSharedFiles(
  form: FormData,
): Promise<{ files: SharedFilePayload[]; tooLarge: boolean }> {
  const files: SharedFilePayload[] = [];
  const entries = form.getAll("files");
  let totalBytes = 0;

  for (const entry of entries) {
    if (files.length >= MAX_SHARE_FILES) break;
    if (!(entry instanceof File)) continue;
    if (entry.size <= 0) continue;

    const nextSize = nextSharePayloadSize(totalBytes, entry.size);
    if (nextSize.tooLarge || entry.size > MAX_SHARE_FILE_BYTES) {
      return { files: [], tooLarge: true };
    }
    totalBytes = nextSize.totalBytes;

    if (!isSupportedSharedTextFile(entry)) {
      files.push({
        name: entry.name || "file",
        type: entry.type || "",
        text: "",
        size: entry.size,
      });
      continue;
    }

    try {
      const text = await entry.text();
      files.push({
        name: entry.name || "shared.txt",
        type: entry.type || "",
        text: text.slice(0, MAX_SHARE_FILE_BYTES),
        size: entry.size,
      });
    } catch {
      files.push({
        name: entry.name || "file",
        type: entry.type || "",
        text: "",
        size: entry.size,
      });
    }
  }

  return { files, tooLarge: false };
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
