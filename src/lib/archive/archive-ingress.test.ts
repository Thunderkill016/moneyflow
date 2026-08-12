import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ARCHIVE_MAX_BYTES,
  ARCHIVE_MAX_DEPTH,
  ingestArchiveBytes,
  ingestArchiveText,
  redactValidatorPath,
  scanJsonStructure,
  type ArchiveIngressRejectionCode,
} from "./archive-ingress.ts";
import { ALL_ARCHIVE_COLLECTIONS, ARCHIVE_SCHEMA_GENERATION } from "./moneyflow-archive.ts";

/**
 * R8 — an untrusted file must cross exactly one boundary, and it must fail
 * closed. Duplicate member names are the reason this layer exists, so they are
 * attacked hardest.
 */

const encoder = new TextEncoder();
const bytesOf = (text: string) => encoder.encode(text);

function expectReject(input: string, code: ArchiveIngressRejectionCode) {
  const result = ingestArchiveText(input);
  assert.ok(!result.ok, `expected ${code}, got acceptance`);
  assert.equal(result.code, code, `expected ${code}, got ${result.code}`);
}

// --- A valid archive, built the way R6 emits one -------------------------------

function uuid(suffix: number): string {
  return `00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;
}

function minimalArchive(): Record<string, unknown> {
  const tables: Record<string, unknown> = {
    profile: {
      full_name: "Người dùng",
      avatar_url: null,
      currency_code: "VND",
      locale: "vi-VN",
      timezone: "Asia/Ho_Chi_Minh",
    },
  };
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    if (collection !== "profile") tables[collection] = [];
  }
  const counts: Record<string, number> = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    counts[collection] = collection === "profile" ? 1 : 0;
  }
  return {
    archive_version: 1,
    archive_id: uuid(1),
    produced_at: "2026-08-12T10:00:00.000000Z",
    schema_generation: ARCHIVE_SCHEMA_GENERATION,
    tenant_row_counts: counts,
    tables,
  };
}

test("a valid empty-tenant archive passes ingress unchanged", () => {
  const text = JSON.stringify(minimalArchive());
  const result = ingestArchiveText(text);
  assert.ok(result.ok, `expected acceptance, got ${result.ok ? "" : result.code}`);
  assert.equal(result.archive.archive_version, 1);
  // Nothing was repaired: the accepted value round-trips to the same bytes.
  assert.equal(JSON.stringify(result.archive), text);
});

test("the same archive passes as raw UTF-8 bytes", () => {
  const result = ingestArchiveBytes(bytesOf(JSON.stringify(minimalArchive())));
  assert.ok(result.ok);
  assert.ok(result.bytes > 0);
});

test("a leading UTF-8 BOM is tolerated, other encodings are not", () => {
  const text = JSON.stringify(minimalArchive());
  const withBom = new Uint8Array([0xef, 0xbb, 0xbf, ...bytesOf(text)]);
  assert.ok(ingestArchiveBytes(withBom).ok, "a BOM-prefixed archive must be accepted");

  // UTF-16LE of `{}` — valid in another encoding, meaningless as UTF-8.
  const utf16 = new Uint8Array([0x7b, 0x00, 0x7d, 0x00]);
  const result = ingestArchiveBytes(utf16);
  assert.ok(!result.ok);
  assert.ok(["invalid_utf8", "invalid_json_syntax"].includes(result.code));
});

// --- Empty, oversized, malformed bytes ------------------------------------------

test("empty and whitespace-only input is rejected", () => {
  assert.equal((ingestArchiveBytes(new Uint8Array(0)) as { code: string }).code, "file_empty");
  expectReject("   \n\t ", "file_empty");
});

test("malformed UTF-8 is rejected rather than replaced with U+FFFD", () => {
  // 0xC3 starts a two-byte sequence; 0x28 cannot continue it.
  const broken = new Uint8Array([0x7b, 0x22, 0x61, 0x22, 0x3a, 0xc3, 0x28, 0x7d]);
  const result = ingestArchiveBytes(broken);
  assert.ok(!result.ok);
  assert.equal(result.code, "invalid_utf8");
  // Prove the default decoder would have silently accepted it.
  const lenient = new TextDecoder("utf-8").decode(broken);
  assert.ok(lenient.includes("�"), "premise: a lenient decoder inserts a replacement char");
});

test("oversized input is rejected before parsing, never truncated", () => {
  const result = ingestArchiveBytes(new Uint8Array(ARCHIVE_MAX_BYTES + 1));
  assert.ok(!result.ok);
  assert.equal(result.code, "file_too_large");
});

test("the size bound is derived from real archive shapes, not invented", () => {
  // ~786 bytes per transaction with its typical entries; the cap must hold a
  // decade of heavy daily use.
  const transactionsAtCap = ARCHIVE_MAX_BYTES / 786;
  assert.ok(transactionsAtCap > 70_000, "the cap must not lock out a long-lived ledger");
  assert.ok(ARCHIVE_MAX_BYTES <= 128 * 1024 * 1024, "the cap must still bound one untrusted parse");
});

// --- JSON syntax ---------------------------------------------------------------

test("non-JSON extensions are rejected", () => {
  for (const input of [
    '{"a": 1,}',
    "[1, 2,]",
    '{"a": 1} // comment',
    '/* comment */ {"a": 1}',
    '{"a": NaN}',
    '{"a": Infinity}',
    '{"a": undefined}',
    "{'a': 1}",
    '{"a": 01}',
  ]) {
    const result = ingestArchiveText(input);
    assert.ok(!result.ok, `${input} must be rejected`);
    assert.ok(
      ["invalid_json_syntax", "archive_invalid"].includes(result.code),
      `${input} produced ${result.code}`,
    );
  }
});

test("truncated and malformed structures are rejected", () => {
  for (const input of ['{"a": 1', '{"a": ', "[1, 2", '{"a": 1}}', '{"a": [1, 2}]', '"unterminated']) {
    expectReject(input, "invalid_json_syntax");
  }
});

test("malformed unicode escapes are rejected", () => {
  for (const input of ['{"a\\u12": 1}', '{"a": "\\uZZZZ"}', '{"a": "\\q"}']) {
    expectReject(input, "invalid_json_syntax");
  }
});

test("a primitive root is not an archive", () => {
  for (const input of ["1", '"text"', "true", "null"]) {
    const result = ingestArchiveText(input);
    assert.ok(!result.ok);
    assert.equal(result.code, "archive_invalid");
  }
});

// --- Duplicate member names: the reason this layer exists ----------------------

test("JSON.parse alone loses duplicate-key evidence", () => {
  // The premise. If this ever stops being true the layer could be reconsidered;
  // while it holds, ingress is the only place a duplicate can be seen.
  const parsed = JSON.parse('{"archive_version": 9, "archive_version": 1}') as Record<
    string,
    unknown
  >;
  assert.equal(parsed.archive_version, 1);
  assert.equal(Object.keys(parsed).length, 1);
});

test("a duplicate root member name is rejected", () => {
  expectReject('{"archive_id": "a", "archive_id": "b"}', "duplicate_member_name");
});

test("a duplicate member name escaped into the same name is rejected", () => {
  // "archive_id" decodes to "archive_id" — comparing raw spelling misses it.
  expectReject('{"archive_id": "a", "\\u0061rchive_id": "b"}', "duplicate_member_name");
  expectReject('{"\\u0061": 1, "a": 2}', "duplicate_member_name");
});

test("a duplicate deep inside the archive is rejected", () => {
  const archive = minimalArchive();
  const text = JSON.stringify(archive).replace(
    '"currency_code":"VND"',
    '"currency_code":"VND","currency_code":"USD"',
  );
  expectReject(text, "duplicate_member_name");
});

test("a duplicate inside an object contained in an array is rejected", () => {
  expectReject('{"rows": [{"id": 1, "id": 2}]}', "duplicate_member_name");
  expectReject('{"rows": [{"a": 1}, {"b": 2, "b": 3}]}', "duplicate_member_name");
});

test("the same name in sibling scopes is valid, not a duplicate", () => {
  for (const input of [
    '{"a": {"id": 1}, "b": {"id": 2}}',
    '{"rows": [{"id": 1}, {"id": 2}]}',
    '{"a": {"x": {"id": 1}}, "id": 2}',
  ]) {
    assert.equal(scanJsonStructure(input), null, `${input} must scan clean`);
  }
});

test("text that merely looks like a member name is not one", () => {
  // A naive regex over `"key":` would fire on every one of these.
  for (const input of [
    '{"note": "\\"id\\": 1, \\"id\\": 2"}',
    '{"note": "{\\"id\\": 1}"}',
    '{"id": "value with \\"id\\": inside"}',
    '{"note": "a:b, c:d", "other": "\\"note\\":"}',
    '{"note": "}{][", "second": "\\\\"}',
    '{"a": "\\\\", "b": "\\""}',
  ]) {
    assert.equal(scanJsonStructure(input), null, `${input} must scan clean`);
    assert.doesNotThrow(() => JSON.parse(input), `${input} must really be valid JSON`);
  }
});

test("a duplicate is caught even when values contain decoys", () => {
  expectReject('{"note": "\\"id\\": 9", "id": 1, "id": 2}', "duplicate_member_name");
});

test("duplicate detection reports position but never the member name", () => {
  const result = ingestArchiveText('{"merchant_secret_name": 1, "merchant_secret_name": 2}');
  assert.ok(!result.ok);
  assert.equal(result.code, "duplicate_member_name");
  const serialized = JSON.stringify(result);
  assert.ok(
    !serialized.includes("merchant_secret_name"),
    "a member name can itself be user data and must not be echoed",
  );
  assert.ok(typeof result.byteOffset === "number");
});

// --- Depth ----------------------------------------------------------------------

test("excessive nesting is rejected", () => {
  const deep = `${"[".repeat(ARCHIVE_MAX_DEPTH + 5)}1${"]".repeat(ARCHIVE_MAX_DEPTH + 5)}`;
  const result = ingestArchiveText(deep);
  assert.ok(!result.ok);
  assert.equal(result.code, "max_depth_exceeded");
});

test("nesting up to the bound is accepted by the scanner", () => {
  const atLimit = `${"[".repeat(ARCHIVE_MAX_DEPTH)}1${"]".repeat(ARCHIVE_MAX_DEPTH)}`;
  assert.equal(scanJsonStructure(atLimit), null);
});

test("the depth bound is not looser than R5's own forbidden-key scan", () => {
  // R5 stops descending past depth 24, so anything ingress accepts must be fully
  // inspectable by that scan — otherwise a deeply buried secret goes unexamined.
  const validator = readFileSync(
    new URL("./moneyflow-archive-validator.ts", import.meta.url),
    "utf8",
  );
  const bound = Number.parseInt(/depth > (\d+)/u.exec(validator)?.[1] ?? "0", 10);
  assert.ok(bound > 0, "the validator must still bound its scan");
  assert.ok(
    ARCHIVE_MAX_DEPTH <= bound,
    `ingress depth ${ARCHIVE_MAX_DEPTH} must not exceed the validator's scan bound ${bound}`,
  );
});

