/**
 * MoneyFlow agent harness policy — the machine-readable form of rules that
 * already exist in prose.
 *
 * This module is a *projection*, not a new framework. Every rule here is already
 * written down in `AGENTS.md`, `docs/engineering/RISK_PROPORTIONAL_DELIVERY.md`
 * and the CI workflows; the point is to let tooling answer the same questions a
 * human answers by reading them.
 *
 * ## The single-authority rule
 *
 * Path → CI job selection has exactly one owner: `classify-ci-changes.mjs`. This
 * module imports it and must never restate one of its matchers. What lives here
 * is the harness knowledge the classifier deliberately does not carry — risk
 * class, local commands, provider check identities, approval boundaries and
 * evidence types — and it lives here *once*, so `agent:doctor` consumes policy
 * instead of accumulating a private copy of it.
 *
 * If you find yourself adding a path rule here that duplicates a classifier
 * matcher, extend the classifier and import it instead. Two matchers for one
 * fact is the failure mode this module exists to prevent.
 */

import fs from "node:fs";
import path from "node:path";

import {
  classifyChanges,
  databaseMatchers,
  isRequestBoundary,
  matchesAny,
  workflowOrPolicyMatchers,
} from "./classify-ci-changes.mjs";

/**
 * Freeze what leaves this module, not merely the constant tables.
 *
 * A consumer reads `decision.approval.granted`. Freezing only the boundary
 * catalogue left the *emitted* object a plain literal, so anything holding the
 * report could set `granted: true` and every downstream reader would believe it.
 * The tables were never the attack surface; the report is.
 */
function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const entry of Object.values(value)) deepFreeze(entry);
  return value;
}

export const POLICY_SCHEMA_VERSION = 2;

/** Where each rule is written in prose. Emitted so a reader can check the projection. */
export const POLICY_SOURCES = Object.freeze({
  riskClasses: "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md#change-classes",
  gateSelection: "scripts/classify-ci-changes.mjs",
  providerChecks: "docs/engineering/RISK_PROPORTIONAL_DELIVERY.md#stable-required-checks",
  approvalBoundaries: "docs/engineering/AGENT_OPERATING_MODEL.md",
  evidence: "AGENTS.md#definition-of-done",
});

// --- Risk classes ------------------------------------------------------------

export const RISK_CLASSES = Object.freeze({
  0: Object.freeze({
    id: 0,
    label: "documentation and mechanical repository changes",
    planningArtifact: "inline plan or clear PR description",
  }),
  1: Object.freeze({
    id: 1,
    label: "bounded code change",
    planningArtifact: "concise PR plan",
  }),
  2: Object.freeze({
    id: 2,
    label: "user-interface or user-flow change",
    planningArtifact: "concise plan; full packet for multi-flow redesign",
  }),
  3: Object.freeze({
    id: 3,
    label: "financial, data, security or operational boundary",
    planningArtifact: "full work packet under docs/plans/active/",
  }),
});

/**
 * Paths that make a change a Class 3 boundary.
 *
 * These are *sensitivity* rules, not gate-selection rules — a distinction worth
 * keeping, because `supabase/migrations/` selects the pgTAP job (classifier's
 * job) *and* raises the risk class (this module's job) for different reasons.
 * Selecting a gate is about which evidence is meaningful; the class is about how
 * much human ceremony the change needs.
 */
