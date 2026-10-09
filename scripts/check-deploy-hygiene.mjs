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
 * This checker applies real gitignore semantics to `.vercelignore` and
 * asserts a matrix of synthetic canary paths (never real secrets) is
 * excluded, plus positive controls that must still ship. It needs no Vercel
 * credentials, so it runs in CI and locally.
 *
 * Post-deploy verification of an actual deployment's file list is a
 * separate operator step (runbook) — Vercel API access is required.
 */
import { readFileSync } from "node:fs";

const VERCELIGNORE = ".vercelignore";

/** Compile one gitignore pattern into a predicate. */
function compilePattern(raw) {
  let pattern = raw.trim();
  if (!pattern || pattern.startsWith("#")) return null;
  let negate = false;
  if (pattern.startsWith("!")) {
    negate = true;
    pattern = pattern.slice(1);
  }
  const dirOnly = pattern.endsWith("/");
  if (dirOnly) pattern = pattern.slice(0, -1);
  // A leading or embedded slash anchors the pattern at the repo root.
  const anchored = pattern.includes("/");
  const anchoredPattern = pattern.replace(/^\/+/u, "");

  const re = globToRegExp(anchoredPattern);
  return { negate, dirOnly, anchored, re };
}

function globToRegExp(glob) {
  // Escape regex metacharacters, then translate glob tokens:
  //   `**` spans directories; `*`/`?` stay within one path segment.
  let out = "";
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        while (glob[i + 1] === "*") i += 1;
        if (glob[i + 1] === "/") i += 1; // `**/` also matches zero dirs
        out += "(?:[^/]+/)*[^/]*|[^/]*";
      } else {
        out += "[^/]*";
      }
    } else if (c === "?") {
      out += "[^/]";
    } else {
      out += c.replace(/[.+^${}()|[\]\\]/gu, "\\$&");
    }
  }
  return new RegExp(`^${out}$`, "u");
}

/**
 * gitignore decision for `path` (posix, no leading slash):
 * last matching pattern wins; directory patterns match the directory and
 * everything beneath it.
 */
function isIgnored(rules, path) {
  let ignored = false;
  for (const rule of rules) {
    if (!rule) continue;
    const target = rule.anchored ? path : path.split("/").pop();
    let match = rule.re.test(target);
    // Unanchored patterns also match a directory at any level, which then
    // covers everything under it.
    if (!match && !rule.anchored) {
      const segs = path.split("/");
      match = segs.slice(0, -1).some((seg) => rule.re.test(seg));
    }
    // Directory patterns: `foo/` excludes `foo/bar` even when the pattern
    // is anchored — test every parent directory too.
    if (!match && rule.dirOnly) {
      const segs = path.split("/");
      match = segs.slice(0, -1).some((_, i) => {
        const dir = segs.slice(0, i + 1).join("/");
        return rule.anchored ? rule.re.test(dir) : rule.re.test(segs[i]);
      });
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
  // Key material and cert-style files.
  "id_rsa.key",
  "service-account.pem",
  "certs/private.key",
  // Build outputs that must never be treated as source input.
  ".next/build-manifest.json",
  ".vercel/project.json",
  "node_modules/lodash/index.js",
  "output/bundle.tar",
  "supabase/.temp/cli-latest",
  "tsconfig.tsbuildinfo",
];

const MUST_INCLUDE = [
  "src/app/api/health/route.ts",
  "src/lib/build-identity.ts",
  "scripts/deploy-prod.mjs",
  "scripts/neon-poc/prod-export.mjs",
  "docs/operations/production-runbook.md",
  "package.json",
  "next.config.ts",
];

const failures = [];
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
