#!/usr/bin/env node
/**
 * Fails when a class selector in the legacy global stylesheets is rendered by
 * nothing. References come only from class-bearing product expressions, active
 * CSS Module `:global(...)` selectors, and finite runtime class values that can
 * be traced through TypeScript symbols.
 *
 * Imports, routes, prose, comments and tests intentionally do not count merely
 * because they contain the same text as a CSS class.
 */
import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = process.cwd();

/**
 * This scanner is the repository's only accurate model of "which class names does
 * product code actually emit". `check-code-css-ownership.mjs` asks the inverse
 * question and needs the same answer, so the extraction is importable rather than
 * duplicated. The CLI behaviour below runs only when invoked directly.
 */
const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

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
const CLASS_CHAIN_METHODS = new Set(["concat", "filter", "flat", "flatMap", "join"]);

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

const productFiles = sourceFiles();
const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
let compilerOptions = {
  allowJs: true,
  jsx: ts.JsxEmit.Preserve,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ESNext,
};
let rootNames = productFiles;

if (configPath) {
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (!loaded.error) {
    const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, root);
    compilerOptions = parsed.options;
    rootNames = parsed.fileNames;
  }
}

const program = ts.createProgram({ rootNames, options: compilerOptions });
const checker = program.getTypeChecker();

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

function collectBindings(sourceFile) {
  const bindings = new Map();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const entries = bindings.get(node.name.text) ?? [];
      entries.push(node.initializer);
      bindings.set(node.name.text, entries);
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      const entries = bindings.get(node.name.text) ?? [];
      entries.push(node);
      bindings.set(node.name.text, entries);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

function symbolFor(node) {
  let symbol = checker.getSymbolAtLocation(node);
  if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol;
}

function declarationValues(symbol) {
  const values = [];
  for (const declaration of symbol?.declarations ?? []) {
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      values.push(declaration.initializer);
    } else if (ts.isPropertyAssignment(declaration)) {
      values.push(declaration.initializer);
    } else if (ts.isShorthandPropertyAssignment(declaration)) {
      values.push(declaration.name);
    } else if (ts.isEnumMember(declaration) && declaration.initializer) {
      values.push(declaration.initializer);
    } else if (ts.isFunctionDeclaration(declaration)) {
      values.push(declaration);
    }
  }
  return values;
}

function addLiteralTypeValues(node, referenced) {
  let type;
  try {
    type = checker.getTypeAtLocation(node);
  } catch {
    return;
  }
  const seen = new Set();
  const visit = (current) => {
    if (!current || seen.has(current.id)) return;
    seen.add(current.id);
    if (current.flags & ts.TypeFlags.StringLiteral) {
      addClassTokens(current.value, referenced);
      return;
    }
    if (current.isUnion?.()) {
      for (const member of current.types) visit(member);
    }
  };
  visit(type);
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

function collectReturnedExpressions(node, context, options, seen) {
  if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
    collectClassExpression(node.body, context, options, seen);
    return;
  }
  const body = node.body;
  if (!body || !ts.isBlock(body)) return;
  const visit = (child) => {
    if (ts.isReturnStatement(child) && child.expression) {
      collectClassExpression(child.expression, context, options, seen);
      return;
    }
    ts.forEachChild(child, visit);
  };
  visit(body);
}

function collectPropertyValues(rawNode, name, context, options, seen) {
  if (!rawNode) return;
  const node = unwrap(rawNode);
  const key = `${context.file}:property:${name}:${node.pos}:${node.end}`;
  if (seen.has(key)) return;
  const nextSeen = new Set(seen);
  nextSeen.add(key);

  if (ts.isObjectLiteralExpression(node)) {
    const direct = objectPropertyInitializer(node, name);
    if (direct) {
      collectClassExpression(direct, context, options, nextSeen);
      return;
    }
    for (const property of node.properties) {
      if (ts.isPropertyAssignment(property)) {
        collectPropertyValues(property.initializer, name, context, options, nextSeen);
      } else if (ts.isSpreadAssignment(property)) {
        collectPropertyValues(property.expression, name, context, options, nextSeen);
      }
    }
    return;
  }

  if (ts.isConditionalExpression(node)) {
    collectPropertyValues(node.whenTrue, name, context, options, nextSeen);
    collectPropertyValues(node.whenFalse, name, context, options, nextSeen);
    return;
  }

  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (
      operator === ts.SyntaxKind.QuestionQuestionToken ||
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
      collectPropertyValues(node.left, name, context, options, nextSeen);
      collectPropertyValues(node.right, name, context, options, nextSeen);
    }
    return;
  }

  if (ts.isIdentifier(node)) {
    for (const initializer of context.bindings.get(node.text) ?? []) {
      collectPropertyValues(initializer, name, context, options, nextSeen);
    }
    for (const initializer of declarationValues(symbolFor(node))) {
      collectPropertyValues(initializer, name, context, options, nextSeen);
    }
    return;
  }

  if (ts.isElementAccessExpression(node) || ts.isPropertyAccessExpression(node)) {
    const target = node.expression;
    for (const initializer of declarationValues(symbolFor(target))) {
      collectPropertyValues(initializer, name, context, options, nextSeen);
    }
    if (ts.isIdentifier(target)) {
      for (const initializer of context.bindings.get(target.text) ?? []) {
        collectPropertyValues(initializer, name, context, options, nextSeen);
      }
    }
  }
}

