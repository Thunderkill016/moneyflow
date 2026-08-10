/**
 * TASK-118 — Static RLS surface checks on Supabase migrations.
 * No Docker / no live prod: parses SQL files under supabase/migrations/.
 * Full runtime suite: npm run test:db (see docs/security-rls-check.md).
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const MIGRATIONS_DIR = join(process.cwd(), "supabase/migrations");

const REQUIRED_TABLES = [
  "profiles",
  "accounts",
  "categories",
  "financial_transactions",
  "transaction_entries",
  "monthly_budgets",
  "recurring_commitments",
  "commitment_occurrences",
  "recurring_income_templates",
  "income_template_occurrences",
  "savings_goals",
  "savings_goal_allocations",
  "import_batches",
  "inbox_candidates",
] as const;

function loadMigrationsSql(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  assert.ok(files.length > 0, "expected at least one migration file");
  return files
    .map((f) => readFileSync(join(MIGRATIONS_DIR, f), "utf8"))
    .join("\n");
}

function normalize(sql: string): string {
  return sql.toLowerCase();
}

function blankChar(char: string): string {
  return char === "\n" || char === "\r" ? char : " ";
}

/**
 * Return only lexically executable SQL for the lightweight SECURITY DEFINER
 * scan. Lex raw PostgreSQL text before case-folding so case-sensitive
 * dollar-quote tags keep their exact delimiter semantics. Comments, string
 * constants, quoted identifiers and dollar-quoted bodies are blanked while
 * preserving line structure. Block comments may nest.
 *
 * This is deliberately a narrow lexer, not a SQL parser. Its only job is to
 * prevent prose/literal contents from creating or hiding SECURITY DEFINER
 * tokens in the static scan.
 */
function executableSqlForStaticScan(sql: string): string {
  let output = "";
  let i = 0;
  let state:
    | "normal"
    | "line_comment"
    | "block_comment"
    | "single_quote"
    | "double_quote"
    | "dollar_quote" = "normal";
  let blockDepth = 0;
  let dollarDelimiter = "";
  let escapeString = false;

  while (i < sql.length) {
    const char = sql[i];
    const next = sql[i + 1] ?? "";

    if (state === "normal") {
      if (char === "-" && next === "-") {
        output += "  ";
        i += 2;
        state = "line_comment";
        continue;
      }
      if (char === "/" && next === "*") {
        output += "  ";
        i += 2;
        state = "block_comment";
        blockDepth = 1;
        continue;
      }
      if (char === "'") {
        const prefix = sql[i - 1] ?? "";
        const beforePrefix = sql[i - 2] ?? "";
        escapeString =
          (prefix === "e" || prefix === "E") &&
          (i < 2 || !/[a-zA-Z0-9_$]/.test(beforePrefix));
        output += " ";
        i += 1;
        state = "single_quote";
        continue;
      }
      if (char === '"') {
        output += " ";
        i += 1;
        state = "double_quote";
        continue;
      }
      if (char === "$") {
        const match = sql
          .slice(i)
          .match(/^(?:\$\$|\$[A-Za-z_][A-Za-z0-9_]*\$)/);
        if (match) {
          dollarDelimiter = match[0];
          output += " ".repeat(dollarDelimiter.length);
          i += dollarDelimiter.length;
          state = "dollar_quote";
          continue;
        }
      }

      output += char;
      i += 1;
      continue;
    }

    if (state === "line_comment") {
      output += blankChar(char);
      i += 1;
      if (char === "\n" || char === "\r") state = "normal";
      continue;
    }

    if (state === "block_comment") {
      if (char === "/" && next === "*") {
        output += "  ";
        i += 2;
        blockDepth += 1;
        continue;
      }
      if (char === "*" && next === "/") {
        output += "  ";
        i += 2;
        blockDepth -= 1;
        if (blockDepth === 0) state = "normal";
        continue;
      }
      output += blankChar(char);
      i += 1;
      continue;
    }

    if (state === "single_quote") {
      if (char === "'" && next === "'") {
        output += "  ";
        i += 2;
        continue;
      }
      if (escapeString && char === "\\" && next) {
        output += `${blankChar(char)}${blankChar(next)}`;
        i += 2;
        continue;
      }
      output += blankChar(char);
      i += 1;
      if (char === "'") {
        state = "normal";
        escapeString = false;
      }
      continue;
    }

    if (state === "double_quote") {
      if (char === '"' && next === '"') {
        output += "  ";
        i += 2;
        continue;
      }
      output += blankChar(char);
      i += 1;
      if (char === '"') state = "normal";
      continue;
    }

    if (state === "dollar_quote") {
      if (sql.startsWith(dollarDelimiter, i)) {
        output += " ".repeat(dollarDelimiter.length);
        i += dollarDelimiter.length;
        state = "normal";
        dollarDelimiter = "";
        continue;
      }
      output += blankChar(char);
      i += 1;
    }
  }

  return output;
}

function publicTables(sqlLc: string): string[] {
  const found = new Set<string>();
  const re = /create\s+table\s+public\.([a-z0-9_]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sqlLc)) !== null) {
    found.add(m[1]);
  }
  return [...found].sort();
}

