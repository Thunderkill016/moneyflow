import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  backupFileName,
  classifyRestoreFailure,
  encryptedBackupFileName,
  describeArchiveCollection,
  describeBackupFailure,
  describeIngressRejection,
  describeRestoreFailure,
  serializeArchive,
  summarizeArchive,
  verifyArchiveBytes,
} from "./archive-backup.ts";
import {
  ALL_ARCHIVE_COLLECTIONS,
  ARCHIVE_SCHEMA_GENERATION,
  type MoneyFlowArchive,
} from "./moneyflow-archive.ts";

/**
 * R9 — the pure parts of the Backup & Restore surface: what the file is called,
 * what the confirmation step is allowed to show, and what the user is told when
 * something is refused.
 */

function archive(overrides: Record<string, unknown> = {}): MoneyFlowArchive {
  return {
    archive_version: 1,
    archive_id: "00000000-0000-4000-8000-000000000001",
    produced_at: "2026-08-12T09:30:00.000000Z",
    schema_generation: "20260804160000",
    tenant_row_counts: {
      profile: 1,
      accounts: 2,
      categories: 11,
      transactions: 7,
      monthlyBudgets: 1,
      savingsGoals: 1,
      inboxCandidates: 2,
    },
    tables: {},
    ...overrides,
  } as unknown as MoneyFlowArchive;
}

test("the backup filename identifies MoneyFlow and its date, and nothing else", () => {
  assert.equal(
    backupFileName("2026-08-12T09:30:00.000000Z"),
    "moneyflow-ban-sao-luu-2026-08-12.json",
  );
});

test("the filename never carries account identity", () => {
  // A backup lands in a downloads folder, a chat attachment or a cloud sync, so
  // the filename is the part everyone else sees.
  const name = backupFileName("2026-08-12T09:30:00.000000Z");
  for (const identity of ["@", "user", "uuid", "0000", "email"]) {
    assert.ok(!name.includes(identity), `filename must not contain ${identity}`);
  }
});

test("a malformed produced_at still yields a usable filename", () => {
  assert.equal(backupFileName("nonsense"), "moneyflow-ban-sao-luu-unknown.json");
});

test("serialization does not alter the archive", () => {
  const source = archive();
  const text = serializeArchive(source);
  assert.deepEqual(JSON.parse(text), JSON.parse(JSON.stringify(source)));
});

test("the confirmation summary reports counts and nothing else", () => {
  const summary = summarizeArchive(archive());
  assert.deepEqual(summary, {
    producedAt: "2026-08-12T09:30:00.000000Z",
    archiveVersion: 1,
    accounts: 2,
    categories: 11,
    transactions: 7,
    budgets: 1,
    goals: 1,
    inboxCandidates: 2,
  });
  // Every value is a count or the envelope's own metadata — never ledger content.
  for (const [key, value] of Object.entries(summary)) {
    if (key === "producedAt") continue;
    assert.equal(typeof value, "number", `${key} must be a count`);
  }
});

test("missing counts summarize as zero rather than undefined", () => {
  const summary = summarizeArchive(archive({ tenant_row_counts: {} }));
  assert.equal(summary.transactions, 0);
  assert.equal(summary.accounts, 0);
});

test("every ingress rejection has a Vietnamese message that reassures nothing changed", () => {
  const codes = [
    "file_empty",
    "file_too_large",
    "invalid_utf8",
    "invalid_json_syntax",
    "duplicate_member_name",
    "max_depth_exceeded",
    "too_many_object_members",
    "archive_invalid",
  ] as const;
  for (const code of codes) {
    const message = describeIngressRejection(code);
    assert.ok(message.length > 10, `${code} needs a real message`);
    // No internal vocabulary may reach a user.
    for (const leak of ["R5", "R6", "R7", "R8", "JSON.parse", "RPC", "auth.uid", "SECURITY"]) {
      assert.ok(!message.includes(leak), `${code} message leaks ${leak}`);
    }
  }
});