// --- R5 stays the domain authority ----------------------------------------------

test("valid JSON that is not a MoneyFlow archive is rejected by R5, not repaired", () => {
  const result = ingestArchiveText('{"hello": "world"}');
  assert.ok(!result.ok);
  assert.equal(result.code, "archive_invalid");
  assert.ok((result.errors?.length ?? 0) > 0, "R5's own rejections must be surfaced");
});

test("ingress does not fix up an archive R5 would reject", () => {
  const archive = minimalArchive();
  delete (archive as Record<string, unknown>).produced_at;
  const result = ingestArchiveText(JSON.stringify(archive));
  assert.ok(!result.ok);
  assert.equal(result.code, "archive_invalid");
  assert.ok(result.errors?.some((error) => error.code === "archive_missing_key"));
});

test("a nested secret still reaches R5 and is rejected there", () => {
  const archive = minimalArchive();
  (archive.tables as Record<string, unknown>).importBatches = [
    { nested: { service_role_key: "eyJ..." } },
  ];
  (archive.tenant_row_counts as Record<string, number>).importBatches = 1;
  const result = ingestArchiveText(JSON.stringify(archive));
  assert.ok(!result.ok);
  assert.equal(result.code, "archive_invalid");
  assert.ok(result.errors?.some((error) => error.code === "forbidden_secret_field"));
});