const CLASS_3_MATCHERS = Object.freeze([
  // Imported, not restated: the classifier owns what counts as database truth
  // and as CI/workflow policy. Duplicating either pattern here would create the
  // second definition this module exists to prevent.
  { id: "database-truth", test: (file) => matchesAny(file, databaseMatchers) },
  { id: "ci-security-policy", test: (file) => matchesAny(file, workflowOrPolicyMatchers) },
  { id: "request-boundary", test: isRequestBoundary },
  /**
   * Provider-side repository state the owner controls.
   *
   * `RISK_PROPORTIONAL_DELIVERY.md` names branch protection, rulesets, workflow
   * permissions and CODEOWNERS as explicit owner operations, and `AGENTS.md`
   * forbids changing them inside feature work. Anything under `.github/` that is
   * not a documentation template is therefore a boundary, not a bounded change.
   */
  {
    id: "repository-governance",
    test: (file) =>
      file.startsWith(".github/") &&
      !/^\.github\/(?:ISSUE_TEMPLATE|PULL_REQUEST_TEMPLATE|DISCUSSION_TEMPLATE)\//.test(file),
  },
  /**
   * The agent harness policy itself.
   *
   * Deliberately its own reason rather than folded into `ci-security-policy`:
   * these files cannot change which gates CI selects, so the classifier is right
   * not to force every gate for them. They *can* change what an agent believes
   * the rules are, which is why understating them would be the worse error. The
   * asymmetry is intentional and symmetric across both harness files — an earlier
   * version made the policy Class 3 and its consumer Class 1, which was just a
   * gap.
   */
  {
    id: "harness-policy",
    test: (file) => /^scripts\/agent-(?:policy|doctor)(?:\.test)?\.mjs$/.test(file),
  },
  { id: "server-mutation", test: (file) => file.startsWith("src/app/actions/") },
  // Route handlers are server request entry points exactly as server actions are.
  { id: "server-route", test: (file) => /^src\/app\/api\/.*\/route\.[cm]?[jt]s$/.test(file) },
  // The authenticated client the server-mutation paths go through.
  { id: "supabase-client", test: (file) => file.startsWith("src/lib/supabase/") },
  { id: "archive-portability", test: (file) => file.startsWith("src/lib/archive/") },
  {
    id: "auth-and-account-deletion",
    test: (file) => /^src\/lib\/(?:auth|account-delet|account-register)/.test(file),
  },
  {
    id: "financial-domain",
    test: (file) =>
      /^src\/lib\/(?:money|transaction|transfer|balance|split|budget|goal|commitment|reconcil|import|export|inbox)/.test(
        file,
      ),
  },
  { id: "deployment-config", test: (file) => /^(?:vercel\.json|\.env\.example)$/.test(file) },
]);

function class3Reasons(files) {
  const reasons = new Set();
  for (const file of files) {
    for (const matcher of CLASS_3_MATCHERS) {
      if (matcher.test(file)) reasons.add(matcher.id);
    }
  }
  return [...reasons].sort();
}

/**
 * Derive the risk class from the classifier's own facts plus Class 3 sensitivity.
 *
 * Order matters: a change is judged by its most sensitive part, never averaged.
 * A docs PR that also touches a migration is Class 3.
 */
export function deriveRiskClass(classification, { files } = {}) {
  // No silent default: an absent file list previously skipped the entire Class 3
  // sensitivity check and answered "Class 1", which is the one wrong answer that
  // looks like a real one.
  const subject = files ?? classification.files;
  if (!Array.isArray(subject)) {
    throw new TypeError("deriveRiskClass requires the changed file list; refusing to guess");
  }
  const reasons = class3Reasons(subject);
  if (reasons.length > 0) {
    return { class: 3, reasons, ...RISK_CLASSES[3] };
  }
  if (classification.docsOnly) {
    return { class: 0, reasons: ["documentation-only"], ...RISK_CLASSES[0] };
  }
  if (classification.uiAudit) {
    return { class: 2, reasons: ["visual-or-layout-surface"], ...RISK_CLASSES[2] };
  }
  return { class: 1, reasons: ["bounded-executable-change"], ...RISK_CLASSES[1] };
}

// --- Local gates -------------------------------------------------------------

/**
 * Local commands keyed by the classifier's own output flags.
 *
 * `always` mirrors Class 0's required set in `RISK_PROPORTIONAL_DELIVERY.md`:
 * even a documentation change proves migration identity, the knowledge contract
 * and the CI classification contract.
 */
export const GATE_COMMANDS = Object.freeze({
  always: Object.freeze([
    "npm run check:migrations",
    "npm run check:knowledge",
    "npm run test:ci-policy",
  ]),
  byFlag: Object.freeze({
    fullVerify: "npm run verify:prepush",
    database: "npm run test:db",
    browserSmoke: "npm run test:e2e",
    uiAudit: "npm run test:ui-audit:pr",
  }),
});

export function buildGatePlan(classification) {
  const commands = [...GATE_COMMANDS.always];
  for (const [flag, command] of Object.entries(GATE_COMMANDS.byFlag)) {
    if (classification[flag]) commands.push(command);
  }
  return [...new Set(commands)];
}