test("database rejections are classified into situations a user can act on", () => {
  assert.equal(
    classifyRestoreFailure({ code: "PGRST202", message: "Could not find the function" }),
    "capability_missing",
  );
  assert.equal(
    classifyRestoreFailure({ message: 'relation "x" ... authentication_required' }),
    "not_authenticated",
  );
  assert.equal(
    classifyRestoreFailure({ message: "restore_target_not_empty" }),
    "target_not_empty",
  );
  assert.equal(
    classifyRestoreFailure({ message: "archive_already_restored" }),
    "already_restored",
  );
  assert.equal(
    classifyRestoreFailure({ message: "restore_archive_id_conflict" }),
    "id_conflict",
  );
  assert.equal(classifyRestoreFailure({ message: "row_shape_invalid" }), "archive_rejected");
  assert.equal(
    classifyRestoreFailure({ message: "money_out_of_safe_range" }),
    "archive_rejected",
  );
  assert.equal(classifyRestoreFailure({ message: "something else entirely" }), "unexpected");
});

test("restore failure messages never expose raw database text", () => {
  const kinds = [
    "capability_missing",
    "not_authenticated",
    "target_not_empty",
    "already_restored",
    "id_conflict",
    "archive_rejected",
    "unexpected",
  ] as const;
  for (const kind of kinds) {
    const message = describeRestoreFailure(kind);
    assert.ok(message.length > 10);
    for (const leak of ["ERROR", "pg", "relation", "SQL", "restore_user_archive", "_invalid"]) {
      assert.ok(!message.includes(leak), `${kind} message leaks ${leak}`);
    }
  }
});

test("the non-destructive outcomes say so explicitly", () => {
  // A user who sees a failure must know whether their data survived.
  for (const kind of ["target_not_empty", "id_conflict", "archive_rejected", "unexpected"] as const) {
    const message = describeRestoreFailure(kind);
    assert.ok(
      /không có dữ liệu nào bị thay đổi|hoàn tác|giữ nguyên/iu.test(message),
      `${kind} must tell the user their data is intact: "${message}"`,
    );
  }
});

test("backup failures are distinguished from restore failures", () => {
  assert.notEqual(
    describeBackupFailure("capability_missing"),
    describeRestoreFailure("capability_missing"),
  );
  assert.ok(describeBackupFailure("unexpected").includes("Chưa có tệp nào được tải về"));
});

// --- Standalone file verification ----------------------------------------------
//
// The verify affordance is a composition, not a new validator: untrusted bytes
// cross the same ingress the restore picker uses, then the same summary. These
// tests pin what the composition may claim — and what it must never claim.

function serializableArchive(): Record<string, unknown> {
  const tables: Record<string, unknown> = {
    profile: {
      full_name: "Người dùng",
      avatar_url: null,
      currency_code: "VND",
      locale: "vi-VN",
      timezone: "Asia/Ho_Chi_Minh",
    },
    categories: [
      {
        id: "00000000-0000-4000-8000-000000000010",
        name: "Ăn uống",
        kind: "expense",
        icon: null,
        color: null,
        is_default: false,
        is_archived: false,
        created_at: "2026-08-12T09:30:00.000000Z",
      },
    ],
  };
  const counts: Record<string, number> = {};
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    if (!(collection in tables)) tables[collection] = [];
    counts[collection] =
      collection === "profile" ? 1 : (tables[collection] as unknown[]).length;
  }
  return {
    archive_version: 1,
    archive_id: "00000000-0000-4000-8000-000000000001",
    produced_at: "2026-08-12T09:30:00.000000Z",
    schema_generation: ARCHIVE_SCHEMA_GENERATION,
    tenant_row_counts: counts,
    tables,
  };
}

test("verifyArchiveBytes reports generation, produced_at and per-collection counts", () => {
  const result = verifyArchiveBytes(
    new TextEncoder().encode(JSON.stringify(serializableArchive())),
  );
  assert.ok(result.ok, `expected acceptance, got ${result.ok ? "" : result.code}`);
  assert.equal(result.report.schemaGeneration, ARCHIVE_SCHEMA_GENERATION);
  assert.equal(result.report.producedAt, "2026-08-12T09:30:00.000000Z");
  assert.equal(result.report.archiveVersion, 1);
  // Every contract collection is reported exactly once, in inventory order.
  assert.deepEqual(
    result.report.collections.map((entry) => entry.collection),
    [...ALL_ARCHIVE_COLLECTIONS],
  );
  assert.equal(
    result.report.collections.find((entry) => entry.collection === "categories")?.count,
    1,
  );
  assert.equal(result.report.totalRows, 2);
  assert.ok(result.report.bytes > 0);
});

