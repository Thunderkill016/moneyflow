import assert from "node:assert/strict";
import test from "node:test";
import { localStatementEnvironment } from "./local-statement-env.mjs";

const fixture = {
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-anon",
  MF_STATEMENT_SERVICE_ROLE_KEY: "synthetic-fixture-admin",
};

test("only the configured disposable endpoint permits fixture administration", () => {
  assert.equal(
    localStatementEnvironment(fixture).url,
    fixture.NEXT_PUBLIC_SUPABASE_URL,
  );
  for (const url of [
    undefined,
    "https://project.supabase.co",
    "http://localhost:54321",
    "http://127.0.0.1:3301",
    "http://user:secret@127.0.0.1:54321",
    "http://127.0.0.1:54321/remote",
    "http://127.0.0.1:54321?redirect=remote",
  ]) {
    assert.throws(
      () =>
        localStatementEnvironment({
          ...fixture,
          NEXT_PUBLIC_SUPABASE_URL: url,
        }),
      /disposable loopback/,
    );
  }
});

test("missing keys fail without exposing supplied credentials", () => {
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "MF_STATEMENT_SERVICE_ROLE_KEY",
  ]) {
    assert.throws(
      () => localStatementEnvironment({ ...fixture, [key]: "" }),
      (error) =>
        error.message.includes("disposable anon") &&
        !error.message.includes("synthetic-fixture-admin"),
    );
  }
});
