import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

type AuditReport = {
  vulnerabilities?: Record<
    string,
    {
      name?: string;
      severity?: string;
      isDirect?: boolean;
      via?: unknown;
      effects?: unknown;
      range?: string;
      nodes?: string[];
      fixAvailable?: unknown;
    }
  >;
  metadata?: unknown;
};

function runAudit(args: string[]): AuditReport {
  try {
    return JSON.parse(
      execFileSync("npm", ["audit", "--json", ...args], {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
      }),
    ) as AuditReport;
  } catch (error) {
    const stdout =
      typeof error === "object" &&
      error !== null &&
      "stdout" in error &&
      typeof error.stdout === "string"
        ? error.stdout
        : "";
    if (!stdout) throw error;
    return JSON.parse(stdout) as AuditReport;
  }
}

function summarize(report: AuditReport) {
  return {
    metadata: report.metadata,
    vulnerabilities: Object.values(report.vulnerabilities ?? {})
      .filter((item) => item.severity === "high" || item.severity === "critical")
      .map((item) => ({
        name: item.name,
        severity: item.severity,
        isDirect: item.isDirect,
        via: item.via,
        effects: item.effects,
        range: item.range,
        nodes: item.nodes,
        fixAvailable: item.fixAvailable,
      })),
  };
}

test("temporary dependency audit probe", () => {
  const all = summarize(runAudit([]));
  const production = summarize(runAudit(["--omit=dev"]));

  assert.fail(
    `DEPENDENCY_AUDIT_PROBE\n${JSON.stringify({ all, production }, null, 2)}`,
  );
});