test("verifyArchiveBytes surfaces the ingress rejection unchanged", () => {
  const empty = verifyArchiveBytes(new Uint8Array(0));
  assert.ok(!empty.ok);
  assert.equal(empty.code, "file_empty");
  const garbage = verifyArchiveBytes(new TextEncoder().encode("not json at all"));
  assert.ok(!garbage.ok);
  assert.equal(garbage.code, "invalid_json_syntax");
  const notArchive = verifyArchiveBytes(new TextEncoder().encode('{"hello": "world"}'));
  assert.ok(!notArchive.ok);
  assert.equal(notArchive.code, "archive_invalid");
});

test("verification counts come from the validated file, not a claim inside it", () => {
  // The counts and the tables disagree, so the file is invalid — a check that
  // trusted tenant_row_counts blindly would report 99 phantom categories.
  const built = serializableArchive();
  (built.tenant_row_counts as Record<string, number>).categories = 99;
  const result = verifyArchiveBytes(new TextEncoder().encode(JSON.stringify(built)));
  assert.ok(!result.ok);
  assert.equal(result.code, "archive_invalid");
});

test("a verification report carries no restore eligibility", () => {
  const result = verifyArchiveBytes(
    new TextEncoder().encode(JSON.stringify(serializableArchive())),
  );
  assert.ok(result.ok);
  // "Valid file" must never be expressible as "restorable file" by this shape.
  for (const key of [...Object.keys(result), ...Object.keys(result.report)]) {
    assert.ok(
      !/restor|eligib|confirm/iu.test(key),
      `${key} must not imply restore eligibility`,
    );
  }
});

test("every contract collection has a Vietnamese label", () => {
  for (const collection of ALL_ARCHIVE_COLLECTIONS) {
    const label = describeArchiveCollection(collection);
    assert.ok(label.length > 1, `${collection} needs a real label`);
    assert.notEqual(label, collection, `${collection} fell back to the raw key`);
  }
});

// --- Surface composition -------------------------------------------------------

const surfaceSource = readFileSync(
  new URL("../../components/backup-settings-page.tsx", import.meta.url),
  "utf8",
);
/**
 * Comments stripped: the component documents the traps it avoids by name, and
 * prose must not decide a check about executable code.
 */
const surface = surfaceSource.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");

test("the restore flow validates before it can mutate", () => {
  // The confirming state exists between validation and the RPC, so one press
  // cannot both check a file and rewrite a ledger.
  assert.ok(surface.includes('kind: "validating"'));
  assert.ok(surface.includes('kind: "confirming"'));
  assert.ok(surface.includes('kind: "restoring"'));
  const confirmHandler = surface.slice(surface.indexOf("async function handleConfirmRestore"));
  assert.ok(
    confirmHandler.includes('restore.kind !== "confirming"'),
    "the restore RPC must only be reachable from the confirming state",
  );
  const fileHandler = surface.slice(
    surface.indexOf("async function handleFile"),
    surface.indexOf("async function handleConfirmRestore"),
  );
  assert.ok(
    !fileHandler.includes("restore_user_archive"),
    "selecting a file must never call the restore RPC",
  );
});

test("the file crosses the ingress boundary as bytes, not text", () => {
  assert.ok(surface.includes("arrayBuffer()"), "the file must be read as bytes");
  assert.ok(!surface.includes("file.text()"), "file.text() would bypass strict UTF-8 handling");
  assert.ok(surface.includes("ingestArchiveBytes"));
});

