/*
 * Which build is running.
 *
 * The product had no answer to "what version are you on?". `package.json` has
 * said `0.1.0` across 521 commits with no tags and no releases, so the only
 * real identifier is the deployed commit — and nothing surfaced it.
 *
 * That matters now rather than in principle: as of 2026-08-27 the owner uses
 * this on a real phone, and PR #497 started sending client errors to a log. A
 * report that cannot be tied to a build is a report you cannot act on, because
 * the first question about any defect is which code produced it.
 *
 * The value comes from the platform's build-time environment variables. It is
 * baked in at build time, which is why it is read through `process.env` at
 * module scope rather than at call time — the bundler inlines it, and there is
 * no runtime environment in the browser to read it from.
 */

/** Full commit SHA of the running build, or null when it cannot be known. */
export const BUILD_COMMIT: string | null =
  process.env.NEXT_PUBLIC_BUILD_COMMIT || null;

/** Short, human-quotable form — what a person reads off a screen into a message. */
export function shortBuildId(commit: string | null = BUILD_COMMIT): string {
  if (!commit || !/^[0-9a-f]{7,40}$/iu.test(commit)) return "dev";
  return commit.slice(0, 7);
}

/**
 * One line naming the running build.
 *
 * Says `dev` rather than inventing a value when the commit is absent, because a
 * fabricated build id is worse than an admitted unknown: it would send someone
 * looking through the wrong code.
 */
export function buildLabel(commit: string | null = BUILD_COMMIT): string {
  return `Bản dựng ${shortBuildId(commit)}`;
}
