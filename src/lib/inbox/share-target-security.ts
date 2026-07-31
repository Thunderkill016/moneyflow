export const MAX_SHARE_REQUEST_BYTES = 12 * 1024 * 1024;
export const MAX_SHARE_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_SHARE_TEXT_FIELD_CHARS = 20_000;

const TEXT_MIME_TYPES = new Set([
  "text/csv",
  "text/plain",
  "text/tab-separated-values",
  "application/csv",
]);

const TEXT_FILE_EXTENSIONS = [".csv", ".txt", ".tsv"] as const;

type SharedFileDescriptor = {
  name: string;
  type: string;
  size: number;
};

export function parseDeclaredContentLength(
  value: string | null | undefined,
): number | null {
  if (!value?.trim()) return null;
  if (!/^\d+$/.test(value.trim())) return null;

  const parsed = Number(value.trim());
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

export function declaredShareRequestTooLarge(
  value: string | null | undefined,
): boolean {
  const length = parseDeclaredContentLength(value);
  return length !== null && length > MAX_SHARE_REQUEST_BYTES;
}

export function isSupportedSharedTextFile(
  file: SharedFileDescriptor,
): boolean {
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return false;
  if (file.size > MAX_SHARE_FILE_BYTES) return false;

  const mime = file.type.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (TEXT_MIME_TYPES.has(mime)) return true;

  const name = file.name.trim().toLowerCase();
  const extensionAllowed = TEXT_FILE_EXTENSIONS.some((extension) =>
    name.endsWith(extension),
  );

  // Android share providers commonly omit MIME or use octet-stream. In that
  // case require a known text extension rather than decoding arbitrary binary.
  return extensionAllowed && (mime === "" || mime === "application/octet-stream");
}

export function nextSharePayloadSize(
  currentBytes: number,
  nextFileBytes: number,
): { totalBytes: number; tooLarge: boolean } {
  if (
    !Number.isSafeInteger(currentBytes) ||
    !Number.isSafeInteger(nextFileBytes) ||
    currentBytes < 0 ||
    nextFileBytes < 0
  ) {
    return { totalBytes: Number.POSITIVE_INFINITY, tooLarge: true };
  }

  const totalBytes = currentBytes + nextFileBytes;
  return {
    totalBytes,
    tooLarge:
      !Number.isSafeInteger(totalBytes) || totalBytes > MAX_SHARE_REQUEST_BYTES,
  };
}
