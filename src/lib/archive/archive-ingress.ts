/**
 * R8 — the single trusted boundary between an untrusted archive file and the
 * R5-validated `MoneyFlowArchive`.
 *
 *   bytes → size bound → strict UTF-8 → structural scan → JSON.parse → R5
 *
 * Nothing here repairs, normalizes or fills in an archive. This layer only
 * decides whether raw input is safe to hand to `JSON.parse`, and then whether
 * the parsed value is a real MoneyFlow archive — which remains entirely R5's
 * judgement. No financial, referential or security rule is duplicated here.
 *
 * Pure: no React, no Next runtime, no Supabase, no filesystem, no network. The
 * only imports are the archive contract and its validator.
 *
 * ## Why a structural scan exists at all
 *
 * RFC 8259 §4 says duplicate object member names are not interoperable, and
 * `JSON.parse` resolves them silently by keeping the last one. By the time a
 * parsed object exists the evidence is gone, so
 * `{"archive_version": 9, "archive_version": 1}` would reach the validator
 * looking perfectly valid. R5 documented that it could not make this claim.
 * This scanner is what finally can: it reads the raw text before `JSON.parse`
 * and rejects a duplicate member name at any depth.
 */

import {
  ALL_ARCHIVE_COLLECTIONS,
  ARCHIVE_ENVELOPE_KEYS,
  ARCHIVE_ROW_SPECS,
  type MoneyFlowArchive,
} from "./moneyflow-archive.ts";
import {
  validateMoneyFlowArchive,
  type ArchiveRejection,
} from "./moneyflow-archive-validator.ts";

/**
 * Maximum accepted archive size.
 *
 * Measured from the real contract shapes: a serialized transaction is ~334 B and
 * an entry ~348 B, so a transaction with its typical 1.3 entries costs ~786 B.
 * 64 MiB therefore holds roughly 85,000 transactions — about 23 years of ten
 * entries a day, or eleven years at twenty. That is generous headroom for a
 * manual-first personal ledger while still bounding one untrusted parse to
 * something a browser can hold.
 *
 * Oversized input is rejected outright. It is never truncated: half an archive
 * is not a smaller archive, it is a corrupt one.
 */
export const ARCHIVE_MAX_BYTES = 64 * 1024 * 1024;

/**
 * Maximum structural nesting.
 *
 * A real archive nests five deep (envelope → tables → collection → row → opaque
 * `headers`/`column_map` payload), so 24 is far above anything legitimate.
 *
 * The exact value is deliberate rather than round: R5's defence-in-depth
 * forbidden-key scan stops descending past depth 24. Capping ingress at the same
 * bound guarantees the validator actually inspects every level of what it
 * accepts — without this, a secret buried at depth 30 would slip past that scan
 * unexamined.
 */
export const ARCHIVE_MAX_DEPTH = 24;

/**
 * Maximum members in a single object.
 *
 * Scope frames are popped as objects close, so the memory the scanner holds is
 * bounded by the *largest single object*, not by the file. A real archive's
 * biggest objects are a row (34 members at most, from `ARCHIVE_ROW_SPECS`) and
 * an imported statement's `column_map`, which is a handful of columns. 4096
 * leaves enormous headroom for both while stopping a crafted object with
 * millions of unique short names from growing an unbounded name set.
 */
export const ARCHIVE_MAX_OBJECT_MEMBERS = 4096;

export type ArchiveIngressRejectionCode =
  | "file_empty"
  | "file_too_large"
  | "invalid_utf8"
  | "invalid_json_syntax"
  | "duplicate_member_name"
  | "max_depth_exceeded"
  | "too_many_object_members"
  | "archive_invalid";

/**
 * Rejections carry a stable code and structural position only.
 *
 * Never a member name and never a value: an archive holds a whole financial
 * history, and `column_map` keys are user-derived column headers from a bank
 * statement, so even a key name can be private. A byte offset and a depth locate
 * the problem without disclosing anything in the file.
 */
export type ArchiveIngressResult =
  | {
      readonly ok: true;
      readonly archive: MoneyFlowArchive;
      readonly bytes: number;
    }
  | {
      readonly ok: false;
      readonly code: ArchiveIngressRejectionCode;
      readonly byteOffset?: number;
      readonly depth?: number;
      /**
       * Present only for `archive_invalid`. R5's rejections carry no values, but
       * their `path` is built from real object keys — and inside an opaque
       * `headers`/`column_map` payload those keys are the user's own imported
       * column headers. Any segment outside the known contract is redacted
       * before it leaves this boundary.
       */
      readonly errors?: readonly ArchiveRejection[];
    };

