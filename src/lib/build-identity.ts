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

const COMMIT_PATTERN = /^[0-9a-f]{40}$/u;

export type BuildCommitResolution = {
  /** Resolved commit, or null when no source provided one. */
  commit: string | null;
  /** Which environment variable supplied it (for audit logs). */
  source: string | null;
  /**
   * Set when resolution must fail closed: a set-but-malformed SHA, or a
   * Vercel production build with no commit at all. A production release
   * without provenance is the incident #779 exists to prevent — the build
   * must stop rather than ship a `dev` label.
   */
  error: string | null;
};

/**
 * Resolve the deployed commit from the environment, in precedence order.
 *
 * - `VERCEL_GIT_COMMIT_SHA` — Vercel sets it for git-connected builds.
 * - `GITHUB_SHA` — GitHub Actions always sets it; covers CI builds.
 * - `MF_BUILD_COMMIT` — explicit operator-provided provenance for manual
 *   CLI/prebuilt deploys (`vercel deploy -b MF_BUILD_COMMIT=<sha>`), which
 *   receive no git metadata from Vercel. `scripts/deploy-prod.mjs` is the
 *   sanctioned way to supply it.
 *
 * A *set but malformed* value fails closed rather than falling through to a
 * weaker source: silently downgrading provenance would hide a bad input.
 */
export function resolveBuildCommit(
  env: Record<string, string | undefined>,
): BuildCommitResolution {
  const sources = [
    "VERCEL_GIT_COMMIT_SHA",
    "GITHUB_SHA",
    "MF_BUILD_COMMIT",
  ] as const;
  for (const name of sources) {
    const raw = env[name]?.trim().toLowerCase();
    if (!raw) continue;
    if (!COMMIT_PATTERN.test(raw)) {
      return {
        commit: null,
        source: name,
        error: `${name} is set but is not a git commit SHA: "${raw.slice(0, 24)}"`,
      };
    }
    return { commit: raw, source: name, error: null };
  }
  if (env.VERCEL_ENV === "production") {
    return {
      commit: null,
      source: null,
      error:
        "A Vercel production build has no commit provenance. Deploy through Git integration or pass -b MF_BUILD_COMMIT=<sha> via scripts/deploy-prod.mjs.",
    };
  }
  return { commit: null, source: null, error: null };
}

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
