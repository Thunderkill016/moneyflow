import assert from "node:assert/strict";
import test from "node:test";
import { validateDesignEvaluation } from "./design-evaluation.mjs";

function validEvaluation() {
  return {
    schemaVersion: 2,
    task: "Refine MoneyFlow dashboard hierarchy",
    generatedBy: "generator-session-1",
    evaluatedBy: "evaluator-session-2",
    routes: ["/dashboard"],
    viewports: ["phone", "desktop"],
    interactions: [{ name: "Open primary capture action", result: "pass" }],
    scores: {
      designQuality: 8,
      originality: 7,
      craft: 8,
      functionality: 9,
    },
    gates: {
      responsive: true,
      accessibility: true,
      financialSemantics: true,
      moneyflowConsistency: true,
    },
    evidence: [
      "output/design-harness/screenshots/dashboard-phone.png",
      "output/design-harness/screenshots/dashboard-desktop.png",
    ],
    findings: [],
    decision: "pass",
    verdict: "pass",
  };
}

test("accepts a complete independent evaluation", () => {
  assert.deepEqual(validateDesignEvaluation(validEvaluation()), []);
});

test("rejects self-evaluation", () => {
  const evaluation = validEvaluation();
  evaluation.evaluatedBy = evaluation.generatedBy;
  assert.match(validateDesignEvaluation(evaluation).join("\n"), /different sessions\/agents/u);
});

test("rejects scores below threshold", () => {
  const evaluation = validEvaluation();
  evaluation.scores.craft = 6;
  assert.match(validateDesignEvaluation(evaluation).join("\n"), /scores\.craft must be >= 8/u);
});

test("rejects missing interaction evidence", () => {
  const evaluation = validEvaluation();
  evaluation.interactions = [];
  assert.match(validateDesignEvaluation(evaluation).join("\n"), /at least one exercised behavior/u);
});

test("rejects unresolved blocking findings", () => {
  const evaluation = validEvaluation();
  evaluation.findings = [{ severity: "blocking", detail: "Primary CTA clipped" }];
  assert.match(validateDesignEvaluation(evaluation).join("\n"), /blocking and must be resolved/u);
});
