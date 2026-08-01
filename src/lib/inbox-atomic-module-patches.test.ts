import { execFileSync } from "node:child_process";
import test from "node:test";

test("emit reviewed atomic module patches", () => {
  try {
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "scripts/emit-inbox-atomic-module-patches.ts"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    const output = error as { stdout?: string; stderr?: string };
    if (output.stdout) process.stdout.write(output.stdout);
    if (output.stderr) process.stderr.write(output.stderr);
    throw error;
  }
});