test("unsafe money still reaches R5 and is rejected there", () => {
  const archive = minimalArchive();
  (archive.tables as Record<string, unknown>).accounts = [
    {
      id: uuid(21),
      name: "Tiền mặt",
      kind: "cash",
      currency_code: "VND",
      initial_balance_minor: 9007199254740993,
      credit_limit_minor: null,
      icon: null,
      color: null,
      is_archived: false,
      created_at: "2026-08-12T10:00:00.000000Z",
      updated_at: "2026-08-12T10:00:00.000000Z",
    },
  ];
  (archive.tenant_row_counts as Record<string, number>).accounts = 1;
  const result = ingestArchiveText(JSON.stringify(archive));
  assert.ok(!result.ok);
  assert.equal(result.code, "archive_invalid");
});

test("a number encoded as a string is not coerced", () => {
  const archive = minimalArchive();
  archive.archive_version = "1";
  const result = ingestArchiveText(JSON.stringify(archive));
  assert.ok(!result.ok);
  assert.equal(result.code, "archive_invalid");
});

// --- Purity and hygiene ----------------------------------------------------------

test("ingress does not mutate its input", () => {
  const text = JSON.stringify(minimalArchive());
  const copy = `${text}`;
  ingestArchiveText(text);
  assert.equal(text, copy);
});

