import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { PLAN_AUTHORITY_MANIFEST_PATH } from "./plan-authority.mjs";

const ACTIVE_PACKET_DIRECTORY = "docs/plans/active";
const RETIRED_BOARD_PATH = "docs/plans/active/README.md";
const RETIRED_BOARD_MARKER = "**Status:** retired as executable authority";

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
    const retired = readFileSync(join(root, RETIRED_BOARD_PATH), "utf8");
    if (!retired.includes(RETIRED_BOARD_MARKER)) {
      failures.push(
        `${RETIRED_BOARD_PATH} may exist only as a retired compatibility pointer; it must not regain board/authority semantics`,
      );
    }
  } catch {
    failures.push(`${RETIRED_BOARD_PATH} compatibility pointer is missing`);
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
