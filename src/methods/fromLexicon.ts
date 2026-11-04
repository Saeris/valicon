import type { LexiconDoc } from "../types/index.js";
import { type BuildConfig, buildLexicon, type Expr } from "./expressions.js";

/**
 * From Lexicon config interface.
 */
export interface FromLexiconConfig extends BuildConfig {
  /**
   * Returns the module specifier to import another Lexicon document from.
   * Defaults to a sibling module named after the NSID: `./com.example.nsid.js`.
   */
  readonly resolveImport?: (nsid: string) => string;
  /**
   * The module specifier of Valibot. Defaults to `valibot`.
   */
  readonly valibotImport?: string;
  /**
   * The module specifier of Valicon. Defaults to `valicon`.
   */
  readonly valiconImport?: string;
}

/**
 * The maximum line width before an expression is broken across lines.
 */
const LINE_WIDTH = 80;

/**
 * JavaScript reserved words that cannot be used as identifiers.
 */
const RESERVED = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield"
]);

/**
 * Converts a definition name to a safe identifier.
 *
 * @param name The definition name.
 *
 * @returns The identifier.
 */
export function toIdentifier(name: string): string {
  const identifier = name.replace(/[^\w$]/gu, "_");
  return RESERVED.has(identifier) || /^\d/u.test(identifier)
    ? `_${identifier}`
    : identifier;
}

/**
 * Converts an NSID to the namespace alias used for its import.
 *
 * @param nsid The NSID.
 *
 * @returns The alias.
 */
export function toImportAlias(nsid: string): string {
  return nsid
    .split(".")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("")
    .replace(/[^\w$]/gu, "_");
}

/**
 * Prints an object key, quoting it when it is not a valid identifier.
 *
 * @param key The key.
 *
 * @returns The printed key.
 */
function printKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/u.test(key) ? key : JSON.stringify(key);
}

/**
 * Prints an expression as source code, breaking lines when it is too wide.
 *
 * @param expr The expression.
 * @param indent The current indentation depth.
 *
 * @returns The source code.
 */
function print(expr: Expr, indent: number): string {
  const pad = "  ".repeat(indent);
  const inner = "  ".repeat(indent + 1);
  switch (expr.kind) {
    case "value": {
      return JSON.stringify(expr.value);
    }
    case "local": {
      const name = toIdentifier(expr.name);
      return expr.lazy ? `v.lazy(() => ${name})` : name;
    }
    case "external": {
      return `v.lazy(() => ${toImportAlias(expr.nsid)}.${toIdentifier(expr.name)})`;
    }
    case "array": {
      const items = expr.items.map((item) => print(item, indent + 1));
      const inline = `[${items.join(", ")}]`;
      if (fits(inline, indent) || items.length === 0) {
        return inline;
      }
      return `[\n${items.map((item) => inner + item).join(",\n")}\n${pad}]`;
    }
    case "object": {
      const entries = expr.entries.map(
        ([key, item]) => `${printKey(key)}: ${print(item, indent + 1)}`
      );
      if (entries.length === 0) {
        return "{}";
      }
      const inline = `{ ${entries.join(", ")} }`;
      if (fits(inline, indent)) {
        return inline;
      }
      return `{\n${entries.map((entry) => inner + entry).join(",\n")}\n${pad}}`;
    }
    case "call": {
      const args = expr.args.map((arg) => print(arg, indent + 1));
      const inline = `${expr.callee}(${args.join(", ")})`;
      if (fits(inline, indent) || args.length === 0) {
        return inline;
      }
      // Hug a trailing object or array argument, like `v.object({ ... })`,
      // when everything before it fits on the first line.
      const last = expr.args.at(-1)!;
      const head = args.slice(0, -1);
      if (
        (last.kind === "object" || last.kind === "array") &&
        head.every((arg) => !arg.includes("\n")) &&
        fits(`${expr.callee}(${[...head, "{"].join(", ")}`, indent)
      ) {
        return `${expr.callee}(${[...head, print(last, indent)].join(", ")})`;
      }
      return `${expr.callee}(\n${args.map((arg) => inner + arg).join(",\n")}\n${pad})`;
    }
    default: {
      throw new Error("Unknown expression");
    }
  }
}

/**
 * Checks whether a single line expression fits the line width.
 *
 * @param inline The printed expression.
 * @param indent The indentation depth.
 *
 * @returns Whether it fits.
 */
function fits(inline: string, indent: number): boolean {
  return !inline.includes("\n") && inline.length + indent * 2 <= LINE_WIDTH;
}

/**
 * Generates TypeScript source code with Valibot schemas from a
 * [Lexicon](https://atproto.com/specs/lexicon) document.
 *
 * Every definition becomes an exported constant named after it, with `main`
 * holding the primary definition. Definitions are emitted in dependency
 * order, cycles are broken with `v.lazy()`, and references to other
 * documents are imported as namespaces named after their NSID, such as
 * `ComAtprotoRepoStrongRef`.
 *
 * Hint: Object definitions declare an optional `$type` literal and records a
 * required one, so the generated schemas work with `union()` and round-trip
 * through `toLexicon()`. Use `compileLexicon()` instead when you need the
 * schemas at runtime without a build step.
 *
 * @param doc The Lexicon document.
 * @param config The generation config.
 *
 * @returns The generated source code.
 */
export function fromLexicon(
  doc: LexiconDoc,
  config?: FromLexiconConfig
): string {
  const { defs, externals } = buildLexicon(doc, config);
  const resolveImport =
    config?.resolveImport ?? ((nsid: string): string => `./${nsid}.js`);
  const lines: string[] = [
    `// Generated from the ${doc.id} Lexicon by Valicon. Do not edit.`,
    `import * as v from ${JSON.stringify(config?.valibotImport ?? "valibot")};`,
    `import * as lex from ${JSON.stringify(config?.valiconImport ?? "@saeris/valicon")};`
  ];
  for (const nsid of [...externals].sort()) {
    lines.push(
      `import * as ${toImportAlias(nsid)} from ${JSON.stringify(resolveImport(nsid))};`
    );
  }
  for (const { name, expr } of defs) {
    const def = doc.defs[name];
    lines.push("");
    if (def?.description !== void 0) {
      lines.push("/**", ` * ${def.description}`, " */");
    }
    lines.push(`export const ${toIdentifier(name)} = ${print(expr, 0)};`);
  }
  return `${lines.join("\n")}\n`;
}
