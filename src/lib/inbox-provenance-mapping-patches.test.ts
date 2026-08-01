import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

test("emit reviewed Inbox provenance mapping patches", () => {
  try {
    execFileSync(
      process.execPath,
      ["--experimental-strip-types", "--input-type=module"],
      {
        input: readFileSync("scripts/emit-inbox-provenance-mapping-patches.cts", "utf8"),
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch (error) {
    const output = error as { stdout?: string; stderr?: string };
    if (output.stdout) process.stdout.write(output.stdout);
    if (output.stderr) process.stderr.write(output.stderr);
    throw error;
  }
});