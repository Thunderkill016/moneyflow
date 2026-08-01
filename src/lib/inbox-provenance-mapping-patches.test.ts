import { execFileSync } from "node:child_process";
import test from "node:test";

test("emit reviewed Inbox provenance mapping patches", () => {
  try {
    execFileSync(
      process.execPath,
      ["scripts/emit-inbox-provenance-mapping-patches.mjs"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    const output = error as { stdout?: string; stderr?: string };
    if (output.stdout) process.stdout.write(output.stdout);
    if (output.stderr) process.stderr.write(output.stderr);
    throw error;
  }
});