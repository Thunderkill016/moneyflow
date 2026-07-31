import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
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

function wrappedBase64(path: string): string {
  const encoded = readFileSync(path).toString("base64");
  return encoded.match(/.{1,120}/g)?.join("\n") ?? encoded;
}

test("temporary patched lockfile generation probe", () => {
  const packageJsonPath = "package.json";
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    devDependencies: Record<string, string>;
  };
  packageJson.devDependencies.eslint = "^9.39.4";
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  execFileSync(
    "npm",
    [
      "install",
      "--package-lock-only",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );

  const all = summarize(runAudit([]));
  const production = summarize(runAudit(["--omit=dev"]));

  assert.fail(
    [
      "PATCHED_LOCKFILE_PROBE",
      JSON.stringify({ all, production }, null, 2),
      "PACKAGE_JSON_BASE64_BEGIN",
      wrappedBase64("package.json"),
      "PACKAGE_JSON_BASE64_END",
      "PACKAGE_LOCK_BASE64_BEGIN",
      wrappedBase64("package-lock.json"),
      "PACKAGE_LOCK_BASE64_END",
    ].join("\n"),
  );
});
