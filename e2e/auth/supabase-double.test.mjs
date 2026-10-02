import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createInterface } from "node:readline";
import test from "node:test";

test("read-only fixtures reject writes and unknown financial RPCs", async (t) => {
  const child = spawn(
    process.execPath,
    [new URL("./supabase-double.mjs", import.meta.url).pathname],
    {
      env: { ...process.env, SUPABASE_DOUBLE_PORT: "0" },
      stdio: ["ignore", "pipe", "inherit"],
    },
  );
  t.after(async () => {
    const exited = once(child, "exit");
    child.kill();
    await exited;
  });
  const lines = createInterface({ input: child.stdout });
  const [line] = await once(lines, "line");
  lines.close();
  const base = line.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
  assert.ok(
    base,
    "double must announce its dynamically allocated loopback port",
  );
  const candidate = { id: "synthetic-candidate", amount_minor: 45000 };
  await fetch(`${base}/__control/seed`, {
    method: "POST",
    body: JSON.stringify({ inbox_candidates: [candidate] }),
  });
  for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
    const response = await fetch(`${base}/rest/v1/inbox_candidates`, {
      method,
    });
    assert.equal(
      response.status,
      501,
      `${method} must never simulate persistence`,
    );
  }
  const rpc = await fetch(`${base}/rest/v1/rpc/approve_inbox_candidate`, {
    method: "POST",
  });
  assert.equal(rpc.status, 501);
  const read = await fetch(`${base}/rest/v1/inbox_candidates`);
  assert.equal(read.status, 200);
  assert.deepEqual(await read.json(), [candidate]);
  const head = await fetch(`${base}/rest/v1/inbox_candidates`, {
    method: "HEAD",
  });
  assert.equal(head.status, 200);
  const report = await (await fetch(`${base}/__control/report`)).json();
  assert.equal(report.misses.length, 5);
  assert.deepEqual(report.served, [
    "/rest/v1/inbox_candidates",
    "/rest/v1/inbox_candidates",
  ]);
});
