/**
 * TASK-255 — demo/placeholder Supabase env is unconfigured so production
 * build and local demo mode work without real credentials.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { getSupabaseConfig, isSupabaseConfigured } from "./config.ts";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const PUB_KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

function withEnv(
  env: { url?: string | undefined; key?: string | undefined },
  fn: () => void,
): void {
  const prevUrl = process.env[URL_KEY];
  const prevKey = process.env[PUB_KEY];
  if (env.url === undefined) delete process.env[URL_KEY];
  else process.env[URL_KEY] = env.url;
  if (env.key === undefined) delete process.env[PUB_KEY];
  else process.env[PUB_KEY] = env.key;
  try {
    fn();
  } finally {
    if (prevUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = prevUrl;
    if (prevKey === undefined) delete process.env[PUB_KEY];
    else process.env[PUB_KEY] = prevKey;
  }
}

test("missing env → demo (not configured)", () => {
  withEnv({ url: undefined, key: undefined }, () => {
    assert.equal(getSupabaseConfig(), null);
    assert.equal(isSupabaseConfigured(), false);
  });
});

test("literal placeholder → demo (TASK-255 style)", () => {
  withEnv({ url: "placeholder", key: "placeholder" }, () => {
    assert.equal(getSupabaseConfig(), null);
    assert.equal(isSupabaseConfigured(), false);
  });
});

test(".env.example values → demo", () => {
  withEnv(
    {
      url: "https://your-project-ref.supabase.co",
      key: "sb_publishable_replace_me",
    },
    () => {
      assert.equal(getSupabaseConfig(), null);
      assert.equal(isSupabaseConfigured(), false);
    },
  );
});

test("real-looking URL + key → configured", () => {
  withEnv(
    {
      url: "https://abcdefghijklmnop.supabase.co",
      key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example",
    },
    () => {
      assert.deepEqual(getSupabaseConfig(), {
        url: "https://abcdefghijklmnop.supabase.co",
        publishableKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example",
      });
      assert.equal(isSupabaseConfigured(), true);
    },
  );
});