type ScanFailure = {
  readonly code: Extract<
    ArchiveIngressRejectionCode,
    | "invalid_json_syntax"
    | "duplicate_member_name"
    | "max_depth_exceeded"
    | "too_many_object_members"
  >;
  readonly byteOffset: number;
  readonly depth?: number;
};

const WHITESPACE = new Set([" ", "\t", "\n", "\r"]);

/**
 * Every path segment the contract itself defines: envelope keys, collection
 * names and declared row fields. Anything else in a validator path came from the
 * archive's own data and must not be echoed.
 */
const CONTRACT_PATH_SEGMENTS: ReadonlySet<string> = new Set<string>([
  "tables",
  "tenant_row_counts",
  ...ARCHIVE_ENVELOPE_KEYS,
  ...ALL_ARCHIVE_COLLECTIONS,
  ...Object.values(ARCHIVE_ROW_SPECS).flatMap((spec) => Object.keys(spec.fields)),
]);

const REDACTED_SEGMENT = "<redacted>";

/**
 * Convert a UTF-16 code-unit index into the true UTF-8 byte offset.
 *
 * The scanner walks JavaScript string indices, but the field is documented as a
 * byte offset into the original file — and a single Vietnamese `đ` already makes
 * those two disagree. Counted without allocating, and only ever on the rejection
 * path, so the cost is paid once for a file that is being refused anyway.
 */
function utf8ByteOffset(text: string, codeUnitIndex: number): number {
  let bytes = 0;
  for (let index = 0; index < codeUnitIndex && index < text.length; index += 1) {
    const code = text.codePointAt(index) ?? 0;
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code < 0x10000) bytes += 3;
    else {
      bytes += 4;
      // A surrogate pair is two code units but one code point.
      index += 1;
    }
  }
  return bytes;
}

/**
 * Redact the parts of a validator path that came from archive data.
 *
 * `tables.importBatches[0].column_map.My Bank Login` keeps its structure but
 * loses the private header, becoming
 * `tables.importBatches[0].column_map.<redacted>`.
 */
export function redactValidatorPath(path: string): string {
  if (path === "") return path;
  return path
    .split(".")
    .map((segment) => {
      // Array indices are structural, e.g. `transactions[3]`.
      const name = segment.replace(/\[\d+\]$/u, "");
      const suffix = segment.slice(name.length);
      if (name === "" || CONTRACT_PATH_SEGMENTS.has(name)) return segment;
      return `${REDACTED_SEGMENT}${suffix}`;
    })
    .join(".");
}

/** Frame state for the object currently being scanned. */
type Frame = {
  readonly isObject: boolean;
  /** Decoded member names already seen in *this* object. Sibling scopes are separate. */
  readonly names: Set<string> | null;
  expectingName: boolean;
};

function isHexDigit(character: string): boolean {
  return /^[0-9a-fA-F]$/u.test(character);
}

/**
 * Step over one JSON string without building its decoded value.
 *
 * Used for string *values*, which are the overwhelming majority of an archive's
 * bytes and whose contents this scanner never needs. Decoding them would build a
 * multi-megabyte JavaScript string one character at a time and could exhaust the
 * heap on input well under the byte cap — a boundary that exists to bound
 * untrusted work must not itself be the thing that runs out of memory.
 */
function skipString(text: string, start: number): { next: number } | { error: number } {
  let index = start + 1;
  while (index < text.length) {
    const character = text[index];
    if (character === '"') return { next: index + 1 };
    if (character === "\\") {
      const escape = text[index + 1];
      if (escape === undefined) return { error: index };
      if (escape === "u") {
        const hex = text.slice(index + 2, index + 6);
        if (hex.length < 4 || ![...hex].every(isHexDigit)) return { error: index };
        index += 6;
        continue;
      }
      if (!'"\\/bfnrt'.includes(escape)) return { error: index };
      index += 2;
      continue;
    }
    if (character < " ") return { error: index };
    index += 1;
  }
  return { error: index };
}

/**
 * Read one JSON string starting at the opening quote and return its **decoded**
 * value.
 *
 * Decoding is the point: `"archive_id"` and `"archive_id"` are the same
 * member name, so comparing raw source spelling would miss an escaped duplicate.
 */