const actions = readFileSync(
  new URL("../../app/actions/archive.ts", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");

test("a produced backup is validated before it is offered as a download", () => {
  // Validation lives in the action, so a broken archive never even reaches the
  // browser, let alone a downloads folder. A 200 is not proof of a valid archive.
  const backupAction = actions.slice(
    actions.indexOf("export async function createArchiveBackupAction"),
    actions.indexOf("export async function restoreArchiveAction"),
  );
  const validateAt = backupAction.indexOf("validateMoneyFlowArchive");
  const returnAt = backupAction.indexOf("ok: true");
  assert.ok(validateAt > 0, "the action must validate the RPC result");
  assert.ok(returnAt > validateAt, "validation must precede handing the archive back");
  // And the component must not download something the action refused.
  const backupHandler = surface.slice(
    surface.indexOf("async function handleBackup"),
    surface.indexOf("async function handleFile"),
  );
  assert.ok(backupHandler.indexOf("!result.ok") < backupHandler.indexOf("anchor.click()"));
});

test("the server action re-validates a restore instead of trusting the browser", () => {
  // A server action is a public entrypoint; the browser having run ingress is
  // not evidence for the server.
  const restoreAction = actions.slice(actions.indexOf("export async function restoreArchiveAction"));
  const validateAt = restoreAction.indexOf("validateMoneyFlowArchive");
  const rpcAt = restoreAction.indexOf("restore_user_archive");
  assert.ok(validateAt > 0 && rpcAt > validateAt, "validate before calling the database");
  assert.ok(restoreAction.includes("revalidatePath"), "restored state must not be served stale");
});

test("demo mode cannot reach the archive RPCs at all", () => {
  assert.ok(actions.includes("viewer.isDemo"), "both actions must refuse a demo viewer");
  const backupAction = actions.slice(
    actions.indexOf("export async function createArchiveBackupAction"),
    actions.indexOf("export async function restoreArchiveAction"),
  );
  assert.ok(backupAction.indexOf("viewer.isDemo") < backupAction.indexOf("supabase.rpc"));
});

test("the transport ceiling is enforced before upload, not by the platform", () => {
  assert.ok(surface.includes("ARCHIVE_MAX_RESTORE_BYTES"));
  const fileHandler = surface.slice(
    surface.indexOf("async function handleFile"),
    surface.indexOf("async function handleConfirmRestore"),
  );
  assert.ok(
    fileHandler.indexOf("ARCHIVE_MAX_RESTORE_BYTES") < fileHandler.indexOf("ingestArchiveBytes"),
    "an untransportable file must be refused before anything else happens",
  );
});

test("repeated submits cannot start two restores", () => {
  assert.ok(surface.includes("busy.current"), "a re-render-independent guard is required");
  assert.ok(surface.includes("useRef(false)"));
});

test("success does not leave stale pre-restore data on screen", () => {
  const confirmHandler = surface.slice(surface.indexOf("async function handleConfirmRestore"));
  assert.ok(confirmHandler.includes("router.refresh()"));
  assert.ok(confirmHandler.includes("router.push("));
});

test("demo mode is told the truth instead of given controls that cannot work", () => {
  assert.ok(surface.includes("viewer.isDemo"));
  assert.ok(surface.includes("Chế độ dùng thử chưa có sao lưu đầy đủ"));
  assert.ok(surface.includes("disabled={demo"), "actions must be inert in demo");
});

test("the report export stays a separate feature", () => {
  const hub = readFileSync(
    new URL("../../components/settings-hub-page.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(hub.includes('href: "/settings/export"'), "the report export must remain");
  assert.ok(hub.includes("Xuất giao dịch và Inbox"));
  assert.ok(hub.includes('href: "/settings/backup"'), "backup is its own destination");
  assert.ok(hub.includes("Bản sao lưu MoneyFlow"));
  // The report export must keep saying it is not a full backup.
  assert.ok(hub.includes("chưa phải bản sao lưu đầy đủ"));
});

test("the verify path inspects a file without restore eligibility", () => {
  // The affordance exists as its own section with its own input.
  assert.ok(surface.includes("Kiểm tra tệp sao lưu"), "the verify section must exist");
  assert.ok(surface.includes('data-testid="verify-file"'));
  // It crosses the same trusted boundary as the restore picker.
  assert.ok(surface.includes("verifyArchiveBytes"));

  // The handler ends at a report: it must not reach the restore action, the
  // restore state machine, or the transport pre-check that only exists to
  // bound an upload — verify never uploads anything.
  const verifyHandler = surface.slice(
    surface.indexOf("async function handleVerifyFile"),
    surface.indexOf("function resetRestore"),
  );
  assert.ok(!verifyHandler.includes("restoreArchiveAction"));
  assert.ok(!verifyHandler.includes("setRestore"), "verify must not touch restore state");
  assert.ok(
    !verifyHandler.includes('"confirming"') && !verifyHandler.includes('"restoring"'),
    "verify has no path into the restore state machine",
  );
  assert.ok(
    !verifyHandler.includes("ARCHIVE_MAX_RESTORE_BYTES"),
    "verify inspects locally; the transport cap bounds uploads only",
  );

  // Honest copy: "valid file" is never stated as "restorable file".
  assert.ok(surface.includes("Tệp hợp lệ"));
  assert.ok(
    surface.includes("chưa chứng minh tệp có thể khôi phục"),
    "the report must say validation is not proof of restorability",
  );
  // And the verify state machine is terminal — no restore kinds exist.
  const verifyState = surface.slice(
    surface.indexOf("type VerifyState"),
    surface.indexOf("function formatProducedAt"),
  );
  assert.ok(verifyState.includes('"valid"') && verifyState.includes('"invalid"'));
  assert.ok(!verifyState.includes("confirming") && !verifyState.includes("restoring"));
});

// --- Optional encryption -----------------------------------------------------

test("encrypted backups are opt-in and sealed client-side before download", () => {
  const backupHandler = surface.slice(
    surface.indexOf("async function handleBackup"),
    surface.indexOf("async function handleFile"),
  );
  // Plain stays the default — encryption is a checkbox away, not the contract.
  assert.ok(backupHandler.includes("encryptBackup"));
  assert.ok(backupHandler.includes("encryptBackupBytes"));
  assert.ok(backupHandler.includes("encryptedBackupFileName"));
  // The sealed file name must disclose encryption — ".json" alone would read
  // as a corrupt plain archive to anyone picking it back up.
  const sealedName = encryptedBackupFileName("2026-09-25T01:00:00.000Z");
  assert.ok(sealedName.includes("ma-hoa"));
  assert.ok(sealedName.endsWith(".json"));
  assert.notEqual(sealedName, backupFileName("2026-09-25T01:00:00.000Z"));
});

test("an encrypted file asks for a passphrase before touching archive ingress", () => {
  const fileHandler = surface.slice(
    surface.indexOf("async function handleFile"),
    surface.indexOf("async function handleConfirmRestore"),
  );
  const detectAt = fileHandler.indexOf("isEncryptedBackupBytes");
  const ingestAt = fileHandler.indexOf("ingestArchiveBytes");
  assert.ok(detectAt > 0 && ingestAt > detectAt, "detection precedes ingress");
  assert.ok(fileHandler.includes("decryptBackupBytes"));
  // The passphrase prompt keeps the bytes so a wrong passphrase never forces
  // a re-pick, and the failure copy cannot claim which half failed.
  assert.ok(fileHandler.includes('"needsPassphrase"'));
  assert.ok(
    fileHandler.includes("decrypt_failed") &&
      !fileHandler.includes("wrong_passphrase"),
    "GCM failure stays undifferentiated",
  );
  // Same for the verify path — inspection accepts encrypted files too.
  const verifyHandler = surface.slice(
    surface.indexOf("async function handleVerifyFile"),
    surface.indexOf("function resetRestore"),
  );
  assert.ok(verifyHandler.includes("isEncryptedBackupBytes"));
  assert.ok(verifyHandler.includes("decryptBackupBytes"));
  assert.ok(!verifyHandler.includes("encryptBackupBytes"), "verify only opens, never seals");
});

test("decrypted bytes re-enter through the same trusted boundaries", () => {
  // No parallel ingress for encrypted files — the plaintext archive crosses
  // the same validator as a plain file, so an envelope cannot smuggle a
  // weaker format.
  const fileHandler = surface.slice(
    surface.indexOf("async function handleFile"),
    surface.indexOf("async function handleConfirmRestore"),
  );
  const passHandler = fileHandler.slice(
    fileHandler.indexOf("async function handleRestorePassphrase"),
  );
  const decryptAt = passHandler.indexOf("decryptBackupBytes");
  const ingestAt = passHandler.indexOf("acceptPlainBytes");
  assert.ok(decryptAt > 0 && ingestAt > decryptAt);
});

test("the passphrase never becomes part of the archive or a server call", () => {
  // Passwords go to Web Crypto only; the actions take an archive document and
  // know nothing about passphrases.
  assert.ok(!actions.includes("passphrase"), "server actions must not see passphrases");
  const backupHandler = surface.slice(
    surface.indexOf("async function handleBackup"),
    surface.indexOf("async function handleFile"),
  );
  assert.ok(!backupHandler.includes("createArchiveBackupAction(backupPassphrase"));
});
