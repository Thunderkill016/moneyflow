import assert from "node:assert/strict";
import test from "node:test";
import {
  SupabaseConfigurationError,
  getAppMode,
  getSupabaseConfig,
  isSupabaseConfigured,
} from "./config.ts";

const MODE_KEY = "NEXT_PUBLIC_APP_MODE";
const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const PUB_KEY = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

type TestEnv = {
  mode?: string;
  url?: string;
  key?: string;
};

function withEnv(env: TestEnv, fn: () => void): void {
  const previous = {
    mode: process.env[MODE_KEY],
    url: process.env[URL_KEY],
    key: process.env[PUB_KEY],
  };

  const values: Record<string, string | undefined> = {
    [MODE_KEY]: env.mode,
    [URL_KEY]: env.url,
    [PUB_KEY]: env.key,
  };
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  try {
    fn();
  } finally {
    const restore: Record<string, string | undefined> = {
      [MODE_KEY]: previous.mode,
      [URL_KEY]: previous.url,
      [PUB_KEY]: previous.key,
    };
    for (const [name, value] of Object.entries(restore)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("demo mode is explicit and does not require backend values", () => {
  withEnv({ mode: "demo" }, () => {
    assert.equal(getAppMode(), "demo");
    assert.equal(getSupabaseConfig(), null);
    assert.equal(isSupabaseConfigured(), false);
  });
});

test("missing or unknown app mode fails instead of guessing demo mode", () => {
  withEnv({}, () => {
    assert.throws(() => getAppMode(), SupabaseConfigurationError);
  });
  withEnv({ mode: "auto" }, () => {
    assert.throws(() => getAppMode(), SupabaseConfigurationError);
  });
});

test("authenticated mode requires both backend values", () => {
  withEnv({ mode: "authenticated" }, () => {
    assert.throws(() => getSupabaseConfig(), SupabaseConfigurationError);
  });
});

test("authenticated mode returns normalized configuration", () => {
  withEnv(
    {
      mode: "authenticated",
      url: "https://project.example.com",
      key: "sb_publishable_test_key",
    },
    () => {
      assert.deepEqual(getSupabaseConfig(), {
        url: "https://project.example.com",
        publishableKey: "sb_publishable_test_key",
      });
      assert.equal(isSupabaseConfigured(), true);
    },
  );
});

test("authenticated mode rejects malformed backend URLs", () => {
  withEnv(
    {
      mode: "authenticated",
      url: "https://project.example.com/path",
      key: "sb_publishable_test_key",
    },
    () => {
      assert.throws(() => getSupabaseConfig(), SupabaseConfigurationError);
    },
  );
});
