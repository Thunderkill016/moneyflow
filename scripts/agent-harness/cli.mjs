#!/usr/bin/env node

import process from "node:process";
import { pathToFileURL } from "node:url";

import { HarnessContext } from "./context.mjs";
import { defaultHarnessPlugin } from "./providers.mjs";
import {
  DEFAULT_HARNESS_STATE_DIR,
  runHarnessCycle,
} from "./runtime.mjs";

const DEFAULT_POLL_SECONDS = 30;

function fail(message) {
  throw new Error(message);
}

export function parseHarnessArgs(argv) {
  const options = {
    mode: null,
    repo: null,
    stateDir: DEFAULT_HARNESS_STATE_DIR,
    pollSeconds: DEFAULT_POLL_SECONDS,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--once" || value === "--watch") {
      if (options.mode) fail("Choose exactly one of --once or --watch");
      options.mode = value.slice(2);
      continue;
    }
    if (["--repo", "--state-dir", "--poll-seconds"].includes(value)) {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) fail(`${value} requires a value`);
      if (value === "--repo") options.repo = next;
      if (value === "--state-dir") options.stateDir = next;
      if (value === "--poll-seconds") {
        const parsed = Number(next);
        if (!Number.isInteger(parsed) || parsed < 1) fail("--poll-seconds must be a positive integer");
        options.pollSeconds = parsed;
      }
      index += 1;
      continue;
    }
    fail(`Unknown option: ${value}`);
  }
  if (!options.mode) fail("Choose exactly one of --once or --watch");
  return Object.freeze(options);
}

function delay(milliseconds, signal) {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export async function createDefaultHarness(config = {}) {
  const ctx = new HarnessContext();
  await ctx.use(defaultHarnessPlugin, config);
  return ctx;
}

function printCycle(result) {
  if (result.status === "blocked") {
    console.error(`Agent harness blocked: ${result.reason}`);
    return;
  }
  console.log(`Agent harness processed ${result.processed} command(s).`);
  if ((result.skippedSources?.length ?? 0) > 0) {
    console.error(`Agent harness skipped ${result.skippedSources.length} unreadable source(s).`);
  }
}

export async function main(
  argv = process.argv.slice(2),
  { ctx: suppliedContext = null, signal = undefined, harnessConfig = {} } = {},
) {
  let options;
  try {
    options = parseHarnessArgs(argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "invalid harness arguments");
    return 2;
  }

  const ownedContext = suppliedContext === null;
  const ctx = suppliedContext ?? (await createDefaultHarness(harnessConfig));
  try {
    if (options.mode === "once") {
      const result = await runHarnessCycle({
        ctx,
        requestedRepo: options.repo,
        stateDir: options.stateDir,
        signal,
      });
      printCycle(result);
      return result.status === "blocked" ? 2 : 0;
    }

    while (!signal?.aborted) {
      const result = await runHarnessCycle({
        ctx,
        requestedRepo: options.repo,
        stateDir: options.stateDir,
        signal,
      });
      printCycle(result);
      if (signal?.aborted) break;
      await delay(options.pollSeconds * 1000, signal);
    }
    return 0;
  } finally {
    if (ownedContext) await ctx.dispose();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once("SIGINT", abort);
  process.once("SIGTERM", abort);
  process.exitCode = await main(process.argv.slice(2), { signal: controller.signal });
}
