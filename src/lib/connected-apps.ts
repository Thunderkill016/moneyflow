/*
 * Connected-apps (OAuth grants) display helpers.
 *
 * `supabase.auth.oauth.listGrants()` returns the OAuth clients the user has
 * consented to; this module normalizes that response for the settings UI and
 * owns the shared scope labels so the consent screen and the review list
 * describe the same scopes in the same words.
 */

export type OAuthGrantRow = {
  client: { id: string; name: string; uri: string; logo_uri: string };
  scopes: string[];
  granted_at: string;
};

export type ConnectedApp = {
  clientId: string;
  name: string;
  /** Host portion of the client's registered URI; "" when unparseable. */
  host: string;
  scopes: string[];
  grantedAt: string;
};

export const OAUTH_SCOPE_LABELS: Record<string, string> = {
  openid: "Xác nhận danh tính của bạn",
  profile: "Tên hiển thị",
  email: "Địa chỉ email",
  phone: "Số điện thoại",
};

export function oauthScopeLabel(scope: string): string {
  return OAUTH_SCOPE_LABELS[scope] ?? scope;
}

export function mapOAuthGrants(grants: OAuthGrantRow[]): ConnectedApp[] {
  return grants.map((grant) => ({
    clientId: grant.client.id,
    name: grant.client.name.trim() || "Ứng dụng không tên",
    host: safeHost(grant.client.uri),
    scopes: grant.scopes.filter((scope) => scope.length > 0),
    grantedAt: grant.granted_at,
  }));
}

function safeHost(uri: string): string {
  try {
    return new URL(uri).host;
  } catch {
    return "";
  }
}

const GRANTED_AT_FORMAT = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatGrantedAt(iso: string): string {
  const time = Date.parse(iso);
  if (!Number.isFinite(time)) return "—";
  return GRANTED_AT_FORMAT.format(new Date(time));
}