// --- Capabilities ------------------------------------------------------------

/** Which local capability each classifier flag actually needs to run. */
export const CAPABILITY_REQUIREMENTS = Object.freeze({
  node: Object.freeze({ always: true }),
  npm: Object.freeze({ always: true }),
  git: Object.freeze({ always: true }),
  supabase: Object.freeze({ flags: ["database"] }),
  docker: Object.freeze({ flags: ["database"] }),
  playwright: Object.freeze({ flags: ["browserSmoke", "uiAudit"] }),
});

export function requiredCapabilities(classification) {
  const required = {};
  for (const [name, rule] of Object.entries(CAPABILITY_REQUIREMENTS)) {
    required[name] = rule.always === true || (rule.flags ?? []).some((flag) => Boolean(classification[flag]));
  }
  return required;
}

// --- Provider checks ---------------------------------------------------------

/**
 * The protected check contexts a pull request must satisfy on its exact head.
 *
 * Declared rather than derived, because *requiredness* lives in the branch
 * ruleset and cannot be read out of a workflow file — a workflow says a job
 * exists, not that merging depends on it. What is derived, and enforced by
 * `verifyProviderCheckIdentities`, is that every context declared here is still
 * a real pull-request-triggered job identity. That catches the drift this
 * repository can actually detect offline: a renamed, retriggered or deleted job.
 *
 * The half it cannot catch — the owner adding or removing a *required* context
 * in the ruleset — is what `reconcileWithLiveRuleset` is for, and it needs
 * network and a token, so it stays opt-in and is never a silent pass.
 */
export const PROVIDER_CHECK_CONTEXTS = Object.freeze([
  Object.freeze({
    context: "verify",
    workflow: ".github/workflows/ci.yml",
    proves: "policy contracts, static quality, unit tests and production build",
    mayReportNotApplicable: true,
  }),
  Object.freeze({
    context: "database",
    workflow: ".github/workflows/ci.yml",
    proves: "Supabase reset and pgTAP against a real PostgreSQL",
    mayReportNotApplicable: true,
  }),
  Object.freeze({
    context: "e2e",
    workflow: ".github/workflows/ci.yml",
    proves: "the selected browser shards actually succeeded",
    mayReportNotApplicable: true,
  }),
  Object.freeze({
    context: "Gitleaks all refs",
    workflow: ".github/workflows/secret-history.yml",
    proves: "no secret is present in any ref's history",
    mayReportNotApplicable: false,
  }),
  Object.freeze({
    context: "Analyze JavaScript and TypeScript",
    workflow: ".github/workflows/codeql.yml",
    // Deliberately not "not applicable"-able: the code-scanning rule requires
    // uploaded analysis data, so a no-op green job leaves the PR unmergeable.
    proves: "a real uploaded CodeQL analysis for the exact head",
    mayReportNotApplicable: false,
  }),
]);

export function requiredProviderChecks() {
  return PROVIDER_CHECK_CONTEXTS.map((entry) => entry.context);
}

const WORKFLOW_DIR = ".github/workflows";

/**
 * Read job identities out of the workflow files.
 *
 * A job's check context is its `name:` when present and its key otherwise —
 * the same rule GitHub applies. Parsed with a narrow line scanner rather than a
 * YAML dependency: the shape being read is two levels deep and adding a parser
 * dependency to a policy guard would be a worse trade.
 */
