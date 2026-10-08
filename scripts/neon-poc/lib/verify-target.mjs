// Shared fail-closed target verification for all remote PoC operations.
//
// Problem this solves: `NEON_POC_URL` is a self-declared env var — nothing
// stopped `reset-remote.mjs`/`replay-migrations.mjs --remote` from pointing at
// an arbitrary database. This module forces every remote run to verify the
// destination against the trusted Neon Management API *before* opening the
// SQL connection:
//
//   1. --project-id must be in the allowlist (exact scratch project only).
//   2. GET /projects/{id} must return the allowlisted project name.
//   3. NEON_POC_URL's host must equal an endpoint host OF that project
//      (prevents pointing an allowlisted project id at a foreign database).
//   4. After connecting, current_database() must match the DB allowlist and
//      current_user must be the expected migration-runner role.
//   5. Any step failing or missing credential => abort (never continue).
//
// Credentials are read from NEON_API_KEY or the local neonctl OAuth profile
// (~/.config/neon/credentials.json); nothing is logged or copied anywhere.
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const API_BASE = "https://console.neon.tech/api/v2";

// Exact allowlist — the ONLY project any remote PoC script may touch.
// Key = project id, value = expected project name (both must match).
const ALLOWED_PROJECTS = {
  "polished-pine-75721729": "moneyflow-neon-poc",
};

// Databases inside the scratch project the PoC may operate on. `mf_poc*` is
// reserved for disposable per-run databases if we switch to that pattern.
const ALLOWED_DATABASES = ["neondb", "mf_poc"];

// Expected connected role — the migration-runner on Neon Free.
const EXPECTED_USER = "neondb_owner";

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

export function abort(msg) {
  console.error(`target verification FAILED: ${msg}`);
  process.exit(3);
}

async function neonApi(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok)
    abort(
      `Neon API ${path} -> ${res.status} ${await res.text().then((t) => t.slice(0, 120))}`,
    );
  return res.json();
}

function loadToken() {
  if (process.env.NEON_API_KEY) return process.env.NEON_API_KEY;
  const credPath = join(homedir(), ".config/neon/credentials.json");
  if (!existsSync(credPath))
    abort(
      "no NEON_API_KEY and no neonctl credentials found — run `npx neonctl me` to authenticate",
    );
  const cred = JSON.parse(readFileSync(credPath, "utf8"));
  if (!cred.access_token)
    abort(
      "neonctl credentials file has no access_token — run `npx neonctl me`",
    );
  return cred.access_token;
}

// Verify the remote target end-to-end. Returns { projectId, endpointHost,
// database } on success; exits non-zero on ANY mismatch.
export async function verifyTarget(client, url) {
  const projectId = argValue("--project-id");
  if (!projectId) abort("missing --project-id (required, allowlisted)");
  const expectedName = ALLOWED_PROJECTS[projectId];
  if (!expectedName)
    abort(`project-id "${projectId}" is not in the PoC allowlist`);

  const token = loadToken();

  // 1+2: trusted project identity
  const proj = await neonApi(`/projects/${projectId}`, token);
  if (proj?.project?.name !== expectedName)
    abort(
      `project ${projectId} resolved to "${proj?.project?.name}", expected "${expectedName}"`,
    );
  if (proj?.project?.platform_id !== "aws" && !proj?.project?.region_id)
    abort("project response missing region — unexpected API shape");

  // 3: NEON_POC_URL host must be an endpoint of THIS project
  const urlHost = new URL(url.replace(/^postgres(ql)?:/, "https:")).hostname;
  const eps = await neonApi(`/projects/${projectId}/endpoints`, token);
  const hosts = new Set(
    (eps?.endpoints ?? []).flatMap((e) => {
      const pooler = e.pooler_enabled !== false;
      return pooler ? [e.host] : [e.host]; // API already returns the connectable host
    }),
  );
  // Neon hosts can be reported with or without the `-pooler` segment
  const normalized = urlHost.replace("-pooler.", ".");
  const match = [...hosts].some(
    (h) => h === urlHost || h.replace("-pooler.", ".") === normalized,
  );
  if (!match)
    abort(
      `NEON_POC_URL host "${urlHost}" is not an endpoint of ${expectedName} ` +
        `(project endpoints: ${[...hosts].join(", ") || "none"})`,
    );

  // 4: post-connect identity
  const {
    rows: [who],
  } = await client.query(
    "select current_database() as db, current_user as usr",
  );
  if (!ALLOWED_DATABASES.includes(who.db))
    abort(
      `database "${who.db}" is not in the PoC allowlist (${ALLOWED_DATABASES.join(", ")})`,
    );
  if (who.usr !== EXPECTED_USER)
    abort(`connected as "${who.usr}", expected "${EXPECTED_USER}"`);

  console.log(
    `verified target: ${expectedName} (${projectId}) / endpoint ${urlHost} / db ${who.db} / role ${who.usr}`,
  );
  return { projectId, endpointHost: urlHost, database: who.db };
}

// Dry-run inventory used by reset: everything the surgical reset would drop.
// Aborts if schemas outside the known PoC/managed surface exist — anything
// unexpected means the database is not the one we think it is.
export async function inventoryPublic(client) {
  const KNOWN_SCHEMAS = new Set([
    "public",
    "extensions",
    "supabase_migrations",
    "auth", // managed: pg_session_jwt — never dropped by the reset
    "neon_auth", // managed: Better Auth mirror — never dropped
    "pgrst", // managed: Data API PostgREST internals — never dropped
  ]);
  const { rows: schemas } = await client.query(
    `select nspname from pg_namespace
     where nspname not like 'pg\\_%' escape '\\'
       and nspname <> 'information_schema'
     order by nspname`,
  );
  const unknown = schemas
    .map((r) => r.nspname)
    .filter((s) => !KNOWN_SCHEMAS.has(s));
  if (unknown.length)
    abort(
      `unexpected non-PoC schemas present: ${unknown.join(", ")} — refusing to operate`,
    );

  const { rows } = await client.query(`
    select 'relation' as kind, c.relname as name
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','v','m','S')
        and not exists (select 1 from pg_depend d
          where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e')
    union all
    select 'function', p.oid::regprocedure::text
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and not exists (select 1 from pg_depend d
          where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
    union all
    select 'type', t.typname
      from pg_type t join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype in ('e','d')
        and not exists (select 1 from pg_depend d
          where d.classid = 'pg_type'::regclass and d.objid = t.oid and d.deptype in ('e','i'))
    order by 1, 2`);
  return rows;
}