test("rejections never contain archive content", () => {
  const archive = minimalArchive();
  (archive.tables as Record<string, Record<string, unknown>>).profile.full_name =
    "Nguyễn Bí Mật 999";
  delete (archive as Record<string, unknown>).archive_id;
  const result = ingestArchiveText(JSON.stringify(archive));
  assert.ok(!result.ok);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes("Nguyễn Bí Mật 999"), "no archive value may appear in a rejection");
  for (const error of result.errors ?? []) {
    assert.deepEqual(Object.keys(error).sort(), ["code", "path"]);
  }
});

test("a huge string value is scanned cheaply instead of exhausting the heap", () => {
  // The scanner used to decode every string, including values, building a
  // multi-megabyte JS string one character at a time. A 40 MiB value — well
  // under the 64 MiB cap — aborted the process with an out-of-memory fatal.
  const text = `{"note":"${"b".repeat(24 * 1024 * 1024)}"}`;
  const started = Date.now();
  const scan = scanJsonStructure(text);
  const elapsed = Date.now() - started;
  assert.equal(scan, null, "a large but valid string value must scan clean");
  assert.ok(elapsed < 5000, `scanning a large value must stay cheap, took ${elapsed}ms`);
});

test("duplicate detection still works alongside a huge string value", () => {
  const filler = "b".repeat(1024 * 1024);
  expectReject(`{"note":"${filler}","id":1,"id":2}`, "duplicate_member_name");
});

test("a caller-supplied byte count cannot shrink past the size bound", () => {
  const archive = JSON.stringify(minimalArchive());
  const honest = ingestArchiveText(archive);
  assert.ok(honest.ok);
  // Understating the size must not change the measured bytes.
  const understated = ingestArchiveText(archive, 5);
  assert.ok(understated.ok);
  assert.equal(understated.bytes, honest.bytes, "the measured length always applies");
});

test("validator paths are redacted before leaving the boundary", () => {
  // column_map keys are the user's own imported statement headers.
  const archive = minimalArchive();
  (archive.tables as Record<string, unknown>).importBatches = [
    { column_map: { "My Bank Password Hint": "x" } },
  ];
  (archive.tenant_row_counts as Record<string, number>).importBatches = 1;
  const result = ingestArchiveText(JSON.stringify(archive));
  assert.ok(!result.ok);
  assert.equal(result.code, "archive_invalid");
  const serialized = JSON.stringify(result);
  assert.ok(
    !serialized.includes("My Bank Password Hint"),
    "a user-derived key must never appear in a rejection path",
  );
  assert.ok(serialized.includes("<redacted>"), "the structure is kept, the private part is not");
  // Contract structure survives so the message stays useful.
  assert.ok(serialized.includes("importBatches"));
});

test("redaction keeps contract segments and array indices intact", () => {
  assert.equal(
    redactValidatorPath("tables.transactions[3].amount_minor"),
    "tables.transactions[3].amount_minor",
  );
  assert.equal(
    redactValidatorPath("tables.importBatches[0].column_map.Số tiền"),
    "tables.importBatches[0].column_map.<redacted>",
  );
  assert.equal(redactValidatorPath("archive_id"), "archive_id");
  assert.equal(redactValidatorPath(""), "");
});

test("the ingress module imports no runtime, database or provider code", () => {
  const source = readFileSync(new URL("./archive-ingress.ts", import.meta.url), "utf8");
  const imports = [...source.matchAll(/^import[^;]*?from\s+"([^"]+)";/gmu)].map((m) => m[1]);
  assert.deepEqual(imports.sort(), [
    "./moneyflow-archive-validator.ts",
    "./moneyflow-archive.ts",
  ]);
  const code = source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");
  for (const forbidden of ["supabase", "next/", "react", "node:", "process.env"]) {
    assert.ok(!code.includes(forbidden), `ingress must not reference ${forbidden}`);
  }
});

test("no dependency was added for ingress", () => {
  const before = readFileSync(new URL("../../../package.json", import.meta.url), "utf8");
  const manifest = JSON.parse(before) as { dependencies: Record<string, string> };
  for (const suspicious of ["secure-json-parse", "json-bigint", "jsonlint", "json-parse-safe"]) {
    assert.ok(!(suspicious in manifest.dependencies), `${suspicious} must not be a dependency`);
  }
});
