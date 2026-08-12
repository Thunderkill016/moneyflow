export const DESIGN_SCORE_THRESHOLDS = Object.freeze({
  designQuality: 8,
  originality: 7,
  craft: 8,
  functionality: 9,
});

export const REQUIRED_DESIGN_GATES = Object.freeze([
  "responsive",
  "accessibility",
  "financialSemantics",
  "moneyflowConsistency",
]);

const REQUIRED_VIEWPORTS = Object.freeze(["phone", "desktop"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function validateDesignEvaluation(evaluation) {
  const errors = [];

  if (!evaluation || typeof evaluation !== "object" || Array.isArray(evaluation)) {
    return ["evaluation must be a JSON object"];
  }

  if (evaluation.schemaVersion !== 2) {
    errors.push("schemaVersion must be 2");
  }

  if (!isNonEmptyString(evaluation.task)) {
    errors.push("task must be a non-empty string");
  }

  if (!isNonEmptyString(evaluation.generatedBy)) {
    errors.push("generatedBy must identify the generator session/agent");
  }

  if (!isNonEmptyString(evaluation.evaluatedBy)) {
    errors.push("evaluatedBy must identify the evaluator session/agent");
  }

  if (
    isNonEmptyString(evaluation.generatedBy) &&
    isNonEmptyString(evaluation.evaluatedBy) &&
    evaluation.generatedBy.trim() === evaluation.evaluatedBy.trim()
  ) {
    errors.push("generator and evaluator must be different sessions/agents");
  }

  const routes = asArray(evaluation.routes);
  if (routes.length === 0 || routes.some((route) => !isNonEmptyString(route))) {
    errors.push("routes must contain at least one route string");
  }

  const viewports = new Set(asArray(evaluation.viewports));
  for (const viewport of REQUIRED_VIEWPORTS) {
    if (!viewports.has(viewport)) {
      errors.push(`viewports must include ${viewport}`);
    }
  }

  const interactions = asArray(evaluation.interactions);
  if (interactions.length === 0) {
    errors.push("interactions must contain at least one exercised behavior");
  }
  for (const [index, interaction] of interactions.entries()) {
    if (!interaction || typeof interaction !== "object") {
      errors.push(`interactions[${index}] must be an object`);
      continue;
    }
    if (!isNonEmptyString(interaction.name)) {
      errors.push(`interactions[${index}].name must be non-empty`);
    }
    if (interaction.result !== "pass") {
      errors.push(`interactions[${index}] must pass`);
    }
  }

  const scores = evaluation.scores ?? {};
  for (const [criterion, threshold] of Object.entries(DESIGN_SCORE_THRESHOLDS)) {
    const score = scores[criterion];
    if (typeof score !== "number" || Number.isNaN(score) || score < 0 || score > 10) {
      errors.push(`scores.${criterion} must be a number from 0 to 10`);
      continue;
    }
    if (score < threshold) {
      errors.push(`scores.${criterion} must be >= ${threshold}; received ${score}`);
    }
  }

  const gates = evaluation.gates ?? {};
  for (const gate of REQUIRED_DESIGN_GATES) {
    if (gates[gate] !== true) {
      errors.push(`gates.${gate} must be true`);
    }
  }

  const evidence = asArray(evaluation.evidence);
  if (evidence.length < 2 || evidence.some((item) => !isNonEmptyString(item))) {
    errors.push("evidence must contain at least two artifact references (phone and desktop)");
  }

  const findings = asArray(evaluation.findings);
  for (const [index, finding] of findings.entries()) {
    if (!finding || typeof finding !== "object") {
      errors.push(`findings[${index}] must be an object`);
      continue;
    }
    if (finding.severity === "blocking" || finding.severity === "P1") {
      errors.push(`findings[${index}] is blocking and must be resolved before pass`);
    }
  }

  if (evaluation.decision !== "pass") {
    errors.push("decision must be pass (use refine or pivot while iteration is still required)");
  }

  if (evaluation.verdict !== "pass") {
    errors.push("verdict must be pass");
  }

  return errors;
}
