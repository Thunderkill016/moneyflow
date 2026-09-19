import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ACTIVE_PACKET_DIRECTORY = "docs/plans/active";
const INDEX_PATH = "docs/plans/active/README.md";
const INDEX_MARKER = "**Status:** packet directory, not a queue or authority source";

export function validateActivePacketRegistry(root) {
  const failures = [];
  try {
    const index = readFileSync(join(root, INDEX_PATH), "utf8");
    if (!index.includes(INDEX_MARKER)) {
      failures.push(`${INDEX_PATH} must remain a packet-directory guide, not a queue or authority source`);
    }
    if (/\|\s*(?:NOW|NEXT)\s*\|/iu.test(index) || /current work board/iu.test(index)) {
      failures.push(`${INDEX_PATH} must not regain a NOW/NEXT board or current-work authority semantics`);
    }
  } catch {
    failures.push(`${INDEX_PATH} is missing`);
  }
  return failures;
}

export function validateActivePacketReferences(root, referencePaths) {
  const failures = [];
  const activeRoot = join(root, ACTIVE_PACKET_DIRECTORY);

  for (const path of referencePaths) {
    let content;
    try {
      content = readFileSync(join(root, path), "utf8");
    } catch {
      continue;
    }

    for (const [, packet] of content.matchAll(
      /docs\/plans\/active\/([A-Za-z0-9._-]+\.md)/gmu,
    )) {
      if (packet === "README.md") continue;
      try {
        if (!statSync(join(activeRoot, packet)).isFile()) {
          failures.push(`${path} references missing active packet: ${packet}`);
        }
      } catch {
        failures.push(`${path} references missing active packet: ${packet}`);
      }
    }
  }

  return failures;
}