function readString(
  text: string,
  start: number,
): { value: string; next: number } | { error: number } {
  let index = start + 1;
  let out = "";
  while (index < text.length) {
    const character = text[index];
    if (character === '"') return { value: out, next: index + 1 };
    if (character === "\\") {
      const escape = text[index + 1];
      if (escape === undefined) return { error: index };
      switch (escape) {
        case '"':
          out += '"';
          index += 2;
          break;
        case "\\":
          out += "\\";
          index += 2;
          break;
        case "/":
          out += "/";
          index += 2;
          break;
        case "b":
          out += "\b";
          index += 2;
          break;
        case "f":
          out += "\f";
          index += 2;
          break;
        case "n":
          out += "\n";
          index += 2;
          break;
        case "r":
          out += "\r";
          index += 2;
          break;
        case "t":
          out += "\t";
          index += 2;
          break;
        case "u": {
          const hex = text.slice(index + 2, index + 6);
          if (hex.length < 4 || ![...hex].every(isHexDigit)) return { error: index };
          out += String.fromCharCode(Number.parseInt(hex, 16));
          index += 6;
          break;
        }
        default:
          // Not a JSON escape. `JSON.parse` rejects it too; we agree early.
          return { error: index };
      }
      continue;
    }
    // Raw control characters are not permitted inside a JSON string.
    if (character < " ") return { error: index };
    out += character;
    index += 1;
  }
  // Unterminated string.
  return { error: index };
}

/**
 * Walk the raw text, tracking object scopes, and reject duplicate member names
 * and excessive nesting.
 *
 * This is deliberately **not** a JSON parser: it builds no values and decides no
 * types. It tokenizes just enough to know which strings are member names and
 * which object they belong to. `JSON.parse` remains the syntax authority — any
 * structural disagreement here is reported as a syntax error, which `JSON.parse`
 * then confirms.
 */
export function scanJsonStructure(text: string): ScanFailure | null {
  const stack: Frame[] = [];
  let index = 0;
  let seenValue = false;

  while (index < text.length) {
    const character = text[index];

    if (WHITESPACE.has(character)) {
      index += 1;
      continue;
    }

    if (character === "{" || character === "[") {
      const isObject = character === "{";
      if (stack.length + 1 > ARCHIVE_MAX_DEPTH) {
        return { code: "max_depth_exceeded", byteOffset: index, depth: stack.length + 1 };
      }
      stack.push({
        isObject,
        names: isObject ? new Set<string>() : null,
        expectingName: isObject,
      });
      index += 1;
      continue;
    }

    if (character === "}" || character === "]") {
      const frame = stack.pop();
      if (!frame) return { code: "invalid_json_syntax", byteOffset: index };
      if (frame.isObject !== (character === "}")) {
        return { code: "invalid_json_syntax", byteOffset: index };
      }
      if (stack.length === 0) seenValue = true;
      index += 1;
      continue;
    }

    if (character === ",") {
      const frame = stack[stack.length - 1];
      if (!frame) return { code: "invalid_json_syntax", byteOffset: index };
      if (frame.isObject) frame.expectingName = true;
      index += 1;
      continue;
    }

    if (character === ":") {
      const frame = stack[stack.length - 1];
      if (!frame?.isObject) return { code: "invalid_json_syntax", byteOffset: index };
      index += 1;
      continue;
    }

    if (character === '"') {
      const frame = stack[stack.length - 1];
      const isMemberName = Boolean(frame?.isObject && frame.expectingName);
      // Only a member name is worth decoding; a value's contents are irrelevant
      // here and decoding them is what makes large archives expensive.
      if (!isMemberName) {
        const skipped = skipString(text, index);
        if ("error" in skipped) {
          return { code: "invalid_json_syntax", byteOffset: skipped.error };
        }
        index = skipped.next;
        if (stack.length === 0) seenValue = true;
        continue;
      }
      const read = readString(text, index);
      if ("error" in read) return { code: "invalid_json_syntax", byteOffset: read.error };
      if (frame?.isObject && frame.expectingName) {
        if (frame.names?.has(read.value)) {
          // Deliberately reports position only — a member name can itself be
          // user data (an imported statement's column header).
          return {
            code: "duplicate_member_name",
            byteOffset: index,
            depth: stack.length,
          };
        }
        if ((frame.names?.size ?? 0) >= ARCHIVE_MAX_OBJECT_MEMBERS) {
          return {
            code: "too_many_object_members",
            byteOffset: index,
            depth: stack.length,
          };
        }
        frame.names?.add(read.value);
        frame.expectingName = false;
      }
      index = read.next;
      if (stack.length === 0) seenValue = true;
      continue;
    }

    // A primitive token: number, true, false or null. Its exact validity is
    // `JSON.parse`'s business; here we only need to step over it.
    const tokenStart = index;
    while (
      index < text.length &&
      !WHITESPACE.has(text[index]) &&
      !",}]:".includes(text[index])
    ) {
      index += 1;
    }
    if (index === tokenStart) return { code: "invalid_json_syntax", byteOffset: index };
    if (stack.length === 0) seenValue = true;
  }

  if (stack.length > 0) return { code: "invalid_json_syntax", byteOffset: text.length };
  if (!seenValue) return { code: "invalid_json_syntax", byteOffset: 0 };
  return null;
}

