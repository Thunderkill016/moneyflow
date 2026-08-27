import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/*
 * Every action must be pinned to a full-length commit SHA.
 *
 * This is enforced by a repository setting, and the enforcement happens at action
 * resolution — the job dies in about seven seconds, before a single step runs.
 * Nothing before merge said a word: `ui-audit-nightly.yml` was merged unpinned and
 * failed on every scheduled run from 2026-08-03 to 2026-08-27, so 27 days of
 * "nightly Firefox coverage" never existed and no gate noticed. PR #500 then shipped
 * the same one-line defect. This is the check that would have caught both.
 *
 * A moving tag is also a supply-chain risk in its own right: `@v4` re-points
 * whenever the publisher moves it, so what runs is whatever they push next.
 */

const WORKFLOW_DIR = ".github/workflows";
const FULL_SHA = /^[0-9a-f]{40}$/u;

/** Local (`./…`) and Docker (`docker://…`) uses are not fetched by ref. */
function isPinnable(reference) {
  return !reference.startsWith("./") && !reference.startsWith("docker://");
}

/**
 * @param {string} name file name, for the message
 * @param {string} source workflow YAML
 * @returns {string[]} one failure per unpinned `uses:`
 */
export function findUnpinnedUses(name, source) {
  const failures = [];
  const lines = source.split(/\r?\n/u);

  for (const [index, line] of lines.entries()) {
    // Ignore commented-out examples; only real `uses:` keys are resolved.
    if (/^\s*#/u.test(line)) continue;
    const match = line.match(/^\s*(?:-\s*)?uses:\s*(\S+)/u);
    if (!match) continue;

    const reference = match[1];
    if (!isPinnable(reference)) continue;

    const at = reference.lastIndexOf("@");
    const ref = at === -1 ? "" : reference.slice(at + 1);
    if (!FULL_SHA.test(ref)) {
      failures.push(
        `${WORKFLOW_DIR}/${name}:${index + 1} uses ${reference} — pin to a full 40-character commit SHA, with the version in a trailing comment`,
      );
    }
  }

  return failures;
}

function runCli() {
  let names;
  try {
    names = readdirSync(WORKFLOW_DIR).filter((name) => /\.ya?ml$/u.test(name));
  } catch {
    console.log("workflow pin contract — no workflow directory; skipped");
    return;
  }

  const failures = names.flatMap((name) =>
    findUnpinnedUses(name, readFileSync(join(WORKFLOW_DIR, name), "utf8")),
  );

  console.log(
    `workflow pin contract — ${failures.length === 0 ? "PASSED" : "FAILED"}; ${names.length} workflow file(s)`,
  );
  for (const failure of failures) console.error(`failure: ${failure}`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) runCli();
