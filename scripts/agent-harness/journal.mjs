import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const RUN_JOURNAL_VERSION = 1;
export const TERMINAL_RUN_EVENTS = new Set(["run/completed", "run/failed"]);

export class RunJournalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "RunJournalError";
    this.code = code;
  }
}

function freezeJson(value) {
  let encoded;
  try {
    encoded = JSON.stringify(value);
  } catch {
    throw new RunJournalError("INVALID_EVENT_DATA", "run journal data must be JSON serializable");
  }
  if (encoded === undefined) {
    throw new RunJournalError("INVALID_EVENT_DATA", "run journal data must be JSON serializable");
  }
  return Object.freeze(JSON.parse(encoded));
}

export function runJournalPath(stateDir, commandId) {
  if (!/^[a-f0-9]{64}$/u.test(commandId)) {
    throw new RunJournalError("INVALID_COMMAND_ID", "run journal command id must be a SHA-256 hex string");
  }
  return join(stateDir, "runs", `${commandId}.jsonl`);
}

export function parseRunJournal(text) {
  const events = [];
  for (const [index, raw] of String(text ?? "").split(/\r?\n/u).entries()) {
    if (!raw) continue;
    let event;
    try {
      event = JSON.parse(raw);
    } catch {
      throw new RunJournalError("MALFORMED_JOURNAL", `run journal line ${index + 1} is invalid JSON`);
    }
    if (
      event?.version !== RUN_JOURNAL_VERSION ||
      event.seq !== events.length ||
      !Number.isSafeInteger(event.time) ||
      typeof event.type !== "string" ||
      !/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/u.test(event.type) ||
      event.data === undefined
    ) {
      throw new RunJournalError(
        "MALFORMED_JOURNAL",
        `run journal line ${index + 1} violates the event envelope contract`,
      );
    }
    events.push(
      Object.freeze({
        version: event.version,
        seq: event.seq,
        time: event.time,
        type: event.type,
        data: freezeJson(event.data),
      }),
    );
  }
  return Object.freeze(events);
}

export function readRunJournal(path) {
  try {
    return parseRunJournal(readFileSync(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return Object.freeze([]);
    throw error;
  }
}

export function projectRun(events) {
  if (!Array.isArray(events)) {
    throw new RunJournalError("INVALID_EVENTS", "run projection requires an event array");
  }
  if (events.length === 0) return Object.freeze({ status: "unseen", terminal: false });

  let accepted = false;
  let provider = null;
  let branch = null;
  let worktree = null;
  let exitCode = null;
  let logFile = null;
  let terminalType = null;

  for (const event of events) {
    if (event.type === "run/accepted") accepted = true;
    if (event.type === "workspace/prepared") {
      branch = event.data.branch ?? branch;
      worktree = event.data.worktree ?? worktree;
    }
    if (event.type === "agent/started") provider = event.data.provider ?? provider;
    if (event.type === "agent/settled") {
      exitCode = Number.isInteger(event.data.exitCode) ? event.data.exitCode : exitCode;
      logFile = typeof event.data.logFile === "string" ? event.data.logFile : logFile;
    }
    if (TERMINAL_RUN_EVENTS.has(event.type)) terminalType = event.type;
  }

  if (terminalType) {
    return Object.freeze({
      status: terminalType === "run/completed" ? "completed" : "failed",
      terminal: true,
      provider,
      branch,
      worktree,
      exitCode,
      logFile,
    });
  }

  return Object.freeze({
    status: accepted ? "interrupted" : "observed",
    terminal: false,
    provider,
    branch,
    worktree,
    exitCode,
    logFile,
  });
}

export class RunJournal {
  #events;
  #path;
  #clock;

  constructor({ stateDir, commandId, clock = () => Date.now() }) {
    this.#path = runJournalPath(stateDir, commandId);
    this.#clock = clock;
    this.#events = [...readRunJournal(this.#path)];
  }

  get path() {
    return this.#path;
  }

  events() {
    return Object.freeze([...this.#events]);
  }

  projection() {
    return projectRun(this.#events);
  }

  append(type, data = {}) {
    if (this.projection().terminal) {
      throw new RunJournalError("RUN_TERMINAL", "cannot append after a terminal run event");
    }
    if (typeof type !== "string" || !/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/u.test(type)) {
      throw new RunJournalError("INVALID_EVENT_TYPE", `invalid run event type: ${type}`);
    }
    const event = Object.freeze({
      version: RUN_JOURNAL_VERSION,
      seq: this.#events.length,
      time: this.#clock(),
      type,
      data: freezeJson(data),
    });
    mkdirSync(dirname(this.#path), { recursive: true, mode: 0o700 });
    appendFileSync(this.#path, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
    this.#events.push(event);
    return event;
  }
}
