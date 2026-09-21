import type { Metadata } from "next";
import { ConnectedAppsPage } from "@/components/connected-apps-page";
import { mapOAuthGrants, type ConnectedApp } from "@/lib/connected-apps";
import { createClient } from "@/lib/supabase/server";
import { requireViewer } from "@/server/auth";

export const metadata: Metadata = {
  title: "Ứng dụng đã kết nối — Money Flow",
  description:
    "Xem và thu hồi quyền truy cập của các ứng dụng bạn đã cho phép qua OAuth.",
};

/*
 * Connected-apps surface (A2): the review/revoke half of the OAuth consent
 * flow. Grants are loaded server-side through the user-scoped client — the
 * list can only ever contain the caller's own grants.
 */
export default async function Page() {
  const viewer = await requireViewer();

  let apps: ConnectedApp[] = [];
  let loadError = false;
  if (!viewer.isDemo) {
    const supabase = await createClient();
    if (supabase) {
      const { data, error } = await supabase.auth.oauth.listGrants();
      if (error) {
        loadError = true;
      } else {
        apps = mapOAuthGrants(data ?? []);
      }
    } else {
      loadError = true;
    }
  }

  return (
    <ConnectedAppsPage
      viewer={{
        email: viewer.email,
        displayName: viewer.displayName,
        isDemo: viewer.isDemo,
      }}
      apps={apps}
      loadError={loadError}
    />
  );
}
