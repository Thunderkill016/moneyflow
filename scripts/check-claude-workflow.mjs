import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const root = process.cwd();
const settingsPath = join(root, ".claude/settings.json");
const sessionHookPath = join(root, "scripts/hooks/session-start.sh");
const safetyHookPath = join(root, "scripts/hooks/pre-tool-safety.sh");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    input: options.input,
    encoding: "utf8",
    env: { ...process.env, ...options.env },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      [
        `${command} ${args.join(" ")} exited ${result.status}`,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result;
}

function assertIncludesAll(actual, expected, label) {
  for (const value of expected) {
    assert.ok(actual.includes(value), `${label} must include ${value}`);
  }
}

function initializeGitRepository(directory) {
  const modernInit = spawnSync("git", ["init", "-q", "-b", "main"], {
    cwd: directory,
    encoding: "utf8",
  });

  if (modernInit.error) throw modernInit.error;
  if (modernInit.status !== 0) {
    run("git", ["init", "-q"], { cwd: directory });
    run("git", ["checkout", "-q", "-b", "main"], { cwd: directory });
  }

  run("git", ["config", "user.name", "MoneyFlow Contract"], {
    cwd: directory,
  });
  run("git", ["config", "user.email", "contract@moneyflow.local"], {
    cwd: directory,
  });
  run("git", ["config", "commit.gpgsign", "false"], { cwd: directory });
  run("git", ["add", "."], { cwd: directory });
  run("git", ["commit", "-q", "-m", "test fixture"], { cwd: directory });
}