function collectClassExpression(
  rawNode,
  context,
  options = { objectKeysAreClasses: false },
  seen = new Set(),
) {
  if (!rawNode) return;
  const node = unwrap(rawNode);
  addLiteralTypeValues(node, context.referenced);

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
    const key = `${context.file}:binding:${node.text}`;
    if (seen.has(key)) return;
    const nextSeen = new Set(seen);
    nextSeen.add(key);
    for (const initializer of context.bindings.get(node.text) ?? []) {
      collectClassExpression(initializer, context, options, nextSeen);
    }
    for (const initializer of declarationValues(symbolFor(node))) {
      collectClassExpression(initializer, context, options, nextSeen);
    }
    return;
  }

  if (ts.isPropertyAccessExpression(node)) {
    collectPropertyValues(node.expression, node.name.text, context, options, seen);
    return;
  }

  if (ts.isElementAccessExpression(node)) {
    if (node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)) {
      collectPropertyValues(node.expression, node.argumentExpression.text, context, options, seen);
    }
    return;
  }

  if (ts.isConditionalExpression(node)) {
    collectClassExpression(node.whenTrue, context, options, seen);
    collectClassExpression(node.whenFalse, context, options, seen);
    return;
  }

  if (ts.isBinaryExpression(node)) {
    const operator = node.operatorToken.kind;
    if (
      operator === ts.SyntaxKind.PlusToken ||
      operator === ts.SyntaxKind.QuestionQuestionToken ||
      operator === ts.SyntaxKind.BarBarToken ||
      operator === ts.SyntaxKind.AmpersandAmpersandToken
    ) {
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

  if (ts.isArrowFunction(node) || ts.isFunctionExpression(node) || ts.isFunctionDeclaration(node)) {
    collectReturnedExpressions(node, context, options, seen);
    return;
  }

  if (ts.isCallExpression(node)) {
    const name = calleeName(node.expression);
    if (name && CLASS_BUILDERS.has(name)) {
      const objectKeysAreClasses =
        name === "clsx" || name === "cn" || name === "classnames" || name === "classNames";
      for (const argument of node.arguments) {
        collectClassExpression(argument, context, { objectKeysAreClasses }, seen);
      }
      return;
    }

    if (ts.isPropertyAccessExpression(node.expression) && CLASS_CHAIN_METHODS.has(node.expression.name.text)) {
      collectClassExpression(node.expression.expression, context, options, seen);
      if (node.expression.name.text === "concat") {
        for (const argument of node.arguments) collectClassExpression(argument, context, options, seen);
      }
      return;
    }

    if (ts.isIdentifier(node.expression)) {
      for (const initializer of context.bindings.get(node.expression.text) ?? []) {
        collectClassExpression(initializer, context, options, seen);
      }
      for (const initializer of declarationValues(symbolFor(node.expression))) {
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

export function collectSourceReferences(file, referenced, runtimePrefixes) {
  const source = readFileSync(file, "utf8");
  if (extname(file) === ".html") {
    collectHtmlClasses(source, referenced);
    return;
  }

  const sourceFile = program.getSourceFile(file);
  if (!sourceFile) return;
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
          if (
            ts.isStringLiteralLike(attribute) &&
            (attribute.text === "class" || attribute.text === "className")
          ) {
            collectClassExpression(node.arguments[1], context);
          }
        }
      }

      const name = calleeName(node.expression);
      if (
        name === "createElement" &&
        node.arguments[1] &&
        ts.isObjectLiteralExpression(unwrap(node.arguments[1]))
      ) {
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

export function stripCssComments(source) {
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

export function classSelectors(css) {
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

export function globalClassSelectors(css) {
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

/**
 * Every class token product code can emit, plus the finite runtime prefixes that
 * stand in for class families the scanner can only resolve partially.
 */
export function collectEmittedClasses() {
  const referenced = new Set();
  const runtimePrefixes = new Set();
  for (const file of productFiles) collectSourceReferences(file, referenced, runtimePrefixes);
  return { referenced, runtimePrefixes, files: productFiles };
}

export function cssModuleFiles() {
  const found = [];
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
      if (path.endsWith(".module.css")) found.push(path);
    }
  };
  walk(join(root, "src"));
  return found;
}

if (!invokedDirectly) {
  // Imported for its extraction only; the CLI report below must not run.
} else {

const { referenced, runtimePrefixes } = collectEmittedClasses();

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

}
