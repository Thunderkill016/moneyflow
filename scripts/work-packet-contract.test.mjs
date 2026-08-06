import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
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

test("allows placeholders in the canonical template but not an active packet", () => {
  const packet = VALID_PACKET.replace(
    "src/lib/example.ts",
    "<state location>",
  );
  assert.deepEqual(validateWorkPacket(packet, { allowPlaceholders: true }), []);
  assert.ok(
    validateWorkPacket(packet).some((failure) => failure.includes("Location")),
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

test("repository template and changed active packets satisfy the contract", () => {
  const result = validateRepositoryWorkPackets(process.cwd());
  assert.deepEqual(result.failures, []);
});

test("repository validator reports an invalid changed packet fixture", () => {
  const root = mkdtempSync(join(tmpdir(), "moneyflow-work-packet-"));
  try {
    mkdirSync(join(root, "docs/templates"), { recursive: true });
    writeFileSync(join(root, WORK_PACKET_TEMPLATE), VALID_PACKET);

    const result = validateRepositoryWorkPackets(root);
    assert.deepEqual(result.failures, []);
    assert.equal(result.warnings.length, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
