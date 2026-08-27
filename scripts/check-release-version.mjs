import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/*
 * Keep the version in `package.json` and the top of `CHANGELOG.md` telling the
 * same story.
 *
 * Before this, `package.json` said `0.1.0` across 530 commits with no tags and no
 * releases, so the number said nothing and nobody noticed. A changelog that drifts
 * from the shipped version is worse than none: it is a confident wrong answer to
 * "what changed between these two builds?".
 */

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/u;
/** Keep a Changelog heading: `## [1.2.3] — 2026-08-27`, em dash or hyphen. */
const RELEASE_HEADING = /^##\s+\[([^\]]+)\]\s*[—-]\s*(\d{4}-\d{2}-\d{2})\s*$/u;
const UNRELEASED_HEADING = /^##\s+\[[^\]]+\]\s*$/u;

/**
 * @param {string} version `package.json` version
 * @param {string} changelog `CHANGELOG.md` contents
 * @returns {{ ok: boolean, failures: string[], released: string | null }}
 */
export function checkReleaseVersion(version, changelog) {
  const failures = [];

  if (!SEMVER.test(version)) {
    failures.push(`package.json version "${version}" is not semver`);
  }

  const headings = changelog
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("## "));

  if (headings.length === 0) {
    failures.push("CHANGELOG.md has no version headings");
    return { ok: false, failures, released: null };
  }

  /*
   * The first heading must be the unreleased section. Without it every change
   * lands under an already-tagged version, which silently rewrites what that tag
   * shipped.
   */
  if (!UNRELEASED_HEADING.test(headings[0]) || RELEASE_HEADING.test(headings[0])) {
    failures.push(
      `CHANGELOG.md must open with an unreleased section, found "${headings[0]}"`,
    );
  }

  const releases = headings
    .map((heading) => heading.match(RELEASE_HEADING))
    .filter((match) => match !== null);

  if (releases.length === 0) {
    failures.push("CHANGELOG.md has no dated release section");
    return { ok: false, failures, released: null };
  }

  const latest = releases[0][1];
  if (latest !== version) {
    failures.push(
      `package.json says ${version} but the newest CHANGELOG.md release is ${latest}`,
    );
  }

  for (const [heading, name] of releases.map((m) => [m[0], m[1]])) {
    if (!SEMVER.test(name)) failures.push(`"${heading}" is not a semver release`);
  }

  const names = releases.map((match) => match[1]);
  if (new Set(names).size !== names.length) {
    failures.push("CHANGELOG.md lists the same version twice");
  }

  return { ok: failures.length === 0, failures, released: latest };
}

function runCli() {
  const version = JSON.parse(readFileSync("package.json", "utf8")).version;
  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const result = checkReleaseVersion(version, changelog);

  console.log(
    `release version contract — ${result.ok ? "PASSED" : "FAILED"}; package ${version}, changelog ${result.released ?? "none"}`,
  );
  for (const failure of result.failures) console.error(`failure: ${failure}`);
  process.exitCode = result.ok ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
