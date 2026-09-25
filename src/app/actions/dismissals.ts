"use server";

import {
  DISMISSAL_BATCH_MAX,
  DISMISSAL_SCOPES,
  PATTERN_KEY_SHAPE,
} from "@/lib/pattern-dismissals";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";
import { z } from "zod";

/**
 * Persist advisory dismissals ("Bỏ qua" on duplicate/recurring suggestions)
 * so the decision follows the account across devices instead of living in one
 * browser's localStorage. The RPC derives user_id from auth.uid() — a caller
 * can only ever dismiss for itself.
 */

const keysSchema = z
  .array(z.string().regex(PATTERN_KEY_SHAPE))
  .min(1)
  .max(DISMISSAL_BATCH_MAX);

export type DismissalActionResult =
  | { ok: true }
  | { ok: false; kind: "invalid" | "capability_missing" | "write_failed" };

export async function dismissPatternKeysAction(
  scope: string,
  keys: string[],
): Promise<DismissalActionResult> {
  const viewer = await requireViewer();
  if (viewer.isDemo) return { ok: false, kind: "capability_missing" };

  if (!(DISMISSAL_SCOPES as readonly string[]).includes(scope)) {
    return { ok: false, kind: "invalid" };
  }
  const parsed = keysSchema.safeParse(keys);
  if (!parsed.success) return { ok: false, kind: "invalid" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, kind: "capability_missing" };

  const { error } = await supabase.rpc("dismiss_pattern_keys", {
    p_scope: scope,
    p_keys: parsed.data,
  });
  if (error) {
    console.error("pattern_dismissal_write_failed", {
      code: error.code ?? "unknown",
    });
    return { ok: false, kind: "write_failed" };
  }
  return { ok: true };
}
