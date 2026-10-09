#!/usr/bin/env node
/*
 * Deploy-context hygiene contract (#779).
 *
 * The 2026-10-08 incident: `vercel deploy` does NOT apply `.gitignore` when
 * `.vercelignore` exists, and `.vercelignore` was missing — so the directory
 * holding the encrypted production backup, its passphrase, rotated
 * credentials and connection strings was uploaded into deployment file
 * storage. Vercel-side file lists are only visible to an authenticated
 * account, so the gate that must hold every day is: **the ignore file itself
 * provably excludes every secret-shaped path**.
 *
 * This checker applies gitignore semantics to `.vercelignore` and asserts a
 * matrix of synthetic canary paths (never real secrets) is excluded, plus
 * positive controls that must still ship. It needs no Vercel credentials,
 * so it runs in CI and locally.
 *
 * Post-deploy verification of an actual deployment's file list is a
 * separate operator step (runbook) — Vercel API access is required.
 */
import { readFileSync } from "node:fs";

const VERCELIGNORE = ".vercelignore";

/**
 * Compile one gitignore pattern into a predicate over a repo-relative posix
 * path (no leading slash). Semantics implemented:
 *   - `#` comments, `!` negation, trailing `/` = directory-only
 *   - a pattern containing `/` is anchored to the repo root (leading `/`
 *     stripped); otherwise it matches a path segment at any depth
 *   - `*`/`?` stay within one segment; `**` spans zero or more segments
 *   - `[...]` character classes, `[!...]` negated classes, `\x` escapes
 * A pattern matching a directory also excludes everything beneath it —
 * handled in isIgnored(), not here.
 */
function compilePattern(rawLine) {
  let pattern = rawLine.trim();
  if (!pattern || pattern.startsWith("#")) return null;
  if (pattern.startsWith("\\#") || pattern.startsWith("\\!")) {
    pattern = pattern.slice(1);
  }
  let negate = false;
  if (pattern.startsWith("!")) {
    negate = true;
    pattern = pattern.slice(1);
  }
  const dirOnly = pattern.endsWith("/");
  if (dirOnly) pattern = pattern.slice(0, -1);
  const anchored = pattern.includes("/");
  const anchoredPattern = pattern.replace(/^\/+/u, "");
  return { negate, dirOnly, anchored, re: globToRegExp(anchoredPattern) };
}

