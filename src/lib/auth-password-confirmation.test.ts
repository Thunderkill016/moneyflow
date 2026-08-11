import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PASSWORD_MISMATCH_MESSAGE,
  passwordConfirmationMatches,
} from "./auth-password-confirmation.ts";

/** BUG-B: registration accepted a single password and never checked a confirmation. */

test("a matching confirmation is accepted", () => {
  assert.equal(passwordConfirmationMatches("correct horse battery", "correct horse battery"), true);
});

test("a mismatch is rejected", () => {
  assert.equal(passwordConfirmationMatches("correct horse battery", "correct horse batteru"), false);
});

test("confirmation is compared exactly — no trimming, no case folding", () => {
  // Both are legal password characters. Normalising here would accept a
  // confirmation that differs from what actually gets stored.
  assert.equal(passwordConfirmationMatches("secret value", "secret value "), false);
  assert.equal(passwordConfirmationMatches("Secret", "secret"), false);
});

test("a missing or non-string confirmation is rejected", () => {
  assert.equal(passwordConfirmationMatches("secret", undefined), false);
  assert.equal(passwordConfirmationMatches("secret", null), false);
  assert.equal(passwordConfirmationMatches("secret", 12), false);
  assert.equal(passwordConfirmationMatches(undefined, undefined), false);
});

test("the register action rejects a mismatch before it can reach Supabase", () => {
  /*
   * The behavioural claim this file exists for. `actions.ts` cannot be imported
   * here (next/cache, next/headers), so the ordering is asserted structurally:
   * the schema carries the confirmation rule, the action parses first and
   * returns on failure, and signUp appears only after that early return.
   */
  const source = readFileSync("src/app/(auth)/actions.ts", "utf8");

  assert.match(source, /passwordConfirmationMatches\(value\.password, value\.confirmPassword\)/);
  assert.match(source, /confirmPassword: formData\.get\("confirmPassword"\)/);

  const register = source.slice(source.indexOf("export async function register("));
  const parseAt = register.indexOf("registerSchema.safeParse");
  const guardAt = register.indexOf("if (!parsed.success) return");
  const signUpAt = register.indexOf("auth.signUp");

  assert.ok(parseAt !== -1 && guardAt !== -1 && signUpAt !== -1, "register must parse, guard and sign up");
  assert.ok(parseAt < guardAt, "the schema must be parsed before the guard");
  assert.ok(guardAt < signUpAt, "a failed parse must return before signUp is reached");
});

test("the mismatch message does not leak either password", () => {
  assert.doesNotMatch(PASSWORD_MISMATCH_MESSAGE, /\$\{|password[A-Z]/);
});
