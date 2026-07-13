import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveDisplayName } from "@/lib/profile";

export type Viewer = {
  id: string;
  email: string | null;
  displayName: string | null;
  isDemo: boolean;
};

export const getViewer = cache(async (): Promise<Viewer | null> => {
  if (!isSupabaseConfigured()) {
    return { id: "demo-user", email: null, displayName: "Minh Anh", isDemo: true };
  }

  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const id = String(data.claims.sub);
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", id).maybeSingle();

  return {
    id,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
    displayName: resolveDisplayName(profile?.full_name, data.claims.user_metadata),
    isDemo: false,
  };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