/**
 * Decode archive bytes as strict UTF-8.
 *
 * `fatal: true` matters: the default decoder replaces malformed sequences with
 * U+FFFD, which would silently rewrite a corrupt file into a parseable one.
 *
 * A leading UTF-8 BOM is tolerated and stripped — editors and spreadsheet tools
 * add it, and it is unambiguous. Nothing else is: no encoding sniffing, no
 * legacy encodings, no UTF-16.
 */
function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    // `ignoreBOM: false` strips a leading U+FEFF. A BOM anywhere else stays in
    // the text and is rejected as a syntax error by the scanner, which is the
    // correct outcome — it is not a valid JSON character.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Take untrusted archive bytes and return an R5-validated archive, or a reason.
 *
 * Order is load-bearing: the cheap byte bound runs before any decoding, decoding
 * runs before scanning, and the scan runs before `JSON.parse` — because that is
 * the only moment duplicate member names are still observable.
 */
export function ingestArchiveBytes(bytes: Uint8Array): ArchiveIngressResult {
  if (bytes.byteLength === 0) return { ok: false, code: "file_empty" };
  if (bytes.byteLength > ARCHIVE_MAX_BYTES) {
    return { ok: false, code: "file_too_large" };
  }

  const text = decodeUtf8(bytes);
  if (text === null) return { ok: false, code: "invalid_utf8" };

  return ingestArchiveText(text, bytes.byteLength);
}

/**
 * The same boundary for input that is already a JavaScript string.
 *
 * The byte bound is re-derived rather than assumed, so a caller cannot skip it
 * by decoding first.
 */
export function ingestArchiveText(text: string, knownBytes?: number): ArchiveIngressResult {
  // A UTF-8 encoding is at least one byte per code unit, so this rejects an
  // oversized input before `TextEncoder` allocates a buffer for it.
  if (text.length > ARCHIVE_MAX_BYTES) return { ok: false, code: "file_too_large" };
  // `knownBytes` is an optimisation, never a permission: the measured length
  // still applies, so a caller cannot shrink its way past the bound.
  const measured = new TextEncoder().encode(text).byteLength;
  const bytes = Math.max(measured, knownBytes ?? 0);
  if (bytes === 0) return { ok: false, code: "file_empty" };
  if (bytes > ARCHIVE_MAX_BYTES) return { ok: false, code: "file_too_large" };
  if (text.trim() === "") return { ok: false, code: "file_empty" };

  const failure = scanJsonStructure(text);
  if (failure) {
    return {
      ok: false,
      code: failure.code,
      byteOffset: utf8ByteOffset(text, failure.byteOffset),
      ...(failure.depth === undefined ? {} : { depth: failure.depth }),
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // No message is carried through: `JSON.parse` errors quote the offending
    // source text, which would put archive content into a rejection object.
    return { ok: false, code: "invalid_json_syntax" };
  }

  // R5 remains the domain authority. Nothing above has repaired anything, so a
  // malformed archive reaches the validator exactly as it was written.
  const result = validateMoneyFlowArchive(parsed);
  if (!result.ok) {
    return {
      ok: false,
      code: "archive_invalid",
      errors: result.errors.map((rejection) => ({
        code: rejection.code,
        path: redactValidatorPath(rejection.path),
      })),
    };
  }

  return { ok: true, archive: result.archive, bytes };
}
