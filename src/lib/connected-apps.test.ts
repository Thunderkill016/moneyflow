import assert from "node:assert/strict";
import test from "node:test";

import {
  formatGrantedAt,
  mapOAuthGrants,
  oauthScopeLabel,
} from "./connected-apps.ts";

const GRANT = {
  client: {
    id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    name: "Claude Desktop",
    uri: "https://claude.ai",
    logo_uri: "",
  },
  scopes: ["openid", "profile", "email"],
  granted_at: "2026-09-20T12:34:56.000Z",
};

test("mapOAuthGrants normalizes grant rows into display models", () => {
  const [app] = mapOAuthGrants([GRANT]);
  assert.equal(app.clientId, GRANT.client.id);
  assert.equal(app.name, "Claude Desktop");
  assert.equal(app.host, "claude.ai");
  assert.deepEqual(app.scopes, ["openid", "profile", "email"]);
  assert.equal(app.grantedAt, GRANT.granted_at);
});

test("mapOAuthGrants tolerates missing name/uri and empty lists", () => {
  assert.deepEqual(mapOAuthGrants([]), []);
  const [app] = mapOAuthGrants([
    { client: { id: "x", name: "", uri: "not a url", logo_uri: "" }, scopes: [], granted_at: "" },
  ]);
  assert.equal(app.name, "Ứng dụng không tên");
  assert.equal(app.host, "");
});

test("oauthScopeLabel translates known scopes, keeps unknown verbatim", () => {
  assert.equal(oauthScopeLabel("openid"), "Xác nhận danh tính của bạn");
  assert.equal(oauthScopeLabel("email"), "Địa chỉ email");
  assert.equal(oauthScopeLabel("custom_scope"), "custom_scope");
});

test("formatGrantedAt renders a Vietnamese date-time and survives bad input", () => {
  const rendered = formatGrantedAt(GRANT.granted_at);
  assert.match(rendered, /20/);
  assert.match(rendered, /09/);
  assert.match(rendered, /2026/);
  assert.equal(formatGrantedAt("not-a-date"), "—");
  assert.equal(formatGrantedAt(""), "—");
});
