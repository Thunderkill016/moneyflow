"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

const inputSchema = z.object({
  batchId: z.string().uuid(),
  event: z.enum(["commit_attempt", "commit_replay"]),
});

/**
 * Best-effort first-party maintenance measurement.
 *
 * This action never receives transaction content and callers must never make a
 * financial mutation depend on its success. The database RPC is SECURITY
 * INVOKER and RLS-scoped to the authenticated user's import batch.
 */
export async function recordImportBatchMeasurementAction(input: {
  batchId: string;
  event: "commit_attempt" | "commit_replay";
}): Promise<{ ok: true } | { ok: false }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const { error } = await supabase.rpc("record_import_batch_measurement", {
    p_batch_id: parsed.data.batchId,
    p_event: parsed.data.event,
  });

  return error ? { ok: false } : { ok: true };
}
