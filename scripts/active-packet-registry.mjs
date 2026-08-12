import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const ACTIVE_PACKET_REGISTRY_PATH = "docs/plans/active/README.md";
const ACTIVE_PACKET_DIRECTORY = "docs/plans/active";

function packetNamesFromRegistry(registry) {
  return Array.from(
    registry.matchAll(/^\|\s*`([^`]+\.md)`\s*\|/gmu),
    ([, packet]) => packet,
  );
}

export function validateActivePacketRegistry(root) {
  const failures = [];
  let registry;

  try {
    registry = readFileSync(join(root, ACTIVE_PACKET_REGISTRY_PATH), "utf8");
  } catch {
    return [`missing active-packet registry: ${ACTIVE_PACKET_REGISTRY_PATH}`];
  }

  const registered = packetNamesFromRegistry(registry);
  if (registered.length === 0) {
    failures.push(`${ACTIVE_PACKET_REGISTRY_PATH} must register active packets`);
    return failures;
  }
  if (new Set(registered).size !== registered.length) {
    failures.push(`${ACTIVE_PACKET_REGISTRY_PATH} registers a packet more than once`);
  }

  let actual = [];
  try {
    actual = readdirSync(join(root, ACTIVE_PACKET_DIRECTORY)).filter((entry) => {
      if (entry === "README.md" || !entry.endsWith(".md")) return false;
      return statSync(join(root, ACTIVE_PACKET_DIRECTORY, entry)).isFile();
    });
  } catch {
    failures.push(`${ACTIVE_PACKET_DIRECTORY} must exist`);
    return failures;
  }

  for (const packet of registered) {
    if (!actual.includes(packet)) {
      failures.push(
        `${ACTIVE_PACKET_REGISTRY_PATH} registers missing active packet: ${packet}`,
      );
    }
  }
  for (const packet of actual) {
    if (!registered.includes(packet)) {
      failures.push(
        `${ACTIVE_PACKET_DIRECTORY}/${packet} is active but absent from the registry`,
      );
    }
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