function globToRegExp(glob) {
  // Walk segment-wise so `**` gets its real meaning:
  //   `**/`  -> zero or more leading segments   `(?:[^/]+/)*`
  //   `/**`  -> any suffix (including empty)     `(?:/.*)?`
  //   `/**/` -> zero or more middle segments     `(?:/[^/]+)*/` handled as two tokens
  //   `**`   -> anything                          `.*`
  let out = "";
  const n = glob.length;
  for (let i = 0; i < n; i += 1) {
    const c = glob[i];
    if (c === "*") {
      const runStart = i;
      while (glob[i + 1] === "*") i += 1;
      const isDouble = i > runStart;
      if (!isDouble) {
        out += "[^/]*";
        continue;
      }
      const prevIsSlash = runStart === 0 || glob[runStart - 1] === "/";
      const nextIsSlash = glob[i + 1] === "/";
      const atEnd = i + 1 >= n;
      if (prevIsSlash && nextIsSlash) {
        // `/**/` or `**/` at start: zero or more whole segments.
        i += 1; // consume the trailing slash
        out += "(?:[^/]+/)*";
      } else if (prevIsSlash && atEnd) {
        // `/**` at end: anything under the preceding dir, or nothing.
        out += "(?:/[^/]*)*";
      } else if (prevIsSlash || atEnd) {
        // `**` at a segment boundary: anything.
        out += ".*";
      } else {
        // `a**b` — gitignore treats a mid-segment `**` like `*`.
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else if (c === "[") {
      const end = glob.indexOf("]", i + 1);
      if (end === -1) {
        out += "\\[";
      } else {
        let cls = glob.slice(i + 1, end);
        if (cls.startsWith("!")) cls = `^${cls.slice(1)}`;
        out += `[${cls.replace(/\\/gu, "\\\\")}]`;
        i = end;
      }
    } else if (c === "\\" && i + 1 < n) {
      out += `\\${glob[++i]}`;
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/gu, "\\$&");
    }
  }
  return new RegExp(`^${out}$`, "u");
}

/**
 * gitignore decision for `path` (posix, no leading slash):
 * last matching pattern wins; a pattern matching any ancestor directory
 * covers everything beneath it (regardless of the pattern's own `/` suffix).
 */
function isIgnored(rules, path) {
  const segs = path.split("/");
  let ignored = false;
  for (const rule of rules) {
    if (!rule) continue;
    let match = false;
    if (rule.anchored) {
      if (!rule.dirOnly) match = rule.re.test(path);
      if (!match) {
        // Pattern matching an ancestor directory excludes its contents.
        for (let i = 1; i < segs.length; i += 1) {
          if (rule.re.test(segs.slice(0, i).join("/"))) {
            match = true;
            break;
          }
        }
      }
    } else {
      if (!rule.dirOnly && rule.re.test(segs[segs.length - 1])) match = true;
      if (!match) match = segs.slice(0, -1).some((s) => rule.re.test(s));
    }
    if (match) ignored = !rule.negate;
  }
  return ignored;
}

const rules = readFileSync(VERCELIGNORE, "utf8")
  .split(/\r?\n/u)
  .map(compilePattern)
  .filter(Boolean);

/*
 * Parity guard: the 2026-10-08 incident exists because `.gitignore` and the
 * upload exclusion contract drifted apart. Every non-negated `.gitignore`
 * rule must be represented in `.vercelignore` — either by the same
 * normalized pattern, or by an intentional superset declared below.
 * Gitignored paths are never source of truth, so excluding them is always
 * safe; a missing counterpart is a coverage hole, not a choice.
 */
const GITIGNORE = ".gitignore";

/** Normalize a gitignore rule for cross-file comparison. */
function normalizeRule(line) {
  let p = line.trim();
  if (!p || p.startsWith("#") || p.startsWith("!")) return null;
  p = p.replace(/^\/+/u, "").replace(/\/+$/u, "");
  return p;
}

/*
 * Declared intentional supersets: vercelignore rule `v` legitimately covers
 * gitignore rule `g`. Keep this list short and justified — anything broader
 * than the gitignore intent is a deliberate hardening choice.
 */
const SUPERSETS = new Map([
  // `*.tar.gz`/`*.zip` cover the model-blob rules and any future archive.
  ["public/models/*.tar.gz", "*.tar.gz"],
  ["public/models/*.zip", "*.zip"],
  // `.env*` covers `.env.telegram`; `*.env` covers telegram.env basenames.
  [".env.telegram", ".env*"],
  [".config/moneyflow/telegram.env", "*.env"],
  // The `output/` directory rule covers every gitignored subtree under it.
  ["output/playwright", "output"],
  ["output/playwright-audit", "output"],
  ["output/playwright-auth", "output"],
  ["output/design-harness", "output"],
]);

const gitignoreRules = readFileSync(GITIGNORE, "utf8")
  .split(/\r?\n/u)
  .map(normalizeRule)
  .filter(Boolean);
const vercelSet = new Set(
  readFileSync(VERCELIGNORE, "utf8")
    .split(/\r?\n/u)
    .map(normalizeRule)
    .filter(Boolean),
);

const parityGaps = gitignoreRules.filter(
  (g) => !vercelSet.has(g) && !SUPERSETS.has(g),
);

/*
 * Canary matrix — synthetic names shaped like real incidents. Every entry
 * must be excluded from a Vercel CLI upload context.
 */
const MUST_EXCLUDE = [
  // The actual leak: PoC output holding backup/passphrase/credentials/conn.
  "scripts/neon-poc/out/prod-credentials.txt",
  "scripts/neon-poc/out/prod-backup-2026-10-08.enc.json",
  "scripts/neon-poc/out/prod-backup.passphrase",
  "scripts/neon-poc/out/prod-neon-conn.txt",
  "scripts/neon-poc/out/prod-cookie-secret.txt",
  // Generic env files at any name npm/dotenv produce.
  ".env",
  ".env.local",
  ".env.production",
  ".env.development.local",
  ".env.vercel",
  "prod.env",
  ".env.telegram",
  "nested/.config/moneyflow/telegram.env",
  // Key material and cert/credential shapes.
  "id_rsa",
  "id_ed25519",
  "id_rsa.key",
  "service-account.pem",
  "service-account-prod.json",
  "credentials.json",
  "gcp-credentials.json",
  "certs/private.key",
  "store/release.keystore",
  "tls/bundle.p12",
  "tls/identity.pfx",
  ".npmrc",
  ".netrc",
  // Tenant data and tooling scratch — whole-ledger archives live here.
  ".tmp/prod-archive.mfarchive",
  ".tmp/anything.json",
  "logs/agent-run.log",
  ".agent-dispatcher/state.json",
  ".agent-harness/out.txt",
  // Dumps and local databases.
  "backups/prod.dump",
  "local.db.sqlite",
  "db.sqlite3",
  // Build outputs that must never be treated as source input.
  ".next/build-manifest.json",
  ".vercel/project.json",
  "node_modules/lodash/index.js",
  "output/bundle.tar",
  "coverage/lcov.info",
  "test-results/junit.xml",
  "playwright-report/index.html",
  "blob-report/report.zip",
  "supabase/.temp/cli-latest",
  "tsconfig.tsbuildinfo",
  "packages/app/tsconfig.tsbuildinfo",
  "npm-debug.log",
  "yarn-error.log",
  "public/models/whisper.tar.gz",
  "public/models/tiny.zip",
];

const MUST_INCLUDE = [
  "src/app/api/health/route.ts",
  "src/lib/build-identity.ts",
  "scripts/deploy-prod.mjs",
  "scripts/neon-poc/prod-export.mjs",
  "docs/operations/production-runbook.md",
  "package.json",
  "next.config.ts",
  ".env.example",
  "supabase/migrations/20261001000000_init.sql",
  "db/compat/pgtap.sql",
];

const failures = [];
for (const g of parityGaps) {
  failures.push(
    `.gitignore rule "${g}" has no .vercelignore counterpart — add it or declare a superset`,
  );
}
for (const path of MUST_EXCLUDE) {
  if (!isIgnored(rules, path))
    failures.push(`NOT excluded from deploy upload: ${path}`);
}
for (const path of MUST_INCLUDE) {
  if (isIgnored(rules, path))
    failures.push(`wrongly excluded from deploy upload: ${path}`);
}

if (failures.length) {
  console.error("deploy-hygiene FAIL:");
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(
  `deploy-hygiene OK: ${MUST_EXCLUDE.length} canary secret paths excluded, ${MUST_INCLUDE.length} controls shipped, ${rules.length} .vercelignore rules evaluated`,
);
