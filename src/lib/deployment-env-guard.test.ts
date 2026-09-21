import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const script = resolve("scripts/check-deployment-env.mjs");

function runGuard(overrides: Record<string, string | undefined>) {
  const cwd = mkdtempSync(join(tmpdir(), "moneyflow-deployment-env-"));
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_MODE: "authenticated",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.example.com",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test_key",
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    LEGACY_SITE_HOSTS: "old.example.com",
    ...overrides,
  };

  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete env[name];
  }

  const result = spawnSync(process.execPath, [script, "--force"], {
    cwd,
    env,
    encoding: "utf8",
  });
  rmSync(cwd, { recursive: true, force: true });
  return result;
}

function runGuardInTempEnv(
  contents: string,
  overrides: Record<string, string | undefined> = {},
) {
  const cwd = mkdtempSync(join(tmpdir(), "moneyflow-deployment-env-"));
  writeFileSync(join(cwd, ".env.local"), contents);

  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: "test",
    ...overrides,
  };
  for (const [name, value] of Object.entries(env)) {
    if (value === undefined) delete env[name];
  }

  const result = spawnSync(process.execPath, [script, "--force"], {
    cwd,
    env,
    encoding: "utf8",
  });
  rmSync(cwd, { recursive: true, force: true });
  return result;
}

test("explicit local authenticated configuration passes without an invented fallback", () => {
  const result = runGuard({});
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /contract passed/);
});

test("explicit local demo mode does not require backend values", () => {
  const result = runGuard({
    NEXT_PUBLIC_APP_MODE: "demo",
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
  });
  assert.equal(result.status, 0, result.stderr);
});

test("hosted builds require HTTPS", () => {
  const result = runGuard({ VERCEL: "1" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must use HTTPS/);
});

test("Vercel production cannot silently run in demo mode", () => {
  const result = runGuard({
    VERCEL: "1",
    VERCEL_ENV: "production",
    NEXT_PUBLIC_APP_MODE: "demo",
    NEXT_PUBLIC_SITE_URL: "https://finance.example.com",
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must use NEXT_PUBLIC_APP_MODE="authenticated"/);
});

test("missing deployment values fail the guard", () => {
  const result = runGuard({ NEXT_PUBLIC_SITE_URL: undefined });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NEXT_PUBLIC_SITE_URL is missing/);
});

test("authenticated mode requires backend values", () => {
  const result = runGuard({
    NEXT_PUBLIC_SUPABASE_URL: undefined,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NEXT_PUBLIC_SUPABASE_URL is required/);
  assert.match(result.stderr, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/);
});

test("the canonical hostname cannot also be a legacy hostname", () => {
  const result = runGuard({
    NEXT_PUBLIC_SITE_URL: "https://finance.example.com",
    LEGACY_SITE_HOSTS: "finance.example.com",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /must not contain the configured site hostname/);
});

test("forced local validation loads values from .env.local", () => {
  const result = runGuardInTempEnv(
    "NEXT_PUBLIC_APP_MODE=demo\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n",
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Loaded \.env\.local \(2 variables\) for local validation\./);
});

test("process environment values take precedence over .env.local", () => {
  const result = runGuardInTempEnv(
    "NEXT_PUBLIC_APP_MODE=authenticated\nNEXT_PUBLIC_SITE_URL=http://localhost:3000\n",
    { NEXT_PUBLIC_APP_MODE: "demo" },
  );

  assert.equal(result.status, 0, result.stderr);
});
