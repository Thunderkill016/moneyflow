import { createClient } from "@/lib/supabase/server";
import type { DismissalScope } from "@/lib/pattern-dismissals";
import { getViewer } from "@/server/auth";
import { z } from "zod";

/**
 * Server-persisted advisory dismissals for one scope.
 *
 * Returns `null` for demo viewers — demo state stays browser-local, so the
 * caller keeps its localStorage path. On a read error the empty list is the
 * honest degradation: a suppressed suggestion reappears and can be dismissed
 * again, while pretending the read succeeded would hide it silently.
 */
export async function getPatternDismissedKeys(
  scope: DismissalScope,
): Promise<string[] | null> {
  const viewer = await getViewer();
  if (!viewer || viewer.isDemo) return null;

  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("pattern_dismissals")
    .select("pattern_key")
    .eq("scope", scope);

  if (error) {
    console.error("pattern_dismissals_read_failed", {
      code: error.code ?? "unknown",
    });
    return [];
  }

  const rows = z
    .array(z.object({ pattern_key: z.string() }))
    .safeParse(data ?? []);
  if (!rows.success) {
    console.error("pattern_dismissals_row_malformed");
    return [];
  }
  return rows.data.map((row) => row.pattern_key);
}
