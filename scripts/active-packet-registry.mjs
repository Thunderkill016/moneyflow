import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { PLAN_AUTHORITY_MANIFEST_PATH } from "./plan-authority.mjs";

const ACTIVE_PACKET_DIRECTORY = "docs/plans/active";
const RETIRED_BOARD_PATH = "docs/plans/active/README.md";

export function validateActivePacketRegistry(root) {
  const failures = [];
  let manifest;

  try {
    manifest = JSON.parse(
      readFileSync(join(root, PLAN_AUTHORITY_MANIFEST_PATH), "utf8"),
    );
  } catch {
    return [`missing or invalid plan authority manifest: ${PLAN_AUTHORITY_MANIFEST_PATH}`];
  }

  for (const [label, entry] of [
    ["master", manifest?.master],
    ["current", manifest?.current],
  ]) {
    if (entry == null && label === "current") continue;
    const path = entry?.path;
    if (typeof path !== "string" || !path.startsWith(`${ACTIVE_PACKET_DIRECTORY}/`)) {
      failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} ${label}.path must point inside ${ACTIVE_PACKET_DIRECTORY}`);
      continue;
    }
    try {
      if (!statSync(join(root, path)).isFile()) {
        failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} ${label} packet is not a file: ${path}`);
      }
    } catch {
      failures.push(`${PLAN_AUTHORITY_MANIFEST_PATH} ${label} packet is missing: ${path}`);
    }
  }

  try {
    if (statSync(join(root, RETIRED_BOARD_PATH)).isFile()) {
      failures.push(
        `${RETIRED_BOARD_PATH} is retired; human planning belongs in GitHub Issues/PRs and executable authority belongs in ${PLAN_AUTHORITY_MANIFEST_PATH}`,
      );
    }
  } catch {
    // Expected: the Markdown board has been retired.
  }

  return failures;
}

export function validateAuthorityPacketReferences(root, authorityPaths) {
  const failures = [];
  const activeRoot = join(root, ACTIVE_PACKET_DIRECTORY);

  for (const path of authorityPaths) {
    let content;
    try {
      content = readFileSync(join(root, path), "utf8");
    } catch {
      continue;
    }

    for (const [, packet] of content.matchAll(
      /docs\/plans\/active\/([A-Za-z0-9._-]+\.md)/gmu,
    )) {
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
