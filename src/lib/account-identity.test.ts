import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ACCOUNT_COLORS,
  ACCOUNT_ICON_NAMES,
  ACCOUNT_KIND_DEFAULT_ICONS,
  PICKABLE_ACCOUNT_ICONS,
  isAccountColor,
  isAccountIconName,
  mapAccountRow,
} from "./accounts.ts";

const migration = readFileSync(
  "supabase/migrations/20260926120000_account_identity.sql",
  "utf8",
);
const action = readFileSync("src/app/actions/accounts.ts", "utf8");
const workspace = readFileSync(
  "src/components/accounts/accounts-workspace.tsx",
  "utf8",
);
const workspaceCss = readFileSync(
  "src/components/accounts/accounts-workspace.module.css",
  "utf8",
);
const detailPage = readFileSync(
  "src/components/account-detail-page.tsx",
  "utf8",
);
const detailCss = readFileSync(
  "src/components/account-detail-page.module.css",
  "utf8",
);
const dialog = readFileSync("src/components/account-dialog.tsx", "utf8");

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "5f3a2b6b-9b7c-4b7c-9c1a-2d7a5b8c9e10",
    name: "Ví test",
    kind: "cash",
    currency_code: "VND",
    initial_balance_minor: 0,
    is_archived: false,
    ...overrides,
  };
}

test("account identity constants stay inside the writable contract", () => {
  for (const icon of PICKABLE_ACCOUNT_ICONS) {
    assert.equal(isAccountIconName(icon), true);
  }
  for (const color of ACCOUNT_COLORS) {
    assert.equal(isAccountColor(color), true);
  }
  assert.equal(isAccountIconName("evil"), false);
  assert.equal(isAccountIconName(null), false);
  assert.equal(isAccountColor("#ff00ff"), false);
  assert.equal(isAccountColor("kind-bank"), false);
  for (const icon of Object.values(ACCOUNT_KIND_DEFAULT_ICONS)) {
    assert.equal(isAccountIconName(icon), true);
  }
});

test("every account kind has a default icon so fallback never renders blank", () => {
  for (const kind of ["cash", "bank", "e_wallet", "credit_card", "savings"]) {
    assert.ok(
      ACCOUNT_KIND_DEFAULT_ICONS[kind as keyof typeof ACCOUNT_KIND_DEFAULT_ICONS],
      `missing kind default for ${kind}`,
    );
  }
});

test("mapAccountRow carries stored identity and guards stale values", () => {
  const stored = mapAccountRow(row({ icon: "spark", color: "violet" }));
  assert.equal(stored.icon, "spark");
  assert.equal(stored.color, "violet");

  const plain = mapAccountRow(row());
  assert.equal(plain.icon, null);
  assert.equal(plain.color, null);

  const stale = mapAccountRow(
    row({ icon: "deleted-icon", color: "kind-bank" }),
  );
  assert.equal(stale.icon, null);
  assert.equal(stale.color, null);
});

test("the write RPC validates the same icon set the app offers", () => {
  for (const icon of PICKABLE_ACCOUNT_ICONS) {
    assert.ok(
      migration.includes(`'${icon}'`),
      `migration allowlist missing '${icon}'`,
    );
  }
  assert.match(migration, /raise exception 'invalid_account_icon'/);
});

test("the write RPC validates the same color palette the app offers", () => {
  for (const color of ACCOUNT_COLORS) {
    assert.ok(
      migration.includes(`'${color}'`),
      `migration allowlist missing '${color}'`,
    );
  }
  assert.match(migration, /raise exception 'invalid_account_color'/);
});

test("the RPC signatures keep existing positional params and append identity", () => {
  assert.match(
    migration,
    /p_icon text default null,\s*p_color text default null/,
  );
  assert.match(migration, /p_currency_code text default 'VND'/);
  // Direct row mutation stays revoked — the RPC remains the only write path.
  assert.match(migration, /grant execute on function public\.update_financial_account/);
  assert.match(migration, /grant execute on function public\.create_financial_account/);
});

test("the server action accepts only palette icons and colors", () => {
  assert.match(action, /icon: z\.enum\(ACCOUNT_ICON_NAMES\)/);
  assert.match(action, /color: z\.enum\(ACCOUNT_COLORS\)/);
  assert.match(action, /p_icon: parsed\.data\.icon \?\? null/);
  assert.match(action, /p_color: parsed\.data\.color \?\? null/);
  assert.match(action, /is_archived,icon,color/);
});

test("the dialog offers a picker for every writable icon and color", () => {
  assert.match(dialog, /PICKABLE_ACCOUNT_ICONS\.map/);
  assert.match(dialog, /ACCOUNT_COLORS\.map/);
  assert.match(dialog, /ACCOUNT_KIND_DEFAULT_ICONS\[nextKind\]/);
});

test("stored identity wins over the kind fallback on every render surface", () => {
  assert.match(workspace, /account\.icon \?\? ACCOUNT_KIND_DEFAULT_ICONS\[account\.kind\]/);
  assert.match(detailPage, /account\.icon \?\? ACCOUNT_KIND_DEFAULT_ICONS\[account\.kind\]/);
  // Stored colors degrade to the kind tone, never to an unowned class.
  assert.match(workspace, /isAccountColor\(account\.color\) \? styles\[account\.color\]/);
  assert.match(detailPage, /isAccountColor\(account\.color\) \? styles\[account\.color\]/);
});

test("every palette color has a CSS tone class on both render surfaces", () => {
  for (const color of ACCOUNT_COLORS) {
    assert.ok(
      workspaceCss.includes(`.${color}`),
      `workspace css missing tone '.${color}'`,
    );
    assert.ok(
      detailCss.includes(`.${color}`),
      `detail css missing tone '.${color}'`,
    );
  }
});

test("legacy callers of ACCOUNT_ICON_NAMES stay honest", () => {
  // Kind defaults are part of the writable set, never a dead glyph.
  for (const icon of Object.values(ACCOUNT_KIND_DEFAULT_ICONS)) {
    assert.ok(ACCOUNT_ICON_NAMES.includes(icon));
  }
});
