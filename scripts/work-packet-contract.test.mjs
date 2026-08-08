import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  collectChangedActivePackets,
  main,
  validateRepositoryWorkPackets,
  validateWorkPacket,
  WORK_PACKET_TEMPLATE,
} from "./work-packet-contract.mjs";

const VALID_PACKET = `# Example

## Control contract

### State

- Location: src/lib/example.ts
- Writer/owner: example service
- Propagation: callers receive the updated result synchronously

### Feedback

- Expected failing signal: focused unit test fails before the implementation
- Success signal: focused unit test and repository policy gate pass
- Semantic evidence: the real user flow returns the expected result

### Removal impact

- What breaks if removed: the example flow loses its owned behavior
- Rollback: revert the bounded commit and rerun the same focused test

### Action safety

- Permissions: branch-only repository writes
- Reversibility: additive files and one package entry are removable
- Escalation: stop for provider, production or ownership changes
- Failure containment: no runtime, database or provider effect
`;

function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function makeRepository() {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-work-packet-"));
  mkdirSync(join(root, "docs/templates"), { recursive: true });
  writeFileSync(join(root, WORK_PACKET_TEMPLATE), VALID_PACKET);
  git(root, ["init"]);
  git(root, ["config", "user.email", "tests@example.test"]);
  git(root, ["config", "user.name", "MoneyFlow Tests"]);
  git(root, ["add", "."]);
  git(root, ["commit", "-m", "baseline"]);
  git(root, ["branch", "-M", "main"]);
  git(root, ["checkout", "-b", "feature"]);
  return root;
}

test("accepts a resolved external reliability contract", () => {
  assert.deepEqual(validateWorkPacket(VALID_PACKET), []);
});

test("requires semantic evidence instead of only system-green evidence", () => {
  const packet = VALID_PACKET.replace(
    "- Semantic evidence: the real user flow returns the expected result\n",
    "",
  );
  assert.ok(
    validateWorkPacket(packet).some((failure) =>
      failure.includes("Semantic evidence"),
    ),
  );
});

test("requires control fields to live inside the control contract", () => {
  const packet = VALID_PACKET.replace(
    "## Control contract\n\n",
    "## Control contract\n\nNo structured fields here.\n\n## Other section\n\n",
  );
  assert.ok(
    validateWorkPacket(packet).some(
      (failure) =>
        failure.includes("Control contract") && failure.includes("### State"),
    ),
  );
});

test("allows placeholders in the canonical template but not an active packet", () => {
  const packet = VALID_PACKET.replace("src/lib/example.ts", "<state location>");
  assert.deepEqual(validateWorkPacket(packet, { allowPlaceholders: true }), []);
  assert.ok(
    validateWorkPacket(packet).some((failure) => failure.includes("Location")),
  );
});

test("allows literal angle-bracket syntax inside resolved evidence", () => {
  const packet = VALID_PACKET.replace(
    "the real user flow returns the expected result",
    "the rendered `<button>` remains keyboard reachable",
  );
  assert.deepEqual(validateWorkPacket(packet), []);
});

test("rejects unresolved marker prefixes and bare non-answers", () => {
  const todoPacket = VALID_PACKET.replace(
    "branch-only repository writes",
    "TODO: decide provider permissions",
  );
  const notApplicablePacket = VALID_PACKET.replace(
    "the real user flow returns the expected result",
    "Not applicable",
  );
  assert.ok(
    validateWorkPacket(todoPacket).some((failure) =>
      failure.includes("Permissions"),
    ),
  );
  assert.ok(
    validateWorkPacket(notApplicablePacket).some((failure) =>
      failure.includes("Semantic evidence"),
    ),
  );
});

test("requires distinct failing, success and semantic signals", () => {
  const packet = VALID_PACKET.replace(
    "the real user flow returns the expected result",
    "focused unit test and repository policy gate pass",
  );
  assert.ok(
    validateWorkPacket(packet).some((failure) =>
      failure.includes("distinguish the deterministic success signal"),
    ),
  );
});

test("rejects duplicate contract fields instead of accepting the first value", () => {
  const packet = VALID_PACKET.replace(
    "- Semantic evidence: the real user flow returns the expected result\n",
    "- Semantic evidence: the real user flow returns the expected result\n- Semantic evidence: TODO\n",
  );
  assert.ok(
    validateWorkPacket(packet).some((failure) =>
      failure.includes("duplicate field: Semantic evidence"),
    ),
  );
});

test("requires permissions, reversibility, escalation and containment", () => {
  const packet = VALID_PACKET.replace(
    "- Failure containment: no runtime, database or provider effect\n",
    "",
  );
  assert.ok(
    validateWorkPacket(packet).some((failure) =>
      failure.includes("Failure containment"),
    ),
  );
});

test("fails closed when Git scope cannot be resolved", () => {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-work-packet-no-git-"));
  try {
    mkdirSync(join(root, "docs/templates"), { recursive: true });
    writeFileSync(join(root, WORK_PACKET_TEMPLATE), VALID_PACKET);
    const result = validateRepositoryWorkPackets(root);
    assert.ok(
      result.failures.some((failure) => failure.includes("scope unavailable")),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails instead of silently falling back from an explicit invalid base", () => {
  const root = makeRepository();
  try {
    const result = validateRepositoryWorkPackets(root, "missing-base");
    assert.ok(
      result.failures.some((failure) => failure.includes("missing-base")),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validates untracked active packets before they are committed", () => {
  const root = makeRepository();
  try {
    mkdirSync(join(root, "docs/plans/active"), { recursive: true });
    const packetPath = "docs/plans/active/new-feature.md";
    writeFileSync(
      join(root, packetPath),
      VALID_PACKET.replace(
        "- Semantic evidence: the real user flow returns the expected result\n",
        "",
      ),
    );

    const changed = collectChangedActivePackets(root);
    assert.deepEqual(changed.files, [packetPath]);

    const result = validateRepositoryWorkPackets(root);
    assert.equal(result.base, "main");
    assert.deepEqual(result.checkedPackets, [packetPath]);
    assert.ok(
      result.failures.some(
        (failure) =>
          failure.includes(packetPath) && failure.includes("Semantic evidence"),
      ),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("validates committed, staged and unstaged packet changes without duplicates", () => {
  const root = makeRepository();
  try {
    mkdirSync(join(root, "docs/plans/active"), { recursive: true });
    const packetPath = "docs/plans/active/feature.md";
    writeFileSync(join(root, packetPath), VALID_PACKET);
    git(root, ["add", packetPath]);
    git(root, ["commit", "-m", "add packet"]);

    writeFileSync(
      join(root, packetPath),
      VALID_PACKET.replace(
        "branch-only repository writes",
        "TODO: decide permissions",
      ),
    );
    git(root, ["add", packetPath]);
    writeFileSync(
      join(root, packetPath),
      VALID_PACKET.replace(
        "branch-only repository writes",
        "TODO: decide permissions and containment",
      ),
    );

    const changed = collectChangedActivePackets(root);
    assert.deepEqual(changed.files, [packetPath]);
    const result = validateRepositoryWorkPackets(root);
    assert.ok(result.failures.some((failure) => failure.includes("Permissions")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects duplicate base flags and unknown arguments", () => {
  assert.equal(main(["--base", "main", "--base", "origin/main"]), 2);
  assert.equal(main(["--unexpected"]), 2);
});
