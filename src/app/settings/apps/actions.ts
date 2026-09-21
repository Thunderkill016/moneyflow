"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/server/auth";

/*
 * Revoke an OAuth grant the user previously approved (617/A2). This calls the
 * user-scoped Supabase OAuth api — revocation marks consent revoked, deletes
 * the client's sessions and invalidates its refresh tokens. Never uses a
 * service-role client: the grant belongs to the caller.
 */
const clientIdSchema = z.string().uuid();

export type RevokeResult = { ok: true } | { ok: false; message: string };

export async function revokeConnectedApp(formData: FormData): Promise<RevokeResult> {
  const parsed = clientIdSchema.safeParse(formData.get("client_id"));
  if (!parsed.success) return { ok: false, message: "Yêu cầu không hợp lệ." };

  const viewer = await getViewer();
  if (!viewer || viewer.isDemo) {
    return { ok: false, message: "Hãy đăng nhập để quản lý ứng dụng đã kết nối." };
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, message: "Không kết nối được máy chủ. Thử lại." };

  const { error } = await supabase.auth.oauth.revokeGrant({
    clientId: parsed.data,
  });
  if (error) {
    return { ok: false, message: "Không thu hồi được quyền truy cập. Thử lại." };
  }

  revalidatePath("/settings/apps");
  return { ok: true };
}
