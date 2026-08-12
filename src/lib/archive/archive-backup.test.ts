import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  backupFileName,
  classifyRestoreFailure,
  describeBackupFailure,
  describeIngressRejection,
  describeRestoreFailure,
  serializeArchive,
  summarizeArchive,
} from "./archive-backup.ts";
import type { MoneyFlowArchive } from "./moneyflow-archive.ts";

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
