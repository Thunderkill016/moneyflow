#!/usr/bin/env node
/**
 * Fails when a class selector in the legacy global stylesheets is rendered by
 * nothing. References come only from class-bearing product expressions, active
 * CSS Module `:global(...)` selectors, and runtime class prefixes.
 *
 * This intentionally ignores imports, routes, prose, comments and tests. Those
 * strings cannot put a class in the DOM and previously kept dead CSS green.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import ts from "typescript";

const root = process.cwd();

const STYLESHEETS = [
  "src/app/globals.css",
  "src/app/ui-refresh.css",
  "src/app/benchmark-ux.css",
  "src/app/safe-to-spend-withdrawal.css",
  "src/app/cross-device-stabilization.css",
  "src/app/ai-uiux-refresh.css",
  "src/app/ai-uiux-guardrails.css",
];

const SOURCE_DIRS = ["src"];
const SOURCE_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".mjs", ".html"]);
const CLASS_BUILDERS = new Set(["clsx", "cn", "classnames", "classNames", "cva", "twMerge"]);

function normalized(path) {
  return path.replaceAll("\\", "/");
}

function isTest(path) {
  const value = normalized(path);
  return (
    /\.(?:test|spec)\.[jt]sx?$/.test(value) ||
    /(?:^|\/)(?:__tests__|e2e)(?:\/|$)/.test(value)
  );
}

function sourceFiles() {
  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!SOURCE_EXTENSIONS.has(extname(path)) || isTest(path)) continue;
      files.push(path);
    }
  };
  for (const dir of SOURCE_DIRS) walk(join(root, dir));
  return files;
}

function addClassTokens(value, referenced) {
  for (const token of value.split(/[^\w-]+/)) {
    if (/^-?[_a-zA-Z][\w-]*$/.test(token)) referenced.add(token);
  }
}

function addRuntimePrefix(value, runtimePrefixes) {
  const tokens = value.split(/[^\w-]+/);
  const candidate = tokens.at(-1) ?? "";
  if (/^[a-zA-Z_][\w-]*-$/.test(candidate)) runtimePrefixes.add(candidate);
}

function propertyName(node) {
  if (!node) return null;
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) return node.text;
  if (ts.isStringLiteralLike(node) || ts.isNumericLiteral(node)) return node.text;
  return null;
}

function calleeName(expression) {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  return null;
}

function isClassAttribute(name) {
  return (
    name === "class" ||
    name === "className" ||
    /ClassName$/.test(name) ||
    /(?:^|[-_])class(?:name)?$/i.test(name)
  );
}

function collectBindings(sourceFile) {
  const bindings = new Map();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const entries = bindings.get(node.name.text) ?? [];
      entries.push(node.initializer);
      bindings.set(node.name.text, entries);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function unwrap(node) {
  let current = node;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current) ||
    ts.isSatisfiesExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function objectPropertyInitializer(object, name) {
  for (const property of object.properties) {
    if (ts.isPropertyAssignment(property) && propertyName(property.name) === name) {
      return property.initializer;
    }
    if (ts.isShorthandPropertyAssignment(property) && property.name.text === name) {
      return property.name;
    }
  }
  return null;
}

function collectClassExpression(
  rawNode,
  context,
  options = { objectKeysAreClasses: false },
  seen = new Set(),
) {
  if (!rawNode) return;
  const node = unwrap(rawNode);

  if (ts.isStringLiteralLike(node)) {
    addClassTokens(node.text, context.referenced);
    return;
  }

  if (ts.isTemplateExpression(node)) {
    addClassTokens(node.head.text, context.referenced);
    addRuntimePrefix(node.head.text, context.runtimePrefixes);
    for (const span of node.templateSpans) {
      collectClassExpression(span.expression, context, options, seen);
      addClassTokens(span.literal.text, context.referenced);
      if (span.literal.kind === ts.SyntaxKind.TemplateMiddle) {
        addRuntimePrefix(span.literal.text, context.runtimePrefixes);
      }
    }
    return;
  }

  if (ts.isIdentifier(node)) {
    const key = `${context.file}:${node.text}`;
    if (seen.has(key)) return;
    const initializers = context.bindings.get(node.text) ?? [];
    if (!initializers.length) return;
    const nextSeen = new Set(seen);
    nextSeen.add(key);
    for (const initializer of initializers) {
      collectClassExpression(initializer, context, options, nextSeen);
    }
    return;
  }

  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    const target = node.expression;
    const name = ts.isPropertyAccessExpression(node)
      ? node.name.text
      : node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)
        ? node.argumentExpression.text
        : null;
    if (name && ts.isIdentifier(target)) {
      for (const initializer of context.bindings.get(target.text) ?? []) {
        const value = unwrap(initializer);
        if (ts.isObjectLiteralExpression(value)) {
          collectClassExpression(objectPropertyInitializer(value, name), context, options, seen);
        }
      }
    }
    return;
  }

  if (ts.isConditionalExpression(node)) {
    collectClassExpression(node.whenTrue, context, options, seen);
    collectClassExpression(node.whenFalse, context, options, seen);
    return;
  }

  if (ts.isBinaryExpression(node)) {
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      collectClassExpression(node.left, context, options, seen);
      collectClassExpression(node.right, context, options, seen);
    }
    return;
  }

  if (ts.isArrayLiteralExpression(node)) {
    for (const element of node.elements) {
      if (ts.isSpreadElement(element)) {
        collectClassExpression(element.expression, context, options, seen);
      } else {
        collectClassExpression(element, context, options, seen);
      }
    }
    return;
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        collectClassExpression(property.expression, context, options, seen);
        continue;
      }
      if (ts.isShorthandPropertyAssignment(property)) {
        if (options.objectKeysAreClasses) addClassTokens(property.name.text, context.referenced);
        continue;
      }
      if (!ts.isPropertyAssignment(property)) continue;
      if (options.objectKeysAreClasses) {
        const name = propertyName(property.name);
        if (name) addClassTokens(name, context.referenced);
      } else {
        collectClassExpression(property.initializer, context, options, seen);
      }
    }
    return;
  }

  if (ts.isCallExpression(node)) {
    const name = calleeName(node.expression);
    if (name && CLASS_BUILDERS.has(name)) {
      const objectKeysAreClasses = name === "clsx" || name === "cn" || name === "classnames" || name === "classNames";
      for (const argument of node.arguments) {
        collectClassExpression(argument, context, { objectKeysAreClasses }, seen);
      }
      return;
    }
    if (ts.isIdentifier(node.expression)) {
      for (const initializer of context.bindings.get(node.expression.text) ?? []) {
        collectClassExpression(initializer, context, options, seen);
      }
    }
  }
}

function collectHtmlClasses(source, referenced) {
  const withoutComments = source.replace(/<!--[\s\S]*?-->/g, " ");
  for (const pattern of [/\bclass\s*=\s*"([^"]*)"/gi, /\bclass\s*=\s*'([^']*)'/gi]) {
    for (const match of withoutComments.matchAll(pattern)) addClassTokens(match[1], referenced);
  }
}

function collectSourceReferences(file, referenced, runtimePrefixes) {
  const source = readFileSync(file, "utf8");
  if (extname(file) === ".html") {
    collectHtmlClasses(source, referenced);
    return;
  }

  const extension = extname(file);
  const kind = extension === ".tsx"
    ? ts.ScriptKind.TSX
    : extension === ".jsx"
      ? ts.ScriptKind.JSX
      : extension === ".js" || extension === ".mjs"
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const context = {
    file,
    bindings: collectBindings(sourceFile),
    referenced,
    runtimePrefixes,
  };

  const visit = (node) => {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sourceFile);
      if (isClassAttribute(name)) {
        if (node.initializer && ts.isStringLiteral(node.initializer)) {
          addClassTokens(node.initializer.text, referenced);
        } else if (node.initializer && ts.isJsxExpression(node.initializer)) {
          collectClassExpression(node.initializer.expression, context);
        }
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      (ts.isPropertyAccessExpression(node.left) || ts.isElementAccessExpression(node.left))
    ) {
      const name = ts.isPropertyAccessExpression(node.left)
        ? node.left.name.text
        : node.left.argumentExpression && ts.isStringLiteralLike(node.left.argumentExpression)
          ? node.left.argumentExpression.text
          : null;
      if (name === "class" || name === "className") {
        collectClassExpression(node.right, context);
      }
    }

    if (ts.isCallExpression(node)) {
      if (ts.isPropertyAccessExpression(node.expression)) {
        const method = node.expression.name.text;
        const owner = node.expression.expression;
        if (
          ts.isPropertyAccessExpression(owner) &&
          owner.name.text === "classList" &&
          ["add", "remove", "toggle", "replace"].includes(method)
        ) {
          for (const argument of node.arguments) collectClassExpression(argument, context);
        }
        if (method === "setAttribute" && node.arguments.length >= 2) {
          const attribute = node.arguments[0];
          if (ts.isStringLiteralLike(attribute) && (attribute.text === "class" || attribute.text === "className")) {
            collectClassExpression(node.arguments[1], context);
          }
        }
      }

      const name = calleeName(node.expression);
      if (name === "createElement" && node.arguments[1] && ts.isObjectLiteralExpression(unwrap(node.arguments[1]))) {
        const props = unwrap(node.arguments[1]);
        for (const property of props.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const key = propertyName(property.name);
          if (key && isClassAttribute(key)) collectClassExpression(property.initializer, context);
        }
      }
    }

    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function stripCssComments(source) {
  let output = "";
  let quote = null;
  let escaped = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    const next = source[i + 1];
    if (quote) {
      output += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      continue;
    }
    if (char === "/" && next === "*") {
      output += "  ";
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) {
        output += source[i] === "\n" ? "\n" : " ";
        i += 1;
      }
      output += " ";
      continue;
    }
    output += char;
  }
  return output;
}

function selectorClassNames(selector) {
  const names = new Set();
  let quote = null;
  let escaped = false;
  let bracketDepth = 0;
  for (let i = 0; i < selector.length; i += 1) {
    const char = selector[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "[") {
      bracketDepth += 1;
      continue;
    }
    if (char === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }
    if (char !== "." || bracketDepth > 0) continue;
    const match = selector.slice(i + 1).match(/^(-?[_a-zA-Z][\w-]*)/);
    if (!match) continue;
    names.add(match[1]);
    i += match[1].length;
  }
  return names;
}

function classSelectors(css) {
  const source = stripCssComments(css);
  const names = new Set();
  const stack = [];
  let buffer = "";
  let quote = null;
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      buffer += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
      continue;
    }
    if (char === "(") parentheses += 1;
    if (char === ")") parentheses = Math.max(0, parentheses - 1);
    if (char === "[") brackets += 1;
    if (char === "]") brackets = Math.max(0, brackets - 1);

    if (parentheses > 0 || brackets > 0) {
      buffer += char;
      continue;
    }

    if (char === "{") {
      const prelude = buffer.trim();
      buffer = "";
      if (prelude.startsWith("@")) {
        const atName = prelude.match(/^@([\w-]+)/)?.[1] ?? "";
        if (atName === "scope") {
          for (const name of selectorClassNames(prelude)) names.add(name);
        }
        stack.push(atName);
      } else {
        for (const name of selectorClassNames(prelude)) names.add(name);
        stack.push("style");
      }
      continue;
    }
    if (char === "}") {
      stack.pop();
      buffer = "";
      continue;
    }
    if (char === ";") {
      buffer = "";
      continue;
    }
    buffer += char;
  }
  return names;
}

function globalClassSelectors(css) {
  const source = stripCssComments(css);
  const names = new Set();
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf(":global(", cursor);
    if (start < 0) break;
    let depth = 1;
    let quote = null;
    let escaped = false;
    let end = start + 8;
    for (; end < source.length && depth > 0; end += 1) {
      const char = source[end];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
    }
    if (depth !== 0) break;
    const argument = source.slice(start + 8, end - 1);
    for (const name of selectorClassNames(argument)) names.add(name);
    cursor = end;
  }
  return names;
}

const referenced = new Set();
const runtimePrefixes = new Set();
for (const file of sourceFiles()) collectSourceReferences(file, referenced, runtimePrefixes);

const modules = [];
const walkModules = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walkModules(path);
      continue;
    }
    if (path.endsWith(".module.css")) modules.push(path);
  }
};
walkModules(join(root, "src"));
for (const file of modules) {
  for (const name of globalClassSelectors(readFileSync(file, "utf8"))) referenced.add(name);
}

const prefixes = [...runtimePrefixes];
let total = 0;
let failed = 0;
const report = [];

for (const relativePath of STYLESHEETS) {
  let css;
  try {
    css = readFileSync(join(root, relativePath), "utf8");
  } catch {
    continue;
  }
  const names = classSelectors(css);
  const dead = [...names]
    .filter((name) => !referenced.has(name) && !prefixes.some((prefix) => name.startsWith(prefix)))
    .sort();
  total += names.size;
  failed += dead.length;
  if (dead.length) report.push({ file: relativePath, dead });
}

if (failed === 0) {
  console.log(`[check:dead-css] ${total} class selectors, all reachable from product code.`);
  process.exit(0);
}

console.error(`[check:dead-css] ${failed} class selector(s) no product code can render:\n`);
for (const entry of report) console.error(`  ${entry.file}\n    ${entry.dead.join(", ")}`);
console.error(
  "\nRemove the rule, render the class from a class-bearing expression, or keep an\n" +
  "active :global(...) dependency beside the component that owns it. Imports,\n" +
  "routes, prose, comments and tests intentionally do not count as reachability.",
);
process.exit(1);