function hasRlsEnabled(sqlLc: string, table: string): boolean {
  const re = new RegExp(
    `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
  );
  return re.test(sqlLc);
}

function hasPolicyOn(sqlLc: string, table: string): boolean {
  const flat = sqlLc.replace(/\s+/g, " ");
  const re = new RegExp(
    `create\\s+policy\\s+[^;]+?\\s+on\\s+public\\.${table}\\b`,
  );
  return re.test(flat);
}

function securityDefinerWindows(sql: string): string[] {
  const executable = executableSqlForStaticScan(sql);
  const flat = normalize(executable).replace(/\s+/g, " ");
  const parts = flat.split("security definer");
  return parts.slice(1).map((chunk) => chunk.slice(0, 160));
}

test("rls migrations: SECURITY DEFINER scanner ignores SQL comments", () => {
  const sql = `
    -- Financial writes remain SECURITY DEFINER owned.
    /* outer SECURITY DEFINER comment
       /* nested SECURITY DEFINER comment */
    */
    create function public.real_rpc()
    returns void
    language plpgsql
    security definer
    set search_path = ''
    as $$ begin null; end; $$;
  `;
  const windows = securityDefinerWindows(sql);
  assert.equal(windows.length, 1);
  assert.ok(windows[0].includes("set search_path"));
});

test("rls migrations: comment markers inside SQL strings do not hide executable declarations", () => {
  const sql = `
    select '-- literal, not a comment';
    select '/* literal, not a comment */';
    select E'escaped quote: \\' -- still literal';
    create function public.real_rpc()
    returns void
    language plpgsql
    security definer
    set search_path = ''
    as $$ begin null; end; $$;
  `;
  const windows = securityDefinerWindows(sql);
  assert.equal(windows.length, 1);
  assert.ok(windows[0].includes("set search_path"));
});

test("rls migrations: dollar-quoted bodies cannot manufacture SECURITY DEFINER matches", () => {
  const sql = `
    create function public.real_rpc()
    returns void
    language plpgsql
    security definer
    set search_path = ''
    as $function$
    begin
      perform '-- SECURITY DEFINER in body';
      perform '/* SECURITY DEFINER in body */';
    end;
    $function$;
  `;
  const windows = securityDefinerWindows(sql);
  assert.equal(windows.length, 1);
  assert.ok(windows[0].includes("set search_path"));
});

test("rls migrations: mixed-case dollar tags remain case-sensitive before keyword folding", () => {
  const sql = `
    create function public.body_only()
    returns void
    language plpgsql
    as $TAG$
    begin
      perform '$tag$';
    end;
    $TAG$;

    create function public.real_rpc()
    returns void
    language plpgsql
    security definer
    set search_path = ''
    as $$ begin null; end; $$;
  `;
  const windows = securityDefinerWindows(sql);
  assert.equal(windows.length, 1);
  assert.ok(windows[0].includes("set search_path"));
});

test("rls migrations: every public table enables RLS", () => {
  const sqlLc = normalize(loadMigrationsSql());
  const tables = publicTables(sqlLc);
  assert.ok(tables.length >= REQUIRED_TABLES.length, "expected core tables");

  for (const table of tables) {
    assert.ok(
      hasRlsEnabled(sqlLc, table),
      `public.${table} must ENABLE ROW LEVEL SECURITY`,
    );
  }
});

test("rls migrations: every public table has at least one policy", () => {
  const sqlLc = normalize(loadMigrationsSql());
  for (const table of publicTables(sqlLc)) {
    assert.ok(
      hasPolicyOn(sqlLc, table),
      `public.${table} must have CREATE POLICY … ON public.${table}`,
    );
  }
});

test("rls migrations: required user-owned tables present", () => {
  const sqlLc = normalize(loadMigrationsSql());
  const tables = new Set(publicTables(sqlLc));
  for (const table of REQUIRED_TABLES) {
    assert.ok(tables.has(table), `missing required table public.${table}`);
  }
});

test("rls migrations: SECURITY DEFINER sets search_path", () => {
  const windows = securityDefinerWindows(loadMigrationsSql());
  assert.ok(windows.length > 0, "expected at least one SECURITY DEFINER RPC");
  for (const [i, window] of windows.entries()) {
    assert.ok(
      window.includes("set search_path"),
      `SECURITY DEFINER #${i + 1} must set search_path nearby`,
    );
  }
});

test("rls migrations: ledger is select-policy oriented (no direct DML policies)", () => {
  const sqlLc = normalize(loadMigrationsSql());
  const flat = sqlLc.replace(/\s+/g, " ");
  assert.match(
    flat,
    /create policy "transactions_select_own" on public\.financial_transactions/,
  );
  assert.doesNotMatch(
    flat,
    /create policy "[^"]+" on public\.financial_transactions for insert/,
  );
  assert.doesNotMatch(
    flat,
    /create policy "[^"]+" on public\.transaction_entries for insert/,
  );
});