export function deriveWorkflowJobs({ root = process.cwd() } = {}) {
  const dir = path.join(root, WORKFLOW_DIR);
  if (!fs.existsSync(dir)) return [];
  const jobs = [];
  for (const file of fs.readdirSync(dir).sort()) {
    if (!/\.ya?ml$/.test(file)) continue;
    const workflow = `${WORKFLOW_DIR}/${file}`;
    const lines = fs.readFileSync(path.join(dir, file), "utf8").split(/\r?\n/);
    const triggersPullRequest = workflowTriggersPullRequest(lines);
    const jobsAt = lines.findIndex((line) => /^jobs:\s*$/.test(line));
    if (jobsAt < 0) continue;
    for (let i = jobsAt + 1; i < lines.length; i += 1) {
      const start = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(lines[i]);
      if (!start) continue;
      let name = null;
      let eventGated = false;
      for (let j = i + 1; j < lines.length && /^ {4}\S/.test(lines[j]); j += 1) {
        const found = /^ {4}name:\s*(.+?)\s*$/.exec(lines[j]);
        if (found && name === null) name = found[1].replace(/^['"]|['"]$/g, "");
        /**
         * A job-level `if:` can silence a check on pull requests even when its
         * workflow triggers on them, and `ci.yml` already gates every required
         * job this way — so ignoring job conditions would let a one-line edit
         * stop a required check from ever reporting while the doctor kept
         * advertising it.
         *
         * The rule is deliberately conservative rather than a GitHub expression
         * evaluator: if the condition reasons about `github.event_name` but never
         * mentions `pull_request`, this job cannot be shown to run on one. The
         * real conditions here all name `pull_request` explicitly, so they pass;
         * `if: github.event_name == 'push'` does not.
         */
        if (/^ {4}if:/.test(lines[j]) && /github\.event_name/.test(lines[j])) {
          eventGated = !/pull_request/.test(lines[j]);
        }
      }
      jobs.push({
        id: start[1],
        context: name ?? start[1],
        workflow,
        triggersPullRequest: triggersPullRequest && !eventGated,
        eventGatedAwayFromPullRequest: eventGated,
      });
    }
  }
  return jobs;
}

/**
 * Does this workflow run on pull requests?
 *
 * Depth matters. An earlier version matched `pull_request:` at any indentation
 * inside the `on:` block, so a `workflow_call` input *named* `pull_request`
 * counted as a trigger — a workflow that never runs on a PR reported as if it
 * did. Only a direct child of `on:` is a trigger.
 */
function workflowTriggersPullRequest(lines) {
  const inline = lines.find((line) => /^on:\s*\S/.test(line));
  if (inline) return /\bpull_request\b/.test(inline);
  const onAt = lines.findIndex((line) => /^on:\s*$/.test(line));
  if (onAt < 0) return false;
  for (let i = onAt + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) break; // next top-level key ends the block
    if (/^ {2}pull_request:/.test(line) || /^ {2}pull_request\s*$/.test(line)) return true;
  }
  return false;
}

/**
 * Deterministic, offline drift guard.
 *
 * Fails when a declared context no longer names a pull-request-triggered job, or
 * when the workflow it is attributed to has changed. Runs in `test:ci-policy`,
 * so renaming a CI job cannot silently leave `agent:doctor` advertising a check
 * that will never report.
 */
export function verifyProviderCheckIdentities({ root = process.cwd() } = {}) {
  const jobs = deriveWorkflowJobs({ root });
  const problems = [];
  for (const declared of PROVIDER_CHECK_CONTEXTS) {
    const matches = jobs.filter((job) => job.context === declared.context);
    if (matches.length === 0) {
      problems.push({
        context: declared.context,
        problem: "no workflow job declares this check identity",
      });
      continue;
    }
    // One job must satisfy every condition. Testing the conditions independently
    // let a decoy workflow provide the identity while the real job was unhooked.
    const owning = matches.filter((job) => job.workflow === declared.workflow);
    if (owning.length === 0) {
      problems.push({
        context: declared.context,
        problem: `declared workflow ${declared.workflow} no longer owns this job`,
      });
      continue;
    }
    if (!owning.some((job) => job.triggersPullRequest)) {
      const gated = owning.some((job) => job.eventGatedAwayFromPullRequest);
      problems.push({
        context: declared.context,
        problem: gated
          ? "job is gated away from pull_request by a job-level event condition"
          : "job exists but its workflow no longer triggers on pull_request",
      });
    }
  }
  return { ok: problems.length === 0, problems, jobs };
}

/**
 * Compare the declared contexts against the live branch ruleset.
 *
 * Opt-in and read-only: it needs network and a token, so it can never be part of
 * the offline guard. It reads a ruleset; it cannot change one.
 */
export function reconcileWithLiveRuleset(liveRequiredContexts) {
  if (!Array.isArray(liveRequiredContexts)) {
    return { ok: false, checked: false, reason: "no live ruleset data supplied" };
  }
  const declared = new Set(requiredProviderChecks());
  const live = new Set(liveRequiredContexts);
  const missingLocally = [...live].filter((context) => !declared.has(context)).sort();
  const staleLocally = [...declared].filter((context) => !live.has(context)).sort();
  return {
    ok: missingLocally.length === 0 && staleLocally.length === 0,
    checked: true,
    missingLocally,
    staleLocally,
  };
}

// --- Owner approval boundaries ----------------------------------------------

/**
 * Boundaries this repository distinguishes.
 *
 * This is a vocabulary, not a grant. Nothing in this module can authorize
 * anything: `granted` is a frozen `false` on every boundary, and the only way an
 * approval becomes real is a human saying so for one named action. The harness
 * models the boundary so tooling can *notice* one is being crossed.
 */
export const APPROVAL_BOUNDARIES = Object.freeze({
  none: Object.freeze({
    id: "none",
    rank: 0,
    label: "no provider write",
    granted: false,
    requiresOwnerApproval: false,
  }),
  provider_read: Object.freeze({
    id: "provider_read",
    rank: 1,
    label: "read-only provider inspection",
    granted: false,
    requiresOwnerApproval: false,
  }),
  production_schema_write: Object.freeze({
    id: "production_schema_write",
    rank: 2,
    label: "production schema or migration write",
    granted: false,
    requiresOwnerApproval: true,
  }),
  tenant_ledger_mutation: Object.freeze({
    id: "tenant_ledger_mutation",
    rank: 3,
    label: "tenant or ledger data mutation",
    granted: false,
    requiresOwnerApproval: true,
  }),
  auth_identity_mutation: Object.freeze({
    id: "auth_identity_mutation",
    rank: 4,
    label: "Auth or provider identity mutation",
    granted: false,
    requiresOwnerApproval: true,
  }),
});

const BOUNDARY_IMPLICATIONS = Object.freeze([
  {
    boundary: "production_schema_write",
    // Not just `migrations/`: `roles.sql` and `config.toml` are provider state
    // that likewise only takes effect once someone applies it.
    test: (file) =>
      file.startsWith("supabase/migrations/") ||
      /^supabase\/(?:roles\.sql|seed\.sql|config\.toml)$/.test(file),
    why: "a new or edited migration, role grant or project setting only takes effect once someone applies it to production",
  },
  {
    boundary: "tenant_ledger_mutation",
    /**
     * Does this migration define a path that writes or removes tenant rows?
     *
     * Filename stems are a floor, not a ceiling. `harden_tenant_deletion`
     * contains "delet" but not "delete", and a neutrally-named migration can
     * still carry a `delete from`, so the SQL body is read when a reader is
     * available and the stems only catch what a path alone can.
     */
    test: (file, body) =>
      (file.startsWith("supabase/migrations/") &&
        /(?:purge|delet|restore|truncate|cascade|drop_)/i.test(file)) ||
      (typeof body === "string" &&
        /\b(?:delete\s+from|truncate\s+table|truncate\s+public\.)/i.test(body)),
    why: "the migration defines a path that writes or removes tenant rows",
  },
  {
    boundary: "auth_identity_mutation",
    // The whole Edge deployment unit, not one directory: `delete-account`
    // imports its recent-auth guard from `_shared/`, and that helper is what
    // decides whether a caller may destroy an Auth identity.
    test: (file) => file.startsWith("supabase/functions/"),
    why: "the deployed Edge function and its shared helpers act on Auth identities",
  },
  {
    boundary: "provider_read",
    test: (file) => file.startsWith(".github/"),
    why: "verifying the effect needs provider-side check identities or ruleset state read back",
  },
]);

/**
 * Which boundaries this diff *implies* — and for what.
 *
 * The distinction the model must not blur: editing a migration is a repository
 * change requiring no approval at all. *Deploying* it is a production write
 * requiring an explicit scoped one. So the implied boundary is reported against
 * a future deployment step, and `requiredForThisDiff` stays `none` for any diff
 * that only changes files.
 */
export function deriveApprovalBoundary(files = [], { readFile } = {}) {
  const implied = new Map();
  for (const file of files) {
    // Read lazily and only for the files a body rule could apply to: the pure
    // default stays path-only so this function remains testable without a disk.
    let body;
    const bodyOf = () => {
      if (body === undefined) {
        body = readFile && file.startsWith("supabase/migrations/") ? (readFile(file) ?? null) : null;
      }
      return body;
    };
    for (const rule of BOUNDARY_IMPLICATIONS) {
      if (rule.test(file, bodyOf())) {
        if (!implied.has(rule.boundary)) implied.set(rule.boundary, { ...APPROVAL_BOUNDARIES[rule.boundary], why: rule.why });
      }
    }
  }
  const boundaries = [...implied.values()].sort((a, b) => a.rank - b.rank);
  const needsApproval = boundaries.filter((entry) => entry.requiresOwnerApproval);
  return {
    vocabulary: Object.keys(APPROVAL_BOUNDARIES),
    requiredForThisDiff: APPROVAL_BOUNDARIES.none.id,
    impliedForDeployment: boundaries.map((entry) => ({
      boundary: entry.id,
      label: entry.label,
      requiresOwnerApproval: entry.requiresOwnerApproval,
      why: entry.why,
    })),
    ownerApprovalRequiredBeforeDeployment: needsApproval.length > 0,
    highestImpliedBoundary: boundaries.at(-1)?.id ?? APPROVAL_BOUNDARIES.none.id,
    // Never derived, never inferred from a green gate, never set by this tool.
    granted: false,
    grantedBy: null,
    grantedScope: null,
    note:
      "This tool models boundaries and grants none. An approval is one named action approved by the owner; it does not extend to the next action, and no local or provider check can substitute for it.",
  };
}

// --- Evidence ----------------------------------------------------------------

export const EVIDENCE_TYPES = Object.freeze({
  local_gates: "the selected local commands pass on the working tree",
  provider_exact_head: "the required provider checks are green on the exact PR head",
  pgtap_database: "pgTAP ran the migrations against a real PostgreSQL",
  browser_evidence: "the affected flows were exercised in a browser",
  responsive_evidence: "cross-device or cross-browser audit evidence exists",
  pr_memory_record: "docs/research/pr-memory/YYYY/QN/PR-<number>.md exists and is truthful",
  work_packet: "a full packet under docs/plans/active/ owns state, risk and rollback",
  owner_approval_record: "the owner's explicit scoped approval is recorded before the write",
  production_read_back: "the affected production behavior was verified after merge",
});

export function deriveEvidenceRequirements(classification, riskClass, approval) {
  const required = ["local_gates", "provider_exact_head", "pr_memory_record"];
  if (classification.database) required.push("pgtap_database");
  if (classification.browserSmoke) required.push("browser_evidence");
  if (classification.uiAudit) required.push("responsive_evidence");
  if (riskClass.class === 3) required.push("work_packet");
  if (approval.ownerApprovalRequiredBeforeDeployment) {
    required.push("owner_approval_record", "production_read_back");
  }
  return required.map((id) => ({ id, means: EVIDENCE_TYPES[id] }));
}

// --- The one decision object -------------------------------------------------

/**
 * Everything tooling needs, derived once from the changed paths.
 *
 * `completion` is deliberately part of the answer. A harness that reports local
 * green with no statement about what local green does *not* prove is the exact
 * failure this repository already documents: a build does not prove RLS, and a
 * passing working tree is not a merged, provider-verified pull request.
 */
export function buildPolicyDecision(files, { forceFull = false, readFile } = {}) {
  const classification = classifyChanges(files, { forceFull });
  const riskClass = deriveRiskClass(classification, { files: classification.files });
  const approval = deriveApprovalBoundary(classification.files, { readFile });
  return deepFreeze({
    policySchemaVersion: POLICY_SCHEMA_VERSION,
    policySources: POLICY_SOURCES,
    classification,
    riskClass,
    localGatePlan: buildGatePlan(classification),
    requiredCapabilities: requiredCapabilities(classification),
    providerChecks: PROVIDER_CHECK_CONTEXTS.map((entry) => ({ ...entry })),
    approval,
    evidenceRequired: deriveEvidenceRequirements(classification, riskClass, approval),
    completion: Object.freeze({
      localGreenIsCompletion: false,
      statement:
        "Local gates green means the selected local evidence passed. It is not a merged pull request: the required provider checks must be green on the exact head, review findings resolved, and the PR memory record written. Merging and deployment remain owner decisions.",
    }),
  });
}
