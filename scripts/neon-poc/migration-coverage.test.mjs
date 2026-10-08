// Coverage test: every Supabase-only dependency inside supabase/migrations
// must be (a) handled by the deterministic generator's transforms, or
// (b) proven to exist natively on the provisioned Neon scratch project.
// Any NEW Supabase-specific dependency that is neither transformed nor
// natively present fails here — before it can fail on the remote.
//
//   node --test scripts/neon-poc/migration-coverage.test.mjs
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { transformForNeon, isFresh } from "./gen-neon-migrations.mjs";

const SRC = "supabase/migrations";
const OUT = "db/neon/migrations";

const files = readdirSync(SRC)
  .filter((f) => f.endsWith(".sql"))
  .sort();

// Supabase dependencies that DO exist natively on the provisioned Neon
// project — verified against pg_roles/pg_proc/pg_namespace on
// polished-pine-75721729 (Neon Free, Data API + managed Auth) — and therefore
// need no transform and no coverage flag:
//   roles: anonymous authenticated authenticator anon service_role
//   auth.*: auth.uid() -> uuid, auth.jwt() -> jsonb, auth.user_id() -> text
//   schemas: neon_auth (managed mirror), extensions (created by preflight)
//   extensions: pgcrypto (preflight), pg_session_jwt (managed, in public)

// Supabase-only constructs that the deterministic transform rewrites —
// each rule must actually fire for the test to pass (guards dead rules).
const TRANSFORMED = [
  { name: 'auth.users -> neon_auth."user"', pattern: /\bauth\.users\b/ },
  {
    name: "raw_user_meta_data -> name",
    pattern: /\.raw_user_meta_data\s*->>\s*'(full_name|name)'/,
  },
  {
    name: "for role postgres -> neondb_owner",
    pattern: /alter default privileges for role postgres\b/i,
  },
];

// DDL writes into provider-managed schemas — precise object-definition
// patterns (a bare `create … auth.` match would also flag policy bodies that
// legitimately call auth.uid()).
const MANAGED_DDL = (schema) => [
  new RegExp(
    `\\b(create|alter|drop)\\s+(or\\s+replace\\s+)?(table|view|materialized\\s+view|function|procedure|index|type|sequence|schema)\\s+(if\\s+(not\\s+)?exists\\s+)?${schema}\\.`,
    "i",
  ),
  new RegExp(`\\bcreate\\s+trigger\\b[^;]*?\\bon\\s+${schema}\\.`, "i"),
  new RegExp(`\\b(create|drop)\\s+policy\\b[^;]*?\\bon\\s+${schema}\\.`, "i"),
];

// Supabase constructs with NO Neon equivalent — any hit is an uncovered
// dependency and must be resolved explicitly (new transform, preflight
// addition, or product decision). Expand this list as gaps are found.
const UNCOVERED = [
  { name: "storage.* schema", pattern: /\bstorage\./ },
  { name: "realtime.* schema", pattern: /\brealtime\./ },
  { name: "auth.email() (not provisioned)", pattern: /\bauth\.email\s*\(/ },
  ...MANAGED_DDL("auth").map((pattern) => ({
    name: "DDL write into managed auth schema",
    pattern,
  })),
  { name: "supabase vault/secrets", pattern: /\bvault\.|\bsecrets\./ },
  { name: "pg_net/http", pattern: /\bnet\.http_/ },
];

test("every transformed dependency actually fires in current migrations", () => {
  for (const t of TRANSFORMED) {
    const hit = files.some((f) =>
      t.pattern.test(readFileSync(join(SRC, f), "utf8")),
    );
    assert.ok(hit, `transform rule "${t.name}" never fires — dead rule`);
  }
});

test("no uncovered Supabase-only dependency survives the transform", () => {
  // Judge what would actually execute on Neon: the transformed SQL.
  const violations = [];
  for (const f of files) {
    const sql = transformForNeon(readFileSync(join(SRC, f), "utf8")).sql;
    for (const u of UNCOVERED) {
      if (u.pattern.test(sql)) violations.push(`${f}: ${u.name}`);
    }
  }
  assert.deepEqual(violations, [], violations.join("\n"));
});

test("generated Neon set contains no Supabase-only constructs", () => {
  const f = isFresh();
  assert.ok(f.fresh, `generated set stale: ${f.reason}`);
  const violations = [];
  for (const file of files) {
    const sql = readFileSync(join(OUT, file), "utf8");
    for (const t of TRANSFORMED) {
      if (t.pattern.test(sql))
        violations.push(`${file}: still contains "${t.name}"`);
    }
    for (const u of UNCOVERED) {
      if (u.pattern.test(sql)) violations.push(`${file}: ${u.name}`);
    }
  }
  assert.deepEqual(violations, [], violations.join("\n"));
});

test("generated set never writes into managed schemas", () => {
  // neon_auth."user" trigger creation is the single permitted exception —
  // profile provisioning is a real migration statement, not a rewrite
  // artifact. DDL on every other managed object is flagged.
  const violations = [];
  for (const file of files) {
    const sql = readFileSync(join(OUT, file), "utf8");
    for (const p of MANAGED_DDL("auth")) {
      if (p.test(sql))
        violations.push(`${file}: DDL write into managed auth schema`);
    }
    const withoutUserTrigger = sql.replace(
      /\bcreate\s+trigger\b[^;]*?\bon\s+neon_auth\."user"/gi,
      "",
    );
    for (const p of MANAGED_DDL("neon_auth")) {
      if (p.test(withoutUserTrigger))
        violations.push(`${file}: DDL write into managed neon_auth schema`);
    }
  }
  assert.deepEqual(violations, [], violations.join("\n"));
});
