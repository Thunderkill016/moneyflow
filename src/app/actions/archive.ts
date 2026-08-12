"use server";

import { revalidatePath } from "next/cache";
import {
  ARCHIVE_MAX_RESTORE_BYTES,
  classifyRestoreFailure,
  type RestoreFailureKind,
} from "@/lib/archive/archive-backup";
import type { MoneyFlowArchive } from "@/lib/archive/moneyflow-archive";
import { validateMoneyFlowArchive } from "@/lib/archive/moneyflow-archive-validator";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

/**
 * Complete backup and restore, behind the repository's enforced boundary.
 *
 * `check:architecture` forbids `src/components` from importing Supabase, and no
 * hook in this codebase talks to it either — every client data path goes through
 * a server action. Backup and restore follow that rule rather than opening a new
 * browser→database channel for one feature.
 *
 * ## The transport ceiling this creates, and why it is stated rather than hidden
 *
 * Server action requests are capped at 1 MB by default (Next's own
 * documentation), and the hosting platform caps serverless request bodies at
 * roughly 4.5 MB. `serverActions.bodySizeLimit` is therefore raised to 4 MB in
 * `next.config.ts` — as high as the platform will actually carry — and the UI
 * refuses a larger archive up front with a clear message instead of letting the
 * platform return an opaque 413 mid-upload.
 *
 * At roughly 786 bytes per transaction that is about 5,000 transactions. R8's
 * 64 MiB parser bound is unchanged and still correct for reading a file; this is
 * a *transport* ceiling, and lifting it needs a different upload path (direct
 * object storage or a chunked endpoint), which is its own slice rather than
 * something to fake here.
 */

export type BackupActionResult =
  | { ok: true; archive: MoneyFlowArchive }
  | { ok: false; kind: RestoreFailureKind };

export type RestoreActionResult =
  | { ok: true }
  | { ok: false; kind: RestoreFailureKind | "too_large_to_transport" };

export async function createArchiveBackupAction(): Promise<BackupActionResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, kind: "capability_missing" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, kind: "capability_missing" };

  const { data, error } = await supabase.rpc("export_user_archive");
  if (error) {
    console.error("archive_backup_failed", { code: error.code ?? "unknown" });
    return { ok: false, kind: classifyRestoreFailure({ code: error.code, message: error.message }) };
  }

  // The RPC result is untrusted here: a 200 is not proof the payload satisfies
  // the archive contract, and a broken backup is only discovered when it is
  // needed. Never hand the browser something that would not validate.
  const validated = validateMoneyFlowArchive(data);
  if (!validated.ok) {
    console.error("archive_backup_invalid", { rejections: validated.errors.length });
    return { ok: false, kind: "archive_rejected" };
  }
  return { ok: true, archive: validated.archive };
}

export async function restoreArchiveAction(
  archive: unknown,
): Promise<RestoreActionResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, kind: "capability_missing" };

  // The browser already ran the file through ingress, but a server action is a
  // public entrypoint: re-validate rather than trust the caller. The database
  // validates a third time before it writes, which is the authority.
  const validated = validateMoneyFlowArchive(archive);
  if (!validated.ok) return { ok: false, kind: "archive_rejected" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, kind: "capability_missing" };

  const { error } = await supabase.rpc("restore_user_archive", {
    p_archive: validated.archive,
  });
  if (error) {
    console.error("archive_restore_failed", { code: error.code ?? "unknown" });
    return { ok: false, kind: classifyRestoreFailure({ code: error.code, message: error.message }) };
  }

  // Every route reads the server, so the whole tree must be re-fetched before
  // the user can look at pre-restore numbers.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function archiveRestoreTransportLimit(): Promise<number> {
  return ARCHIVE_MAX_RESTORE_BYTES;
}