function copyIntoFixture(source, fixtureRoot, relativePath) {
  const destination = join(fixtureRoot, relativePath);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
assert.equal(
  settings.permissions?.defaultMode,
  "default",
  "Claude permissions.defaultMode must remain default",
);
assert.ok(Array.isArray(settings.permissions?.allow), "permissions.allow must be an array");
assert.ok(Array.isArray(settings.permissions?.deny), "permissions.deny must be an array");

assertIncludesAll(
  settings.permissions.allow,
  [
    "Read",
    "Glob",
    "Grep",
    "Bash(git status:*)",
    "Bash(git diff:*)",
    "Bash(npm run check:knowledge)",
    "Bash(npm run test)",
    "Bash(npm run build)",
  ],
  "permissions.allow",
);
assertIncludesAll(
  settings.permissions.deny,
  [
    "Bash(git push --force:*)",
    "Bash(git reset --hard:*)",
    "Bash(gh pr merge:*)",
    "Bash(vercel --prod:*)",
    "Bash(supabase db push:*)",
  ],
  "permissions.deny",
);

const sessionStart = settings.hooks?.SessionStart?.find(
  (entry) => entry.matcher === "startup",
);
assert.ok(sessionStart, "SessionStart startup hook must be registered");
assert.ok(
  sessionStart.hooks?.some((hook) =>
    String(hook.command).includes("scripts/hooks/session-start.sh"),
  ),
  "SessionStart must call scripts/hooks/session-start.sh",
);

const preToolUse = settings.hooks?.PreToolUse?.find((entry) => {
  const tools = String(entry.matcher)
    .split("|")
    .map((value) => value.trim());
  return ["Bash", "Edit", "Write", "Read", "Grep", "Glob"].every((tool) =>
    tools.includes(tool),
  );
});
assert.ok(
  preToolUse,
  "PreToolUse must cover Bash, Edit, Write, Read, Grep and Glob",
);
assert.ok(
  preToolUse.hooks?.some((hook) =>
    String(hook.command).includes("scripts/hooks/pre-tool-safety.sh"),
  ),
  "PreToolUse must call scripts/hooks/pre-tool-safety.sh",
);

const claudeEntrypoint = read("CLAUDE.md");
const readme = read("README.md");
const workflow = read("docs/engineering/CLAUDE_CODE_WORKFLOW.md");
const evaluator = read(".claude/agents/evaluator.md");
const sessionHook = read("scripts/hooks/session-start.sh");

assert.match(claudeEntrypoint, /docs\/engineering\/CLAUDE_CODE_WORKFLOW\.md/);
assert.match(claudeEntrypoint, /evaluator/);
assert.match(readme, /docs\/engineering\/CLAUDE_CODE_WORKFLOW\.md/);
assert.match(workflow, /## 5\. Task state machine/);
assert.match(workflow, /## 7\. Permission policy/);
assert.match(workflow, /## 11\. Definition of done/);
assert.doesNotMatch(sessionHook, /IDEA\.md|Grok VIP/);

const evaluatorTools = evaluator.match(/^tools:\s*(.+)$/mu)?.[1] ?? "";
assert.match(evaluatorTools, /Read/);
assert.match(evaluatorTools, /Bash/);
assert.doesNotMatch(evaluatorTools, /(?:^|[,\s])(?:Edit|Write)(?:$|[,\s])/u);
assert.match(evaluator, /\*\*P0\*\*/);
assert.match(evaluator, /\*\*Ready to merge\*\*/);
assert.match(evaluator, /\*\*Not ready\*\*/);

run("bash", ["-n", sessionHookPath]);
run("bash", ["-n", safetyHookPath]);

const fixtureRoot = mkdtempSync(join(tmpdir(), "moneyflow-claude-workflow-"));

try {
  copyIntoFixture(
    sessionHookPath,
    fixtureRoot,
    "scripts/hooks/session-start.sh",
  );
  copyIntoFixture(
    safetyHookPath,
    fixtureRoot,
    "scripts/hooks/pre-tool-safety.sh",
  );
  mkdirSync(join(fixtureRoot, "docs/plans/active"), { recursive: true });
  writeFileSync(
    join(fixtureRoot, "docs/plans/active/example-work-packet.md"),
    "# Example work packet\n",
  );
  writeFileSync(join(fixtureRoot, "README.md"), "# Fixture\n");
  writeFileSync(join(fixtureRoot, ".env.example"), "EXAMPLE_ONLY=true\n");

  initializeGitRepository(fixtureRoot);

  const session = run("bash", ["scripts/hooks/session-start.sh"], {
    cwd: fixtureRoot,
  });
  assert.match(session.stdout, /branch: main/);
  assert.match(session.stdout, /dirty paths: 0/);
  assert.match(session.stdout, /example-work-packet\.md/);
  assert.match(session.stdout, /docs\/engineering\/CLAUDE_CODE_WORKFLOW\.md/);
  assert.match(session.stdout, /npm run check:knowledge/);

  function invokeHook(toolName, toolInput, rawInput) {
    const input =
      rawInput ??
      JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: toolName,
        tool_input: toolInput,
      });
    return run("bash", ["scripts/hooks/pre-tool-safety.sh"], {
      cwd: fixtureRoot,
      input,
    });
  }

  function assertAllowed(toolName, toolInput, label) {
    const result = invokeHook(toolName, toolInput);
    assert.equal(result.stdout.trim(), "", `${label} should be allowed`);
  }

  function assertDenied(toolName, toolInput, reasonPattern, label) {
    const result = invokeHook(toolName, toolInput);
    const decision = JSON.parse(result.stdout);
    const output = decision.hookSpecificOutput;
    assert.equal(output?.hookEventName, "PreToolUse", `${label} hook event`);
    assert.equal(output?.permissionDecision, "deny", `${label} must be denied`);
    assert.match(
      String(output?.permissionDecisionReason ?? ""),
      reasonPattern,
      `${label} must include a useful reason`,
    );
  }

  assertAllowed("Read", { file_path: "README.md" }, "benign Read");
  assertAllowed(
    "Grep",
    { pattern: "Fixture", path: "README.md" },
    "benign Grep",
  );
  assertAllowed("Glob", { pattern: "scripts/**/*.sh" }, "benign Glob");
  assertAllowed("Bash", { command: "npm run test" }, "verification command");
  assertAllowed("Bash", { command: "cat .env.example" }, ".env.example read");

  const malformed = invokeHook("", {}, "not-json");
  assert.equal(malformed.stdout.trim(), "", "malformed input must fail open safely");

  assertDenied(
    "Read",
    { file_path: ".env.local" },
    /environment|secret/i,
    "secret Read",
  );
  assertDenied(
    "Grep",
    { pattern: "token", path: "secrets" },
    /environment|secret/i,
    "secret Grep",
  );
  assertDenied(
    "Glob",
    { pattern: "**/.env*" },
    /environment|secret/i,
    "secret Glob",
  );
  assertDenied(
    "Bash",
    { command: "cat .env" },
    /environment|secret/i,
    "secret shell read",
  );
  assertDenied(
    "Edit",
    { file_path: "README.md" },
    /focused branch/i,
    "Edit on main",
  );
  assertDenied(
    "Bash",
    { command: "git push --force origin main" },
    /force-push/i,
    "force push",
  );
  assertDenied(
    "Bash",
    { command: "gh pr merge 107 --squash" },
    /human action/i,
    "autonomous merge",
  );
  assertDenied(
    "Bash",
    { command: "npx vercel --prod" },
    /human-gated/i,
    "production deploy",
  );
  assertDenied(
    "Bash",
    { command: "npx supabase db push" },
    /human-gated/i,
    "remote database mutation",
  );

  run("git", ["switch", "-q", "-c", "test/feature"], { cwd: fixtureRoot });
  assertAllowed(
    "Edit",
    { file_path: "README.md" },
    "Edit on focused feature branch",
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log("Claude Code operating contract passed.");
