// Deterministically generate the Neon-specific migration set from
// supabase/migrations into db/neon/migrations/, so remote replay applies
// reviewable committed files instead of runtime regex rewrites.
//
// Transforms (logged, mechanical — production migration would carry these
// explicitly rather than generated):
//   auth.users                 -> neon_auth."user"   (managed auth mirror, uuid PK)
//   x.raw_user_meta_data->>'…' -> x.name             (Better Auth user column)
//   alter default privileges for role postgres
//                              -> … neondb_owner     (actual migration-runner role)
//
// MANIFEST.json records sha256(source)+sha256(output) per file; replay aborts
// if any source changed without regeneration. --check exits non-zero when the
// generated set is stale (used by the coverage test).
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const SRC = "supabase/migrations";
const OUT = "db/neon/migrations";
const MANIFEST = join(OUT, "MANIFEST.json");
const CHECK = process.argv.includes("--check");

export function transformForNeon(sql) {
  let touched = 0;
  const next = sql
    .replace(/\bauth\.users\b/g, () => (touched++, 'neon_auth."user"'))
    .replace(
      /(\w+)\.raw_user_meta_data\s*->>\s*'(full_name|name)'/g,
      (m, alias) => (touched++, `${alias}.name`),
    )
    // On Neon the migration-runner role is neondb_owner, not postgres —
    // `alter default privileges for role` must target the actual runner to
    // keep the same deny-by-default hardening on future objects.
    .replace(
      /(alter default privileges for role )postgres\b/gi,
      (m) => (touched++, m.replace(/postgres$/, "neondb_owner")),
    );
  return { sql: next, touched };
}

const sha = (s) => createHash("sha256").update(s).digest("hex");

export function generate({ dryRun = false } = {}) {
  const files = readdirSync(SRC)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const entries = {};
  let rewritten = 0;
  for (const file of files) {
    const source = readFileSync(join(SRC, file), "utf8");
    const t = transformForNeon(source);
    if (t.touched) rewritten++;
    entries[file] = {
      sourceSha256: sha(source),
      outputSha256: sha(t.sql),
      rewrites: t.touched,
    };
    if (!dryRun) {
      mkdirSync(OUT, { recursive: true });
      writeFileSync(join(OUT, file), t.sql);
    }
  }
  const manifest = { generatedFrom: SRC, entries };
  if (!dryRun)
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  return { files: files.length, rewritten, manifest };
}

// True when the committed generated set matches current sources byte-for-byte.
export function isFresh() {
  if (!existsSync(MANIFEST))
    return { fresh: false, reason: "MANIFEST.json missing" };
  const saved = JSON.parse(readFileSync(MANIFEST, "utf8")).entries;
  const files = readdirSync(SRC)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const e = saved[f];
    if (!e) return { fresh: false, reason: `${f} not in manifest` };
    if (e.sourceSha256 !== sha(readFileSync(join(SRC, f), "utf8")))
      return { fresh: false, reason: `${f} source changed since generation` };
    const outPath = join(OUT, f);
    if (
      !existsSync(outPath) ||
      e.outputSha256 !== sha(readFileSync(outPath, "utf8"))
    )
      return { fresh: false, reason: `${f} generated output stale` };
  }
  return { fresh: true, count: files.length };
}

const isMain = process.argv[1]?.endsWith("gen-neon-migrations.mjs");
if (isMain) {
  const r = generate({ dryRun: CHECK });
  if (CHECK) {
    const f = isFresh();
    if (!f.fresh) {
      console.error(`generated Neon migrations are STALE: ${f.reason}`);
      console.error("run: node scripts/neon-poc/gen-neon-migrations.mjs");
      process.exit(1);
    }
    console.log(`Neon migrations up to date (${f.count} files)`);
  } else {
    console.log(
      `generated ${r.files} Neon migrations into ${OUT} (${r.rewritten} files rewritten)`,
    );
  }
}
